"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/app/contact-links.mjs";
import {
  clientEmptyMessage,
  clientInitials,
  filterAndSummarizeClients,
  resolveClientPeriodRange,
  saoPauloTodayDate,
} from "./presentation.mjs";

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
  status?: string;
  service_price_snapshot?: number | null;
  appointments_count: number;
  completed_appointments_count: number;
  first_appointment_at: string;
  last_appointment_at: string;
  last_completed_appointment_at: string | null;
  completed_revenue_total: number;
};

type Shop = { id: string; name: string; role: "owner" | "manager" };
type PeriodPreset = "month" | "week" | "30days" | "all" | "custom";

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "Ainda não concluiu";
}

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Clientes() {
  const today = useMemo(() => saoPauloTodayDate(), []);
  const initialRange = useMemo(() => resolveClientPeriodRange("month", today), [today]);
  const [search, setSearch] = useState("");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
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
      const pageSize = 1000;
      let from = 0;
      const allHistoryRows: CustomerHistory[] = [];
      let fetchError = false;

      const shopQuery = supabase.from("barbershops").select("id,name").eq("id", barbershopId).maybeSingle<{ id: string; name: string }>();

      while (true) {
        const pageResult = await supabase
          .from("barbershop_customer_history")
          .select("appointment_id,customer_id,customer_name,customer_email,customer_phone,starts_at,status,service_price_snapshot,appointments_count,completed_appointments_count,first_appointment_at,last_appointment_at,last_completed_appointment_at,completed_revenue_total")
          .eq("barbershop_id", barbershopId)
          .order("starts_at", { ascending: false })
          .order("appointment_id", { ascending: false })
          .range(from, from + pageSize - 1);

        if (pageResult.error) {
          fetchError = true;
          break;
        }
        if (!pageResult.data || pageResult.data.length === 0) break;
        allHistoryRows.push(...(pageResult.data as CustomerHistory[]));
        if (pageResult.data.length < pageSize) break;
        from += pageSize;
      }

      const shopResult = await shopQuery;
      const customerIds = [...new Set(allHistoryRows.map((item) => item.customer_id))];
      const phoneByCustomer = new Map<string, string | null>();

      for (let i = 0; i < customerIds.length; i += 500) {
        const batch = customerIds.slice(i, i + 500);
        const { data: customerPhones } = await supabase.from("customers").select("id,phone_normalized").in("id", batch) as { data: CustomerPhone[] | null };
        for (const item of customerPhones || []) {
          phoneByCustomer.set(item.id, item.phone_normalized);
        }
      }

      setHistory(allHistoryRows.map((item) => ({ ...item, phone_normalized: phoneByCustomer.get(item.customer_id) || null })));
      if (shopResult.data) setShop({ ...shopResult.data, role: context.role as "owner" | "manager" });
      setMessage(fetchError ? "Não foi possível carregar os clientes." : "");
    }
    void load();
  }, []);

  function selectPreset(preset: Exclude<PeriodPreset, "custom">) {
    setPeriodPreset(preset);
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const range = resolveClientPeriodRange(preset, today);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function handleStartDateChange(value: string) {
    setPeriodPreset("custom");
    setStartDate(value);
    if (endDate && value && value > endDate) {
      setEndDate(value);
    }
  }

  function handleEndDateChange(value: string) {
    setPeriodPreset("custom");
    setEndDate(value);
    if (startDate && value && value < startDate) {
      setStartDate(value);
    }
  }

  const { rows, summary } = useMemo(
    () =>
      filterAndSummarizeClients(history, {
        search,
        periodPreset,
        startDate,
        endDate,
      }) as { rows: CustomerHistory[]; summary: { appointments: number; completed: number; revenue: number } },
    [history, search, periodPreset, startDate, endDate],
  );

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

      <section className="product-card product-filters management-clients-period-filter" aria-label="Filtro de período dos clientes">
        <div className="product-chip-row management-clients-presets" role="group" aria-label="Atalhos de período">
          <button className="product-chip" type="button" data-active={periodPreset === "month" ? "true" : "false"} onClick={() => selectPreset("month")}>Mês atual</button>
          <button className="product-chip" type="button" data-active={periodPreset === "week" ? "true" : "false"} onClick={() => selectPreset("week")}>Semana atual</button>
          <button className="product-chip" type="button" data-active={periodPreset === "30days" ? "true" : "false"} onClick={() => selectPreset("30days")}>Últimos 30 dias</button>
          <button className="product-chip" type="button" data-active={periodPreset === "all" ? "true" : "false"} onClick={() => selectPreset("all")}>Todo o período</button>
        </div>
        <div className="management-clients-date-range">
          <div className="product-field">
            <label htmlFor="client-period-start">De</label>
            <input id="client-period-start" className="product-input" type="date" value={startDate} max={endDate || undefined} onChange={(event) => handleStartDateChange(event.target.value)} />
          </div>
          <div className="product-field">
            <label htmlFor="client-period-end">Até</label>
            <input id="client-period-end" className="product-input" type="date" value={endDate} min={startDate || undefined} onChange={(event) => handleEndDateChange(event.target.value)} />
          </div>
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
          {!message && rows.length === 0 && <div className="product-empty management-clients-empty" role="status"><strong>Nenhum resultado por aqui</strong><span>{clientEmptyMessage(search, periodPreset !== "all" && history.length > 0)}</span></div>}
        </div>
      </section>

      <p className="management-clients-note">Use o WhatsApp somente para assuntos relacionados ao atendimento e respeite os consentimentos para ações de marketing.</p>
    </div>
  </PanelShell>;
}
