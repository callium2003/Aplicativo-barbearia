"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/app/contact-links.mjs";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Shop = { id: string; name: string };
type CustomerPhone = { id: string; phone_normalized: string | null };
type CustomerHistory = {
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  phone_normalized?: string | null;
  starts_at: string;
  appointments_count: number;
  completed_appointments_count: number;
  first_appointment_at: string;
  last_appointment_at: string;
  last_completed_appointment_at: string | null;
  completed_revenue_total: number;
};

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "Ainda não concluiu atendimento";
}

const nav = <nav style={{ background: "#2a211c", padding: "12px 8vw", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}><Link href="/painel/configurar" style={{ color: "#d7ccc0", textDecoration: "none" }}>Dados cadastrais</Link><Link href="/painel/clientes" style={{ color: "#fff", fontWeight: 700, textDecoration: "none" }}>Clientes</Link><Link href="/painel/agenda" style={{ color: "#d7ccc0", textDecoration: "none" }}>Agenda</Link><Link href="/painel/relatorios" style={{ color: "#d7ccc0", textDecoration: "none" }}>Relatórios</Link></nav>;

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<CustomerHistory[]>([]);
  const [barbershopName, setBarbershopName] = useState("");
  const [message, setMessage] = useState("Carregando clientes...");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/entrar"); return; }
      const { data: ownerShop, error: ownerShopError } = await supabase.from("barbershops").select("id,name").eq("owner_id", user.id).maybeSingle<Shop>();
      const { data: membership } = ownerShop ? { data: null as { barbershop_id: string } | null } : await supabase.from("team_members").select("barbershop_id").eq("user_id", user.id).eq("role", "manager").eq("status", "active").maybeSingle<{ barbershop_id: string }>();
      const barbershopId = ownerShop?.id || membership?.barbershop_id;
      if (ownerShopError || !barbershopId) { setMessage("Não foi possível identificar a barbearia deste painel."); return; }
      const { data, error } = await supabase.from("barbershop_customer_history").select("customer_id,customer_name,customer_email,customer_phone,starts_at,appointments_count,completed_appointments_count,first_appointment_at,last_appointment_at,last_completed_appointment_at,completed_revenue_total").eq("barbershop_id", barbershopId).order("starts_at", { ascending: false });
      const customerIds = [...new Set((data || []).map(item => item.customer_id))];
      const { data: customerPhones } = customerIds.length ? await supabase.from("customers").select("id,phone_normalized").in("id", customerIds) : { data: [] as CustomerPhone[] };
      const phoneByCustomer = new Map((customerPhones || []).map(item => [item.id, item.phone_normalized]));
      setHistory((data || []).map(item => ({ ...item, phone_normalized: phoneByCustomer.get(item.customer_id) || null })) as CustomerHistory[]);
      if (ownerShop) setBarbershopName(ownerShop.name);
      else {
        const { data: publicShop } = await supabase.from("public_barbershop_pages").select("name").eq("id", barbershopId).maybeSingle<{ name: string }>();
        setBarbershopName(publicShop?.name || "sua barbearia");
      }
      setMessage(error ? "Não foi possível carregar os clientes." : "");
    }
    void load();
  }, []);

  const rows = useMemo(() => {
    const unique = new Map<string, CustomerHistory>();
    for (const item of history) if (!unique.has(item.customer_id)) unique.set(item.customer_id, item);
    return [...unique.values()].filter(item => `${item.customer_name} ${item.customer_phone}`.toLowerCase().includes(search.toLowerCase()));
  }, [history, search]);

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#171310", color: "white", padding: "19px 8vw" }}><Link href="/painel" style={{ color: "white", textDecoration: "none", fontWeight: 800 }}>BARBEARIA<span style={{ color: "#e99358" }}>SP</span></Link></header>
    {nav}
    <div style={{ maxWidth: 1050, margin: "0 auto", padding: "42px 24px" }}>
      <p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.5 }}>BASE DA BARBEARIA</p>
      <h1 style={{ font: "bold clamp(34px,5vw,58px)/.95 Georgia,serif", margin: "0 0 12px" }}>Clientes.</h1>
      <p style={{ color: "#6d6257" }}>Histórico real dos agendamentos desta barbearia. Cancelamentos e faltas não entram no total realizado.</p>
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou celular" style={{ width: "100%", maxWidth: 450, boxSizing: "border-box", padding: 13, border: "1px solid #d9d0c8", borderRadius: 5, margin: "20px 0" }} />
      {message && <p role="status" style={{ color: "#7d3c21" }}>{message}</p>}
      <section style={{ background: "white", borderRadius: 9, overflow: "hidden", border: "1px solid #e5ddd5" }}>
        {!message && rows.length === 0 ? <p style={{ padding: 20, margin: 0 }}>Ainda não há clientes com agendamento.</p> : rows.map(item => {
          const whatsappLink = buildWhatsAppLink(item.phone_normalized || item.customer_phone, `Olá, ${item.customer_name}! Aqui é da ${barbershopName || "sua barbearia"}. Tudo bem?`);
          return <article key={item.customer_id} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, padding: 20, borderBottom: "1px solid #eee" }}>
            <div><b>{item.customer_name}</b><br /><small>{item.customer_email || "E-mail não informado"}</small></div>
            <div><b>Celular</b><br />{item.customer_phone}</div>
            <div><b>Último concluído</b><br /><small>{dateTime(item.last_completed_appointment_at)}</small></div>
            <div><b>{item.completed_appointments_count}/{item.appointments_count}</b><br /><small>concluídos</small><br /><b style={{ color: "#286331" }}>R$ {Number(item.completed_revenue_total).toFixed(2).replace(".", ",")}</b></div>
            {whatsappLink && <a href={whatsappLink} aria-label={`Falar no WhatsApp com ${item.customer_name}`} target="_blank" rel="noreferrer" style={{ alignSelf: "center", background: "#16874b", color: "white", textDecoration: "none", borderRadius: 7, padding: "11px 13px", fontWeight: 800, textAlign: "center" }}>💬 Falar no WhatsApp</a>}
          </article>;
        })}
      </section>
    </div>
  </main>;
}
