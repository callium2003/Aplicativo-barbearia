"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/app/contact-links.mjs";
import { clientEmptyMessage, clientInitials } from "./presentation.mjs";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";

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
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

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

  if (!shop) return <main className="product-shell management-clients-loading" aria-busy="true"><div className="management-clients-loading-card"><span className="management-clients-skeleton wide" /><span className="management-clients-skeleton" /><p className="product-message" role="status">{message}</p></div></main>;

  return <PanelShell role={shop.role} active="clients" shopName={shop.name} barbershopId={shop.id}>
    <div className="product-content management-clients-page">
      <header className="management-clients-head">
        <div>
          <h1 className="product-title">Clientes</h1>
        </div>
      </header>

      <section className="management-clients-search" aria-labelledby="client-search-title">
        <div className="management-clients-searchbox">
          <label id="client-search-title" htmlFor="client-search">Buscar cliente</label>
          <input id="client-search" type="search" className="product-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, e-mail ou WhatsApp" autoComplete="off" />
        </div>
      </section>

      <section className="management-clients-metric-panel" aria-label="Resumo da base filtrada">
        <div className="management-clients-metric"><strong>{rows.length}</strong><span>clientes</span></div>
        <div className="management-clients-metric"><strong>{summary.completed}</strong><span>atendimentos</span></div>
        <div className="management-clients-metric"><strong>{money(summary.revenue)}</strong><span>concluídos</span></div>
      </section>

      {message && <p className="product-message error" role="status">{message}</p>}

      <section className="management-clients-section" aria-labelledby="client-list-title">
        <div className="product-section-head">
          <div>
            <h2 id="client-list-title">Base da barbearia</h2>
          </div>
        </div>
        <div className="management-clients-list">
          {rows.map((item) => {
            const link = buildWhatsAppLink(item.phone_normalized || item.customer_phone, `Olá, ${item.customer_name}! Aqui é da ${shop.name}. Tudo bem?`);
            const isExpanded = expandedCustomerId === item.customer_id;
            return <article className={`management-client-row${isExpanded ? " is-expanded" : ""}`} key={item.customer_id}>
              <div className="management-client-avatar" aria-hidden="true">{clientInitials(item.customer_name)}</div>
              <div className="management-client-main">
                <h3>{item.customer_name}</h3>
                <p>{item.customer_phone}</p>
                <p className="management-client-email">{item.customer_email || "E-mail não informado"}</p>
                <p className="management-client-summary">{item.completed_appointments_count} concluído{item.completed_appointments_count === 1 ? "" : "s"} · {money(item.completed_revenue_total)}</p>
                <p className="management-client-last">Último: {dateTime(item.last_completed_appointment_at)}</p>
              </div>
              <div className="management-client-actions">
                {link ? <a className="management-client-whatsapp" href={link} aria-label={`Falar no WhatsApp com ${item.customer_name}`} target="_blank" rel="noreferrer">WhatsApp</a> : <span className="management-client-no-contact">Sem contato</span>}
                <button className="management-client-details-toggle" type="button" aria-expanded={isExpanded} aria-controls={`client-details-${item.customer_id}`} aria-label={`${isExpanded ? "Fechar" : "Abrir"} detalhes de ${item.customer_name}`} onClick={() => setExpandedCustomerId(isExpanded ? null : item.customer_id)}>{isExpanded ? "⌃" : "›"}</button>
              </div>
              {isExpanded && <div className="management-client-details" id={`client-details-${item.customer_id}`}>
                <dl>
                  <div><dt>E-mail</dt><dd>{item.customer_email || "Não informado"}</dd></div>
                  <div><dt>Agendamentos</dt><dd>{item.appointments_count}</dd></div>
                  <div><dt>Primeiro atendimento</dt><dd>{dateTime(item.first_appointment_at)}</dd></div>
                  <div><dt>Último atendimento</dt><dd>{dateTime(item.last_completed_appointment_at)}</dd></div>
                </dl>
              </div>}
            </article>;
          })}
          {!message && rows.length === 0 && <div className="product-empty management-clients-empty" role="status"><strong>Nenhum resultado por aqui</strong><span>{clientEmptyMessage(search)}</span></div>}
        </div>
      </section>

      <p className="management-clients-note">Use o WhatsApp somente para assuntos relacionados ao atendimento e respeite os consentimentos para ações de marketing.</p>
    </div>
  </PanelShell>;
}
