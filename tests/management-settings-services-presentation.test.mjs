import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("settings uses one shared panel shell and an editorial navigation index", async () => {
  const [layout, page] = await Promise.all([
    read("../app/painel/configurar/layout.tsx"),
    read("../app/painel/configurar/page.tsx"),
  ]);

  assert.match(layout, /PanelShell/);
  assert.match(layout, /management-settings-hero/);
  assert.match(layout, /Organize sua operação/);
  assert.doesNotMatch(page, /import PanelShell/);
  assert.match(page, /management-settings-index/);
  assert.match(page, />Relatórios e comissões</);
  assert.doesNotMatch(page, /🏪|✂|👤|📅|💳/u);
});

test("settings index has one hero and reserves booking readiness guidance for the public link", async () => {
  const [layout, page, orderCss, css] = await Promise.all([
    read("../app/painel/configurar/layout.tsx"),
    read("../app/painel/configurar/page.tsx"),
    read("../app/painel/configurar/settings-order.module.css"),
    read("../app/product-ui.css"),
  ]);

  assert.equal((layout + page).match(/Organize sua operação/g)?.length, 1);
  assert.match(page, /O atalho "Minha conta" foi removido da interface/);
  assert.match(page, /Índice legado removido da interface/);
  assert.match(css, /\.management-settings-index \.ios-settings-chevron\s*\{\s*display:\s*none/);
  assert.doesNotMatch(page, /management-setup-warning/);
  assert.match(page, /management-public-booking-warning/);
  assert.match(page, /Agendamento online indisponível/);
  assert.match(page, /Configure as informações de agenda, profissionais e serviços na aba Mais para começar a usufruir da sua nova ferramenta de gestão da barbearia/);
  assert.doesNotMatch(page, /<ul>\{setupRequirements\.map/);
  assert.match(css, /\.management-public-booking-warning/);
  assert.doesNotMatch(orderCss, /nth-|::before|::after|content\s*:/);
});

test("public-link readiness requires an actual professional time range", async () => {
  const page = await read("../app/painel/configurar/page.tsx");

  assert.match(page, /\.select\("professional_id,is_closed,opens_at,closes_at"\)/);
  assert.match(page, /\.filter\(\(hour\) => hour\.opens_at && hour\.closes_at\)/);
});

test("barbershop data and services expose explicit redesign hooks", async () => {
  const [page, css] = await Promise.all([
    read("../app/painel/configurar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  for (const className of [
    "management-shop-profile",
    "management-shop-profile-heading",
    "management-shop-form",
    "management-business-hours",
    "management-services-catalog",
    "management-services-tabs",
    "management-service-card",
    "management-service-edit",
    "management-professionals",
    "management-professional-create",
    "management-professional-schedule",
    "management-professional-day-tabs",
  ]) {
    assert.match(page, new RegExp(className));
    assert.match(css, new RegExp(`\\.${className}`));
  }

  assert.match(page, /Serviços oferecidos/);
  assert.match(page, /Serviços inativos não aparecem para novos agendamentos/);
  assert.match(page, /Inativar/);
  assert.match(page, /Ativar/);
});

test("barbershop data follows the approved light T18 form without legacy edit mode", async () => {
  const [page, css, compatibilityCss, actionFeedback] = await Promise.all([
    read("../app/painel/configurar/page.tsx"),
    read("../app/product-ui.css"),
    read("../app/painel/configurar/settings-modern.module.css"),
    read("../app/painel/ActionFeedback.tsx"),
  ]);

  for (const className of [
    "management-shop-profile-card",
    "management-shop-photo-section",
    "management-shop-fields",
    "management-shop-primary-action",
    "management-shop-secondary-action",
    "management-shop-public-tools",
  ]) {
    assert.match(page, new RegExp(className));
    assert.match(css, new RegExp(`\\.${className}`));
  }

  assert.match(page, /Estas informações aparecem para seus clientes/);
  assert.match(page, /Salvar alterações/);
  assert.match(page, /Trocar foto/);
  assert.match(page, /Ver página pública/);
  assert.match(page, /Copiar link público/);
  assert.match(page, /Testar WhatsApp/);
  assert.match(page, /Testar Google Maps/);
  assert.match(page, /displayPublicLink/);
  assert.match(page, /publicLink\.replace\(\/\^https\?:\\\/\\\//);
  assert.match(page, /navigator\.clipboard\.writeText\(publicLink\)/);
  assert.match(page, /<code>\{displayPublicLink\}<\/code>/);
  assert.match(page, /Dados da barbearia salvos com sucesso/);
  assert.match(page, /<ActionFeedback message=\{profileMessage\}/);
  assert.match(actionFeedback, /aria-live="polite"/);
  assert.doesNotMatch(page, /editingProfile|Editar dados operacionais/);
  assert.match(css, /background:\s*var\(--sp-accent\)\s*!important/);
  assert.match(compatibilityCss, /management-shop-profile[\s\S]*background:\s*transparent\s*!important/);
  assert.equal(css.match(/^\.management-shop-profile \{/gm)?.length, 1);
});

test("business hours save verifies, reconciles and normalizes the persisted rows", async () => {
  const [page, css] = await Promise.all([
    read("../app/painel/configurar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(
    page,
    /\.upsert\(values, \{ onConflict: "barbershop_id,weekday" \}\)\s*\.select\("weekday,opens_at,closes_at,is_closed"\)/,
  );
  assert.match(page, /savedHours\.length !== values\.length/);
  assert.match(page, /setHours\(/);
  assert.match(page, /const saved = hoursResult\.data\?\.find/);
  assert.match(page, /opens_at: saved\.opens_at\?\.slice\(0, 5\) \|\| ""/);
  assert.match(page, /closes_at: saved\.closes_at\?\.slice\(0, 5\) \|\| ""/);
  assert.match(page, /value=\{day\.opens_at \|\| ""\}/);
  assert.match(page, /value=\{day\.closes_at \|\| ""\}/);
  assert.match(page, /Horários confirmados e salvos/);
  assert.match(css, /\.management-business-hours\s*\{[\s\S]*?width:\s*100%/);
});

test("professional schedule edits one selected day without losing the seven-day payload", async () => {
  const page = await read("../app/painel/configurar/page.tsx");

  assert.match(page, /selectedProfessionalWeekday/);
  assert.match(page, /professionalSchedule\.map\(\(day\) =>/);
  assert.match(page, /professionalSchedule\.filter\(\(day\) => day\.weekday === selectedProfessionalWeekday\)/);
  assert.match(page, /aria-label="Escolher dia da agenda"/);
});

test("services use the approved light catalog treatment without generated headings", async () => {
  const [page, css] = await Promise.all([
    read("../app/painel/configurar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(page, /management-service-create-fields/);
  assert.match(page, /management-service-create-action/);
  assert.match(page, /management-service-edit-eyebrow/);
  assert.match(page, /management-secondary-action/);
  assert.match(css, /\.management-service-create\s*\{[\s\S]*?background:\s*#fff/);
  assert.match(css, /\.management-service-new\s*\{[^}]*color:\s*#fff\s*!important/);
  assert.doesNotMatch(css, /\.management-service-edit::before/);
  assert.doesNotMatch(page, /management-service-actions[\s\S]{0,700}background:\s*"#425e9b"/);
});

test("service creation stays open for sequential catalog setup", async () => {
  const page = await read("../app/painel/configurar/page.tsx");
  assert.match(page, /setShowServiceCreate\(true\);\s*setMessage\("Serviço adicionado\. Você pode cadastrar outro agora\."\)/);
  assert.doesNotMatch(page, /setShowServiceCreate\(false\);\s*setMessage\("Serviço adicionado/);
});

test("professionals preserve the existing flow with the approved light presentation", async () => {
  const [page, css] = await Promise.all([
    read("../app/painel/configurar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(page, /Ele poderá organizar a própria agenda depois/);
  assert.doesNotMatch(page, /Foto pública e acesso ao painel continuam sendo configurados/);
  assert.match(page, /management-professional-secondary-action/);
  assert.match(page, /management-professional-danger-action/);
  assert.match(page, /management-professional-edit-form/);
  assert.match(css, /\.management-professional-secondary-action/);
  assert.match(css, /\.management-professional-danger-action/);
  assert.match(css, /\.management-professionals\s*\{[^}]*padding:\s*28px\s*!important/);
  assert.doesNotMatch(page, /background:\s*"#425e9b"/);
  assert.match(page, /value=\{day\.opens_at \|\| ""\}/);
  assert.match(page, /value=\{day\.closes_at \|\| ""\}/);
});

test("granting access moves focus to the existing invitation form", async () => {
  const [page, css] = await Promise.all([
    read("../app/painel/configurar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(page, /inviteFormRef/);
  assert.match(page, /inviteEmailInputRef/);
  assert.match(page, /scrollIntoView/);
  assert.match(page, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(page, /inviteEmailInputRef\.current\?\.focus/);
  assert.doesNotMatch(page, /document\.body\.scrollHeight/);
  assert.match(page, /management-invite-form/);
  assert.match(page, /management-team-list/);
  assert.match(css, /\.management-invite-form/);
  assert.match(css, /\.management-team-list/);
});
