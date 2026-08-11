import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("server-renders the BarbeariaSP landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Barbearia SP \| Agenda para sua barbearia<\/title>/i);
  assert.match(html, /AGENDE\. ORGANIZE\. CRESÇA\./);
  assert.match(html, /Teste grátis por 30 dias/);
  assert.match(html, /PLANOS E TESTE GRATUITO/);
  assert.match(html, /Mensal/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("uses the shared premium administrative navigation on main management pages", async () => {
  const [agenda, clients, reports, professionals, panel, shell] = await Promise.all([
    read("../app/painel/agenda/page.tsx"), read("../app/painel/clientes/page.tsx"), read("../app/painel/relatorios/page.tsx"),
    read("../app/painel/profissionais/page.tsx"), read("../app/painel/page.tsx"), read("../app/painel/PanelShell.tsx"),
  ]);
  for (const source of [agenda, clients, reports, professionals, panel]) assert.match(source, /PanelShell/);
  assert.match(shell, /className="product-nav"/);
  assert.match(shell, /Navegação do painel/);
});

test("keeps the public booking flow connected to required data and consent operations", async () => {
  const [publicPage, agendaPage, configPage, panelPage, signOutButton, subscriptionGate, subscriptionPage] = await Promise.all([
    read("../app/[slug]/page.tsx"), read("../app/painel/agenda/page.tsx"), read("../app/painel/configurar/page.tsx"),
    read("../app/painel/page.tsx"), read("../app/painel/SignOutButton.tsx"), read("../app/painel/SubscriptionGate.tsx"), read("../app/painel/assinatura/page.tsx"),
  ]);
  assert.match(publicPage, /rpc\("get_public_availability"/);
  assert.match(publicPage, /rpc\("book_customer_appointment"/);
  assert.match(publicPage, /sessionStorage\.setItem\(pendingBookingKey/);
  assert.match(publicPage, /localStorage\.setItem\(pendingBookingKey/);
  assert.match(publicPage, /pendingBookingMaxAgeMs = 30 \* 60 \* 1000/);
  assert.match(publicPage, /customerPhone\.replace\(\/\\D\/g, ""\)/);
  assert.match(publicPage, /p_barbershop_marketing: barbershopMarketing/);
  assert.match(publicPage, /p_platform_marketing: platformMarketing/);
  assert.match(publicPage, /signInWithOAuth\(\{ provider: "google"/);
  assert.match(publicPage, /signInWithOtp/);
  assert.match(publicPage, /buildWhatsAppLink\(shop\?\.whatsapp/);
  assert.match(publicPage, /buildGoogleMapsLink/);
  assert.match(agendaPage, /eq\("barbershop_id", currentShop\.id\)/);
  assert.match(agendaPage, /update\(\{ status \}\)/);
  assert.match(agendaPage, /buildWhatsAppLink\(item\.customer_phone/);
  assert.match(panelPage, /Página pública/);
  assert.match(panelPage, /navigator\.clipboard\.writeText/);
  assert.match(configPage, /Link público da barbearia/);
  assert.match(configPage, /rpc\("create_team_invitation"/);
  assert.match(signOutButton, /Abrir painel de gestão/);
  assert.match(subscriptionGate, /barbershop_subscriptions/);
  assert.match(subscriptionPage, /teste gratuito/);
});

test("resolves administrative agenda access for owner, manager and barber roles", async () => {
  const [agendaPage, panelContext] = await Promise.all([read("../app/painel/agenda/page.tsx"), read("../utils/panel-context.ts")]);
  assert.match(agendaPage, /getPanelContext/);
  assert.match(panelContext, /\.from\("team_members"\)[\s\S]*?\.select\("barbershop_id,\s*role,\s*professional_id"\)/);
  assert.match(panelContext, /in\("role", \["manager", "barber"\]\)/);
  assert.match(agendaPage, /currentShop\.role === "barber" && !currentShop\.professional_id/);
  assert.match(agendaPage, /Seu perfil de barbeiro não está vinculado a um profissional ativo/);
  assert.match(agendaPage, /query = query\.eq\("professional_id", currentShop\.professional_id\)/);
});

test("limits Meus agendamentos to the authenticated customer and dedicated customer login", async () => {
  const page = await read("../app/meus-agendamentos/page.tsx");
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /\/cliente\/entrar\?returnTo=%2Fmeus-agendamentos/);
  assert.match(page, /from\("customers"\)[\s\S]*?eq\("auth_user_id", user\.id\)/);
  assert.match(page, /from\("appointments"\)[\s\S]*?eq\("customer_id", user\.id\)[\s\S]*?order\("starts_at", \{ ascending: false \}\)/);
  assert.match(page, /Próximo agendamento/);
  assert.match(page, /rpc\("save_my_customer_profile"/);
});

test("renders the saved public barbershop photo and safe fallback", async () => {
  const [page, styles] = await Promise.all([read("../app/[slug]/page.tsx"), read("../app/[slug]/public-page.module.css")]);
  assert.match(page, /select\("id,slug,name,phone,whatsapp,address,description,photo_url"\)/);
  assert.match(page, /const photoUrl = shop\?\.photo_url\?\.trim\(\) \|\| null/);
  assert.match(page, /src=\{photoUrl\}/);
  assert.match(page, /onError=\{\(\) => setPhotoUnavailable\(true\)\}/);
  assert.match(styles, /\.heroImage img\{[^}]*object-fit:cover/);
});

test("keeps customer details pending before public booking authentication", async () => {
  const page = await read("../app/[slug]/page.tsx");
  assert.match(page, /onSubmit=\{user \? confirmAppointment : requestAuthentication\}/);
  assert.match(page, /function requestAuthentication\(event: FormEvent\)/);
  assert.match(page, /function continueWithGoogle\(\)/);
  assert.match(page, /function sendMagicLink\(\)/);
  assert.match(page, /savePendingBooking\(normalizedPhone\)/);
  assert.match(page, /sessionStorage\.getItem\(pendingBookingKey\)/);
  assert.match(page, /localStorage\.getItem\(pendingBookingKey\)/);
});

test("keeps initial registration private, validated and separate from public catalogue", async () => {
  const [registrationPage, panelPage, settingsPage, migration] = await Promise.all([
    read("../app/cadastro-inicial/page.tsx"), read("../app/painel/page.tsx"), read("../app/painel/configurar/page.tsx"), read("../supabase/migrations/20260803071307_add_initial_registration_details.sql"),
  ]);
  assert.match(registrationPage, /aria-label=\{`Etapa \$\{step\} de 2`\}/);
  assert.match(registrationPage, /validBrazilianPhone/);
  assert.match(registrationPage, /validDocument/);
  assert.match(registrationPage, /window\.location\.replace\("\/painel\/configurar"\)/);
  assert.match(panelPage, /initial_registration_completed/);
  assert.match(settingsPage, />Dados cadastrais</);
  assert.match(migration, /create table public\.barbershop_registration_details/);
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /tax_document.*public_barbershop_pages/);
});

test("enforces 10-minute interval steps for public booking availability", async () => {
  const migration = await read("../supabase/migrations/20260804013607_20260803230000_optimize_booking_intervals_10min.sql");
  assert.match(migration, /interval '10 minutes'/);
  assert.match(migration, /mod\(extract\(minute from v_local_start\)::integer, 10\) <> 0/);
});

test("defines team invitation schema and secure token flow", async () => {
  const [base, hardening, acceptancePage, configPage] = await Promise.all([
    read("../supabase/migrations/20260804043338_add_team_invitations.sql"), read("../supabase/migrations/20260807020457_harden_public_invitation_details.sql"), read("../app/convite/equipe/page.tsx"), read("../app/painel/configurar/page.tsx"),
  ]);
  assert.match(base, /create table (if not exists )?public\.team_invitations/i);
  assert.match(base, /security definer/i);
  assert.match(acceptancePage, /rpc\("get_invitation_details"/);
  assert.match(acceptancePage, /rpc\("accept_team_invitation"/);
  assert.match(acceptancePage, /currentUrl\.searchParams\.delete\("token"\)/);
  assert.doesNotMatch(acceptancePage, /\/convite\/equipe\?token=/);
  assert.match(hardening, /email_masked/);
  assert.match(configPage, /rpc\("revoke_team_invitation"/);
});

test("masks team invitation emails before authentication", async () => {
  const page = await read("../app/convite/equipe/page.tsx");
  assert.match(page, /function maskEmail/);
  assert.match(page, /invitation\?\.email_masked/);
  assert.doesNotMatch(page, /<b>\{invitation\?\.email_normalized\}<\/b>/);
});

test("defines professional commission rate security and management UI", async () => {
  const [migration, configPage] = await Promise.all([read("../supabase/migrations/20260806040831_20260804060000_isolate_professional_commission.sql"), read("../app/painel/configurar/page.tsx")]);
  assert.match(migration, /create table (if not exists )?public\.professional_commission_settings/i);
  assert.match(migration, /create or replace function public\.set_professional_commission_rate/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /grant execute on function public\.set_professional_commission_rate.*to authenticated/i);
  assert.match(configPage, /rpc\("get_professional_commission_rates"/);
  assert.match(configPage, /rpc\("set_professional_commission_rate"/);
  assert.match(configPage, /normalizeCommissionRate/);
});

test("resolves team member role in panel routing", async () => {
  const [panelPage, panelContext] = await Promise.all([read("../app/painel/page.tsx"), read("../utils/panel-context.ts")]);
  assert.match(panelPage, /getPanelContext/);
  assert.match(panelContext, /\.from\("team_members"\)[\s\S]*?\.select\("barbershop_id,\s*role,\s*professional_id"\)/);
});
