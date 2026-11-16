import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Render the actual components with a real React context. Only the browser
// Supabase singleton is replaced: these server renders must never call a service.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiledModule = { exports: {} };
  modules.set(filename, compiledModule);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename.endsWith(".mjs") ? filename + ".ts" : filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.endsWith(".css")) return {};
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return require(specifier);
    const base = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    if (base.replaceAll("\\", "/").endsWith("/utils/supabase")) return { supabase: {} };
    const target = [base, base + ".tsx", base + ".ts", base + ".mjs"].find((candidate) => existsSync(candidate));
    if (!target) throw new Error(`Missing test import: ${specifier}`);
    return load(target);
  };
  new Function("require", "module", "exports", source)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { SubscriptionDataProvider, subscriptionHref } = load("app/painel/assinatura/SubscriptionContext.tsx");
const Checkout = load("app/painel/assinatura/contratar/SandboxCheckout.tsx").default;
const Overview = load("app/painel/assinatura/SubscriptionOverview.tsx").default;
const Plans = load("app/painel/assinatura/SubscriptionPlans.tsx").default;
const ChangePlan = load("app/painel/assinatura/alterar-plano/page.tsx").default;
const Landing = load("app/page.tsx").default;
const Cancel = load("app/painel/assinatura/cancelar/page.tsx").default;
const Rules = load("app/regras-assinatura/page.tsx").default;
const Terms = load("app/termos/page.tsx").default;

function render(Component, props = {}, context = {}) {
  return renderToStaticMarkup(React.createElement(SubscriptionDataProvider, {
    value: {
      shopName: "Barbearia fictícia", role: "owner", subscription: { status: "trialing", plan_code: "simple-trimestral" },
      view: { kind: "trial" }, href: subscriptionHref, activeProfessionals: 1, bills: [], ...context,
    },
  }, React.createElement(Component, props))).replaceAll("\u00a0", " ");
}

for (const [planCode, priceCents, half] of [
  ["simple-trimestral", 21990, "109,95"],
  ["middle-trimestral", 27990, "139,95"],
  ["master-trimestral", 35990, "179,95"],
]) {
  test(`checkout ${planCode} shows two interest-free installments, cash Pix and a new purchase for renewal`, () => {
    const html = render(Checkout, { planCode, planName: "Plano Trimestral", months: 3, priceCents, userLimit: 3 });
    assert.match(html, new RegExp(`2x de R\\$ ${half} sem juros`));
    assert.match(html, /Pix avulso à vista/);
    assert.match(html, /sem renovação automática/);
    assert.match(html, /nova compra/);
    assert.match(html, /três meses de calendário/);
    assert.doesNotMatch(html, /trimestral com renovação automática/i);
  });
}

test("monthly checkout preserves recurring payment without advertising installments", () => {
  const html = render(Checkout, { planCode: "simple-mensal", planName: "Plano Simple", months: 1, priceCents: 7990, userLimit: 3 });
  assert.match(html, /Assinatura mensal com renovação automática/);
  assert.doesNotMatch(html, /2x|Pix avulso|sem renovação automática/);
});

const active = { view: { kind: "active", endsAt: "2027-02-16T12:00:00Z" }, renewalKind: "quarterly_purchase" };
test("active one-time quarterly purchase can renew while preserving its paid period", () => {
  const html = render(Checkout, { planCode: "simple-trimestral", planName: "Plano Simple", months: 3, priceCents: 21990, userLimit: 3 }, active);
  assert.match(html, /Pagar com cartão/);
  assert.match(html, /período vigente.*preservado/);
  assert.match(html, /após o término/);
  assert.doesNotMatch(html, /Não é necessário realizar um novo pagamento/);
  const overview = render(Overview, { sandboxEnabled: true }, active);
  assert.match(overview, /Renovar com nova compra/);
  assert.doesNotMatch(overview, />Alterar plano</);
  const plans = render(Plans, { sandboxEnabled: true }, active);
  assert.match(plans, /href="\/painel\/assinatura\/contratar\?plano=simple-trimestral"/);
  assert.doesNotMatch(plans, /href="\/painel\/assinatura\/contratar\?plano=(?:\w+-mensal|middle-trimestral|master-trimestral)"/);
});

