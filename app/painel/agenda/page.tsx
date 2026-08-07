"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Shop = { id: string; name: string; notification_email: string | null; role: "owner" | "manager" | "barber"; professional_id?: string | null };
type Appointment = { id: string; customer_name: string; customer_email: string | null; customer_phone: string; starts_at: string; ends_at: string; status: "scheduled" | "confirmed" | "completed" | "cancelled"; service_name_snapshot: string | null; service_price_snapshot: number | null; duration_minutes_snapshot: number | null; professional_name_snapshot: string | null };
type AvailabilityDay = { weekday: number; opens_at: string; closes_at: string; is_closed: boolean };
type AvailabilityBreak = { starts_at: string; ends_at: string };
type TimeBlock = { id: string; starts_at: string; ends_at: string; reason: string | null };

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const defaultAvailability: AvailabilityDay[] = days.map((_, weekday) => ({
  weekday,
  opens_at: weekday === 0 ? "" : "09:00",
  closes_at: weekday === 0 ? "" : weekday === 6 ? "18:00" : "20:00",
  is_closed: weekday === 0,
}));
const fieldStyle = { padding: 10, border: "1px solid #d9d0c8", borderRadius: 6, font: "inherit", background: "white" };
const primaryButton = { border: 0, background: "#d7612c", color: "white", padding: "10px 13px", borderRadius: 6, cursor: "pointer", fontWeight: 800 };

