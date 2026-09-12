"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";
import ActionFeedback from "../ActionFeedback";
import { commissionPaymentTransition, dailyChartWindow, nextOverviewDetail, overviewDrilldown, requireReportData, summarizeCommissions, validateReportPeriod } from "./results.mjs";

type TabKey = "overview" | "appointments" | "team" | "services" | "clients" | "commissions";
type Role = "owner" | "manager";

type Summary = {
  total_appointments: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_show: number;
  gross_revenue: number;
  average_ticket: number;
  cancelled_value: number;
  no_show_value: number;
  booked_minutes: number;
  commission_total: number;
  commission_pending: number;
  commission_paid: number;
  net_after_commission: number;
  total_clients: number;
  new_clients: number;
  returning_clients: number;
  rebooked_clients: number;
  rebooking_rate_percent: number;
  cancellation_rate_percent: number;
  no_show_rate_percent: number;
};

type ProfessionalReport = {
  professional_id: string;
  professional_name: string;
  active: boolean;
  appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
  average_ticket: number;
  booked_minutes: number;
  available_minutes: number;
  occupancy_percent: number;
  commission_total: number;
  commission_pending: number;
  commission_paid: number;
};

type ServiceReport = {
  service_id: string | null;
  service_name: string;
  completed_services: number;
  revenue: number;
  average_price: number;
  service_minutes: number;
  revenue_share_percent: number;
};

type CustomerReport = {
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  completed_visits: number;
  period_revenue: number;
  first_appointment: string | null;
  last_completed: string | null;
  next_appointment: string | null;
  lifetime_completed_visits: number;
  lifetime_revenue: number;
  customer_type: "new" | "returning";
};

type AppointmentReport = {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  professional_id: string | null;
  professional_name: string | null;
  service_name: string | null;
  gross_amount: number;
  duration_minutes: number;
};

type DailyReport = {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
};

type ManagementReport = {
  period: { start_date: string; end_date: string; professional_id: string | null };
  summary: Summary;
  professionals: ProfessionalReport[];
  services: ServiceReport[];
  daily: DailyReport[];
  customers: CustomerReport[];
  appointments: AppointmentReport[];
};

type CommissionRow = {
  appointment_id: string;
  starts_at: string;
  professional_id: string | null;
  professional_name: string;
  services: string;
  gross_amount: number;
  commission_rate_percent: number;
  commission_amount: number;
  payment_status: "pending" | "paid";
  paid_at: string | null;
};

type FinancialReport = { commissions: CommissionRow[] };
type InactiveCustomerReport = {
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  last_completed: string;
  days_without_return: number;
  completed_visits: number;
  lifetime_revenue: number;
  service_types: string[];
};
type InactiveCustomerPayload = { customers: InactiveCustomerReport[] };
type ClientSegment = "period" | "inactive";

type ProfessionalOption = { id: string; name: string };
type ReportFilters = {
  startDate: string;
  endDate: string;
  professionalId: string;
};

type ShopState = { id: string; name: string; role: Role };

const zeroSummary: Summary = {
  total_appointments: 0,
  scheduled: 0,
  completed: 0,
  cancelled: 0,
  no_show: 0,
  gross_revenue: 0,
  average_ticket: 0,
  cancelled_value: 0,
  no_show_value: 0,
  booked_minutes: 0,
  commission_total: 0,
  commission_pending: 0,
  commission_paid: 0,
  net_after_commission: 0,
  total_clients: 0,
  new_clients: 0,
  returning_clients: 0,
  rebooked_clients: 0,
  rebooking_rate_percent: 0,
  cancellation_rate_percent: 0,
  no_show_rate_percent: 0,
};

const emptyReport: ManagementReport = {
  period: { start_date: "", end_date: "", professional_id: null },
  summary: zeroSummary,
  professionals: [],
  services: [],
  daily: [],
  customers: [],
  appointments: [],
};

const statusLabel: Record<AppointmentReport["status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

function dateInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekStart(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return shiftDate(today, -((weekday + 6) % 7));
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).format(new Date(`${value.slice(0, 10)}T12:00:00-03:00`));
}

function hours(minutes: number) {
  const h = Math.floor(Number(minutes || 0) / 60);
  const m = Number(minutes || 0) % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function whatsappLink(phone?: string | null, name?: string | null) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  const message = encodeURIComponent(`Olá${name ? `, ${name}` : ""}! Aqui é da barbearia. Estamos entrando em contato sobre seu atendimento.`);
  return `https://wa.me/${international}?text=${message}`;
}

