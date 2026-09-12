"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buildWhatsAppLink } from "@/app/contact-links.mjs";
import { getPanelContext } from "@/utils/panel-context";
import ActionFeedback from "../ActionFeedback";
import PanelShell from "../PanelShell";
import { appointmentStatusErrorMessage, readAgendaProfessionalFilter, summarizeDailyAppointments } from "./presentation.mjs";

type Role = "owner" | "manager" | "barber";
type Status = "scheduled" | "completed" | "cancelled" | "no_show";
type Shop = { id: string; name: string; notification_email: string | null; role: Role; professional_id?: string | null };
type Appointment = { id: string; customer_name: string; customer_email: string | null; customer_phone: string; starts_at: string; ends_at: string; status: Status; service_name_snapshot: string | null; service_price_snapshot: number | null; duration_minutes_snapshot: number | null; professional_id: string | null; professional_name_snapshot: string | null };
type ActionResult = { message: string; tone: "error" | "success" };

const statusLabels: Record<Status, string> = { scheduled: "Agendado", completed: "Concluído", cancelled: "Cancelado", no_show: "Não compareceu" };

function localDate(offset = 0) { const value = new Date(); value.setDate(value.getDate() + offset); return value.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }
function localTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function localDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function money(value: number | null) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function Agenda() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [periodStart, setPeriodStart] = useState(localDate(-30));
  const [periodEnd, setPeriodEnd] = useState(localDate(90));
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [professionalFilterActive, setProfessionalFilterActive] = useState(false);
  const [message, setMessage] = useState("Carregando agenda...");
  const [updatingId, setUpdatingId] = useState("");

  const load = useCallback(async () => {
    const context = await getPanelContext(supabase);
    if (!context.userId) { window.location.replace("/entrar"); return; }
    if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }

    const { data: barbershopData } = await supabase.from("barbershops").select("id,name,notification_email").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string; notification_email: string | null }>();
    if (!barbershopData) { window.location.replace("/painel/inicio"); return; }

    const currentShop: Shop = { ...barbershopData, role: context.role, professional_id: context.professionalId };
    setShop(currentShop);

    if (currentShop.role === "barber" && !currentShop.professional_id) {
      setAppointments([]);
      setMessage("Seu perfil de barbeiro não está vinculado a um profissional ativo na barbearia.");
      return;
    }

    const today = localDate();
    const start = new Date(`${periodStart}T00:00:00-03:00`).toISOString();
    const end = new Date(`${periodEnd}T23:59:59.999-03:00`).toISOString();
    const todayStart = new Date(`${today}T00:00:00-03:00`).toISOString();
    const todayEnd = new Date(`${today}T23:59:59.999-03:00`).toISOString();
    const linkedProfessionalFilter = currentShop.role === "barber" ? currentShop.professional_id : readAgendaProfessionalFilter(window.location.search);
    setProfessionalFilterActive(currentShop.role !== "barber" && Boolean(linkedProfessionalFilter));
    let query = supabase.from("appointments").select("id,customer_name,customer_email,customer_phone,starts_at,ends_at,status,service_name_snapshot,service_price_snapshot,duration_minutes_snapshot,professional_id,professional_name_snapshot").eq("barbershop_id", currentShop.id).gte("starts_at", start).lte("starts_at", end).order("starts_at");
    let dailyQuery = supabase.from("appointments").select("id,customer_name,customer_email,customer_phone,starts_at,ends_at,status,service_name_snapshot,service_price_snapshot,duration_minutes_snapshot,professional_id,professional_name_snapshot").eq("barbershop_id", currentShop.id).gte("starts_at", todayStart).lte("starts_at", todayEnd).order("starts_at");
    if (currentShop.role === "barber" && currentShop.professional_id) query = query.eq("professional_id", currentShop.professional_id);
    if (currentShop.role === "barber" && currentShop.professional_id) dailyQuery = dailyQuery.eq("professional_id", currentShop.professional_id);
    if (currentShop.role !== "barber" && linkedProfessionalFilter) query = query.eq("professional_id", linkedProfessionalFilter);
    if (currentShop.role !== "barber" && linkedProfessionalFilter) dailyQuery = dailyQuery.eq("professional_id", linkedProfessionalFilter);
    const [{ data, error }, { data: dailyData, error: dailyError }] = await Promise.all([query, dailyQuery]);
    setAppointments((data || []) as Appointment[]);
    setDailyAppointments((dailyData || []) as Appointment[]);
    setMessage(error || dailyError ? "Não foi possível carregar a agenda." : "");
  }, [periodStart, periodEnd]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visible = useMemo(() => filter === "all" ? appointments : appointments.filter((item) => item.status === filter), [appointments, filter]);
  const stats = useMemo(() => summarizeDailyAppointments(dailyAppointments), [dailyAppointments]);

  async function updateStatus(item: Appointment, status: Status): Promise<ActionResult> {
    setUpdatingId(item.id);
    try {
      const { error } = await supabase.rpc("set_appointment_status", { p_appointment_id: item.id, p_status: status });
      if (error) return { message: appointmentStatusErrorMessage(error), tone: "error" };
      await load();
      return { message: `Agendamento ${statusLabels[status].toLowerCase()}.`, tone: "success" };
    } catch (error) {
      return { message: appointmentStatusErrorMessage(error), tone: "error" };
    } finally {
      setUpdatingId("");
    }
  }

  if (!shop) return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;

  return <PanelShell role={shop.role} active="agenda" shopName={shop.name} barbershopId={shop.id}>
    <div className="product-content management-agenda-page">
      <div className="product-page-head"><div><h1 className="product-title">{shop.role === "barber" ? "Minha agenda" : "Agenda"}</h1><p className="product-subtitle">Consulte os próximos atendimentos, o histórico recente e mantenha o status de cada horário atualizado.</p></div></div>

      <div className="management-agenda-metrics"><Metric label="Agendamentos de hoje" value={stats.total} onClick={() => setTodayExpanded((expanded) => !expanded)} expanded={todayExpanded} /><Metric label="Agendados" value={stats.scheduled} /><Metric label="Concluídos" value={stats.completed} /><Metric label="No-show" value={stats.noShow} /></div>

      {todayExpanded && <section className="product-card management-agenda-today" id="agenda-today-list" aria-label="Agendamentos de hoje">
        <div className="product-section-head management-agenda-today-head"><div><p className="product-eyebrow">Hoje</p><h2>Agendamentos de hoje</h2><p>{dailyAppointments.length} atendimento{dailyAppointments.length === 1 ? "" : "s"} para acompanhar agora.</p></div></div>
        <AppointmentList appointments={dailyAppointments} shop={shop} updatingId={updatingId} onUpdateStatus={updateStatus} emptyMessage="Nenhum atendimento para hoje." />
      </section>}

      <section className="product-card product-filters management-agenda-filters">
        {professionalFilterActive && <div className="agenda-linked-filter"><span>Agenda filtrada por profissional.</span><Link href="/painel/agenda">Limpar filtro</Link></div>}
        <div className="product-field"><label>De</label><input className="product-input" type="date" value={periodStart} max={periodEnd} onChange={(event) => setPeriodStart(event.target.value)} /></div>
        <div className="product-field"><label>Até</label><input className="product-input" type="date" value={periodEnd} min={periodStart} onChange={(event) => setPeriodEnd(event.target.value)} /></div>
        <div className="product-chip-row">{(["all","scheduled","completed","cancelled","no_show"] as const).map((key) => <button key={key} className="product-chip" data-active={filter === key ? "true" : "false"} type="button" onClick={() => setFilter(key)}>{key === "all" ? "Todos" : statusLabels[key]}</button>)}</div>
      </section>

      {message.startsWith("Não foi possível carregar") && <p className="product-message error" role="status">{message}</p>}

      <section className="product-section product-card">
        <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Atendimentos no período</h2><p>{visible.length} atendimento{visible.length === 1 ? "" : "s"} no período e status selecionados.</p></div></div>
        <AppointmentList appointments={visible} shop={shop} updatingId={updatingId} onUpdateStatus={updateStatus} emptyMessage="Nenhum atendimento no período e filtro selecionados." />
      </section>

    </div>
  </PanelShell>;
}

