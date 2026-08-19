"use client";

import { supabase } from "@/utils/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buildWhatsAppLink } from "@/app/contact-links.mjs";
import { saoPauloDateTimeToIso } from "@/utils/brazil-time";
import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";
import ProfessionalProfile from "../ProfessionalProfile";

type Role = "owner" | "manager" | "barber";
type Status = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
type Shop = { id: string; name: string; notification_email: string | null; role: Role; professional_id?: string | null };
type Appointment = { id: string; customer_name: string; customer_email: string | null; customer_phone: string; starts_at: string; ends_at: string; status: Status; service_name_snapshot: string | null; service_price_snapshot: number | null; duration_minutes_snapshot: number | null; professional_name_snapshot: string | null };
type AvailabilityDay = { weekday: number; opens_at: string; closes_at: string; is_closed: boolean };
type AvailabilityBreak = { starts_at: string; ends_at: string };
type TimeBlock = { id: string; starts_at: string; ends_at: string; reason: string | null };

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const statusLabels: Record<Status, string> = { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado", no_show: "Não compareceu" };
const defaultAvailability: AvailabilityDay[] = days.map((_, weekday) => ({ weekday, opens_at: weekday === 0 ? "" : "09:00", closes_at: weekday === 0 ? "" : weekday === 6 ? "18:00" : "20:00", is_closed: weekday === 0 }));

function localDate(offset = 0) { const value = new Date(); value.setDate(value.getDate() + offset); return value.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }
function localTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function localDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function money(value: number | null) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function saoPauloIso(value: string) { return saoPauloDateTimeToIso(value); }

export default function Agenda() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [periodStart, setPeriodStart] = useState(localDate(-30));
  const [periodEnd, setPeriodEnd] = useState(localDate(90));
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [message, setMessage] = useState("Carregando agenda...");
  const [updatingId, setUpdatingId] = useState("");
  const [availabilityHours, setAvailabilityHours] = useState<AvailabilityDay[]>(defaultAvailability);
  const [availabilityBreaks, setAvailabilityBreaks] = useState<Record<number, AvailabilityBreak>>({});
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [absenceStartsAt, setAbsenceStartsAt] = useState("");
  const [absenceEndsAt, setAbsenceEndsAt] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");

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

    if (currentShop.role === "barber" && currentShop.professional_id) {
      const [businessResult, ownHoursResult, breaksResult, blocksResult] = await Promise.all([
        supabase.from("business_hours").select("weekday,opens_at,closes_at,is_closed").eq("barbershop_id", currentShop.id),
        supabase.from("professional_hours").select("weekday,opens_at,closes_at,is_closed").eq("professional_id", currentShop.professional_id),
        supabase.from("professional_breaks").select("weekday,starts_at,ends_at").eq("professional_id", currentShop.professional_id),
        supabase.from("professional_time_blocks").select("id,starts_at,ends_at,reason").eq("professional_id", currentShop.professional_id).gte("ends_at", new Date().toISOString()).order("starts_at"),
      ]);
      if (businessResult.error || ownHoursResult.error || breaksResult.error || blocksResult.error) {
        setAvailabilityMessage("Não foi possível carregar todas as configurações da sua disponibilidade.");
      } else {
        const businessHours = businessResult.data || [];
        const ownHours = ownHoursResult.data || [];
        setAvailabilityHours(days.map((_, weekday) => {
          const own = ownHours.find((row) => row.weekday === weekday);
          const business = businessHours.find((row) => row.weekday === weekday);
          const source = own || business || defaultAvailability[weekday];
          return { weekday, opens_at: source.opens_at?.slice(0, 5) || "", closes_at: source.closes_at?.slice(0, 5) || "", is_closed: source.is_closed };
        }));
        setAvailabilityBreaks(Object.fromEntries((breaksResult.data || []).map((row) => [row.weekday, { starts_at: row.starts_at.slice(0, 5), ends_at: row.ends_at.slice(0, 5) }])));
        setTimeBlocks((blocksResult.data || []) as TimeBlock[]);
      }
    }

    const start = new Date(`${periodStart}T00:00:00-03:00`).toISOString();
    const end = new Date(`${periodEnd}T23:59:59.999-03:00`).toISOString();
    let query = supabase.from("appointments").select("id,customer_name,customer_email,customer_phone,starts_at,ends_at,status,service_name_snapshot,service_price_snapshot,duration_minutes_snapshot,professional_name_snapshot").eq("barbershop_id", currentShop.id).gte("starts_at", start).lte("starts_at", end).order("starts_at");
    if (currentShop.role === "barber" && currentShop.professional_id) query = query.eq("professional_id", currentShop.professional_id);
    const { data, error } = await query;
    setAppointments((data || []) as Appointment[]);
    setMessage(error ? "Não foi possível carregar a agenda." : "");
  }, [periodStart, periodEnd]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visible = useMemo(() => filter === "all" ? appointments : appointments.filter((item) => item.status === filter), [appointments, filter]);
  const stats = useMemo(() => ({ total: appointments.length, confirmed: appointments.filter((item) => item.status === "confirmed").length, completed: appointments.filter((item) => item.status === "completed").length, noShow: appointments.filter((item) => item.status === "no_show").length }), [appointments]);

  async function updateStatus(item: Appointment, status: Status) {
    setUpdatingId(item.id); setMessage("");
    const { error } = await supabase.from("appointments").update({ status }).eq("id", item.id);
    setUpdatingId("");
    setMessage(error ? "Não foi possível atualizar este agendamento." : `Agendamento ${statusLabels[status].toLowerCase()}.`);
    if (!error) await load();
  }

  function changeAvailabilityHour(weekday: number, update: Partial<AvailabilityDay>) { setAvailabilityHours((current) => current.map((day) => day.weekday === weekday ? { ...day, ...update } : day)); }
  function changeAvailabilityBreak(weekday: number, field: keyof AvailabilityBreak, value: string) { setAvailabilityBreaks((current) => ({ ...current, [weekday]: { starts_at: current[weekday]?.starts_at || "", ends_at: current[weekday]?.ends_at || "", [field]: value } })); }

  async function saveOwnAvailability() {
    if (!shop?.professional_id || shop.role !== "barber") return;
    setAvailabilityMessage("");
    for (const day of availabilityHours) {
      if (!day.is_closed && (!day.opens_at || !day.closes_at || day.opens_at >= day.closes_at)) { setAvailabilityMessage(`Revise o horário de ${days[day.weekday]}.`); return; }
      const pause = availabilityBreaks[day.weekday];
      const hasPause = !!pause?.starts_at || !!pause?.ends_at;
      if (hasPause && (!pause?.starts_at || !pause?.ends_at || pause.starts_at >= pause.ends_at || day.is_closed || pause.starts_at < day.opens_at || pause.ends_at > day.closes_at)) { setAvailabilityMessage(`Revise a pausa de ${days[day.weekday]}.`); return; }
    }
    setSavingAvailability(true);
    const { error: hoursError } = await supabase.from("professional_hours").upsert(availabilityHours.map((day) => ({ professional_id: shop.professional_id, weekday: day.weekday, opens_at: day.is_closed ? null : day.opens_at, closes_at: day.is_closed ? null : day.closes_at, is_closed: day.is_closed })), { onConflict: "professional_id,weekday" });
    if (hoursError) { setSavingAvailability(false); setAvailabilityMessage("Não foi possível salvar seus horários."); return; }
    const { error: deleteBreaksError } = await supabase.from("professional_breaks").delete().eq("professional_id", shop.professional_id);
    if (deleteBreaksError) { setSavingAvailability(false); setAvailabilityMessage("Os horários foram salvos, mas não foi possível atualizar suas pausas."); return; }
    const pauseValues = availabilityHours.flatMap((day) => { const pause = availabilityBreaks[day.weekday]; return !day.is_closed && pause?.starts_at && pause?.ends_at ? [{ professional_id: shop.professional_id, weekday: day.weekday, starts_at: pause.starts_at, ends_at: pause.ends_at }] : []; });
    if (pauseValues.length) { const { error } = await supabase.from("professional_breaks").insert(pauseValues); if (error) { setSavingAvailability(false); setAvailabilityMessage("Os horários foram salvos, mas não foi possível salvar suas pausas."); return; } }
    setSavingAvailability(false); setAvailabilityMessage("Sua disponibilidade semanal foi atualizada."); await load();
  }

  async function addAbsence() {
    if (!shop?.professional_id || shop.role !== "barber") return;
    if (!absenceStartsAt || !absenceEndsAt) { setAvailabilityMessage("Informe o início e o fim da ausência."); return; }
    const startsAt = saoPauloIso(absenceStartsAt); const endsAt = saoPauloIso(absenceEndsAt);
    if (new Date(startsAt) >= new Date(endsAt)) { setAvailabilityMessage("O fim da ausência deve ser posterior ao início."); return; }
    const { error } = await supabase.from("professional_time_blocks").insert({ professional_id: shop.professional_id, starts_at: startsAt, ends_at: endsAt, reason: absenceReason.trim() || null });
    if (error) { setAvailabilityMessage("Não foi possível registrar a ausência."); return; }
    setAbsenceStartsAt(""); setAbsenceEndsAt(""); setAbsenceReason(""); setAvailabilityMessage("Ausência registrada. Novos agendamentos não serão oferecidos nesse período."); await load();
  }

  async function removeAbsence(id: string) {
    if (!shop?.professional_id || shop.role !== "barber") return;
    const { error } = await supabase.from("professional_time_blocks").delete().eq("id", id).eq("professional_id", shop.professional_id);
    setAvailabilityMessage(error ? "Não foi possível remover a ausência." : "Ausência removida.");
    if (!error) await load();
  }

  if (!shop) return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;

  return <PanelShell role={shop.role} active="agenda" shopName={shop.name} barbershopId={shop.id}>
    <div className="product-content">
      <div className="product-page-head"><div><p className="product-eyebrow">{shop.role === "barber" ? "Minha operação" : "Operação diária"}</p><h1 className="product-title">{shop.role === "barber" ? "Minha agenda" : "Agenda"}</h1><p className="product-subtitle">Consulte os próximos atendimentos, o histórico recente e mantenha o status de cada horário atualizado.</p></div></div>

      <div className="product-grid cols-4" style={{ marginBottom: 18 }}><Metric label="Agendamentos" value={stats.total} /><Metric label="Confirmados" value={stats.confirmed} /><Metric label="Concluídos" value={stats.completed} /><Metric label="No-show" value={stats.noShow} /></div>

      <section className="product-card product-filters">
        <div className="product-field"><label>De</label><input className="product-input" type="date" value={periodStart} max={periodEnd} onChange={(event) => setPeriodStart(event.target.value)} /></div>
        <div className="product-field"><label>Até</label><input className="product-input" type="date" value={periodEnd} min={periodStart} onChange={(event) => setPeriodEnd(event.target.value)} /></div>
        <div className="product-chip-row">{(["all","scheduled","confirmed","completed","cancelled","no_show"] as const).map((key) => <button key={key} className="product-chip" data-active={filter === key ? "true" : "false"} type="button" onClick={() => setFilter(key)}>{key === "all" ? "Todos" : statusLabels[key]}</button>)}</div>
      </section>

      {message && <p className={`product-message ${message.startsWith("Não foi") ? "error" : "success"}`} role="status">{message}</p>}

      <section className="product-section product-card">
        <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Atendimentos no período</h2><p>{visible.length} atendimento{visible.length === 1 ? "" : "s"} no período e status selecionados.</p></div></div>
        <div className="product-list agenda-appointment-list">{visible.map((item) => { const wa = buildWhatsAppLink(item.customer_phone, `Olá, ${item.customer_name}! Aqui é da ${shop.name}. Estamos entrando em contato sobre seu agendamento de ${localDateTime(item.starts_at)}.`); return <article className="product-row agenda-appointment" key={item.id}><div className="product-row-main agenda-appointment-main" style={{ display: "grid", gridTemplateColumns: "minmax(104px,.35fr) minmax(180px,1fr) minmax(180px,1fr)", gap: 18, alignItems: "center" }}><div className="agenda-appointment-time"><b>{localDateTime(item.starts_at)}</b><small>até {localTime(item.ends_at)}</small></div><div><div className="product-row-title">{item.customer_name}</div><div className="product-row-meta">{item.customer_phone}{item.customer_email ? ` · ${item.customer_email}` : ""}</div></div><div><b>{item.service_name_snapshot || "Serviço"}</b><div className="product-row-meta">{item.professional_name_snapshot || "Profissional"} · {item.duration_minutes_snapshot || 0} min · {money(item.service_price_snapshot)}</div></div></div><div className="product-row-actions"><span className={`product-status ${item.status}`}>{statusLabels[item.status]}</span>{wa && <a className="product-button whatsapp" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}{item.status === "scheduled" && <button className="product-button secondary" disabled={updatingId === item.id} onClick={() => void updateStatus(item, "confirmed")}>Confirmar</button>}{["scheduled","confirmed"].includes(item.status) && <button className="product-button" disabled={updatingId === item.id} onClick={() => void updateStatus(item, "completed")}>Concluir</button>}{["scheduled","confirmed"].includes(item.status) && <button className="product-button secondary" disabled={updatingId === item.id} onClick={() => void updateStatus(item, "no_show")}>No-show</button>}{["scheduled","confirmed"].includes(item.status) && <button className="product-button secondary" disabled={updatingId === item.id} onClick={() => void updateStatus(item, "cancelled")}>Cancelar</button>}</div></article>; })}{!visible.length && <div className="product-empty">Nenhum atendimento no período e filtro selecionados.</div>}</div>
      </section>

      {shop.role === "barber" && shop.professional_id && <section className="product-section" id="disponibilidade">
        <div className="product-section-head"><div><p className="product-eyebrow">Autonomia do profissional</p><h2>Minha disponibilidade</h2><p>Defina seus horários, pausa recorrente e ausências sem alterar a agenda dos colegas.</p></div><button className="product-button" type="button" disabled={savingAvailability} onClick={() => void saveOwnAvailability()}>{savingAvailability ? "Salvando..." : "Salvar disponibilidade"}</button></div>
        {availabilityMessage && <p className={`product-message ${availabilityMessage.includes("Não foi") || availabilityMessage.includes("Revise") ? "error" : "success"}`}>{availabilityMessage}</p>}
        <div className="product-card product-table-wrap"><table className="product-table"><thead><tr><th>Dia</th><th>Atende</th><th>Início</th><th>Fim</th><th>Pausa início</th><th>Pausa fim</th></tr></thead><tbody>{availabilityHours.map((day) => <tr key={day.weekday}><td><b>{days[day.weekday]}</b></td><td><input type="checkbox" checked={!day.is_closed} onChange={(event) => changeAvailabilityHour(day.weekday, { is_closed: !event.target.checked })} /></td><td><input className="product-input" type="time" disabled={day.is_closed} value={day.opens_at} onChange={(event) => changeAvailabilityHour(day.weekday, { opens_at: event.target.value })} /></td><td><input className="product-input" type="time" disabled={day.is_closed} value={day.closes_at} onChange={(event) => changeAvailabilityHour(day.weekday, { closes_at: event.target.value })} /></td><td><input className="product-input" type="time" disabled={day.is_closed} value={availabilityBreaks[day.weekday]?.starts_at || ""} onChange={(event) => changeAvailabilityBreak(day.weekday, "starts_at", event.target.value)} /></td><td><input className="product-input" type="time" disabled={day.is_closed} value={availabilityBreaks[day.weekday]?.ends_at || ""} onChange={(event) => changeAvailabilityBreak(day.weekday, "ends_at", event.target.value)} /></td></tr>)}</tbody></table></div>

        <div className="product-grid cols-2" style={{ marginTop: 18 }}><div className="product-card pad"><div className="product-section-head"><div><h2>Registrar ausência</h2><p>Bloqueio pontual para folga, férias ou compromisso.</p></div></div><div style={{ display: "grid", gap: 12, marginTop: 15 }}><div className="product-field"><label>Início</label><input className="product-input" type="datetime-local" value={absenceStartsAt} onChange={(event) => setAbsenceStartsAt(event.target.value)} /></div><div className="product-field"><label>Fim</label><input className="product-input" type="datetime-local" value={absenceEndsAt} onChange={(event) => setAbsenceEndsAt(event.target.value)} /></div><div className="product-field"><label>Motivo</label><input className="product-input" value={absenceReason} onChange={(event) => setAbsenceReason(event.target.value)} placeholder="Ex.: férias, médico, compromisso" /></div><button className="product-button" type="button" onClick={() => void addAbsence()}>Registrar ausência</button></div></div><div className="product-card pad"><div className="product-section-head"><div><h2>Próximas ausências</h2><p>Períodos que deixam de aparecer para novos agendamentos.</p></div></div><div className="product-list">{timeBlocks.map((block) => <div className="product-row" key={block.id}><div><b>{localDateTime(block.starts_at)}</b><div className="product-row-meta">até {localDateTime(block.ends_at)} · {block.reason || "Sem motivo informado"}</div></div><button className="product-button secondary" type="button" onClick={() => void removeAbsence(block.id)}>Remover</button></div>)}{!timeBlocks.length && <div className="product-empty">Nenhuma ausência futura registrada.</div>}</div></div></div>
      </section>}
      {shop.role === "barber" && shop.professional_id && <section className="product-section"><ProfessionalProfile professionalId={shop.professional_id} /></section>}
    </div>
  </PanelShell>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="product-card product-stat"><small>{label}</small><strong>{value}</strong><span>nesta data</span></div>; }
