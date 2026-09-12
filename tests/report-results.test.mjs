import assert from "node:assert/strict";
import test from "node:test";
import { commissionPaymentTransition, dailyChartWindow, nextOverviewDetail, overviewDrilldown, requireReportData, summarizeCommissions, validateReportPeriod } from "../app/painel/relatorios/results.mjs";

test("report period accepts 367 inclusive days and rejects 368", () => {
  assert.equal(validateReportPeriod("2025-01-01", "2026-01-02"), null);
  assert.equal(validateReportPeriod("2025-01-01", "2026-01-03"), "too-long");
});
test("invalid and reversed dates never reach a report query", () => {
  for (const [start, end] of [["", "2026-09-09"], ["bad", "bad"], ["2026-02-30", "2026-03-02"], ["2026-09-10", "2026-09-09"]]) {
    assert.equal(validateReportPeriod(start, end), "invalid");
  }
});
test("failed or missing report responses cannot become an empty successful report", () => {
  assert.throws(() => requireReportData({ error: { message: "denied" }, data: null }));
  assert.throws(() => requireReportData({ error: null, data: null }));
});
test("a successful zero result is preserved", () => {
  const data = { summary: { gross_revenue: 0 }, appointments: [] };
  assert.equal(requireReportData({ error: null, data }), data);
});

test("marking a commission as paid requires an explicit confirmation", () => {
  assert.deepEqual(commissionPaymentTransition("pending"), {
    nextStatus: "paid",
    confirmation: "Confirmar que este repasse foi pago?",
  });
  assert.deepEqual(commissionPaymentTransition("paid"), {
    nextStatus: "pending",
    confirmation: null,
  });
});

test("commission summary respects the selected professional rows and payment status", () => {
  assert.deepEqual(summarizeCommissions([
    { commission_amount: 22, payment_status: "pending" },
    { commission_amount: 18, payment_status: "paid" },
    { commission_amount: 10, payment_status: "pending" },
  ]), {
    count: 3,
    total: 50,
    pending: 32,
    paid: 18,
  });
});

test("overview drilldowns reuse the report rows and filter by the metric status", () => {
  const appointments = [
    { appointment_id: "completed", status: "completed" },
    { appointment_id: "cancelled", status: "cancelled" },
    { appointment_id: "no-show", status: "no_show" },
    { appointment_id: "scheduled", status: "scheduled" },
  ];

  assert.deepEqual(overviewDrilldown("revenue", appointments).map((item) => item.appointment_id), ["completed"]);
  assert.deepEqual(overviewDrilldown("cancelled", appointments).map((item) => item.appointment_id), ["cancelled"]);
  assert.deepEqual(overviewDrilldown("no-show", appointments).map((item) => item.appointment_id), ["no-show"]);
  assert.deepEqual(overviewDrilldown("appointments", appointments).map((item) => item.appointment_id), ["completed", "cancelled", "no-show", "scheduled"]);
});

test("overview detail action opens the requested detail and only closes that same detail", () => {
  assert.equal(nextOverviewDetail(null, "revenue"), "revenue");
  assert.equal(nextOverviewDetail("revenue", "cancelled"), "cancelled");
  assert.equal(nextOverviewDetail("cancelled", "cancelled"), null);
});

test("daily chart always covers the last seven calendar days of the applied period", () => {
  const window = dailyChartWindow([
    { date: "2026-09-03", revenue: 50 },
    { date: "2026-09-08", revenue: 80 },
  ], "2026-09-09");

  assert.equal(window.length, 7);
  assert.equal(window[0].date, "2026-09-03");
  assert.equal(window.at(-1).date, "2026-09-09");
  assert.equal(window.find((item) => item.date === "2026-09-04")?.revenue, 0);
  assert.equal(window.find((item) => item.date === "2026-09-08")?.revenue, 80);
});
