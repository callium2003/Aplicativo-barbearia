export function validateReportPeriod(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return "invalid";
  const start = Date.parse(`${startDate}T12:00:00Z`);
  const end = Date.parse(`${endDate}T12:00:00Z`);
  if (![start, end].every(Number.isFinite)
    || new Date(start).toISOString().slice(0, 10) !== startDate
    || new Date(end).toISOString().slice(0, 10) !== endDate) return "invalid";
  return (end - start) / 86_400_000 > 366 ? "too-long" : null;
}

export function requireReportData(result) {
  if (result.error || !result.data) throw new Error("report_unavailable");
  return result.data;
}

export function commissionPaymentTransition(currentStatus) {
  if (currentStatus === "paid") return { nextStatus: "pending", confirmation: null };
  return { nextStatus: "paid", confirmation: "Confirmar que este repasse foi pago?" };
}

export function summarizeCommissions(commissions) {
  return commissions.reduce((summary, commission) => {
    const amount = Number(commission.commission_amount) || 0;
    summary.count += 1;
    summary.total += amount;
    if (commission.payment_status === "paid") summary.paid += amount;
    else summary.pending += amount;
    return summary;
  }, { count: 0, total: 0, pending: 0, paid: 0 });
}

export function overviewDrilldown(metric, appointments) {
  if (metric === "revenue") return appointments.filter((item) => item.status === "completed");
  if (metric === "cancelled") return appointments.filter((item) => item.status === "cancelled");
  if (metric === "no-show") return appointments.filter((item) => item.status === "no_show");
  return appointments;
}

export function nextOverviewDetail(currentDetail, requestedDetail) {
  return currentDetail === requestedDetail ? null : requestedDetail;
}

export function dailyChartWindow(daily, endDate) {
  const byDate = new Map(daily.map((item) => [item.date, item]));
  const end = new Date(`${endDate}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return byDate.get(key) || { date: key, appointments: 0, completed: 0, cancelled: 0, no_show: 0, revenue: 0 };
  });
}