test("an active quarterly purchase blocks a different plan until the paid period ends", () => {
  for (const [planCode, months, priceCents] of [["simple-mensal", 1, 7990], ["middle-trimestral", 3, 27990]]) {
    const html = render(Checkout, { planCode, planName: "Plano escolhido", months, priceCents, userLimit: 3 }, active);
    assert.match(html, /outro plano.*término/);
    assert.doesNotMatch(html, /Pagar com cartão|Pagar com PIX/);
  }
});

test("an ended quarterly purchase allows another plan and pending payment remains visible", () => {
  const ended = { ...active, view: { kind: "ended", endsAt: "2026-01-01T12:00:00Z" } };
  assert.match(render(Plans, { sandboxEnabled: true }, ended), /href="\/painel\/assinatura\/contratar\?plano=middle-mensal"/);
  assert.doesNotMatch(render(Overview, { sandboxEnabled: true }, ended), /nova compra do mesmo plano/);
  const pending = render(Overview, { sandboxEnabled: true }, { ...active, view: { kind: "pending" } });
  assert.match(pending, /Sua contratação já está em andamento/);
  assert.match(pending, /Acompanhar pagamento/);
});

test("historical quarterly recurrence and an unknown renewal mode keep duplicate ordering blocked", () => {
  for (const renewalKind of ["card", "pix", undefined]) {
    const context = { ...active, renewalKind };
    const html = render(Checkout, { planCode: "simple-trimestral", months: 3, priceCents: 21990, userLimit: 3 }, context);
    assert.match(html, /Não é necessário realizar um novo pagamento/);
    assert.doesNotMatch(html, /Pagar com cartão/);
    assert.doesNotMatch(render(Overview, { sandboxEnabled: true }, context), /Renovar com nova compra/);
    assert.doesNotMatch(render(Plans, { sandboxEnabled: true }, context), /href="\/painel\/assinatura\/contratar\?/);
  }
});

test("one-time quarterly purchase directs plan changes to a new purchase", () => {
  const html = render(ChangePlan, {}, active);
  assert.match(html, /nova compra/);
  assert.match(html, /href="\/painel\/assinatura\/planos"/);
  assert.doesNotMatch(html, /Carregando situação atual no Asaas/);
});

test("one-time quarterly cancellation explains there is no renewal to cancel", () => {
  const html = render(Cancel, {}, active);
  assert.match(html, /Não há renovação a cancelar/);
  assert.match(html, /Renovar com nova compra/);
  assert.doesNotMatch(html, /type="checkbox"|>Cancelar renovação da assinatura</);
});

test("rules and terms disclose the same purchase duration and renewal conditions", () => {
  for (const Component of [Rules, Terms]) {
    const html = render(Component);
    assert.match(html, /três meses de calendário/);
    assert.match(html, /sem renovação automática/);
    assert.match(html, /até 2x sem juros/);
    assert.match(html, /Pix avulso à vista/);
    assert.match(html, /nova compra/);
    assert.match(html, /período já pago/);
  }
});

test("landing renders quarterly totals with each half installment and distinguishes renewal by cycle", () => {
  const html = render(Landing);
  for (const half of ["109,95", "139,95", "179,95"]) assert.match(html, new RegExp(`2x de R\\$ ${half} sem juros`));
  assert.match(html, /Pix avulso à vista/);
  assert.match(html, /nova compra/);
  assert.match(html, /mensal.*renovação automática no cartão/);
  assert.doesNotMatch(html, /cobrança integral por ciclo, sem parcelamento|trimestrais têm cobrança integral por ciclo/);
});
