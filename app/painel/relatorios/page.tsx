"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPanelContext } from "@/utils/panel-context";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

type PeriodKey = "today" | "week" | "month";

type ReportSummary = {
  completed_appointments: number;
  gross_revenue: number;
  average_ticket: number;
  commission_total: number;
  commission_pending: number;
  commission_paid: number;
  net_revenue: number;
  cancelled_appointments: number;
  no_show_appointments: number;
};

type ProfessionalReport = {
  professional_id: string | null;
  professional_name: string;
  completed_appointments: number;
  gross_revenue: number;
  commission_total: number;
  net_revenue: number;
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

type FinancialReport = {
  period: { start_date: string; end_date: string };
  summary: ReportSummary;
  professionals: ProfessionalReport[];
  commissions: CommissionRow[];
};

const emptyReport: FinancialReport = {
  period: { start_date: "", end_date: "" },
  summary: {
    completed_appointments: 0,
    gross_revenue: 0,
    average_ticket: 0,
    commission_total: 0,
    commission_pending: 0,
    commission_paid: 0,
    net_revenue: 0,
    cancelled_appointments: 0,
    no_show_appointments: 0,
  },
  professionals: [],
  commissions: [],
};

const nav = <nav style={{ background: "#2a211c", padding: "12px 8vw", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}><Link href="/painel" style={{ color: "#d7ccc0", textDecoration: "none" }}>Dados cadastrais</Link><Link href="/painel/clientes" style={{ color: "#d7ccc0", textDecoration: "none" }}>Clientes</Link><Link href="/painel/agenda" style={{ color: "#d7ccc0", textDecoration: "none" }}>Agenda</Link><Link href="/painel/relatorios" style={{ color: "#fff", fontWeight: 700, textDecoration: "none" }}>Relatórios</Link></nav>;

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
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function periodRange(period: PeriodKey) {
  const today = dateInSaoPaulo();
  if (period === "today") return { start: today, end: today, label: "Hoje" };
  if (period === "month") return { start: `${today.slice(0, 7)}-01`, end: today, label: "Este mês" };

  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return { start: shiftDate(today, -daysSinceMonday), end: today, label: "Esta semana" };
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Relatorios() {
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [report, setReport] = useState<FinancialReport>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      const context = await getPanelContext(supabase);
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }
      if (!context.barbershopId) { window.location.replace("/painel/inicio"); return; }

      const range = periodRange(period);
      const { data, error } = await supabase.rpc("get_barbershop_financial_report", {
        p_barbershop_id: context.barbershopId,
        p_start_date: range.start,
        p_end_date: range.end,
      });

      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message || "Não foi possível carregar os relatórios.");
        setReport(emptyReport);
      } else {
        setReport((data ?? emptyReport) as FinancialReport);
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  async function togglePayment(row: CommissionRow) {
    setSavingId(row.appointment_id);
    setErrorMessage("");
    const nextStatus = row.payment_status === "paid" ? "pending" : "paid";
    const { error } = await supabase.rpc("set_appointment_commission_payment_status", {
      p_appointment_id: row.appointment_id,
      p_payment_status: nextStatus,
    });
    setSavingId(null);
    if (error) {
      setErrorMessage(error.message || "Não foi possível atualizar o repasse.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }

  const range = periodRange(period);
  const summary = report.summary ?? emptyReport.summary;

  if (loading) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f2ed", fontFamily: "Arial, sans-serif" }}>Carregando resultados reais...</main>;
  }

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#171310", color: "white", padding: "19px 8vw" }}><Link href="/painel" style={{ color: "white", textDecoration: "none", fontWeight: 800 }}>BARBEARIA<span style={{ color: "#e99358" }}>SP</span></Link></header>
    {nav}
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "42px 24px" }}>
      <p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.5 }}>RESULTADOS REAIS</p>
      <h1 style={{ font: "bold clamp(34px,5vw,58px)/.95 Georgia,serif", margin: "0 0 12px" }}>Relatórios.</h1>
      <p style={{ color: "#6d6257" }}>Receita de atendimentos concluídos, ticket médio e comissões calculadas com a porcentagem vigente no momento da conclusão.</p>

      <label style={{ display: "inline-grid", gap: 6, margin: "20px 0" }}>
        <b style={{ fontSize: 13 }}>Período</b>
        <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodKey)} style={{ padding: 12, border: "1px solid #d9d0c8", borderRadius: 5, minWidth: 190 }}>
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mês</option>
        </select>
      </label>
      <p style={{ color: "#7a6e63", fontSize: 13, marginTop: -10 }}>De {range.start.split("-").reverse().join("/")} até {range.end.split("-").reverse().join("/")}.</p>

      {errorMessage && <div style={{ background: "#fff0ed", border: "1px solid #edb9ac", color: "#8d2b16", padding: 14, borderRadius: 7, margin: "18px 0" }}>{errorMessage}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, margin: "22px 0" }}>
        <Metric label="ATENDIMENTOS CONCLUÍDOS" value={String(summary.completed_appointments)} />
        <Metric label="RECEITA BRUTA" value={money(summary.gross_revenue)} />
        <Metric label="TICKET MÉDIO" value={money(summary.average_ticket)} />
        <Metric label="COMISSÕES" value={money(summary.commission_total)} />
        <Metric label="COMISSÕES PENDENTES" value={money(summary.commission_pending)} />
        <Metric label="RECEITA APÓS COMISSÕES" value={money(summary.net_revenue)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "#6d6257", fontSize: 14, marginBottom: 22 }}>
        <span>Cancelamentos no período: <b>{summary.cancelled_appointments}</b></span>
        <span>Não comparecimentos: <b>{summary.no_show_appointments}</b></span>
        <span>Comissões já pagas: <b>{money(summary.commission_paid)}</b></span>
      </div>

      <section style={{ background: "white", padding: 22, borderRadius: 9, border: "1px solid #e5ddd5", marginBottom: 22 }}>
        <h2 style={{ fontFamily: "Georgia,serif", marginTop: 0 }}>Por profissional</h2>
        {report.professionals.length === 0 ? <p style={{ color: "#756a60" }}>Ainda não há atendimentos concluídos neste período.</p> : report.professionals.map((item) => <div key={`${item.professional_id ?? "removed"}-${item.professional_name}`} style={{ display: "grid", gridTemplateColumns: "minmax(160px,1.5fr) repeat(4,minmax(110px,1fr))", gap: 12, padding: "15px 0", borderBottom: "1px solid #eee", alignItems: "center", overflowX: "auto" }}>
          <b>{item.professional_name}</b>
          <span>{item.completed_appointments} concluídos</span>
          <span>Bruto: <b>{money(item.gross_revenue)}</b></span>
          <span>Comissão: <b>{money(item.commission_total)}</b></span>
          <span>Líquido: <b>{money(item.net_revenue)}</b></span>
        </div>)}
      </section>

      <section style={{ background: "white", padding: 22, borderRadius: 9, border: "1px solid #e5ddd5" }}>
        <h2 style={{ fontFamily: "Georgia,serif", marginTop: 0 }}>Repasses de comissão</h2>
        <p style={{ color: "#756a60" }}>Cada comissão é calculada e congelada quando o atendimento é marcado como concluído.</p>
        {report.commissions.length === 0 ? <p style={{ color: "#756a60" }}>Nenhuma comissão gerada neste período.</p> : report.commissions.map((row) => <div key={row.appointment_id} style={{ display: "grid", gridTemplateColumns: "minmax(180px,1.5fr) minmax(170px,1.5fr) repeat(3,minmax(115px,1fr)) auto", gap: 12, alignItems: "center", padding: "16px 0", borderBottom: "1px solid #eee", overflowX: "auto" }}>
          <div><b>{row.professional_name}</b><br /><small>{dateTime(row.starts_at)}</small></div>
          <span>{row.services}</span>
          <span>Venda<br /><b>{money(row.gross_amount)}</b></span>
          <span>{Number(row.commission_rate_percent).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%<br /><b>{money(row.commission_amount)}</b></span>
          <span style={{ fontWeight: 700 }}>{row.payment_status === "paid" ? "Pago" : "Pendente"}</span>
          <button type="button" disabled={savingId === row.appointment_id} onClick={() => void togglePayment(row)} style={{ border: 0, borderRadius: 6, background: row.payment_status === "paid" ? "#e8e1da" : "#171310", color: row.payment_status === "paid" ? "#332c27" : "white", padding: "10px 13px", cursor: savingId === row.appointment_id ? "wait" : "pointer", fontWeight: 700 }}>
            {savingId === row.appointment_id ? "Salvando..." : row.payment_status === "paid" ? "Voltar para pendente" : "Marcar como pago"}
          </button>
        </div>)}
      </section>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ background: "white", padding: 20, borderRadius: 9, border: "1px solid #e5ddd5" }}><small style={{ color: "#6f645b", fontWeight: 700 }}>{label}</small><h2 style={{ marginBottom: 0 }}>{value}</h2></div>;
}
