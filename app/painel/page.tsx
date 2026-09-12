"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ActionFeedback from "./ActionFeedback";
import PanelShell from "./PanelShell";
import { summarizeDailyAppointments } from "./agenda/presentation.mjs";
import { buildManagementHomeAlerts, selectUpcomingManagementAppointments } from "./home/presentation.mjs";
import { getPanelContext } from "@/utils/panel-context";
import { supabase } from "@/utils/supabase";

type Role = "owner" | "manager" | "barber";
type Shop = { id: string; name: string; slug: string; initial_registration_completed?: boolean; role: Role };
type Appointment = { id: string; customer_name: string; starts_at: string; status: "scheduled" | "completed" | "cancelled" | "no_show"; service_name_snapshot: string | null; professional_id: string | null; professional_name_snapshot: string | null };
type Professional = { id: string; name: string; active: boolean };
type ProfessionalHour = { professional_id: string; is_closed: boolean; opens_at: string | null; closes_at: string | null };
type BusinessHour = { is_closed: boolean; opens_at: string | null; closes_at: string | null };
type HomeData = { dailyAppointments: Appointment[]; upcomingAppointments: Appointment[]; alerts: ReturnType<typeof buildManagementHomeAlerts> };

const shortcuts = [
  { href: "/painel/agenda", title: "Agenda", description: "Veja e organize os atendimentos." },
  { href: "/painel/profissionais/novo", title: "Novo profissional", description: "Cadastre quem atende na operação." },
  { href: "/painel/servicos", title: "Novo serviço", description: "Adicione ou atualize o catálogo." },
  { href: "/painel/relatorios", title: "Relatórios", description: "Acompanhe os resultados do período." },
];

function saoPauloDay() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function startOfSaoPauloDay(day: string) { return new Date(`${day}T00:00:00-03:00`); }
function formatTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }

