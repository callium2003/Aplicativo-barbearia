"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Shop = { id: string; name: string; notification_email: string | null; role: "owner" | "manager" | "barber"; professional_id?: string | null };
type Appointment = { id: string; customer_name: string; customer_email: string | null; customer_phone: string; starts_at: string; ends_at: string; status: "scheduled" | "confirmed" | "completed" | "cancelled"; service_name_snapshot: string | null; service_price_snapshot: number | null; duration_minutes_snapshot: number | null; professional_name_snapshot: string | null };

function localDate(offset = 0) { const value = new Date(); value.setDate(value.getDate() + offset); return value.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }
function localTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
const labels = { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" } as const;
const colors = { scheduled: ["#e7f1ff", "#165c9a"], confirmed: ["#fff2ce", "#805c00"], completed: ["#e8f5e9", "#286331"], cancelled: ["#f9e8e7", "#8c3430"] } as const;

export default function Agenda() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [filter, setFilter] = useState<"all" | Appointment["status"]>("all");
  const [message, setMessage] = useState("Carregando agenda...");
  const [updatingId, setUpdatingId] = useState("");

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

  const navLinks = shop?.role === "barber"
    ? [{ href: "/painel/agenda", title: "Minha agenda", active: true }]
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "42px 20px 80px" }}><p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.5 }}>PAINEL DA BARBEARIA</p><h1 style={{ font: "bold clamp(34px,5vw,58px)/.95 Georgia,serif", margin: "0 0 12px" }}>Agenda.</h1><p style={{ color: "#6d6257", lineHeight: 1.6 }}>Agendamentos recebidos pelo seu link público aparecem aqui com contato rápido do cliente.</p>
      {shop && shop.role !== "barber" && <section style={{ background: shop.notification_email ? "#eef7ef" : "#fff1e8", border: "1px solid #e5ddd5", padding: 16, borderRadius: 9, marginTop: 20, lineHeight: 1.5 }}><b>Notificações por e-mail</b><br />{shop.notification_email ? <>Os avisos serão destinados a <b>{shop.notification_email}</b> quando o envio profissional for conectado.</> : <>Cadastre o e-mail da barbearia em <Link href="/painel/configurar">Dados cadastrais</Link> para receber os avisos.</>}</section>}
      <section style={{ background: "white", padding: 20, borderRadius: 10, border: "1px solid #e5ddd5", marginTop: 20, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end", justifyContent: "space-between" }}><label style={{ fontWeight: 700 }}>Dia da agenda<input aria-label="Dia da agenda" type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} style={{ display: "block", marginTop: 7, padding: 11, border: "1px solid #d9d0c8", borderRadius: 6, font: "inherit" }} /></label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(["all", "scheduled", "completed", "cancelled"] as const).map(status => <button key={status} onClick={() => setFilter(status)} style={{ padding: "10px 12px", border: filter === status ? "2px solid #e4773a" : "1px solid #ded5cc", background: filter === status ? "#fff5ef" : "white", borderRadius: 6, cursor: "pointer" }}>{status === "all" ? "Todos" : labels[status]}</button>)}</div></section>
      {message && <p role="status" style={{ color: "#7d3c21" }}>{message}</p>}<section style={{ marginTop: 18 }}>{visible.length === 0 ? <div style={{ background: "white", padding: 25, borderRadius: 8, border: "1px solid #e5ddd5" }}>Nenhum agendamento neste dia.</div> : visible.map(item => { const [bg, text] = colors[item.status]; return <article key={item.id} style={{ background: "white", border: "1px solid #e5ddd5", borderRadius: 9, padding: 20, marginBottom: 12, display: "grid", gridTemplateColumns: "minmax(74px,auto) minmax(0,1fr) auto", gap: 18, alignItems: "center" }}><b style={{ fontSize: 22, color: "#c65020" }}>{localTime(item.starts_at)}</b><div><b style={{ fontSize: 17 }}>{item.customer_name}</b><br /><span style={{ color: "#6d6257" }}>{item.service_name_snapshot || "Serviço"} · {item.professional_name_snapshot || "Profissional"}</span><br /><small style={{ color: "#6d6257" }}>{item.duration_minutes_snapshot || 0} min · R$ {Number(item.service_price_snapshot || 0).toFixed(2).replace(".", ",")}</small><br /><b style={{ color: "#3f342b" }}>Celular: {item.customer_phone}</b>{item.customer_email && <><br /><small style={{ color: "#6d6257" }}>{item.customer_email}</small></>}</div><div style={{ textAlign: "right" }}><span style={{ display: "inline-block", background: bg, color: text, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>{labels[item.status]}</span><div style={{ display: "flex", gap: 7, marginTop: 10, justifyContent: "end", flexWrap: "wrap" }}>{item.status !== "completed" && item.status !== "cancelled" && <button disabled={updatingId === item.id} onClick={() => void updateStatus(item, "completed")} style={{ border: 0, background: "#286331", color: "white", padding: "9px 11px", borderRadius: 5, cursor: "pointer", fontWeight: 700 }}>Concluir</button>}{item.status !== "cancelled" && item.status !== "completed" && <button disabled={updatingId === item.id} onClick={() => void updateStatus(item, "cancelled")} style={{ border: "1px solid #b56a5f", background: "white", color: "#8c3430", padding: "8px 10px", borderRadius: 5, cursor: "pointer" }}>Cancelar</button>}</div></div></article>; })}</section>
    </div>
  </main>;
}
