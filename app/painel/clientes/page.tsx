"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/app/contact-links.mjs";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

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

type Shop = { id: string; name: string; role: "owner" | "manager" };

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "Ainda não concluiu";
}

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<CustomerHistory[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("Carregando clientes...");

  useEffect(() => {
    async function load() {
      const context = await getPanelContext(supabase);
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }
      if (!context.role || !context.barbershopId) { setMessage("Não foi possível identificar a barbearia deste painel."); return; }

      const barbershopId = context.barbershopId;
      const [historyResult, shopResult] = await Promise.all([
        supabase.from("barbershop_customer_history").select("customer_id,customer_name,customer_email,customer_phone,starts_at,appointments_count,completed_appointments_count,first_appointment_at,last_appointment_at,last_completed_appointment_at,completed_revenue_total").eq("barbershop_id", barbershopId).order("starts_at", { ascending: false }),
        supabase.from("barbershops").select("id,name").eq("id", barbershopId).maybeSingle<{ id: string; name: string }>(),
      ]);

      const customerIds = [...new Set((historyResult.data || []).map((item) => item.customer_id))];
      const { data: customerPhones } = customerIds.length ? await supabase.from("customers").select("id,phone_normalized").in("id", customerIds) : { data: [] as CustomerPhone[] };
      const phoneByCustomer = new Map((customerPhones || []).map((item) => [item.id, item.phone_normalized]));
      setHistory((historyResult.data || []).map((item) => ({ ...item, phone_normalized: phoneByCustomer.get(item.customer_id) || null })) as CustomerHistory[]);
      if (shopResult.data) setShop({ ...shopResult.data, role: context.role as "owner" | "manager" });
      setMessage(historyResult.error ? "Não foi possível carregar os clientes." : "");
    }
    void load();
  }, []);

  const rows = useMemo(() => {
    const unique = new Map<string, CustomerHistory>();
    for (const item of history) if (!unique.has(item.customer_id)) unique.set(item.customer_id, item);
    const term = search.trim().toLowerCase();
    return [...unique.values()].filter((item) => !term || `${item.customer_name} ${item.customer_phone} ${item.customer_email || ""}`.toLowerCase().includes(term));
  }, [history, search]);

  const summary = useMemo(() => rows.reduce((acc, item) => ({
    completed: acc.completed + Number(item.completed_appointments_count || 0),
    revenue: acc.revenue + Number(item.completed_revenue_total || 0),
  }), { completed: 0, revenue: 0 }), [rows]);

  if (!shop) return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;

  return <PanelShell role={shop.role} active="clients" shopName={shop.name} barbershopId={shop.id}>
    <div className="product-content">
      <div className="product-page-head">
        <div>
          <p className="product-eyebrow">Relacionamento</p>
          <h1 className="product-title">Clientes</h1>
          <p className="product-subtitle">Histórico real da sua base. Use o WhatsApp para conversas relacionadas ao atendimento e respeite os consentimentos para ações de marketing.</p>
        </div>
      </div>

      <div className="product-grid cols-3" style={{ marginBottom: 20 }}>
        <div className="product-card product-stat"><small>Clientes encontrados</small><strong>{rows.length}</strong><span>na base filtrada</span></div>
        <div className="product-card product-stat"><small>Atendimentos concluídos</small><strong>{summary.completed}</strong><span>somados no histórico</span></div>
        <div className="product-card product-stat"><small>Receita concluída</small><strong>{money(summary.revenue)}</strong><span>histórico da base filtrada</span></div>
      </div>

      <section className="product-card product-filters">
        <div className="product-field" style={{ flex: "1 1 320px" }}><label>Buscar cliente</label><input className="product-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, e-mail ou WhatsApp" /></div>
      </section>

      {message && <p className="product-message error" role="status">{message}</p>}

      <section className="product-section product-card">
        <div className="product-section-head" style={{ padding: "20px 20px 0" }}><div><h2>Base da barbearia</h2><p>{rows.length} cliente{rows.length === 1 ? "" : "s"} na busca atual.</p></div></div>
        <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Último concluído</th><th>Atendimentos</th><th>Receita</th><th>Contato</th></tr></thead><tbody>
          {rows.map((item) => {
            const link = buildWhatsAppLink(item.phone_normalized || item.customer_phone, `Olá, ${item.customer_name}! Aqui é da ${shop.name}. Tudo bem?`);
            return <tr key={item.customer_id}>
              <td><b>{item.customer_name}</b><br /><small>{item.customer_email || "E-mail não informado"}</small></td>
              <td>{item.customer_phone}</td>
              <td>{dateTime(item.last_completed_appointment_at)}</td>
              <td><b>{item.completed_appointments_count}</b> concluídos<br /><small>{item.appointments_count} agendamentos</small></td>
              <td><b>{money(item.completed_revenue_total)}</b></td>
              <td>{link ? <a className="product-button whatsapp" href={link} aria-label={`Falar no WhatsApp com ${item.customer_name}`} target="_blank" rel="noreferrer">WhatsApp</a> : "—"}</td>
            </tr>;
          })}
          {!message && rows.length === 0 && <tr><td colSpan={6}><div className="product-empty">Ainda não há clientes com agendamento para esta busca.</div></td></tr>}
        </tbody></table></div>
      </section>
    </div>
  </PanelShell>;
}
