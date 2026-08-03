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
  assert.match(panelPage, /professional_hours/);
  assert.doesNotMatch(configPage, /barbeariasp\.cullentech\.com\.br/);
  assert.match(panelPage, /window\.location\.replace\("\/painel\/inicio"\)/);
  assert.match(subscriptionGate, /barbershop_subscriptions/);
  assert.match(subscriptionGate, /\/painel\/assinatura/);
  assert.match(subscriptionPage, /teste gratuito/);
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
  assert.match(panelPage, /barbershop_registration_details/);
  assert.match(settingsPage, />Dados cadastrais</);
  assert.match(migration, /create table public\.barbershop_registration_details/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /Owner or manager can read own registration details/);
  assert.doesNotMatch(migration, /tax_document.*public_barbershop_pages/);
});
