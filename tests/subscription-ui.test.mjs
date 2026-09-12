import test from "node:test";
import assert from "node:assert/strict";
import { getPlan, splitInstallments, installmentSummary } from "../utils/subscription-plans.ts";
import { legacySubscriptionView, isSubscriptionPath } from "../utils/subscription-view.ts";
import { subscriptionCancellationOptions, subscriptionSections } from "../app/painel/assinatura/presentation.mjs";

test("divides the total into integer cents without losing the last cent", () => {
  assert.deepEqual(splitInstallments(99900, 4), [24975, 24975, 24975, 24975]);
  assert.deepEqual(splitInstallments(53990, 3), [17997, 17997, 17996]);
  assert.match(installmentSummary(53990, 3), /179,97/);
  assert.match(installmentSummary(53990, 3), /179,96/);
  assert.throws(() => splitInstallments(99900, 0));
  assert.throws(() => splitInstallments(10.1, 2));
  assert.throws(() => splitInstallments(100, 1.5));
});

test("rejects unknown plans rather than silently selecting a contract", () => {
  assert.equal(getPlan("ANUAL"), undefined);
  assert.equal(getPlan("__proto__"), undefined);
  assert.equal(getPlan(null), undefined);
  assert.equal(getPlan("anual")?.priceCents, 99900);
});

const now = Date.parse("2026-09-06T12:00:00Z");
test("trial expiry is not represented as debt or confirmed deletion", () => {
  assert.equal(legacySubscriptionView({ status: "trialing", trial_ends_at: "2026-09-07T12:00:00Z" }, now).kind, "trial");
  assert.equal(legacySubscriptionView({ status: "trialing", trial_ends_at: "2026-09-06T12:00:00Z" }, now).kind, "ended");
  assert.equal(legacySubscriptionView({ status: "trialing", trial_ends_at: "2025-01-01T00:00:00Z" }, now).kind, "ended");
});

test("does not confuse missing or invalid subscription data with expired trial", () => {
  assert.equal(legacySubscriptionView(null, now).kind, "unknown");
  assert.equal(legacySubscriptionView({status:"trialing",trial_ends_at:"bad"}, now).kind, "unknown");
  assert.equal(legacySubscriptionView({status:"active",current_period_ends_at:null}, now).kind, "active");
});

test("keeps valid paid period visible when cancelled or overdue", () => {
  assert.equal(legacySubscriptionView({status:"cancelled",current_period_ends_at:"2026-10-01T00:00:00Z"}, now).kind, "active");
  assert.equal(legacySubscriptionView({status:"past_due",current_period_ends_at:"2026-10-01T00:00:00Z"}, now).kind, "active");
  assert.equal(legacySubscriptionView({status:"active",current_period_ends_at:"2026-08-01T00:00:00Z"}, now).kind, "ended");
});

test("subscription subpages are reachable on expiry without exempting similarly named routes", () => {
  assert.equal(isSubscriptionPath("/painel/assinatura"), true);
  assert.equal(isSubscriptionPath("/painel/assinatura/planos"), true);
  assert.equal(isSubscriptionPath("/painel/assinatura/contratar"), true);
  assert.equal(isSubscriptionPath("/painel/assinatura-falsa"), false);
  assert.equal(isSubscriptionPath("/painel/agenda"), false);
});

test("subscription management omits the redundant overview card", () => {
  assert.deepEqual(subscriptionSections.map((section) => section.page), ["cobrancas", "dados", "cancelar"]);
  assert.equal(subscriptionSections.some((section) => section.page === "planos"), false);
});

test("subscription cancellation presents automatic renewal as the default intent", () => {
  assert.deepEqual(subscriptionCancellationOptions.map((option) => option.id), ["renew", "end"]);
  assert.equal(subscriptionCancellationOptions.find((option) => option.id === "renew")?.defaultSelected, true);
});
