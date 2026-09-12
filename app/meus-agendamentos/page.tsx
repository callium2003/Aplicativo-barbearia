"use client";

import { customerSupabase as supabase } from "@/utils/supabase";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  appointmentShop,
  buildCustomerAppointmentTarget,
} from "@/app/customer-appointment-navigation.mjs";
import { CustomerBottomNavigation } from "@/app/customer-bottom-navigation";

type BarbershopSummary = { name: string; slug: string; whatsapp: string | null };
type CustomerBarbershop = { name: string; slug: string };
type Appointment = {
  id: string;
  starts_at: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  service_ids: string[];
  service_name_snapshot: string | null;
  professional_name_snapshot: string | null;
  barbershops: BarbershopSummary | BarbershopSummary[] | null;
};

type CustomerProfile = { id: string; name: string; email: string | null; phone: string; phone_normalized: string };

type ViewKey = "upcoming" | "history";

const statusLabel: Record<Appointment["status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatDayMonthYear(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function whatsapp(phone?: string | null, shop?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const message = encodeURIComponent(`Olá! Sou cliente${shop ? ` da ${shop}` : ""} e gostaria de falar sobre meu agendamento.`);
  return `https://wa.me/${number}?text=${message}`;
}

function initials(name?: string | null) {
  return (name || "Cliente").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function MeusAgendamentos() {
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [barbershops, setBarbershops] = useState<CustomerBarbershop[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [view, setView] = useState<ViewKey>("upcoming");
  const [message, setMessage] = useState("Carregando sua área...");
  const [busy, setBusy] = useState("");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [cancelPendingId, setCancelPendingId] = useState<string | null>(null);
  const [bookingShopChoices, setBookingShopChoices] = useState(false);
  const appointmentListRef = useRef<HTMLElement | null>(null);
  const cancelConfirmationRef = useRef<HTMLElement | null>(null);
  const bookingShopPickerRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async (isMounted?: () => boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos"); return; }

    const [profileResult, appointmentResult] = await Promise.all([
      supabase.from("customers").select("id,name,email,phone,phone_normalized").eq("auth_user_id", user.id).maybeSingle<CustomerProfile>(),
      supabase.from("appointments").select("id,starts_at,status,service_ids,service_name_snapshot,professional_name_snapshot,barbershops(name,slug,whatsapp)").eq("customer_id", user.id).order("starts_at", { ascending: false }),
    ]);
    if (isMounted && !isMounted()) return;

    if (!profileResult.data) {
      window.location.replace("/cliente/entrar?returnTo=%2Fmeus-agendamentos");
      return;
    }

    const { data: barbershopData } = await supabase
      .from("barbershop_customers")
      .select("barbershops(name,slug)")
      .eq("customer_id", profileResult.data.id);
    if (isMounted && !isMounted()) return;

    setProfile(profileResult.data);
    setBarbershops(
      Array.from(
        new Map(
          ((barbershopData || []) as Array<{ barbershops: CustomerBarbershop | CustomerBarbershop[] | null }>)
            .flatMap((item) => Array.isArray(item.barbershops) ? item.barbershops : item.barbershops ? [item.barbershops] : [])
            .map((barbershop) => [barbershop.slug, barbershop]),
        ).values(),
      ),
    );
    setItems((appointmentResult.data || []) as Appointment[]);
    setCurrentTimeMs(Date.now());
    setMessage(appointmentResult.error ? "Não foi possível carregar seus agendamentos." : "");
  }, []);

  useEffect(() => {
    let active = true;
    const loadTimer = window.setTimeout(() => { void load(() => active); }, 0);
    return () => { active = false; window.clearTimeout(loadTimer); };
  }, [load]);

  useEffect(() => {
    if (!bookingShopChoices) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      bookingShopPickerRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      bookingShopPickerRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bookingShopChoices]);

  const upcoming = useMemo(() => items.filter((item) => item.status === "scheduled" && new Date(item.starts_at).getTime() > currentTimeMs).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)), [items, currentTimeMs]);
  const history = useMemo(() => items.filter((item) => !upcoming.some((future) => future.id === item.id)), [items, upcoming]);
  const visible = view === "upcoming" ? upcoming : history;

  async function change(item: Appointment, rebook = false) {
    const shop = appointmentShop(item.barbershops) as BarbershopSummary | null;
    const targetPath = rebook ? buildCustomerAppointmentTarget(shop, item.service_ids, true) : null;
    if (rebook && !targetPath) {
      setMessage("Não foi possível identificar a barbearia deste agendamento. Nenhuma alteração foi feita.");
      return;
    }
    if (rebook && !window.confirm("A reserva atual será cancelada e você escolherá um novo horário. Continuar?")) return;
    setBusy(item.id); setMessage("");
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", item.id);
    if (error) { setBusy(""); setMessage("Não foi possível atualizar este agendamento."); return; }
    if (rebook && targetPath) {
      router.push(targetPath);
      return;
    }
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, status: "cancelled" } : currentItem));
    setBusy("");
    setCancelPendingId(null);
    setMessage("Agendamento cancelado. Ele foi movido para o seu histórico.");
    selectAppointmentView("history");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  function selectAppointmentView(nextView: ViewKey) {
    setView(nextView);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        appointmentListRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        appointmentListRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function requestCancellation(itemId: string) {
    setCancelPendingId(itemId);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        cancelConfirmationRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
        cancelConfirmationRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function startNewAppointment() {
    if (barbershops.length === 1) {
      router.push(`/${barbershops[0].slug}`);
      return;
    }
    if (barbershops.length > 1) {
      setBookingShopChoices(true);
      return;
    }
    setMessage("Não foi possível encontrar uma barbearia vinculada à sua conta para iniciar um novo agendamento.");
  }

  if (!profile) {
    return <main className="customer-shell" style={{ display: "grid", placeItems: "center" }}><p className="customer-message">{message}</p></main>;
  }

  return (
    <main className="customer-shell customer-agenda-shell">
      <div className="customer-editorial-cover customer-agenda-cover">
        <Image src="/barbeariasp-institutional-hero.png" alt="BarbeariaSP" fill priority sizes="(max-width: 768px) 100vw, 1180px" />
        <div className="customer-editorial-cover-shade" />
      </div>

      <header className="customer-topbar customer-agenda-topbar">
        <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
        <div className="customer-header-actions">
          <Link className="customer-button secondary" href="/meu-perfil">Meu perfil</Link>
          <button className="customer-button secondary" type="button" onClick={() => void signOut()}>Sair</button>
          <div className="customer-avatar" aria-label={profile.name}>{initials(profile.name)}</div>
        </div>
      </header>

      <div className="customer-content customer-agenda-content">
        <header className="customer-agenda-heading">
          <p className="customer-eyebrow">ÁREA DO CLIENTE</p>
          <h1 className="customer-title">Meus agendamentos</h1>
          <p className="customer-subtitle">Acompanhe seus próximos horários e seu histórico.</p>
        </header>

        {message && <p className={`customer-message ${message.includes("Não foi") ? "error" : message.includes("cancelado") || message.includes("mantido") ? "success" : ""}`} role="status">{message}</p>}

        <section ref={appointmentListRef} tabIndex={-1} aria-label="Lista de agendamentos" className="customer-agenda-section" style={{ scrollMarginTop: 88 }}>
          <div className="customer-agenda-tabs" role="tablist" aria-label="Tipo de agendamento">
            <button className="customer-agenda-tab" type="button" role="tab" aria-selected={view === "upcoming"} data-active={view === "upcoming" ? "true" : "false"} onClick={() => selectAppointmentView("upcoming")}>
              Próximos <span>{upcoming.length}</span>
            </button>
            <button className="customer-agenda-tab" type="button" role="tab" aria-selected={view === "history"} data-active={view === "history" ? "true" : "false"} onClick={() => selectAppointmentView("history")}>
              Histórico <span>{history.length}</span>
            </button>
          </div>

          <div className="customer-appointment-list" role="tabpanel">
            {visible.map((item) => {
              const shop = appointmentShop(item.barbershops) as BarbershopSummary | null;
              const canChange = item.status === "scheduled" && new Date(item.starts_at).getTime() > currentTimeMs;
              const itemWhatsapp = whatsapp(shop?.whatsapp, shop?.name);
              return (
                <article className="customer-appointment-list-card" key={item.id}>
                  <div className="customer-appointment-card-head">
                    <div>
                      <p className="customer-appointment-shop">{shop?.name || "Barbearia"}</p>
                      <h2>{formatWeekday(item.starts_at)}, {formatDayMonthYear(item.starts_at)}</h2>
                      <time>{formatHour(item.starts_at)}</time>
                    </div>
                    <span className={`product-status ${item.status}`}>{statusLabel[item.status]}</span>
                  </div>
                  <p className="customer-appointment-service">{item.service_name_snapshot || "Serviço"} <span>·</span> {item.professional_name_snapshot || "Profissional"}</p>
                  <div className="customer-appointment-actions">
                    {canChange && itemWhatsapp && <a className="customer-button secondary" href={itemWhatsapp} target="_blank" rel="noreferrer" aria-label={`Falar com ${shop?.name || "a barbearia"} pelo WhatsApp`}>Falar com a barbearia</a>}
                    {canChange && <button className="customer-button secondary" type="button" disabled={busy === item.id} onClick={() => void change(item, true)}>Reagendar</button>}
                    {canChange && <button className="customer-button secondary" type="button" disabled={busy === item.id} aria-expanded={cancelPendingId === item.id} aria-controls={`cancel-confirmation-${item.id}`} onClick={() => requestCancellation(item.id)}>Cancelar</button>}
                  </div>
                  {cancelPendingId === item.id && (
                    <section ref={cancelConfirmationRef} tabIndex={-1} id={`cancel-confirmation-${item.id}`} className="customer-cancel-confirmation" aria-label="Confirmação de cancelamento" aria-live="polite">
                      <h3>Cancelar agendamento</h3>
                      <p>Esta ação libera o horário e não pode ser desfeita.</p>
                      <div>
                        <button className="customer-button secondary" type="button" onClick={() => { setCancelPendingId(null); setMessage("Seu agendamento foi mantido."); }}>Manter agendamento</button>
                        <button className="customer-button" type="button" disabled={busy === item.id} onClick={() => void change(item)}>{busy === item.id ? "Cancelando..." : "Confirmar cancelamento"}</button>
                      </div>
                    </section>
                  )}
                </article>
              );
            })}
            {!visible.length && (
              <div className="customer-agenda-empty">
                <h2>{view === "upcoming" ? "Nenhum horário marcado" : "Seu histórico ainda está vazio"}</h2>
                <p>{view === "upcoming" ? "Quando quiser, escolha uma barbearia para agendar seu próximo atendimento." : "Seus atendimentos concluídos ou cancelados aparecerão aqui."}</p>
              </div>
            )}
          </div>
        </section>

        <nav className="customer-agenda-shortcuts" aria-label="Atalhos da área do cliente">
          <button type="button" onClick={() => selectAppointmentView(view === "upcoming" ? "history" : "upcoming")}>{view === "upcoming" ? `Ver histórico (${history.length})` : `Ver próximos (${upcoming.length})`}</button>
          <Link href="/meu-perfil">Meus dados</Link>
          <Link href="/meu-perfil#preferencias">Preferências de comunicação</Link>
          <Link href="/meu-perfil/privacidade">Privacidade e meus dados</Link>
        </nav>

        <button className="customer-agenda-book-button" type="button" onClick={startNewAppointment}>Agendar novo horário</button>
        {bookingShopChoices && (
          <section ref={bookingShopPickerRef} tabIndex={-1} className="customer-agenda-shop-picker" role="dialog" aria-modal="true" aria-labelledby="customer-agenda-shop-picker-title" style={{ scrollMarginTop: 88 }}>
            <p className="customer-eyebrow">NOVA RESERVA</p>
            <h2 id="customer-agenda-shop-picker-title">Em qual barbearia você quer agendar?</h2>
            <p>Escolha a barbearia para abrir a agenda correta.</p>
            <div>
              {barbershops.map((barbershop) => (
                <Link className="customer-button secondary" href={`/${barbershop.slug}`} key={barbershop.slug} onClick={() => setBookingShopChoices(false)}>{barbershop.name}</Link>
              ))}
            </div>
            <button className="customer-button secondary" type="button" onClick={() => setBookingShopChoices(false)}>Cancelar</button>
          </section>
        )}
      </div>

      <CustomerBottomNavigation active="agenda" />
    </main>
  );
}
