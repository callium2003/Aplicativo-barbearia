import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261029030000_refine_platform_support_and_faq.sql", import.meta.url),
  "utf8",
);

test("refinement migration adds customers category and updates commercial category", () => {
  assert.match(migration, /'customers', 'Clientes & LGPD'/i);
  assert.match(migration, /'commercial', 'Suporte & SLA'/i);
});

test("refinement migration removes commercial offer notes from operational and billing articles", () => {
  assert.match(migration, /set\s+commercial_offer_note = null\s+where category_id = 'billing' and question like 'Como funciona o período de testes%/i);
  assert.match(migration, /set\s+commercial_offer_note = null\s+where category_id = 'agenda' and question like '%intervalos de 10 minutos%'/i);
  assert.match(migration, /Qual é o prazo de resposta e SLA do suporte da plataforma\?/i);
});

test("refinement migration updates billing overdue article with SaaS terms, 5-day grace and 60-day LGPD anonymization", () => {
  assert.match(migration, /contrato eletrônico de prestação de serviços/i);
  assert.match(migration, /tolerância operacional de 5 dias/i);
  assert.match(migration, /60 dias do encerramento definitivo/i);
  assert.match(migration, /anonimizados ou expurgados/i);
  assert.doesNotMatch(migration, /acordo de parcelamento diretamente com nossa equipe/i);
});

test("refinement migration fixes photo upload limit to 3 MB for barbershops and 2 MB for professionals", () => {
  assert.match(migration, /até 3 MB/i);
  assert.match(migration, /até 2 MB/i);
  assert.doesNotMatch(migration, /até 5MB/i);
});

test("refinement migration adds questions regarding customer data, LGPD, exports, cancellation, schedule and commissions", () => {
  assert.match(migration, /Como funciona a privacidade e a gestão dos dados dos clientes \(LGPD\)\?/i);
  assert.match(migration, /A barbearia pode exportar a lista e os dados de seus clientes\?/i);
  assert.match(migration, /Como funciona o cancelamento ou alteração do plano SaaS\?/i);
  assert.match(migration, /Como configurar folgas, feriados ou horários especiais na agenda\?/i);
  assert.match(migration, /Como funciona o cálculo e repasse de comissões dos profissionais\?/i);
});