export default function Painel() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [message, setMessage] = useState("Verificando seu acesso...");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPanel() {
      try {
        if (new URLSearchParams(window.location.hash.slice(1)).has("error")) { window.location.replace("/entrar"); return; }
        const context = await getPanelContext(supabase);
        if (!active) return;
        if (!context.userId) { window.location.replace("/entrar"); return; }
        if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }
        if (context.role === "owner" && !context.initialRegistrationCompleted) { window.location.replace("/cadastro-inicial"); return; }

        const { data: shopData, error: shopError } = await supabase.from("barbershops").select("id,name,slug,initial_registration_completed").eq("id", context.barbershopId).maybeSingle<Omit<Shop, "role">>();
        if (!active) return;
        if (shopError || !shopData) { setMessage("Não foi possível carregar sua barbearia."); return; }

        const currentShop: Shop = { ...shopData, role: context.role as Role };
        setShop(currentShop);
        const dayStart = startOfSaoPauloDay(saoPauloDay());
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const now = new Date().toISOString();
        const [dailyResult, servicesResult, professionalsResult, businessHoursResult, professionalHoursResult, futureAppointmentsResult] = await Promise.all([
          supabase.from("appointments").select("id,customer_name,starts_at,status,service_name_snapshot,professional_id,professional_name_snapshot").eq("barbershop_id", currentShop.id).gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString()).order("starts_at"),
          supabase.from("services").select("id").eq("barbershop_id", currentShop.id).eq("active", true),
          supabase.from("professionals").select("id,name,active").eq("barbershop_id", currentShop.id),
          supabase.from("business_hours").select("is_closed,opens_at,closes_at").eq("barbershop_id", currentShop.id),
          supabase.from("professional_hours").select("professional_id,is_closed,opens_at,closes_at"),
          supabase.from("appointments").select("professional_id").eq("barbershop_id", currentShop.id).gte("starts_at", now).eq("status", "scheduled"),
        ]);
        if (!active) return;
        if ([dailyResult, servicesResult, professionalsResult, businessHoursResult, professionalHoursResult, futureAppointmentsResult].some((result) => result.error)) {
          setMessage("Não foi possível carregar a operação agora. Tente novamente em instantes.");
          return;
        }

        const dailyAppointments = (dailyResult.data || []) as Appointment[];
        const professionals = (professionalsResult.data || []) as Professional[];
        const configuredProfessionalIds = new Set(((professionalHoursResult.data || []) as ProfessionalHour[]).filter((hour) => !hour.is_closed && hour.opens_at && hour.closes_at).map((hour) => hour.professional_id));
        const inactiveNames = new Map(professionals.filter((professional) => !professional.active).map((professional) => [professional.id, professional.name]));
        const inactiveCounts = new Map<string, number>();
        for (const appointment of futureAppointmentsResult.data || []) {
          if (appointment.professional_id && inactiveNames.has(appointment.professional_id)) inactiveCounts.set(appointment.professional_id, (inactiveCounts.get(appointment.professional_id) || 0) + 1);
        }
        const alerts = buildManagementHomeAlerts({
          activeServiceCount: servicesResult.data?.length || 0,
          activeProfessionalCount: professionals.filter((professional) => professional.active).length,
          hasOpenBusinessHours: ((businessHoursResult.data || []) as BusinessHour[]).some((hour) => !hour.is_closed && hour.opens_at && hour.closes_at),
          professionalsWithoutSchedule: professionals.filter((professional) => professional.active && !configuredProfessionalIds.has(professional.id)).map((professional) => professional.id),
          inactiveProfessionalCommitments: [...inactiveCounts.entries()].map(([professionalId, appointmentCount]) => ({ professionalId, professionalName: inactiveNames.get(professionalId) || "Profissional", appointmentCount })),
        });
        setHomeData({ dailyAppointments, upcomingAppointments: selectUpcomingManagementAppointments(dailyAppointments, now), alerts });
        setMessage("");
      } catch {
        if (active) setMessage("Não foi possível verificar seu acesso agora. Aguarde alguns instantes e tente novamente.");
      }
    }

    void loadPanel();
    return () => { active = false; };
  }, []);

  async function copyPublicLink() {
    if (!shop?.slug) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/${shop.slug}`); setCopyMessage("Link copiado."); }
    catch { setCopyMessage("Não foi possível copiar o link. Selecione e copie o endereço manualmente."); }
  }

  if (!shop) return <main className="product-shell management-home-loading"><p className="product-message">{message}</p>{message !== "Verificando seu acesso..." && <button type="button" className="management-home-primary-action" onClick={() => window.location.reload()}>Tentar novamente</button>}</main>;

  const isBarber = shop.role === "barber";
  const daySummary = summarizeDailyAppointments(homeData?.dailyAppointments || []);

  return (
    <PanelShell role={shop.role} active="home" shopName={shop.name} barbershopId={shop.id}>
      <main className="management-home product-content">
        <header className="management-home-heading">
          <p className="product-eyebrow">{isBarber ? "Minha rotina" : "Operação diária"}</p>
          <h1 className="product-title">{isBarber ? "Minha agenda" : `Gestão da ${shop.name}`}</h1>
          <p className="product-subtitle">{isBarber ? "Consulte os atendimentos e organize sua rotina de hoje." : "Acompanhe o dia, resolva pendências e mantenha sua agenda disponível."}</p>
        </header>

        {!homeData && <section className="management-home-state" aria-live="polite"><p>{message || "Carregando a operação..."}</p>{message && <button type="button" className="management-home-primary-action" onClick={() => window.location.reload()}>Tentar novamente</button>}</section>}

        {homeData && <>
          {!isBarber && <section className="management-home-public-link" aria-labelledby="public-link-title">
            <div><p className="product-eyebrow">Página pública</p><h2 id="public-link-title">{shop.slug ? `${window.location.host}/${shop.slug}` : "Seu link público ainda não está pronto"}</h2><p>{shop.slug ? "Compartilhe este endereço para clientes conhecerem a barbearia e agendarem." : "Complete os dados públicos da barbearia para disponibilizar seu endereço."}</p></div>
            <div className="management-home-actions">{shop.slug ? <a className="management-home-primary-action" href={`/${shop.slug}`} target="_blank" rel="noreferrer">Abrir página</a> : <Link className="management-home-primary-action" href="/painel/dados-da-barbearia">Completar dados</Link>}{shop.slug && <button className="management-home-secondary-action" type="button" onClick={() => void copyPublicLink()}>Copiar link</button>}<ActionFeedback message={copyMessage} tone={copyMessage.startsWith("Não foi") ? "error" : "success"} /></div>
          </section>}

          <section className="management-home-section" aria-labelledby="home-summary-title"><div className="management-home-section-heading"><div><p className="product-eyebrow">Hoje</p><h2 id="home-summary-title">Resumo da agenda</h2></div><Link href="/painel/agenda" className="management-home-text-link">Ver agenda</Link></div><div className="management-home-summary-grid"><article><span>Atendimentos</span><strong>{daySummary.total}</strong><small>no dia</small></article><article><span>Agendados</span><strong>{daySummary.scheduled}</strong><small>para atender</small></article><article><span>Concluídos</span><strong>{daySummary.completed}</strong><small>finalizados</small></article><article><span>Não compareceram</span><strong>{daySummary.noShow}</strong><small>registrados</small></article></div></section>

          <section className="management-home-section" aria-labelledby="upcoming-title"><div className="management-home-section-heading"><div><p className="product-eyebrow">Próximos atendimentos</p><h2 id="upcoming-title">O que vem a seguir</h2></div></div>{homeData.upcomingAppointments.length > 0 ? <div className="management-home-appointments">{homeData.upcomingAppointments.map((appointment) => <article className="management-home-appointment" key={appointment.id}><time dateTime={appointment.starts_at}>{formatTime(appointment.starts_at)}</time><div><h3>{appointment.customer_name}</h3><p>{appointment.service_name_snapshot || "Serviço a confirmar"}</p></div><span>{appointment.professional_name_snapshot || "Profissional não informado"}</span></article>)}</div> : <div className="management-home-empty"><p>Não há mais atendimentos agendados para hoje.</p><Link href="/painel/agenda" className="management-home-secondary-action">Abrir agenda</Link></div>}</section>

          <section className="management-home-section" aria-labelledby="shortcuts-title"><div className="management-home-section-heading"><div><p className="product-eyebrow">Atalhos</p><h2 id="shortcuts-title">{isBarber ? "Acesso rápido" : "Gestão"}</h2></div></div><div className="management-home-shortcuts">{(isBarber ? shortcuts.slice(0, 1) : shortcuts).map((shortcut) => <Link className="management-home-shortcut" href={shortcut.href} key={shortcut.href}><h3>{isBarber ? "Abrir minha agenda" : shortcut.title}</h3><p>{isBarber ? "Consulte seus atendimentos e sua disponibilidade." : shortcut.description}</p></Link>)}</div></section>

          {!isBarber && <section className="management-home-section" aria-labelledby="alerts-title"><div className="management-home-section-heading"><div><p className="product-eyebrow">Atenção</p><h2 id="alerts-title">Pendências da operação</h2></div></div>{homeData.alerts.length > 0 ? <div className="management-home-alerts">{homeData.alerts.map((alert) => <Link className="management-home-alert" href={alert.href} key={`${alert.kind}-${alert.title}`}><div><h3>{alert.title}</h3><p>{alert.description}</p></div><span aria-hidden="true">Ver</span></Link>)}</div> : <div className="management-home-empty"><p>Sua operação não tem pendências de configuração identificadas.</p></div>}</section>}
        </>}
      </main>
    </PanelShell>
  );
}