function Metric({ label, value, onClick, expanded }: { label: string; value: number; onClick?: () => void; expanded?: boolean }) {
  if (onClick) return <button className="product-card product-stat management-agenda-metric management-agenda-today-toggle" type="button" onClick={onClick} aria-expanded={expanded} aria-controls="agenda-today-list"><small>{label}</small><strong>{value}</strong><span>{expanded ? "Ocultar atendimentos" : "Ver atendimentos"}</span></button>;
  return <div className="product-card product-stat management-agenda-metric"><small>{label}</small><strong>{value}</strong><span>hoje</span></div>;
}

function AppointmentList({ appointments, shop, updatingId, onUpdateStatus, emptyMessage }: { appointments: Appointment[]; shop: Shop; updatingId: string; onUpdateStatus: (item: Appointment, status: Status) => Promise<ActionResult>; emptyMessage: string }) {
  const [feedbackById, setFeedbackById] = useState<Record<string, ActionResult>>({});

  async function handleStatusUpdate(item: Appointment, status: Status) {
    setFeedbackById((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    const result = await onUpdateStatus(item, status);
    setFeedbackById((current) => ({ ...current, [item.id]: result }));
  }

  return <div className="product-list agenda-appointment-list management-agenda-list">
    {appointments.map((item) => {
      const wa = buildWhatsAppLink(item.customer_phone, `Olá, ${item.customer_name}! Aqui é da ${shop.name}. Estamos entrando em contato sobre seu agendamento de ${localDateTime(item.starts_at)}.`);
      const canUpdateToFinalStatus = item.status === "scheduled";

      return <article className="product-row agenda-appointment" key={item.id}>
        <div className="product-row-main agenda-appointment-main">
          <div className="agenda-appointment-time"><b>{localDateTime(item.starts_at)}</b><small>até {localTime(item.ends_at)}</small></div>
          <div><div className="product-row-title">{item.customer_name}</div><div className="product-row-meta">{item.customer_phone}{item.customer_email ? ` · ${item.customer_email}` : ""}</div></div>
          <div><b>{item.service_name_snapshot || "Serviço"}</b><div className="product-row-meta">{item.professional_name_snapshot || "Profissional"} · {item.duration_minutes_snapshot || 0} min · {money(item.service_price_snapshot)}</div></div>
        </div>
        <div className="product-row-actions">
          <span className={`product-status ${item.status}`}>{statusLabels[item.status]}</span>
          {wa && <a className="management-client-whatsapp management-agenda-whatsapp" href={wa} target="_blank" rel="noreferrer" aria-label={`Falar no WhatsApp com ${item.customer_name}`}>WhatsApp</a>}
          {canUpdateToFinalStatus && <button className="management-agenda-status-action is-complete" disabled={updatingId === item.id} onClick={() => void handleStatusUpdate(item, "completed")}>Concluir</button>}
          {canUpdateToFinalStatus && <button className="management-agenda-status-action is-no-show" disabled={updatingId === item.id} onClick={() => void handleStatusUpdate(item, "no_show")}>No-show</button>}
          {canUpdateToFinalStatus && shop.role !== "barber" && <button className="product-button secondary" disabled={updatingId === item.id} onClick={() => void handleStatusUpdate(item, "cancelled")}>Cancelar</button>}
        </div>
        <div className="management-agenda-row-feedback">
          <ActionFeedback message={feedbackById[item.id]?.message || ""} tone={feedbackById[item.id]?.tone || "error"} />
        </div>
      </article>;
    })}
    {!appointments.length && <div className="product-empty">{emptyMessage}</div>}
  </div>;
}
