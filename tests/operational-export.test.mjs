import assert from "node:assert/strict";
import test from "node:test";

import { buildOperationalExport, makeOperationalExportFilename } from "../utils/operational-export.ts";

test("operational export creates one ZIP containing equivalent Excel and JSON files", async () => {
  const payload = {
    generated_at: "2026-09-12T15:00:00.000Z",
    barbershop: { name: "Fada Barbearia", slug: "fada-barbearia" },
    appointments: [{ starts_at: "2026-09-12T12:00:00.000Z", status: "scheduled", customer_name: "Cliente de teste" }],
    customers: [{ name: "Cliente de teste", email: "cliente@example.test", marketing_consent: true }],
    services: [{ name: "Corte", price: 50 }],
    professionals: [{ name: "Maria", active: true }],
    commissions: [{ commission_amount: 20, payment_status: "paid" }],
    business_hours: [],
    professional_hours: [],
    professional_breaks: [],
    professional_time_blocks: [],
    team_members: [],
    registration: {},
  };

  const archive = await buildOperationalExport(payload);
  const names = [...archive.entries.keys()];

  assert.deepEqual(names, ["dados-operacionais.json", "operacao.xlsx"]);
  assert.match(new TextDecoder().decode(archive.entries.get("dados-operacionais.json")), /Cliente de teste/);
  assert.equal(new TextDecoder().decode(archive.bytes.slice(0, 2)), "PK");
  assert.equal(new TextDecoder().decode(archive.entries.get("operacao.xlsx").slice(0, 2)), "PK");
  assert.equal(makeOperationalExportFilename(payload), "barbeariasp-fada-barbearia-2026-09-12.zip");
});

test("operational export never turns absent data into a synthetic timeline", async () => {
  const archive = await buildOperationalExport({
    generated_at: "2026-09-12T15:00:00.000Z",
    barbershop: { name: "Fada", slug: "fada" },
    appointments: [], customers: [], services: [], professionals: [], commissions: [],
    business_hours: [], professional_hours: [], professional_breaks: [], professional_time_blocks: [], team_members: [], registration: {},
  });

  assert.equal(archive.entries.has("linha-do-tempo.json"), false);
  assert.equal(archive.entries.has("eventos.json"), false);
});
