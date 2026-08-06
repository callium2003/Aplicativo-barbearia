import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the BarbeariaSP landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Barbearia SP \| Agenda para sua barbearia<\/title>/i);
  assert.match(html, /AGENDE\. ORGANIZE\. CRESÇA\./);
  assert.match(html, /Sua barbearia/);
  assert.match(html, /Teste grátis por 30 dias/);
  assert.match(html, /href="\/entrar"/);
  assert.match(html, /PLANOS E TESTE GRATUITO/);
  assert.match(html, /Teste grátis por 30 dias/);
  assert.match(html, /Mensal/);
  assert.match(html, /Trimestral/);
  assert.match(html, /Semestral/);
  assert.match(html, /Anual/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the administrative navigation centered on every menu page", async () => {
  const [agendaPage, clientPage, reportsPage] = await Promise.all([
    readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/clientes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/relatorios/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(agendaPage, /justifyContent: "center"/);
  assert.match(clientPage, /justifyContent: "center"/);
  assert.match(reportsPage, /justifyContent: "center"/);
});

test("keeps the public booking flow connected to its required data operations", async () => {
  const [publicPage, clientPage, agendaPage, configPage, panelPage, professionalsPage, signOutButton, subscriptionGate, subscriptionPage] = await Promise.all([
    readFile(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/clientes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/configurar/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/profissionais/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/SignOutButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/SubscriptionGate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/assinatura/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(publicPage, /rpc\("get_public_availability"/);
  assert.match(publicPage, /rpc\("book_customer_appointment"/);
  assert.match(publicPage, /sessionStorage\.setItem\(pendingBookingKey/);
  assert.match(publicPage, /sessionStorage\.removeItem\(pendingBookingKey\)/);
  assert.match(publicPage, /savedAt: currentTimeMs\(\)/);
  assert.match(publicPage, /pendingBookingMaxAgeMs = 30 \* 60 \* 1000/);
  assert.match(publicPage, /Sua reserva pendente expirou\. Selecione um novo horário\./);
  assert.match(publicPage, /startsAt <= currentTimeMs\(\)/);
  assert.match(publicPage, /customerPhone\.replace\(\/\\D\/g, ""\)/);
  assert.match(publicPage, /Informe um telefone válido com DDD\./);
  assert.match(publicPage, /refreshedAvailability/);
  assert.match(publicPage, /useState\(dateForInput\(\)\)/);
  assert.match(publicPage, /p_barbershop_marketing: barbershopMarketing/);
  assert.match(publicPage, /p_platform_marketing: platformMarketing/);
  assert.match(publicPage, /type="checkbox" checked=\{barbershopMarketing\}/);
  assert.match(publicPage, /signInWithOAuth\(\{ provider: "google"/);
  assert.match(publicPage, /signInWithOtp/);
  assert.match(publicPage, /select\("id,slug,name,phone,whatsapp,address,description,photo_url"\)/);
  assert.match(publicPage, /const photoUrl = shop\?\.photo_url\?\.trim\(\) \|\| null/);
  assert.match(publicPage, /src=\{photoUrl\}/);
  assert.match(publicPage, /onError=\{\(\) => setPhotoUnavailable\(true\)\}/);
  assert.match(publicPage, /objectFit: "cover"/);
  assert.match(publicPage, /buildWhatsAppLink\(shop\?\.whatsapp/);
  assert.match(publicPage, /buildGoogleMapsLink\(\{ address: shop\?\.address \}\)/);
  assert.doesNotMatch(publicPage, /wa\.me\/5511999999999/);
  assert.match(clientPage, /phone_normalized/);
  assert.match(clientPage, /Falar no WhatsApp/);
  assert.match(agendaPage, /eq\("barbershop_id", currentShop\.id\)/);
  assert.match(agendaPage, /update\(\{ status \}\)/);
  assert.match(panelPage, /Dados cadastrais/);
  assert.match(panelPage, /Agenda/);
  assert.match(panelPage, /Clientes/);
  assert.match(panelPage, /Página pública da barbearia/);
  assert.match(panelPage, /window\.location\.origin/);
  assert.match(panelPage, /target="_blank"/);
  assert.match(panelPage, /navigator\.clipboard\.writeText/);
  assert.match(panelPage, /Link copiado com sucesso/);
  assert.match(panelPage, /href="\/painel"/);
  assert.match(agendaPage, /href="\/painel"/);
  assert.match(clientPage, /href="\/painel"/);
  assert.match(clientPage, /justifyContent: "center"/);
  assert.match(agendaPage, /justifyContent: "center"/);
  assert.match(panelPage, /justifyContent: "center"/);
  assert.match(configPage, /Link href="\/painel"/);
  assert.match(configPage, /Link público da barbearia/);
  assert.match(configPage, /Copiar link público/);
  assert.match(configPage, /navigator\.clipboard\.writeText/);
  assert.match(professionalsPage, /Link href="\/painel"/);
  assert.match(signOutButton, /Abrir painel de gestão/);
  assert.match(signOutButton, /Antes de abrir o painel de gestão/);
  assert.match(configPage, /Finalize a configuração antes de abrir o painel de gestão/);
  assert.match(panelPage, /initial_registration_completed/);
  assert.doesNotMatch(configPage, /barbeariasp\.cullentech\.com\.br/);
  assert.match(panelPage, /window\.location\.replace\("\/painel\/inicio"\)/);
  assert.match(subscriptionGate, /barbershop_subscriptions/);
  assert.match(subscriptionGate, /\/painel\/assinatura/);
  assert.match(subscriptionPage, /teste gratuito/);
});

test("resolves administrative agenda access for owner, manager, and barber roles", async () => {
  const [agendaPage, panelContext] = await Promise.all([
    readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../utils/panel-context.ts", import.meta.url), "utf8"),
  ]);

  assert.match(agendaPage, /getPanelContext/);
  assert.match(panelContext, /\.from\("team_members"\)[\s\S]*?\.select\("barbershop_id,\s*role,\s*professional_id"\)/);
  assert.match(panelContext, /in\("role", \["manager", "barber"\]\)/);
  assert.match(agendaPage, /currentShop\.role === "barber" && !currentShop\.professional_id/);
  assert.match(agendaPage, /Seu perfil de barbeiro não está vinculado a um profissional ativo/);
  assert.match(agendaPage, /query\.eq\("professional_id", currentShop\.professional_id\)/);
});

test("limits Meus agendamentos to the authenticated customer", async () => {

  const customerBookingsPage = await readFile(new URL("../app/meus-agendamentos/page.tsx", import.meta.url), "utf8");

  assert.match(customerBookingsPage, /supabase\.auth\.getUser\(\)/);
  assert.match(customerBookingsPage, /window\.location\.replace\("\/entrar"\)/);
  assert.match(customerBookingsPage, /\.from\("appointments"\)[\s\S]*?\.eq\("customer_id", user\.id\)[\s\S]*?\.order\("starts_at", \{ ascending: false \}\)/);
  assert.match(customerBookingsPage, /Você ainda não possui agendamentos\./);
  const appointmentSelectQueries = customerBookingsPage.match(/supabase\.from\("appointments"\)\.select\([^;]+;/g) || [];
  assert.equal(appointmentSelectQueries.length, 1);
  assert.match(appointmentSelectQueries[0], /\.eq\("customer_id", user\.id\)/);
});

test("renders the saved public barbershop photo and keeps a safe fallback", async () => {
  const publicPage = await readFile(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8");

  assert.match(publicPage, /select\("id,slug,name,phone,whatsapp,address,description,photo_url"\)/);
  assert.match(publicPage, /const photoUrl = shop\?\.photo_url\?\.trim\(\) \|\| null/);
  assert.match(publicPage, /src=\{photoUrl\}/);
  assert.match(publicPage, /onError=\{\(\) => setPhotoUnavailable\(true\)\}/);
  assert.match(publicPage, /objectFit: "cover"/);
  assert.match(publicPage, />Sua barbearia<\/div>/);
});

test("keeps customer details pending before public booking authentication", async () => {
  const publicPage = await readFile(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8");

  assert.match(publicPage, /onSubmit=\{user \? confirmAppointment : requestAuthentication\}/);
  assert.match(publicPage, /function requestAuthentication\(event: FormEvent\)/);
  assert.match(publicPage, /function continueWithGoogle\(\)/);
  assert.match(publicPage, /function sendMagicLink\(\)/);
  assert.match(publicPage, /savePendingBooking\(normalizedPhone\)/);
  assert.match(publicPage, /!user && showAuthenticationOptions/);
  assert.match(publicPage, /user \? <button[\s\S]*?"Confirmar agendamento"[\s\S]*?: !showAuthenticationOptions && <button[\s\S]*?>Continuar<\/button>/);
  assert.match(publicPage, /sessionStorage\.getItem\(pendingBookingKey\)/);
  assert.match(publicPage, /localStorage\.getItem\(pendingBookingKey\)/);
  assert.match(publicPage, /pendingBookingMaxAgeMs = 30 \* 60 \* 1000/);
});

test("keeps the initial registration private, validated, and separate from the public catalogue", async () => {
  const [registrationPage, panelPage, settingsPage, migration] = await Promise.all([
    readFile(new URL("../app/cadastro-inicial/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/configurar/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260803071307_add_initial_registration_details.sql", import.meta.url), "utf8"),
  ]);

  assert.match(registrationPage, /ETAPA \{step\} DE 2/);
  assert.match(registrationPage, /Salvar e configurar minha barbearia/);
  assert.match(registrationPage, /validBrazilianPhone/);
  assert.match(registrationPage, /validDocument/);
  assert.match(registrationPage, /window\.location\.replace\("\/painel\/configurar"\)/);
  assert.match(panelPage, /initial_registration_completed/);
  assert.match(settingsPage, />Dados cadastrais</);

  assert.match(migration, /create table public\.barbershop_registration_details/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /Owner or manager can read own registration details/);
  assert.doesNotMatch(migration, /tax_document.*public_barbershop_pages/);
});

test("enforces 10-minute interval steps for public booking availability and validation", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260804013607_optimize_booking_intervals_10min.sql", import.meta.url),
    "utf8"
  );

  assert.match(migration, /interval '10 minutes'/);
  assert.match(migration, /mod\(extract\(minute from v_local_start\)::integer, 10\) <> 0/);
  assert.match(migration, /O horário deve começar em intervalos de 10 minutos\./);
});

test("defines team invitations schema, RLS policies, and RPC security controls", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260804020000_add_team_invitations.sql", import.meta.url),
    "utf8"
  );

  assert.match(migration, /create table (if not exists )?public\.team_invitations/i);
  assert.match(migration, /team_invitations_barber_professional_required/i);
  assert.match(migration, /create (or replace )?function public\.create_team_invitation/i);
  assert.match(migration, /create (or replace )?function public\.get_invitation_details/i);
  assert.match(migration, /create (or replace )?function public\.accept_team_invitation/i);
  assert.match(migration, /create (or replace )?function public\.revoke_team_invitation/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /encode\(extensions\.digest\(v_raw_token::bytea, 'sha256'\), 'hex'\)/);
  assert.match(migration, /Owner or manager can read team_invitations/);
});

test("implements the secure team invitation acceptance flow and panel team management UI", async () => {
  const [acceptancePage, configPage] = await Promise.all([
    readFile(new URL("../app/convite/equipe/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/configurar/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(acceptancePage, /rpc\("get_invitation_details"/);
  assert.match(acceptancePage, /rpc\("accept_team_invitation"/);
  assert.match(acceptancePage, /redirectUrl = token/);
  assert.match(acceptancePage, /\/convite\/equipe\?token=\$\{encodeURIComponent\(token\)\}/);
  assert.match(acceptancePage, /options:\s*\{\s*redirectTo:\s*redirectUrl\s*\}/);
  assert.match(acceptancePage, /options:\s*\{\s*emailRedirectTo:\s*redirectUrl\s*\}/);
  assert.match(acceptancePage, /sessionStorage\.setItem\(PENDING_TOKEN_KEY, activeToken\)/);
  assert.match(acceptancePage, /sessionStorage\.removeItem\(PENDING_TOKEN_KEY\)/);
  assert.doesNotMatch(acceptancePage, /localStorage/);
  assert.match(acceptancePage, /E-mail incompatível/);
  assert.match(acceptancePage, /export function maskEmail/);
  assert.match(acceptancePage, /maskEmail\(invitation\?\.email_normalized\)/);
  assert.doesNotMatch(acceptancePage, /<b>\{invitation\?\.email_normalized\}<\/b>/);
  assert.match(acceptancePage, /Este convite pertence a outro endereço de e-mail/);

  assert.match(configPage, /5\. Equipe e acessos ao painel/);
  assert.match(configPage, /rpc\("create_team_invitation"/);
  assert.match(configPage, /rpc\("revoke_team_invitation"/);
  assert.match(configPage, /Conceder acesso ao painel/);
  assert.match(configPage, /Enviar pelo WhatsApp/);
});

test("masks team invitation emails before authentication and handles edge cases safely", async () => {
  const acceptancePage = await readFile(new URL("../app/convite/equipe/page.tsx", import.meta.url), "utf8");

  assert.match(acceptancePage, /export function maskEmail/);
  assert.match(acceptancePage, /Math\.max\(3, local\.length - 1\)/);
  assert.match(acceptancePage, /"e-mail convidado"/);
  assert.doesNotMatch(acceptancePage, /<b>\{invitation\?\.email_normalized\}<\/b>/);

  const maskEmailMatch = acceptancePage.match(/export function maskEmail[\s\S]*?^}/m);
  assert.ok(maskEmailMatch, "maskEmail function definition found");
  const cleanFnText = maskEmailMatch[0]
    .replace("export function maskEmail(email?: string | null): string", "function maskEmail(email)")
    .replace(": string", "");
  const maskEmailFn = new Function(`
    ${cleanFnText}
    return maskEmail;
  `)();


  assert.equal(maskEmailFn("a@email.com"), "a***@email.com");
  assert.equal(maskEmailFn("jo@email.com"), "j***@email.com");
  assert.equal(maskEmailFn("maria@email.com"), "m****@email.com");
  assert.equal(maskEmailFn("daniel.silva@email.com"), "d***********@email.com");
  assert.equal(maskEmailFn(""), "e-mail convidado");
  assert.equal(maskEmailFn(null), "e-mail convidado");
  assert.equal(maskEmailFn("invalido"), "e-mail convidado");
});

test("defines professional commission rate schema, RPC security controls, and management UI", async () => {
  const [migration, configPage] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260804060000_isolate_professional_commission.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/configurar/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /create table (if not exists )?public\.professional_commission_settings/i);
  assert.match(migration, /check \(commission_rate_percent >= 0\.00 and commission_rate_percent <= 100\.00\)/i);
  assert.match(migration, /Owner or manager can read commission settings/i);
  assert.match(migration, /create or replace function public\.get_professional_commission_rates/i);
  assert.match(migration, /create or replace function public\.set_professional_commission_rate/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path to ''/i);
  assert.match(migration, /revoke all on function public\.set_professional_commission_rate/i);
  assert.match(migration, /grant execute on function public\.set_professional_commission_rate.*to authenticated/i);
  assert.match(migration, /insert into public\.audit_logs/i);

  assert.match(configPage, /rpc\("get_professional_commission_rates"/);
  assert.match(configPage, /rpc\("set_professional_commission_rate"/);
  assert.match(configPage, /Comissão \(%\)/);
  assert.match(configPage, /shop\.role === "owner" && \([\s\S]*?<form/);
  assert.match(configPage, /shop\.role === "owner" \? \(/);
  assert.match(configPage, /setSavingCommission/);
  assert.match(configPage, /editCommissionRate/);
  assert.match(configPage, /Salvar Comissão/);
  assert.match(configPage, /normalizeCommissionRate/);
});

test("resolves team member role in panel routing and queries barbershop_id, role, and professional_id", async () => {
  const [panelPage, panelContext] = await Promise.all([
    readFile(new URL("../app/painel/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../utils/panel-context.ts", import.meta.url), "utf8"),
  ]);

  assert.match(panelPage, /getPanelContext/);
  assert.match(panelContext, /\.from\("team_members"\)[\s\S]*?\.select\("barbershop_id,\s*role,\s*professional_id"\)/);
});
