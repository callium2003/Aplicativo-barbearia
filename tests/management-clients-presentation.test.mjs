import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  clientEmptyMessage,
  clientInitials,
  filterAndSummarizeClients,
  resolveClientPeriodRange,
} from "../app/painel/clientes/presentation.mjs";

test("client initials use the first two meaningful name parts", () => {
  assert.equal(clientInitials("João Pedro da Silva"), "JP");
  assert.equal(clientInitials("  Ana  "), "AN");
  assert.equal(clientInitials(""), "CL");
});

test("empty client copy distinguishes an empty base from an empty search", () => {
  assert.equal(
    clientEmptyMessage(""),
    "Ainda não há clientes com agendamentos nesta barbearia.",
  );
  assert.equal(
    clientEmptyMessage("maria"),
    "Nenhum cliente corresponde à busca atual.",
  );
  assert.equal(
    clientEmptyMessage("", true),
    "Nenhum cliente com atendimento no período selecionado.",
  );
});

test("period range presets resolve month, week and 30days accurately", () => {
  assert.deepEqual(resolveClientPeriodRange("month", "2026-11-12"), {
    startDate: "2026-11-01",
    endDate: "2026-11-30",
  });
  assert.deepEqual(resolveClientPeriodRange("week", "2026-11-12"), {
    startDate: "2026-11-09",
    endDate: "2026-11-15",
  });
  assert.deepEqual(resolveClientPeriodRange("30days", "2026-11-12"), {
    startDate: "2026-10-14",
    endDate: "2026-11-12",
  });
});

test("filterAndSummarizeClients restricts counts and revenue to selected period instead of summing infinitely", () => {
  const history = [
    {
      customer_id: "c1",
      customer_name: "Carlos",
      customer_email: "carlos@test.com",
      customer_phone: "11999990001",
      starts_at: "2026-11-10T14:00:00-03:00",
      status: "completed",
      service_price_snapshot: 60,
      appointments_count: 2,
      completed_appointments_count: 2,
      first_appointment_at: "2026-10-05T14:00:00-03:00",
      last_appointment_at: "2026-11-10T14:00:00-03:00",
      last_completed_appointment_at: "2026-11-10T14:00:00-03:00",
      completed_revenue_total: 110,
    },
    {
      customer_id: "c1",
      customer_name: "Carlos",
      customer_email: "carlos@test.com",
      customer_phone: "11999990001",
      starts_at: "2026-10-05T14:00:00-03:00",
      status: "completed",
      service_price_snapshot: 50,
      appointments_count: 2,
      completed_appointments_count: 2,
      first_appointment_at: "2026-10-05T14:00:00-03:00",
      last_appointment_at: "2026-11-10T14:00:00-03:00",
      last_completed_appointment_at: "2026-11-10T14:00:00-03:00",
      completed_revenue_total: 110,
    },
  ];

  const november = filterAndSummarizeClients(history, {
    periodPreset: "month",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
  });
  assert.equal(november.rows.length, 1);
  assert.equal(november.summary.completed, 1);
  assert.equal(november.summary.revenue, 60);

  const allTime = filterAndSummarizeClients(history, {
    periodPreset: "all",
  });
  assert.equal(allTime.rows.length, 1);
  assert.equal(allTime.summary.completed, 2);
  assert.equal(allTime.summary.revenue, 110);
});

test("clients page uses the approved compact metric panel and customer list", () => {
  const source = readFileSync(
    new URL("../app/painel/clientes/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /management-clients-metric-panel/);
  assert.match(source, /management-clients-period-filter/);
  assert.match(source, /management-client-row/);
  assert.doesNotMatch(source, /product-card product-stat/);
  assert.doesNotMatch(source, /management-client-facts/);
});