export default function Relatorios() {
  const today = useMemo(() => dateInSaoPaulo(), []);
  const [shop, setShop] = useState<ShopState | null>(null);
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [professionalId, setProfessionalId] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
    professionalId: "",
  });
  const [professionalOptions, setProfessionalOptions] = useState<ProfessionalOption[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [report, setReport] = useState<ManagementReport>(emptyReport);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [inactiveCustomers, setInactiveCustomers] = useState<InactiveCustomerReport[]>([]);
  const [clientSegment, setClientSegment] = useState<ClientSegment>("period");
  const [commissionDetailsOpen, setCommissionDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportUnavailable, setReportUnavailable] = useState(false);
  const [commissionsUnavailable, setCommissionsUnavailable] = useState(false);
  const [inactiveCustomersUnavailable, setInactiveCustomersUnavailable] = useState(false);
  const [commissionFeedback, setCommissionFeedback] = useState("");
  const [commissionFeedbackTone, setCommissionFeedbackTone] = useState<"success" | "error">("success");
  const [pendingPayment, setPendingPayment] = useState<CommissionRow | null>(null);
  const [overviewDetail, setOverviewDetail] = useState<"revenue" | "cancelled" | "no-show" | "clients" | null>(null);
  const overviewDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overviewDetail) return;
    const animationFrame = window.requestAnimationFrame(() => {
      overviewDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [overviewDetail]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage("");
      setReportUnavailable(false);
      setCommissionsUnavailable(false);
      setInactiveCustomersUnavailable(false);
      try {
      const context = await getPanelContext(supabase);
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }
      if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }

      const [{ data: shopData }, { data: options }, managementResult, financialResult, inactiveCustomersResult] = await Promise.all([
        supabase.from("barbershops").select("id,name").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string }>(),
        supabase.from("professionals").select("id,name").eq("barbershop_id", context.barbershopId).order("name"),
        supabase.rpc("get_barbershop_management_report", {
          p_barbershop_id: context.barbershopId,
          p_start_date: appliedFilters.startDate,
          p_end_date: appliedFilters.endDate,
          p_professional_id: appliedFilters.professionalId || null,
        }),
        supabase.rpc("get_barbershop_financial_report", {
          p_barbershop_id: context.barbershopId,
          p_start_date: appliedFilters.startDate,
          p_end_date: appliedFilters.endDate,
        }),
        supabase.rpc("get_barbershop_inactive_customers", {
          p_barbershop_id: context.barbershopId,
          p_reference_date: dateInSaoPaulo(),
          p_professional_id: appliedFilters.professionalId || null,
        }),
      ]);

      if (!active) return;
      if (!shopData) throw new Error("shop_unavailable");
      setShop({ ...shopData, role: context.role as Role });
      setProfessionalOptions((options || []) as ProfessionalOption[]);

      setReport(requireReportData(managementResult) as ManagementReport);

      if (financialResult.error || !financialResult.data) {
        setCommissionsUnavailable(true);
      } else {
        const financial = (financialResult.data || { commissions: [] }) as FinancialReport;
        const filtered = appliedFilters.professionalId
          ? financial.commissions.filter(
              (row) => row.professional_id === appliedFilters.professionalId,
            )
          : financial.commissions;
        setCommissions(filtered);
      }
      if (inactiveCustomersResult.error || !inactiveCustomersResult.data) {
        setInactiveCustomersUnavailable(true);
        setInactiveCustomers([]);
      } else {
        const inactivePayload = inactiveCustomersResult.data as InactiveCustomerPayload;
        setInactiveCustomers(Array.isArray(inactivePayload.customers) ? inactivePayload.customers : []);
      }
      } catch {
        if (!active) return;
        setReportUnavailable(true);
        setMessage("Os resultados estão indisponíveis. Tente novamente.");
      }
      if (!active) return;
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [appliedFilters, refreshKey]);

  function applyPreset(preset: "today" | "week" | "month" | "30days") {
    if (preset === "today") { setStartDate(today); setEndDate(today); return; }
    if (preset === "week") { setStartDate(weekStart(today)); setEndDate(today); return; }
    if (preset === "30days") { setStartDate(shiftDate(today, -29)); setEndDate(today); return; }
    setStartDate(`${today.slice(0, 7)}-01`); setEndDate(today);
  }

  function applyFilters() {
    const periodError = validateReportPeriod(startDate, endDate);
    if (periodError === "invalid") {
      setMessage("Informe um período válido para consultar os resultados.");
      return;
    }
    if (periodError === "too-long") {
      setMessage("Não é possível consultar mais de 367 dias de uma vez.");
      return;
    }
    setMessage("");
    setAppliedFilters({ startDate, endDate, professionalId });
  }

  function openOverviewDetail(detail: "revenue" | "cancelled" | "no-show" | "clients" | "appointments" | "commissions") {
    if (detail === "appointments" || detail === "commissions") {
      setOverviewDetail(null);
      setTab(detail);
      return;
    }
    setOverviewDetail((current) => nextOverviewDetail(current, detail));
  }

  async function togglePayment(row: CommissionRow) {
    const transition = commissionPaymentTransition(row.payment_status);
    if (transition.confirmation) {
      setPendingPayment(row);
      setCommissionFeedback("");
      return;
    }
    await savePayment(row, transition.nextStatus as "paid" | "pending");
  }

  async function savePayment(row: CommissionRow, nextStatus: "paid" | "pending") {
    setSavingId(row.appointment_id);
    setCommissionFeedback("");
    const { error } = await supabase.rpc("set_appointment_commission_payment_status", {
      p_appointment_id: row.appointment_id,
      p_payment_status: nextStatus,
    });
    setSavingId(null);
    if (error) {
      setCommissionFeedbackTone("error");
      setCommissionFeedback("Não foi possível atualizar o repasse. Tente novamente.");
      return;
    }
    setCommissionFeedbackTone("success");
    setCommissionFeedback(nextStatus === "paid" ? "Repasse marcado como pago." : "Repasse voltou a pendente.");
    setRefreshKey((value) => value + 1);
  }

  function exportCurrentTab() {
    const stamp = `${appliedFilters.startDate}_${appliedFilters.endDate}`;
    if (tab === "appointments") {
      downloadCsv(`agendamentos_${stamp}.csv`, ["Data", "Status", "Cliente", "WhatsApp", "Serviço", "Profissional", "Valor", "Duração (min)"], report.appointments.map((item) => [dateTime(item.starts_at), statusLabel[item.status], item.customer_name, item.customer_phone, item.service_name, item.professional_name, Number(item.gross_amount).toFixed(2), item.duration_minutes]));
      return;
    }
    if (tab === "team") {
      downloadCsv(`profissionais_${stamp}.csv`, ["Profissional", "Agendamentos", "Concluídos", "Cancelados", "No-show", "Faturamento", "Ticket médio", "Ocupação (%)", "Comissão", "Pendente", "Paga"], report.professionals.map((item) => [item.professional_name, item.appointments, item.completed, item.cancelled, item.no_show, Number(item.revenue).toFixed(2), Number(item.average_ticket).toFixed(2), item.occupancy_percent, Number(item.commission_total).toFixed(2), Number(item.commission_pending).toFixed(2), Number(item.commission_paid).toFixed(2)]));
      return;
    }
    if (tab === "services") {
      downloadCsv(`servicos_${stamp}.csv`, ["Serviço", "Realizados", "Receita", "Preço médio", "Participação da receita (%)", "Minutos executados"], report.services.map((item) => [item.service_name, item.completed_services, Number(item.revenue).toFixed(2), Number(item.average_price).toFixed(2), item.revenue_share_percent, item.service_minutes]));
      return;
    }
    if (tab === "clients") {
      if (clientSegment === "inactive") {
        downloadCsv(`clientes-sem-retorno_${stamp}.csv`, ["Cliente", "E-mail", "WhatsApp", "Última visita", "Dias sem retorno", "Atendimentos concluídos", "Valor histórico", "Tipos de atendimento"], inactiveCustomers.map((item) => [item.customer_name, item.customer_email || "", item.customer_phone, dateTime(item.last_completed), item.days_without_return, item.completed_visits, Number(item.lifetime_revenue).toFixed(2), item.service_types.join(" · ")]));
        return;
      }
      downloadCsv(`clientes_${stamp}.csv`, ["Cliente", "Tipo", "E-mail", "WhatsApp", "Visitas no período", "Receita no período", "Primeira visita", "Última visita", "Próximo agendamento", "Visitas totais", "Receita total"], report.customers.map((item) => [item.customer_name, item.customer_type === "new" ? "Novo" : "Recorrente", item.customer_email || "", item.customer_phone, item.completed_visits, Number(item.period_revenue).toFixed(2), dateTime(item.first_appointment), dateTime(item.last_completed), dateTime(item.next_appointment), item.lifetime_completed_visits, Number(item.lifetime_revenue).toFixed(2)]));
      return;
    }
    if (tab === "commissions") {
      downloadCsv(`comissoes_${stamp}.csv`, ["Data", "Profissional", "Serviços", "Venda", "Taxa (%)", "Comissão", "Repasse", "Pago em"], commissions.map((item) => [dateTime(item.starts_at), item.professional_name, item.services, Number(item.gross_amount).toFixed(2), item.commission_rate_percent, Number(item.commission_amount).toFixed(2), item.payment_status === "paid" ? "Pago" : "Pendente", dateTime(item.paid_at)]));
      return;
    }
    downloadCsv(`resumo_${stamp}.csv`, ["Indicador", "Valor"], [
      ["Agendamentos", report.summary.total_appointments],
      ["Concluídos", report.summary.completed],
      ["Receita bruta", Number(report.summary.gross_revenue).toFixed(2)],
      ["Ticket médio", Number(report.summary.average_ticket).toFixed(2)],
      ["Comissões", Number(report.summary.commission_total).toFixed(2)],
      ["Receita após comissão", Number(report.summary.net_after_commission).toFixed(2)],
      ["Cancelamentos", report.summary.cancelled],
      ["No-show", report.summary.no_show],
      ["Clientes novos", report.summary.new_clients],
      ["Clientes recorrentes", report.summary.returning_clients],
      ["Taxa de reagendamento", report.summary.rebooking_rate_percent],
    ]);
  }

  if (!shop) {
    return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><div><p className="product-message" role="status">{loading ? "Carregando indicadores reais..." : message}</p>{!loading && <button type="button" className="product-button management-report-apply" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button>}</div></main>;
  }

  const unavailable = reportUnavailable || (tab === "commissions" && commissionsUnavailable) || (tab === "clients" && clientSegment === "inactive" && inactiveCustomersUnavailable);
  const filtersPending = startDate !== appliedFilters.startDate || endDate !== appliedFilters.endDate || professionalId !== appliedFilters.professionalId;
  const chartDaily = dailyChartWindow(report.daily, appliedFilters.endDate);
  const maxDailyRevenue = Math.max(1, ...chartDaily.map((item) => Number(item.revenue || 0)));
  const summary = report.summary || zeroSummary;
  const commissionSummary = summarizeCommissions(commissions);

  return (
    <PanelShell role={shop.role} active="reports" shopName={shop.name} barbershopId={shop.id}>
      <div className="product-content management-reports-page">
        <div className="product-page-head management-reports-head">
          <div>
            <h1 className="product-title">Relatórios</h1>
            <p className="product-subtitle">Acompanhe agenda, faturamento, clientes, serviços, ocupação da equipe e comissões com dados reais do período selecionado.</p>
          </div>
        </div>

        <section className="product-card product-filters management-report-filters" aria-label="Filtros dos relatórios">
          <div className="product-chip-row management-report-presets">
            <button className="product-chip" type="button" onClick={() => applyPreset("today")}>Hoje</button>
            <button className="product-chip" type="button" onClick={() => applyPreset("week")}>Esta semana</button>
            <button className="product-chip" type="button" onClick={() => applyPreset("month")}>Este mês</button>
            <button className="product-chip" type="button" onClick={() => applyPreset("30days")}>Últimos<br />30 dias</button>
          </div>
          <div className="product-field"><label>De</label><input className="product-input" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div className="product-field"><label>Até</label><input className="product-input" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></div>
          <div className="product-field management-report-professional"><label>Profissional</label><select className="product-select" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}><option value="">Todos</option>{professionalOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <button className="product-button management-report-apply" type="button" disabled={loading} onClick={applyFilters}>{loading ? "Atualizando..." : "Atualizar resultados"}</button>
          <p className="management-report-filter-note" role="status">{filtersPending ? "Filtros alterados. Clique em Atualizar resultados para consultar e exportar esse período." : `Período aplicado: ${shortDate(appliedFilters.startDate)} a ${shortDate(appliedFilters.endDate)}.`}</p>
        </section>

        {message && <p className="product-message error management-report-feedback" role="status">{message}</p>}

        <div className="product-chip-row management-report-tabs" aria-label="Visões do relatório">
          {([
            ["overview", "Visão geral"], ["appointments", "Agendamentos"], ["team", "Equipe"], ["services", "Serviços"], ["clients", "Clientes"], ["commissions", "Comissões"],
          ] as [TabKey, string][]).map(([key, label]) => <button key={key} type="button" className="product-chip" data-active={tab === key ? "true" : "false"} onClick={() => setTab(key)}>{label}</button>)}
        </div>

        {loading ? <p className="product-message" role="status">Carregando resultados do período...</p> : unavailable ? <div className="product-card pad"><p role="alert">{tab === "commissions" && commissionsUnavailable ? "As comissões estão indisponíveis." : "Os resultados estão indisponíveis."}</p><button type="button" className="product-button management-report-apply" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button></div> : <>
        {tab === "overview" && <>
          <div className="product-grid cols-4 management-report-summary">
            <Metric label="Faturamento" value={money(summary.gross_revenue)} detail={`${summary.completed} atendimentos concluídos`} onClick={() => openOverviewDetail("revenue")} expanded={overviewDetail === "revenue"} />
            <Metric label="Ticket médio" value={money(summary.average_ticket)} detail="por atendimento concluído" />
            <Metric label="Comissões" value={money(summary.commission_total)} detail={`${money(summary.commission_pending)} pendente`} onClick={() => openOverviewDetail("commissions")} />
            <Metric label="Após comissões" value={money(summary.net_after_commission)} detail="receita bruta menos comissão" />
            <Metric label="Agendamentos" value={String(summary.total_appointments)} detail={`${summary.scheduled} agendados`} onClick={() => openOverviewDetail("appointments")} />
            <Metric label="Cancelamentos" value={percent(summary.cancellation_rate_percent)} detail={`${summary.cancelled} cancelados · potencial ${money(summary.cancelled_value)}`} onClick={() => openOverviewDetail("cancelled")} expanded={overviewDetail === "cancelled"} />
            <Metric label="Não compareceu" value={percent(summary.no_show_rate_percent)} detail={`${summary.no_show} no-show · potencial ${money(summary.no_show_value)}`} onClick={() => openOverviewDetail("no-show")} expanded={overviewDetail === "no-show"} />
            <Metric label="Clientes" value={String(summary.total_clients)} detail={`${summary.new_clients} novos · ${summary.returning_clients} recorrentes`} onClick={() => openOverviewDetail("clients")} expanded={overviewDetail === "clients"} />
          </div>

          <div ref={overviewDetailRef}>{overviewDetail && <OverviewDetail detail={overviewDetail} appointments={report.appointments} customers={report.customers} />}</div>

          <section className="product-section product-grid cols-2">
            <div className="product-card pad">
              <div className="product-section-head"><div><h2>Faturamento no período</h2><p>Últimos sete dias do período aplicado.</p></div></div>
              <div className="management-report-chart">{chartDaily.map((item) => <div className="management-report-chart-column" key={item.date} title={`${shortDate(item.date)} · ${money(item.revenue)}`}><div className="management-report-chart-bar" style={{ height: `${Math.max(4, (Number(item.revenue) / maxDailyRevenue) * 150)}px` }} /><small>{shortDate(item.date).replace(" de ", "/")}</small></div>)}</div>
            </div>
            <div className="product-card pad">
              <div className="product-section-head"><div><h2>Clientes e recorrência</h2><p>Base ativa no período selecionado.</p></div></div>
              <div className="product-grid cols-2" style={{ marginTop: 16 }}>
                <Metric compact label="Novos" value={String(summary.new_clients)} detail="primeira visita no período" />
                <Metric compact label="Recorrentes" value={String(summary.returning_clients)} detail="já atendidos antes" />
                <Metric compact label="Reagendaram" value={String(summary.rebooked_clients)} detail="já têm próxima reserva" />
                <Metric compact label="Taxa de retorno" value={percent(summary.rebooking_rate_percent)} detail="clientes com próxima reserva" />
                <Metric compact label="Sem retorno +45 dias" value={inactiveCustomersUnavailable ? "—" : String(inactiveCustomers.length)} detail={inactiveCustomersUnavailable ? "indisponível no momento" : "clientes sem reserva futura"} onClick={() => { setClientSegment("inactive"); setTab("clients"); }} actionLabel="Ver clientes" />
              </div>
            </div>
          </section>

          <section className="product-section product-grid cols-2">
            <div className="product-card pad">
              <div className="product-section-head"><div><h2>Equipe em destaque</h2><p>Faturamento e ocupação da agenda.</p></div></div>
              <div className="product-list">{report.professionals.slice(0, 5).map((item) => <div className="product-row" key={item.professional_id}><div className="product-row-main"><div className="product-row-title">{item.professional_name}</div><div className="product-row-meta">{item.completed} concluídos · {money(item.revenue)} · ticket {money(item.average_ticket)}</div></div><div style={{ width: 150 }}><div className="product-mini-bar"><div><span style={{ width: `${Math.min(100, Number(item.occupancy_percent || 0))}%` }} /></div><b>{percent(item.occupancy_percent)}</b></div></div></div>)}{!report.professionals.length && <div className="product-empty">Cadastre profissionais para acompanhar desempenho.</div>}</div>
            </div>
            <div className="product-card pad">
              <div className="product-section-head"><div><h2>Serviços mais fortes</h2><p>Participação no faturamento concluído.</p></div></div>
              <div className="product-list">{report.services.slice(0, 5).map((item) => <div className="product-row" key={`${item.service_id}-${item.service_name}`}><div className="product-row-main"><div className="product-row-title">{item.service_name}</div><div className="product-row-meta">{item.completed_services} realizados · {money(item.revenue)}</div></div><div style={{ width: 150 }}><div className="product-mini-bar"><div><span style={{ width: `${Math.min(100, Number(item.revenue_share_percent || 0))}%` }} /></div><b>{percent(item.revenue_share_percent)}</b></div></div></div>)}{!report.services.length && <div className="product-empty">Os serviços aparecerão aqui quando houver atendimentos concluídos.</div>}</div>
            </div>
          </section>
        </>}

        {tab === "appointments" && <section className="product-card">
          <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Agendamentos do período</h2><p>Lista completa com status, valor e contato do cliente.</p></div><b>{report.appointments.length} registros</b></div>
          <div className="product-table-wrap"><table className="product-table" data-report-table="appointments"><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Valor</th><th>Contato</th></tr></thead><tbody>{report.appointments.map((item) => { const wa = whatsappLink(item.customer_phone, item.customer_name); return <tr key={item.appointment_id}><td data-label="Data">{dateTime(item.starts_at)}</td><td data-label="Cliente"><b>{item.customer_name}</b><br /><small>{item.customer_phone}</small></td><td data-label="Serviço">{item.service_name || "—"}<br /><small>{item.duration_minutes} min</small></td><td data-label="Profissional">{item.professional_name || "—"}</td><td data-label="Status"><span className={`product-status ${item.status}`}>{statusLabel[item.status]}</span></td><td data-label="Valor">{money(item.gross_amount)}</td><td data-label="Contato">{wa ? <a className="product-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a> : "—"}</td></tr>; })}{!report.appointments.length && <tr><td colSpan={7}><div className="product-empty">Nenhum agendamento no período.</div></td></tr>}</tbody></table></div>
        </section>}

        {tab === "team" && <section className="product-card">
          <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Desempenho da equipe</h2><p>Produção, ticket, ocupação e comissão por profissional.</p></div></div>
          <div className="product-table-wrap"><table className="product-table" data-report-table="team"><thead><tr><th>Profissional</th><th>Agenda</th><th>Receita</th><th>Ticket</th><th>Ocupação</th><th>Cancel./No-show</th><th>Comissão</th></tr></thead><tbody>{report.professionals.map((item) => <tr key={item.professional_id}><td data-label="Profissional"><b>{item.professional_name}</b><br /><small>{item.active ? "Ativo" : "Inativo"}</small></td><td data-label="Agenda">{item.completed} concluídos<br /><small>{item.appointments} total</small></td><td data-label="Receita"><b>{money(item.revenue)}</b></td><td data-label="Ticket">{money(item.average_ticket)}</td><td data-label="Ocupação"><b>{percent(item.occupancy_percent)}</b><br /><small>{hours(item.booked_minutes)} reservadas / {hours(item.available_minutes)} disponíveis</small></td><td data-label="Cancelamentos / faltas">{item.cancelled} / {item.no_show}</td><td data-label="Comissão">{money(item.commission_total)}<br /><small>{money(item.commission_pending)} pendente</small></td></tr>)}{!report.professionals.length && <tr><td colSpan={7}><div className="product-empty">Nenhum profissional encontrado.</div></td></tr>}</tbody></table></div>
        </section>}

        {tab === "services" && <section className="product-card">
          <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Desempenho dos serviços</h2><p>Volume, receita e participação no faturamento.</p></div></div>
          <div className="product-table-wrap"><table className="product-table" data-report-table="services"><thead><tr><th>Serviço</th><th>Realizados</th><th>Receita</th><th>Preço médio</th><th>Participação</th><th>Tempo executado</th></tr></thead><tbody>{report.services.map((item) => <tr key={`${item.service_id}-${item.service_name}`}><td data-label="Serviço"><b>{item.service_name}</b></td><td data-label="Realizados">{item.completed_services}</td><td data-label="Receita"><b>{money(item.revenue)}</b></td><td data-label="Preço médio">{money(item.average_price)}</td><td data-label="Participação"><div className="product-mini-bar"><div><span style={{ width: `${Math.min(100, Number(item.revenue_share_percent || 0))}%` }} /></div><b>{percent(item.revenue_share_percent)}</b></div></td><td data-label="Tempo executado">{hours(item.service_minutes)}</td></tr>)}{!report.services.length && <tr><td colSpan={6}><div className="product-empty">Nenhum serviço concluído no período.</div></td></tr>}</tbody></table></div>
        </section>}

        {tab === "clients" && <section className="product-card">
          <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Clientes e relacionamento</h2><p>{clientSegment === "period" ? "Novos, recorrentes, frequência, valor e próximo agendamento." : "Sem atendimento concluído há mais de 45 dias e sem reserva futura ativa."}</p></div></div>
          <div className="product-chip-row management-report-client-segments" aria-label="Segmentos de clientes"><button type="button" className="product-chip" data-active={clientSegment === "period" ? "true" : "false"} onClick={() => setClientSegment("period")}>Clientes no período</button><button type="button" className="product-chip" data-active={clientSegment === "inactive" ? "true" : "false"} onClick={() => setClientSegment("inactive")}>Sem retorno +45 dias</button></div>
          {clientSegment === "period" ? <div className="product-table-wrap"><table className="product-table" data-report-table="clients"><thead><tr><th>Cliente</th><th>Perfil</th><th>Visitas</th><th>Receita período</th><th>Histórico</th><th>Próxima reserva</th><th>Contato</th></tr></thead><tbody>{report.customers.map((item) => { const wa = whatsappLink(item.customer_phone, item.customer_name); return <tr key={item.customer_id}><td data-label="Cliente"><b>{item.customer_name}</b><br /><small>{item.customer_email || "Sem e-mail"}</small></td><td data-label="Perfil"><span className="product-status completed">{item.customer_type === "new" ? "Novo" : "Recorrente"}</span></td><td data-label="Visitas">{item.completed_visits} no período<br /><small>{item.lifetime_completed_visits} concluídas no total</small></td><td data-label="Receita no período"><b>{money(item.period_revenue)}</b><br /><small>{money(item.lifetime_revenue)} histórico</small></td><td data-label="Histórico"><small>1ª {dateTime(item.first_appointment)}<br />Última {dateTime(item.last_completed)}</small></td><td data-label="Próxima reserva">{dateTime(item.next_appointment)}</td><td data-label="Contato">{wa ? <a className="product-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a> : item.customer_phone}</td></tr>; })}{!report.customers.length && <tr><td colSpan={7}><div className="product-empty">Nenhum cliente com atividade no período.</div></td></tr>}</tbody></table></div> : <div className="product-table-wrap"><table className="product-table" data-report-table="inactive-customers"><thead><tr><th>Cliente</th><th>Última visita</th><th>Sem retorno</th><th>Histórico</th><th>Tipos de atendimento</th><th>Contato</th></tr></thead><tbody>{inactiveCustomers.map((item) => { const wa = whatsappLink(item.customer_phone, item.customer_name); return <tr key={item.customer_id}><td data-label="Cliente"><b>{item.customer_name}</b><br /><small>{item.customer_email || "Sem e-mail"}</small></td><td data-label="Última visita">{dateTime(item.last_completed)}</td><td data-label="Sem retorno"><b>{item.days_without_return} dias</b></td><td data-label="Histórico">{item.completed_visits} concluídos<br /><small>{money(item.lifetime_revenue)} no total</small></td><td data-label="Tipos de atendimento">{item.service_types.join(" · ") || "Não informado"}</td><td data-label="Contato">{wa ? <a className="product-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a> : item.customer_phone}</td></tr>; })}{!inactiveCustomers.length && <tr><td colSpan={6}><div className="product-empty">Nenhum cliente sem retorno há mais de 45 dias neste recorte.</div></td></tr>}</tbody></table></div>}
        </section>}

        {tab === "commissions" && <section className="product-card">
          <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Comissões e repasses</h2><p>{appliedFilters.professionalId ? `Resumo de ${professionalOptions.find((item) => item.id === appliedFilters.professionalId)?.name || "profissional selecionado"}.` : "Resumo consolidado de todos os profissionais."}</p></div></div>
          <div className="product-grid cols-4 management-report-commission-summary"><Metric compact label="Comissões" value={money(commissionSummary.total)} detail={`${commissionSummary.count} atendimentos`} /><Metric compact label="Pendentes" value={money(commissionSummary.pending)} detail="aguardam pagamento" /><Metric compact label="Pagas" value={money(commissionSummary.paid)} detail="repasses concluídos" /><Metric compact label="Profissional" value={appliedFilters.professionalId ? "1" : String(new Set(commissions.map((item) => item.professional_id)).size)} detail={appliedFilters.professionalId ? "filtro aplicado" : "com lançamento"} /></div>
          <button type="button" className="management-report-drilldown-action management-report-commission-detail-action" aria-expanded={commissionDetailsOpen} onClick={() => setCommissionDetailsOpen((open) => !open)}>{commissionDetailsOpen ? "Ocultar detalhes" : "Ver detalhes"}</button>
          {pendingPayment && <div className="management-report-payment-confirmation"><p>Confirmar que o repasse de <strong>{money(pendingPayment.commission_amount)}</strong> para {pendingPayment.professional_name} foi pago?</p><div><button type="button" className="product-button secondary" onClick={() => setPendingPayment(null)}>Cancelar</button><button type="button" className="product-button management-report-apply" disabled={savingId === pendingPayment.appointment_id} onClick={() => { const row = pendingPayment; setPendingPayment(null); void savePayment(row, "paid"); }}>Confirmar pagamento</button></div></div>}
          {commissionDetailsOpen && <div className="product-table-wrap"><table className="product-table" data-report-table="commissions"><thead><tr><th>Data</th><th>Profissional</th><th>Serviços</th><th>Venda</th><th>Taxa</th><th>Comissão</th><th>Repasse</th><th>Ação</th></tr></thead><tbody>{commissions.map((row) => <tr key={row.appointment_id}><td data-label="Data">{dateTime(row.starts_at)}</td><td data-label="Profissional"><b>{row.professional_name}</b></td><td data-label="Serviços">{row.services}</td><td data-label="Venda">{money(row.gross_amount)}</td><td data-label="Taxa">{percent(row.commission_rate_percent)}</td><td data-label="Comissão"><b>{money(row.commission_amount)}</b></td><td data-label="Repasse"><span className={`product-status ${row.payment_status === "paid" ? "completed" : "confirmed"}`}>{row.payment_status === "paid" ? "Pago" : "Pendente"}</span>{row.paid_at && <><br /><small>{dateTime(row.paid_at)}</small></>}</td><td data-label="Ação"><button type="button" className={`product-button ${row.payment_status === "paid" ? "secondary" : "management-report-apply"}`} disabled={savingId === row.appointment_id} onClick={() => void togglePayment(row)}>{savingId === row.appointment_id ? "Salvando..." : row.payment_status === "paid" ? "Voltar a pendente" : "Marcar pago"}</button></td></tr>)}{!commissions.length && <tr><td colSpan={8}><div className="product-empty">Nenhuma comissão gerada neste período.</div></td></tr>}</tbody></table></div>}
          <div className="management-report-payment-feedback"><ActionFeedback message={commissionFeedback} tone={commissionFeedbackTone} /></div>
        </section>}

        <div className="management-report-export-area"><button className="product-button management-report-export" type="button" disabled={loading || unavailable || filtersPending} onClick={exportCurrentTab}>Exportar CSV</button><p>O arquivo respeita a visão, o período e o profissional aplicados.</p></div>
        </>}
      </div>
    </PanelShell>
  );
}

function Metric({ label, value, detail, compact = false, onClick, expanded = false, actionLabel = "Ver detalhes" }: { label: string; value: string; detail: string; compact?: boolean; onClick?: () => void; expanded?: boolean; actionLabel?: string }) {
  return <div className={`product-card product-stat ${compact ? "soft" : ""}`} style={compact ? { minHeight: 105, padding: 16 } : undefined}><small>{label}</small><strong style={compact ? { fontSize: 26, marginTop: 10 } : undefined}>{value}</strong><span>{detail}</span>{onClick && <button className="management-report-drilldown-action" type="button" aria-expanded={expanded} onClick={onClick}>{expanded ? "Ocultar detalhes" : actionLabel}</button>}</div>;
}

function OverviewDetail({ detail, appointments, customers }: { detail: "revenue" | "cancelled" | "no-show" | "clients"; appointments: AppointmentReport[]; customers: CustomerReport[] }) {
  const rows = detail === "clients" ? [] : overviewDrilldown(detail, appointments) as AppointmentReport[];
  const title = detail === "revenue" ? "Atendimentos que compõem o faturamento" : detail === "cancelled" ? "Cancelamentos no período" : detail === "no-show" ? "Não compareceram no período" : "Clientes no período";
  const description = detail === "revenue" ? "Somente atendimentos concluídos compõem o faturamento." : detail === "clients" ? "Clientes retornados pelo mesmo período e filtro profissional aplicados." : "Registros retornados pelo mesmo período e filtro profissional aplicados.";
  const count = detail === "clients" ? customers.length : rows.length;
  return <section className="product-card management-report-drilldown-detail" aria-live="polite"><div className="product-section-head"><div><h2>{title}</h2><p>{description}</p></div><b>{count} registros</b></div><div className="product-list">{detail === "clients" ? customers.map((item) => <div className="product-row" key={item.customer_id}><div className="product-row-main"><div className="product-row-title">{item.customer_name}</div><div className="product-row-meta">{item.completed_visits} atendimento{item.completed_visits === 1 ? "" : "s"} concluído{item.completed_visits === 1 ? "" : "s"} · {money(item.period_revenue)}</div></div><div className="product-row-meta">Último: {dateTime(item.last_completed)}</div></div>) : rows.map((item) => <div className="product-row" key={item.appointment_id}><div className="product-row-main"><div className="product-row-title">{item.customer_name}</div><div className="product-row-meta">{dateTime(item.starts_at)} · {item.service_name || "Serviço não informado"} · {item.professional_name || "Profissional não informado"}</div></div><div><span className={`product-status ${item.status}`}>{statusLabel[item.status]}</span><div className="product-row-meta">{money(item.gross_amount)}</div></div></div>)}{count === 0 && <div className="product-empty">Nenhum registro para este indicador no período.</div>}</div></section>;
}
