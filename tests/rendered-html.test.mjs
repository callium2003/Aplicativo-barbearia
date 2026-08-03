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

test("keeps the public booking flow connected to its required data operations", async () => {
  const [publicPage, clientPage, agendaPage, subscriptionGate, subscriptionPage] = await Promise.all([
    readFile(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/clientes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/SubscriptionGate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/assinatura/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(publicPage, /rpc\("get_public_availability"/);
  assert.match(publicPage, /rpc\("book_customer_appointment"/);
  assert.match(publicPage, /p_barbershop_marketing: barbershopMarketing/);
  assert.match(publicPage, /p_platform_marketing: platformMarketing/);
  assert.match(publicPage, /type="checkbox" checked=\{barbershopMarketing\}/);
  assert.match(publicPage, /signInWithOAuth\(\{ provider: "google"/);
  assert.match(publicPage, /signInWithOtp/);
  assert.match(publicPage, /select\("id,slug,name,phone,whatsapp,address,description,photo_url"\)/);
  assert.match(publicPage, /buildWhatsAppLink\(shop\?\.whatsapp/);
  assert.match(publicPage, /buildGoogleMapsLink\(\{ address: shop\?\.address \}\)/);
  assert.doesNotMatch(publicPage, /wa\.me\/5511999999999/);
  assert.match(clientPage, /phone_normalized/);
  assert.match(clientPage, /Falar no WhatsApp/);
  assert.match(agendaPage, /eq\("barbershop_id", currentShop\.id\)/);
  assert.match(agendaPage, /update\(\{ status \}\)/);
  assert.match(subscriptionGate, /barbershop_subscriptions/);
  assert.match(subscriptionGate, /\/painel\/assinatura/);
  assert.match(subscriptionPage, /teste gratuito/);
});