function localDate(offset = 0) { const value = new Date(); value.setDate(value.getDate() + offset); return value.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }
function localTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function localDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function saoPauloIso(value: string) { return new Date(`${value}:00-03:00`).toISOString(); }
const labels = { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" } as const;
const colors = { scheduled: ["#e7f1ff", "#165c9a"], confirmed: ["#fff2ce", "#805c00"], completed: ["#e8f5e9", "#286331"], cancelled: ["#f9e8e7", "#8c3430"] } as const;

export default function Agenda() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [filter, setFilter] = useState<"all" | Appointment["status"]>("all");
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

    const { data: barbershopData } = await supabase
      .from("barbershops")
      .select("id,name,notification_email")
      .eq("id", context.barbershopId)
      .maybeSingle<{ id: string; name: string; notification_email: string | null }>();

    if (!barbershopData) { window.location.replace("/painel/inicio"); return; }

    const currentShop: Shop = {
      ...barbershopData,
      role: context.role,
      professional_id: context.professionalId,
    };
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
          return {
            weekday,
            opens_at: source.opens_at?.slice(0, 5) || "",
            closes_at: source.closes_at?.slice(0, 5) || "",
            is_closed: source.is_closed,
          };
        }));
        setAvailabilityBreaks(Object.fromEntries((breaksResult.data || []).map((row) => [row.weekday, { starts_at: row.starts_at.slice(0, 5), ends_at: row.ends_at.slice(0, 5) }])));
        setTimeBlocks((blocksResult.data || []) as TimeBlock[]);
      }
    }

    const start = new Date(`${selectedDate}T00:00:00-03:00`).toISOString();
    const end = new Date(`${selectedDate}T00:00:00-03:00`); end.setUTCDate(end.getUTCDate() + 1);
    let query = supabase.from("appointments").select("id,customer_name,customer_email,customer_phone,starts_at,ends_at,status,service_name_snapshot,service_price_snapshot,duration_minutes_snapshot,professional_name_snapshot").eq("barbershop_id", currentShop.id).gte("starts_at", start).lt("starts_at", end.toISOString()).order("starts_at");
    if (currentShop.role === "barber" && currentShop.professional_id) {
      query = query.eq("professional_id", currentShop.professional_id);
    }
    const { data, error } = await query;
    setAppointments((data || []) as Appointment[]); setMessage(error ? "Não foi possível carregar a agenda." : "");
  }, [selectedDate]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [load]);

  const visible = useMemo(() => filter === "all" ? appointments : appointments.filter(item => item.status === filter), [appointments, filter]);

  async function updateStatus(item: Appointment, status: Appointment["status"]) {
    setUpdatingId(item.id); setMessage("");
    const { error } = await supabase.from("appointments").update({ status }).eq("id", item.id);
    setUpdatingId("");
    setMessage(error ? "Não foi possível atualizar este agendamento." : `Agendamento ${labels[status].toLowerCase()}.`);
    if (!error) await load();
  }

  function changeAvailabilityHour(weekday: number, update: Partial<AvailabilityDay>) {
    setAvailabilityHours((current) => current.map((day) => day.weekday === weekday ? { ...day, ...update } : day));
  }

  function changeAvailabilityBreak(weekday: number, field: keyof AvailabilityBreak, value: string) {
    setAvailabilityBreaks((current) => ({
      ...current,
      [weekday]: {
        starts_at: current[weekday]?.starts_at || "",
        ends_at: current[weekday]?.ends_at || "",
        [field]: value,
      },
    }));
  }

  async function saveOwnAvailability() {
    if (!shop?.professional_id || shop.role !== "barber") return;
    setAvailabilityMessage("");

    for (const day of availabilityHours) {
      if (!day.is_closed && (!day.opens_at || !day.closes_at || day.opens_at >= day.closes_at)) {
        setAvailabilityMessage(`Revise o horário de ${days[day.weekday]}.`);
        return;
      }
      const pause = availabilityBreaks[day.weekday];
      const hasPause = !!pause?.starts_at || !!pause?.ends_at;
      if (hasPause && (!pause?.starts_at || !pause?.ends_at || pause.starts_at >= pause.ends_at || day.is_closed || pause.starts_at < day.opens_at || pause.ends_at > day.closes_at)) {
        setAvailabilityMessage(`Revise a pausa de ${days[day.weekday]}. Ela deve ficar dentro do seu horário de atendimento.`);
        return;
      }
    }

    setSavingAvailability(true);
    const { error: hoursError } = await supabase.from("professional_hours").upsert(
      availabilityHours.map((day) => ({
        professional_id: shop.professional_id,
        weekday: day.weekday,
        opens_at: day.is_closed ? null : day.opens_at,
        closes_at: day.is_closed ? null : day.closes_at,
        is_closed: day.is_closed,
      })),
      { onConflict: "professional_id,weekday" },
    );

    if (hoursError) {
      setSavingAvailability(false);
      setAvailabilityMessage("Não foi possível salvar seus horários.");
      return;
    }

    const { error: deleteBreaksError } = await supabase.from("professional_breaks").delete().eq("professional_id", shop.professional_id);
    if (deleteBreaksError) {
      setSavingAvailability(false);
      setAvailabilityMessage("Os horários foram salvos, mas não foi possível atualizar suas pausas.");
      return;
    }

    const pauseValues = availabilityHours.flatMap((day) => {
      const pause = availabilityBreaks[day.weekday];
      return !day.is_closed && pause?.starts_at && pause?.ends_at
        ? [{ professional_id: shop.professional_id, weekday: day.weekday, starts_at: pause.starts_at, ends_at: pause.ends_at }]
        : [];
    });
    if (pauseValues.length) {
      const { error: pauseError } = await supabase.from("professional_breaks").insert(pauseValues);
      if (pauseError) {
        setSavingAvailability(false);
        setAvailabilityMessage("Os horários foram salvos, mas não foi possível salvar suas pausas.");
        return;
      }
    }

    setSavingAvailability(false);
    setAvailabilityMessage("Sua disponibilidade semanal foi atualizada.");
    await load();
  }

  async function addAbsence() {
    if (!shop?.professional_id || shop.role !== "barber") return;
    if (!absenceStartsAt || !absenceEndsAt) {
      setAvailabilityMessage("Informe o início e o fim da ausência.");
      return;
    }
    const startsAt = saoPauloIso(absenceStartsAt);
    const endsAt = saoPauloIso(absenceEndsAt);
    if (new Date(startsAt) >= new Date(endsAt)) {
      setAvailabilityMessage("O fim da ausência deve ser posterior ao início.");
      return;
    }
    const { error } = await supabase.from("professional_time_blocks").insert({
      professional_id: shop.professional_id,
      starts_at: startsAt,
      ends_at: endsAt,
      reason: absenceReason.trim() || null,
    });
    if (error) {
      setAvailabilityMessage("Não foi possível registrar a ausência.");
      return;
    }
    setAbsenceStartsAt("");
    setAbsenceEndsAt("");
    setAbsenceReason("");
    setAvailabilityMessage("Ausência registrada. Novos agendamentos não serão oferecidos nesse período.");
    await load();
  }

  async function removeAbsence(id: string) {
    if (!shop?.professional_id || shop.role !== "barber") return;
    const { error } = await supabase.from("professional_time_blocks").delete().eq("id", id).eq("professional_id", shop.professional_id);
    setAvailabilityMessage(error ? "Não foi possível remover a ausência." : "Ausência removida.");
    if (!error) await load();
  }

  const navLinks = shop?.role === "barber"
    ? [
        { href: "/painel/agenda", title: "Minha agenda", active: true },
        { href: "/painel/agenda#disponibilidade", title: "Minha disponibilidade", active: false },
      ]
    : [
        { href: "/painel/configurar", title: "Dados cadastrais", active: false },
        { href: "/painel/clientes", title: "Clientes", active: false },
        { href: "/painel/agenda", title: "Agenda", active: true },
        { href: "/painel/relatorios", title: "Relatórios", active: false },
      ];

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#171310", color: "white", padding: "19px 8vw" }}><Link href="/painel" style={{ color: "white", textDecoration: "none", fontWeight: 800 }}>BARBEARIA<span style={{ color: "#e99358" }}>SP</span></Link></header>
    <nav style={{ background: "#2a211c", padding: "12px 8vw", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
      {navLinks.map((link) => (
        <Link key={link.href} href={link.href} style={{ color: link.active ? "#fff" : "#d7ccc0", fontWeight: link.active ? 700 : 400, textDecoration: "none" }}>{link.title}</Link>
      ))}
    </nav>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "42px 20px 80px" }}><p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.5 }}>PAINEL DA BARBEARIA</p><h1 style={{ font: "bold clamp(34px,5vw,58px)/.95 Georgia,serif", margin: "0 0 12px" }}>{shop?.role === "barber" ? "Minha agenda." : "Agenda."}</h1><p style={{ color: "#6d6257", lineHeight: 1.6 }}>{shop?.role === "barber" ? "Acompanhe seus atendimentos e ajuste a sua própria disponibilidade." : "Agendamentos recebidos pelo seu link público aparecem aqui com contato rápido do cliente."}</p>
      {shop && shop.role !== "barber" && <section style={{ background: shop.notification_email ? "#eef7ef" : "#fff1e8", border: "1px solid #e5ddd5", padding: 16, borderRadius: 9, marginTop: 20, lineHeight: 1.5 }}><b>Notificações por e-mail</b><br />{shop.notification_email ? <>Os avisos serão destinados a <b>{shop.notification_email}</b> quando o envio profissional for conectado.</> : <>Cadastre o e-mail da barbearia em <Link href="/painel/configurar">Dados cadastrais</Link> para receber os avisos.</>}</section>}

      {shop?.role === "barber" && shop.professional_id && <section id="disponibilidade" style={{ background: "white", padding: 22, borderRadius: 10, border: "1px solid #e5ddd5", marginTop: 22, scrollMarginTop: 20 }}>
        <h2 style={{ margin: "0 0 8px", font: "bold 26px Georgia,serif" }}>Minha disponibilidade</h2>
        <p style={{ color: "#6d6257", lineHeight: 1.55, marginTop: 0 }}>Você pode ajustar seus horários, almoço/pausa e registrar ausências. Essas alterações afetam os novos horários oferecidos aos clientes. Agendamentos já existentes não são cancelados automaticamente.</p>
        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {availabilityHours.map((day) => {
            const pause = availabilityBreaks[day.weekday] || { starts_at: "", ends_at: "" };
            return <div key={day.weekday} style={{ display: "grid", gridTemplateColumns: "minmax(92px,1.1fr) minmax(88px,1fr) minmax(88px,1fr) minmax(88px,1fr) minmax(88px,1fr) auto", gap: 8, alignItems: "end", paddingBottom: 10, borderBottom: "1px solid #eee" }}>
              <b style={{ alignSelf: "center" }}>{days[day.weekday]}</b>
              <label style={{ fontSize: 12 }}>Início<input type="time" disabled={day.is_closed} value={day.opens_at} onChange={(event) => changeAvailabilityHour(day.weekday, { opens_at: event.target.value })} style={{ ...fieldStyle, width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
              <label style={{ fontSize: 12 }}>Fim<input type="time" disabled={day.is_closed} value={day.closes_at} onChange={(event) => changeAvailabilityHour(day.weekday, { closes_at: event.target.value })} style={{ ...fieldStyle, width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
              <label style={{ fontSize: 12 }}>Pausa início<input type="time" disabled={day.is_closed} value={pause.starts_at} onChange={(event) => changeAvailabilityBreak(day.weekday, "starts_at", event.target.value)} style={{ ...fieldStyle, width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
              <label style={{ fontSize: 12 }}>Pausa fim<input type="time" disabled={day.is_closed} value={pause.ends_at} onChange={(event) => changeAvailabilityBreak(day.weekday, "ends_at", event.target.value)} style={{ ...fieldStyle, width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
              <label style={{ fontSize: 12, whiteSpace: "nowrap", alignSelf: "center" }}><input type="checkbox" checked={day.is_closed} onChange={(event) => changeAvailabilityHour(day.weekday, { is_closed: event.target.checked })} /> Não atendo</label>
            </div>;
          })}
        </div>
        <button type="button" disabled={savingAvailability} onClick={() => void saveOwnAvailability()} style={{ ...primaryButton, marginTop: 16, opacity: savingAvailability ? 0.65 : 1 }}>{savingAvailability ? "Salvando..." : "Salvar meus horários"}</button>

        <div style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid #e5ddd5" }}>
          <h3 style={{ margin: "0 0 8px" }}>Ausência eventual</h3>
          <p style={{ color: "#6d6257", marginTop: 0 }}>Use para consulta médica, compromisso, folga ou outro período em que você não poderá atender.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, alignItems: "end" }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Início<input type="datetime-local" value={absenceStartsAt} onChange={(event) => setAbsenceStartsAt(event.target.value)} style={{ ...fieldStyle, display: "block", width: "100%", boxSizing: "border-box", marginTop: 5 }} /></label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Fim<input type="datetime-local" value={absenceEndsAt} onChange={(event) => setAbsenceEndsAt(event.target.value)} style={{ ...fieldStyle, display: "block", width: "100%", boxSizing: "border-box", marginTop: 5 }} /></label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Motivo (opcional)<input value={absenceReason} onChange={(event) => setAbsenceReason(event.target.value)} placeholder="Ex.: consulta médica" style={{ ...fieldStyle, display: "block", width: "100%", boxSizing: "border-box", marginTop: 5 }} /></label>
            <button type="button" onClick={() => void addAbsence()} style={primaryButton}>Registrar ausência</button>
          </div>
          {!!timeBlocks.length && <div style={{ display: "grid", gap: 8, marginTop: 16 }}>{timeBlocks.map((block) => <div key={block.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, background: "#fff8f3", border: "1px solid #ead8ca", borderRadius: 7, flexWrap: "wrap" }}><span><b>{localDateTime(block.starts_at)} → {localDateTime(block.ends_at)}</b>{block.reason && <><br /><small style={{ color: "#6d6257" }}>{block.reason}</small></>}</span><button type="button" onClick={() => void removeAbsence(block.id)} style={{ border: "1px solid #b56a5f", background: "white", color: "#8c3430", padding: "8px 10px", borderRadius: 5, cursor: "pointer" }}>Remover</button></div>)}</div>}
        </div>
        {availabilityMessage && <p role="status" style={{ color: availabilityMessage.startsWith("Não") || availabilityMessage.startsWith("Revise") || availabilityMessage.startsWith("Informe") || availabilityMessage.startsWith("O fim") ? "#8c3430" : "#286331", marginBottom: 0 }}>{availabilityMessage}</p>}
      </section>}

      <section style={{ background: "white", padding: 20, borderRadius: 10, border: "1px solid #e5ddd5", marginTop: 20, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end", justifyContent: "space-between" }}><label style={{ fontWeight: 700 }}>Dia da agenda<input aria-label="Dia da agenda" type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} style={{ display: "block", marginTop: 7, padding: 11, border: "1px solid #d9d0c8", borderRadius: 6, font: "inherit" }} /></label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(["all", "scheduled", "completed", "cancelled"] as const).map(status => <button key={status} onClick={() => setFilter(status)} style={{ padding: "10px 12px", border: filter === status ? "2px solid #e4773a" : "1px solid #ded5cc", background: filter === status ? "#fff5ef" : "white", borderRadius: 6, cursor: "pointer" }}>{status === "all" ? "Todos" : labels[status]}</button>)}</div></section>
      {message && <p role="status" style={{ color: "#7d3c21" }}>{message}</p>}<section style={{ marginTop: 18 }}>{visible.length === 0 ? <div style={{ background: "white", padding: 25, borderRadius: 8, border: "1px solid #e5ddd5" }}>Nenhum agendamento neste dia.</div> : visible.map(item => { const [bg, text] = colors[item.status]; return <article key={item.id} style={{ background: "white", border: "1px solid #e5ddd5", borderRadius: 9, padding: 20, marginBottom: 12, display: "grid", gridTemplateColumns: "minmax(74px,auto) minmax(0,1fr) auto", gap: 18, alignItems: "center" }}><b style={{ fontSize: 22, color: "#c65020" }}>{localTime(item.starts_at)}</b><div><b style={{ fontSize: 17 }}>{item.customer_name}</b><br /><span style={{ color: "#6d6257" }}>{item.service_name_snapshot || "Serviço"} · {item.professional_name_snapshot || "Profissional"}</span><br /><small style={{ color: "#6d6257" }}>{item.duration_minutes_snapshot || 0} min · R$ {Number(item.service_price_snapshot || 0).toFixed(2).replace(".", ",")}</small><br /><b style={{ color: "#3f342b" }}>Celular: {item.customer_phone}</b>{item.customer_email && <><br /><small style={{ color: "#6d6257" }}>{item.customer_email}</small></>}</div><div style={{ textAlign: "right" }}><span style={{ display: "inline-block", background: bg, color: text, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>{labels[item.status]}</span><div style={{ display: "flex", gap: 7, marginTop: 10, justifyContent: "end", flexWrap: "wrap" }}>{item.status !== "completed" && item.status !== "cancelled" && <button disabled={updatingId === item.id} onClick={() => void updateStatus(item, "completed")} style={{ border: 0, background: "#286331", color: "white", padding: "9px 11px", borderRadius: 5, cursor: "pointer", fontWeight: 700 }}>Concluir</button>}{item.status !== "cancelled" && item.status !== "completed" && <button disabled={updatingId === item.id} onClick={() => void updateStatus(item, "cancelled")} style={{ border: "1px solid #b56a5f", background: "white", color: "#8c3430", padding: "8px 10px", borderRadius: 5, cursor: "pointer" }}>Cancelar</button>}</div></div></article>; })}</section>
    </div>
  </main>;
}
