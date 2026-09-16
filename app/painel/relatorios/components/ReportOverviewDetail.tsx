import { AppointmentReport, CustomerReport } from "../types";
import { overviewDrilldown } from "../results.mjs";

const statusLabel: Record<AppointmentReport["status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function OverviewDetail({
  detail,
  appointments,
  customers,
}: {
  detail: "revenue" | "cancelled" | "no-show" | "clients";
  appointments: AppointmentReport[];
  customers: CustomerReport[];
}) {
  const rows = detail === "clients" ? [] : (overviewDrilldown(detail, appointments) as AppointmentReport[]);
  const title =
    detail === "revenue"
      ? "Atendimentos que compõem o faturamento"
      : detail === "cancelled"
      ? "Cancelamentos no período"
      : detail === "no-show"
      ? "Não compareceram no período"
      : "Clientes no período";
  const description =
    detail === "revenue"
      ? "Somente atendimentos concluídos compõem o faturamento."
      : detail === "clients"
      ? "Clientes retornados pelo mesmo período e filtro profissional aplicados."
      : "Registros retornados pelo mesmo período e filtro profissional aplicados.";
  const count = detail === "clients" ? customers.length : rows.length;

  return (
    <section className="product-card management-report-drilldown-detail" aria-live="polite">
      <div className="product-section-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <b>{count} registros</b>
      </div>
      <div className="product-list">
        {detail === "clients"
          ? customers.map((item) => (
              <div className="product-row" key={item.customer_id}>
                <div className="product-row-main">
                  <div className="product-row-title">{item.customer_name}</div>
                  <div className="product-row-meta">
                    {item.completed_visits} atendimento{item.completed_visits === 1 ? "" : "s"} concluído
                    {item.completed_visits === 1 ? "" : "s"} · {money(item.period_revenue)}
                  </div>
                </div>
                <div className="product-row-meta">Último: {dateTime(item.last_completed)}</div>
              </div>
            ))
          : rows.map((item) => (
              <div className="product-row" key={item.appointment_id}>
                <div className="product-row-main">
                  <div className="product-row-title">{item.customer_name}</div>
                  <div className="product-row-meta">
                    {dateTime(item.starts_at)} · {item.service_name || "Serviço não informado"} ·{" "}
                    {item.professional_name || "Profissional não informado"}
                  </div>
                </div>
                <div>
                  <span className={`product-status ${item.status}`}>{statusLabel[item.status]}</span>
                  <div className="product-row-meta">{money(item.gross_amount)}</div>
                </div>
              </div>
            ))}
        {count === 0 && <div className="product-empty">Nenhum registro para este indicador no período.</div>}
      </div>
    </section>
  );
}
