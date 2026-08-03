"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */

import { createClient, type User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildGoogleMapsLink, buildWhatsAppLink } from "@/app/contact-links.mjs";
import { bookingErrorMessage } from "./booking-errors.mjs";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Shop = { id: string; slug: string; name: string; phone: string | null; whatsapp: string | null; address: string | null; description: string | null; photo_url: string | null };
type Service = { id: string; name: string; price: number; duration_minutes: number | null };
type Availability = { professional_id: string; professional_name: string; starts_at: string; ends_at: string };

function dateForInput(offsetDays = 0) { const date = new Date(); date.setDate(date.getDate() + offsetDays); return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }
function formatHour(iso: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso)); }
function formatDate(date: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date(`${date}T12:00:00`)); }
function currentTimeMs() { return Date.now(); }
const buttonBase = { borderRadius: 8, padding: "12px 15px", fontWeight: 800, cursor: "pointer", font: "inherit" } as const;
const pendingBookingKey = "barbeariasp.pending-booking";
const pendingBookingMaxAgeMs = 30 * 60 * 1000;
const pendingBookingExpiredMessage = "Sua reserva pendente expirou. Selecione um novo horário.";

export default function PublicBarbershop() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateForInput());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [email, setEmail] = useState("");
  const [barbershopMarketing, setBarbershopMarketing] = useState(false);
  const [platformMarketing, setPlatformMarketing] = useState(false);
  const [message, setMessage] = useState("Carregando barbearia...");
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [sendingLogin, setSendingLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedDate = query.get("date");
    if (requestedDate && requestedDate >= dateForInput() && requestedDate <= dateForInput(90)) setSelectedDate(requestedDate);
    async function load() {
      const { data: currentShop, error } = await supabase.from("public_barbershop_pages").select("id,slug,name,phone,whatsapp,address,description,photo_url").eq("slug", window.location.pathname.split("/").filter(Boolean).pop() || "").maybeSingle();
      if (error || !currentShop) { setMessage("Esta página de barbearia não foi encontrada."); return; }
      const { data: currentServices } = await supabase.from("public_barbershop_services").select("id,name,price,duration_minutes").eq("barbershop_id", currentShop.id).order("name");
      const loadedServices = currentServices || [];
      const requestedServiceIds = (query.get("services") || query.get("service") || "").split(",").filter(id => loadedServices.some(service => service.id === id));
      if (requestedServiceIds.length) setSelectedServiceIds(requestedServiceIds);
      setPhotoUnavailable(false); setShop(currentShop); setServices(loadedServices); setMessage("");
    }
    void load();
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); setEmail(data.user?.email || ""); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user || null); setEmail(session?.user?.email || ""); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!shop || !selectedServiceIds.length || !selectedDate) { setAvailability([]); return; }
    const currentShop = shop;
    async function loadAvailability() {
      setLoadingAvailability(true); setSelectedSlot(null);
      const { data, error } = await supabase.rpc("get_public_availability", { p_slug: currentShop.slug, p_date: selectedDate, p_service_ids: selectedServiceIds });
      const slots: Availability[] = error ? [] : (data || []); setAvailability(slots); setLoadingAvailability(false);
      const query = new URLSearchParams(window.location.search);
      const restored = slots.find(slot => slot.professional_id === query.get("professional") && slot.starts_at === query.get("starts"));
      if (restored) setSelectedSlot(restored);
    }
    void loadAvailability();
  }, [shop, selectedServiceIds, selectedDate]);

  const whatsappLink = useMemo(() => buildWhatsAppLink(shop?.whatsapp, "Olá! Encontrei a barbearia pelo BarbeariaSP e gostaria de mais informações."), [shop?.whatsapp]);
  const mapsLink = useMemo(() => buildGoogleMapsLink({ address: shop?.address }), [shop?.address]);
  const selectedServices = services.filter(service => selectedServiceIds.includes(service.id));
  const totalDuration = selectedServices.reduce((total, service) => total + Number(service.duration_minutes || 0), 0);
  const totalPrice = selectedServices.reduce((total, service) => total + Number(service.price || 0), 0);
  const availabilityByProfessional = useMemo(() => availability.reduce<Record<string, Availability[]>>((groups, slot) => ({ ...groups, [slot.professional_id]: [...(groups[slot.professional_id] || []), slot] }), {}), [availability]);
  const loginRedirect = typeof window === "undefined" ? "" : window.location.href;
  const photoUrl = shop?.photo_url?.trim() || null;

  function savePendingBooking() {
    if (!shop || !selectedSlot || !selectedServices.length) return;
    sessionStorage.setItem(pendingBookingKey, JSON.stringify({
      barbershopId: shop.id, slug: shop.slug, serviceIds: selectedServices.map((service) => service.id),
      professionalId: selectedSlot.professional_id, startsAt: selectedSlot.starts_at,
      customerName, customerPhone, barbershopMarketing, platformMarketing,
      savedAt: currentTimeMs(),
    }));
  }

  function discardExpiredPendingBooking() {
    sessionStorage.removeItem(pendingBookingKey);
    setSelectedSlot(null);
    const query = new URLSearchParams(window.location.search);
    query.delete("professional"); query.delete("starts");
    const search = query.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
    setMessage(pendingBookingExpiredMessage);
  }

  function restorePendingBooking() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(pendingBookingKey) || "null");
      if (!saved || saved.slug !== shop?.slug || !Array.isArray(saved.serviceIds)) return;
      const savedAt = Number(saved.savedAt);
      const startsAt = typeof saved.startsAt === "string" ? Date.parse(saved.startsAt) : NaN;
      if (!Number.isFinite(savedAt) || !Number.isFinite(startsAt) || currentTimeMs() - savedAt > pendingBookingMaxAgeMs || startsAt <= currentTimeMs()) {
        discardExpiredPendingBooking();
        return;
      }
      setSelectedServiceIds(saved.serviceIds);
      setCustomerName(saved.customerName || ""); setCustomerPhone(saved.customerPhone || "");
      setBarbershopMarketing(Boolean(saved.barbershopMarketing)); setPlatformMarketing(Boolean(saved.platformMarketing));
      const query = new URLSearchParams({ services: saved.serviceIds.join(","), date: saved.startsAt.slice(0, 10), professional: saved.professionalId, starts: saved.startsAt });
      window.history.replaceState({}, "", `${window.location.pathname}?${query.toString()}`);
    } catch { sessionStorage.removeItem(pendingBookingKey); }
  }

  useEffect(() => {
    if (!shop || !user) return;
    const restoreTimer = window.setTimeout(() => restorePendingBooking(), 0);
    return () => window.clearTimeout(restoreTimer);
    // restore is intentionally driven only after the authenticated shop loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, user]);

  function chooseSlot(slot: Availability) {
    setSelectedSlot(slot); setConfirmed(false); setMessage("");
    const query = new URLSearchParams({ services: selectedServiceIds.join(","), date: selectedDate, professional: slot.professional_id, starts: slot.starts_at });
    window.history.replaceState({}, "", `${window.location.pathname}?${query.toString()}`);
  }

  async function continueWithGoogle() {
    savePendingBooking(); setSendingLogin(true); setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: loginRedirect } });
    if (error) { setSendingLogin(false); setMessage("Não foi possível abrir o login Google."); }
  }

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault(); if (!email) return; savePendingBooking(); setSendingLogin(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: loginRedirect } });
    setSendingLogin(false); setMessage(error ? "Não foi possível enviar o link. Confira seu e-mail." : "Enviamos um link de acesso para seu e-mail. Abra-o para continuar o agendamento.");
  }

  async function confirmAppointment(event: FormEvent) {
    event.preventDefault();
    if (!shop || !selectedServices.length || !selectedSlot || !user) return;
    const normalizedPhone = customerPhone.replace(/\D/g, "");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      setMessage("Informe um telefone válido com DDD.");
      return;
    }
    setSaving(true); setMessage("");
    const { data: refreshedAvailability, error: availabilityError } = await supabase.rpc("get_public_availability", {
      p_slug: shop.slug,
      p_date: selectedDate,
      p_service_ids: selectedServices.map(service => service.id),
    });
    const slotIsStillAvailable = !availabilityError && (refreshedAvailability || []).some((slot: Availability) => slot.professional_id === selectedSlot.professional_id && slot.starts_at === selectedSlot.starts_at);
    if (!slotIsStillAvailable) {
      setSaving(false); setSelectedSlot(null);
      setMessage("Este horário não está mais disponível. Selecione um novo horário.");
      return;
    }
    const { error } = await supabase.rpc("book_customer_appointment", {
      p_barbershop_id: shop.id,
      p_service_ids: selectedServices.map(service => service.id),
      p_professional_id: selectedSlot.professional_id,
      p_starts_at: selectedSlot.starts_at,
      p_customer_name: customerName.trim(),
      p_customer_phone: normalizedPhone,
      p_barbershop_marketing: barbershopMarketing,
      p_platform_marketing: platformMarketing,
    });
    setSaving(false);
    if (error) {
      console.error("Falha na RPC de confirmação de agendamento", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setMessage(bookingErrorMessage(error));
      return;
    }
    sessionStorage.removeItem(pendingBookingKey); setConfirmed(true); setMessage("");
  }

  if (!shop) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial,sans-serif" }}><p>{message}</p></main>;
  return <main style={{ minHeight: "100vh", background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial,sans-serif" }}>
    <header style={{ background: "#171310", color: "white", padding: "18px max(20px,7vw)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: "white", textDecoration: "none", fontWeight: 900, letterSpacing: ".04em" }}>BARBEARIA<span style={{ color: "#e99358" }}>SP</span></a><a href="/meus-agendamentos" style={{ color: "#d7ccc0", fontSize: 13 }}>Meus agendamentos</a></header>
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "34px 20px 70px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24, alignItems: "stretch" }}>
        <div style={{ background: "#231a15", color: "white", borderRadius: 16, padding: "clamp(26px,5vw,54px)" }}><p style={{ color: "#f0a46f", fontWeight: 800, letterSpacing: 1.4, fontSize: 12, marginTop: 0 }}>SUA PRÓXIMA VISITA</p><h1 style={{ font: "bold clamp(38px,7vw,68px)/.95 Georgia,serif", margin: "0 0 18px" }}>{shop.name}</h1><p style={{ color: "#ded0c3", maxWidth: 560, fontSize: 17, lineHeight: 1.55 }}>{shop.description || "Cortes, barba e estilo."}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>{whatsappLink && <a href={whatsappLink} aria-label={`Falar no WhatsApp da ${shop.name}`} target="_blank" rel="noreferrer" style={{ background: "#1b9b53", color: "white", textDecoration: "none", borderRadius: 7, padding: "13px 16px", fontWeight: 800 }}>💬 Falar no WhatsApp</a>}{mapsLink && <a href={mapsLink} aria-label={`Ver rota para ${shop.name} no Google Maps`} target="_blank" rel="noreferrer" style={{ border: "1px solid #c8aa91", color: "white", textDecoration: "none", borderRadius: 7, padding: "13px 16px", fontWeight: 800 }}>📍 Como chegar</a>}</div></div>
        <div style={{ background: "white", border: "1px solid #e5ddd5", borderRadius: 16, overflow: "hidden" }}>{photoUrl && !photoUnavailable ? <img src={photoUrl} alt={`Foto da ${shop.name}`} onError={() => setPhotoUnavailable(true)} style={{ width: "100%", height: 255, display: "block", objectFit: "cover" }} /> : <div style={{ height: 255, background: "linear-gradient(135deg,#e0a477,#2a1d17 65%,#c36d3a)", display: "grid", placeItems: "center", color: "white", font: "bold 24px Georgia,serif" }}>Sua barbearia</div>}<div style={{ padding: 20 }}><b>Endereço</b><p style={{ margin: "6px 0 0", color: "#6d6257", lineHeight: 1.5 }}>{shop.address || "Endereço a confirmar"}</p>{shop.phone && <><b style={{ display: "block", marginTop: 14 }}>Telefone</b><p style={{ margin: "6px 0 0", color: "#6d6257" }}>{shop.phone}</p></>}</div></div>
      </div>
      <section style={{ marginTop: 32, background: "white", border: "1px solid #e5ddd5", borderRadius: 16, padding: "clamp(22px,4vw,34px)" }}>
        <p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }}>AGENDAMENTO</p><h2 style={{ font: "bold clamp(31px,5vw,46px) Georgia,serif", margin: "0 0 8px" }}>Escolha seus serviços</h2><p style={{ color: "#6d6257", margin: "0 0 22px", lineHeight: 1.5 }}>Você pode selecionar mais de um serviço. Os horários consideram a duração total.</p>
        <div style={{ display: "grid", gap: 10 }}>{services.length ? services.map(service => { const isSelected = selectedServiceIds.includes(service.id); return <button key={service.id} onClick={() => { setSelectedServiceIds(current => isSelected ? current.filter(id => id !== service.id) : [...current, service.id]); setConfirmed(false); }} style={{ textAlign: "left", background: isSelected ? "#fce9dc" : "white", border: isSelected ? "2px solid #d7612c" : "1px solid #e5ddd5", borderRadius: 10, padding: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><span><b style={{ fontSize: 17 }}>{isSelected ? "✓ " : ""}{service.name}</b><br /><small style={{ color: "#6d6257" }}>{service.duration_minutes} minutos</small></span><b style={{ color: "#b84a1d", whiteSpace: "nowrap" }}>R$ {Number(service.price).toFixed(2).replace(".", ",")}</b></button>; }) : <p style={{ color: "#6d6257" }}>Os serviços serão publicados em breve.</p>}</div>
        {selectedServices.length > 0 && <div style={{ marginTop: 18, padding: 14, background: "#fff7f1", borderRadius: 9, color: "#512f20" }}><b>{selectedServices.length === 1 ? "Serviço selecionado" : "Serviços selecionados"}: </b>{selectedServices.map(service => service.name).join(" + ")}<br /><small><b>Total:</b> {totalDuration} minutos · R$ {totalPrice.toFixed(2).replace(".", ",")}</small></div>}
        {selectedServices.length > 0 && <div style={{ marginTop: 26, paddingTop: 24, borderTop: "1px solid #e5ddd5" }}><label htmlFor="appointment-date" style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>Escolha a data para os serviços selecionados</label><input id="appointment-date" type="date" value={selectedDate} min={dateForInput()} max={dateForInput(90)} onChange={event => { setSelectedDate(event.target.value); setConfirmed(false); }} style={{ font: "inherit", padding: 12, border: "1px solid #cfc2b8", borderRadius: 7, width: "min(100%, 280px)" }} />
          <div style={{ marginTop: 22 }}><h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Profissionais e horários disponíveis</h3>{loadingAvailability ? <p style={{ color: "#6d6257" }}>Consultando a agenda...</p> : Object.keys(availabilityByProfessional).length ? <div style={{ display: "grid", gap: 14 }}>{Object.values(availabilityByProfessional).map(slots => <div key={slots[0].professional_id} style={{ border: "1px solid #e5ddd5", borderRadius: 10, padding: 16 }}><b>{slots[0].professional_name}</b><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{slots.map(slot => <button key={slot.starts_at} type="button" onClick={() => chooseSlot(slot)} style={{ ...buttonBase, padding: "9px 11px", border: selectedSlot?.starts_at === slot.starts_at && selectedSlot.professional_id === slot.professional_id ? "2px solid #d7612c" : "1px solid #d7ccc0", background: selectedSlot?.starts_at === slot.starts_at && selectedSlot.professional_id === slot.professional_id ? "#fce9dc" : "#fff" }}>{formatHour(slot.starts_at)}</button>)}</div></div>)}</div> : <p style={{ color: "#6d6257", lineHeight: 1.5 }}>Não há horário disponível nessa data. Escolha outro dia.</p>}</div>
        </div>}
        {selectedSlot && selectedServices.length > 0 && <section style={{ marginTop: 28, padding: 20, borderRadius: 12, background: "#fff7f1", border: "1px solid #ebc7af" }}><h3 style={{ marginTop: 0 }}>Confirme seus dados</h3><p style={{ lineHeight: 1.5 }}>Você escolheu <b>{selectedServices.map(service => service.name).join(" + ")}</b> ({totalDuration} minutos) com <b>{selectedSlot.professional_name}</b>, {formatDate(selectedDate)} às <b>{formatHour(selectedSlot.starts_at)}</b>.</p>{confirmed ? <p style={{ background: "#e5f5e8", color: "#195c2b", padding: 14, borderRadius: 8, fontWeight: 800 }}>Agendamento confirmado. A barbearia terá seus dados de contato para falar com você se precisar.</p> : user ? <form onSubmit={confirmAppointment} style={{ display: "grid", gap: 12, maxWidth: 520 }}><label><b>E-mail</b><input value={user.email || ""} disabled style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, border: "1px solid #d7ccc0", borderRadius: 7, background: "#f1ece7" }} /></label><label><b>Seu nome</b><input required minLength={2} value={customerName} onChange={event => setCustomerName(event.target.value)} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, border: "1px solid #cfc2b8", borderRadius: 7 }} /></label><label><b>Celular com DDD</b><input required inputMode="tel" minLength={10} value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} placeholder="(11) 99999-9999" style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, border: "1px solid #cfc2b8", borderRadius: 7 }} /></label><label style={{ display: "flex", alignItems: "flex-start", gap: 9, lineHeight: 1.4, cursor: "pointer" }}><input type="checkbox" checked={barbershopMarketing} onChange={event => setBarbershopMarketing(event.target.checked)} style={{ marginTop: 3 }} />Quero receber promoções e novidades desta barbearia.</label><label style={{ display: "flex", alignItems: "flex-start", gap: 9, lineHeight: 1.4, cursor: "pointer" }}><input type="checkbox" checked={platformMarketing} onChange={event => setPlatformMarketing(event.target.checked)} style={{ marginTop: 3 }} />Quero receber novidades, benefícios e serviços da plataforma relacionados ao segmento.</label><small style={{ color: "#6d6257", lineHeight: 1.45 }}>As opções acima são voluntárias e não afetam sua reserva.</small><button disabled={saving} style={{ ...buttonBase, border: 0, background: "#d7612c", color: "white" }}>{saving ? "Confirmando..." : "Confirmar agendamento"}</button></form> : <div style={{ display: "grid", gap: 12, maxWidth: 520 }}><p style={{ margin: 0, lineHeight: 1.5 }}>Para proteger sua reserva, confirme seu e-mail. Você pode entrar com Google ou receber um link de acesso, sem criar senha.</p><button type="button" onClick={continueWithGoogle} disabled={sendingLogin} style={{ ...buttonBase, border: "1px solid #cfc2b8", background: "white" }}>Continuar com Google</button><form onSubmit={sendMagicLink} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><label style={{ flex: "1 1 220px" }}><span style={{ display: "block", fontWeight: 800, marginBottom: 5 }}>Seu e-mail</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@email.com" style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cfc2b8", borderRadius: 7 }} /></label><button disabled={sendingLogin} style={{ ...buttonBase, alignSelf: "end", border: 0, background: "#231a15", color: "white" }}>{sendingLogin ? "Enviando..." : "Receber link por e-mail"}</button></form></div>}{message && <p role="status" style={{ marginBottom: 0, color: "#7d3c21", lineHeight: 1.5 }}>{message}</p>}</section>}
      </section>
    </section>
  </main>;
}
