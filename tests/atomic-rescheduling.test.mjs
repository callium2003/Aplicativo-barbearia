import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildCustomerAppointmentTarget,
} from "../app/customer-appointment-navigation.mjs";
import {
  RESCHEDULE_MINIMUM_HOURS,
  evaluateRescheduleEligibility,
} from "../app/reschedule-policy.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("enforces minimum advance notice policy for online customer rescheduling (EFS §12.4 / BLD-02)", () => {
  const baseTime = new Date("2026-09-16T12:00:00.000Z");

  // 1. Horário com mais de 2h de antecedência: permitido
  const futureSlot = new Date("2026-09-16T15:00:00.000Z"); // 3h depois
  const validResult = evaluateRescheduleEligibility(futureSlot, RESCHEDULE_MINIMUM_HOURS, baseTime);
  assert.equal(validResult.eligible, true);
  assert.equal(validResult.reason, null);
  assert.equal(validResult.message, null);
  assert.ok(validResult.hoursUntil >= 2);

  // 2. Horário com menos de 2h de antecedência: bloqueia com orientação de WhatsApp
  const soonSlot = new Date("2026-09-16T13:00:00.000Z"); // 1h depois
  const soonResult = evaluateRescheduleEligibility(soonSlot, RESCHEDULE_MINIMUM_HOURS, baseTime);
  assert.equal(soonResult.eligible, false);
  assert.equal(soonResult.reason, "insufficient_advance_notice");
  assert.match(soonResult.message, /WhatsApp/i);
  assert.match(soonResult.message, /menos de 2 horas de antecedência/);

  // 3. Horário já iniciado ou no passado: bloqueia
  const pastSlot = new Date("2026-09-16T11:00:00.000Z"); // 1h antes
  const pastResult = evaluateRescheduleEligibility(pastSlot, RESCHEDULE_MINIMUM_HOURS, baseTime);
  assert.equal(pastResult.eligible, false);
  assert.equal(pastResult.reason, "already_started");
  assert.match(pastResult.message, /iniciado ou ultrapassado/);

  // 4. Data inválida
  const invalidResult = evaluateRescheduleEligibility("data_invalida", RESCHEDULE_MINIMUM_HOURS, baseTime);
  assert.equal(invalidResult.eligible, false);
  assert.equal(invalidResult.reason, "invalid_date");
});

test("preserves appointment target navigation and optionally carries reschedule context", () => {
  const shop = { name: "Cullen Barbas", slug: "cullenbarbas" };

  // Sem ID de reagendamento: URL clássica esperada pelos testes existentes
  const standardTarget = buildCustomerAppointmentTarget(shop, ["corte", "barba"], true);
  assert.equal(standardTarget, "/cullenbarbas?services=corte%2Cbarba");

  // Com ID de reagendamento: preserva o ID atômico na query
  const atomicTarget = buildCustomerAppointmentTarget(shop, ["corte", "barba"], true, "apt-uuid-123");
  assert.equal(atomicTarget, "/cullenbarbas?services=corte%2Cbarba&reschedule=apt-uuid-123");
  const parsed = new URL(`http://localhost${atomicTarget}`);
  assert.equal(parsed.searchParams.get("reschedule"), "apt-uuid-123");
});

test("integrates advance notice check into customer agenda before cancellation or rebooking", async () => {
  const bookings = await read("../app/meus-agendamentos/page.tsx");

  assert.match(bookings, /import\s*\{[^}]*evaluateRescheduleEligibility[^}]*\}\s*from\s*"@\/app\/reschedule-policy\.mjs"/);
  assert.match(bookings, /evaluateRescheduleEligibility\(item\.starts_at\)/);
  assert.match(bookings, /insufficient_advance_notice/);
  assert.match(bookings, /Para reagendamentos com menos de 2 horas de antecedência/);

  // Garante estrita retrocompatibilidade com os testes contratuais de cancelamento e rebooking
  assert.match(bookings, /if \(rebook && !window\.confirm\(/);
  assert.match(bookings, /const targetPath = rebook \? buildCustomerAppointmentTarget\(shop, item\.service_ids, true\) : null;/);
  assert.match(bookings, /if \(rebook && targetPath\) \{[\s\S]*?router\.push\(targetPath\);[\s\S]*?return;/);
  assert.match(bookings, /setItems\(\(current\) => current\.map\(\(currentItem\) => currentItem\.id === item\.id \? \{ \.\.\.currentItem, status: "cancelled" \} : currentItem\)\);/);
});
