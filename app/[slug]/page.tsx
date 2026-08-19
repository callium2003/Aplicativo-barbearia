"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */

import { type User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  buildGoogleMapsLink,
  buildWhatsAppLink,
} from "@/app/contact-links.mjs";
import { getPanelContext } from "@/utils/panel-context";
import { bookingErrorMessage } from "./booking-errors.mjs";
import styles from "./public-page.module.css";

type Shop = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  description: string | null;
  photo_url: string | null;
};
type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number | null;
};
type Availability = {
  professional_id: string;
  professional_name: string;
  starts_at: string;
  ends_at: string;
};
type PublicProfessional = {
  id: string;
  name: string;
  photo_url: string | null;
  instagram_url: string | null;
};
type MarketingBarbershop = {
  barbershop_id: string;
  barbershop_name: string;
  barbershop_marketing: boolean;
  barbershop_choice_recorded: boolean;
};
type MarketingPreferences = {
  platform_marketing: boolean;
  platform_choice_recorded: boolean;
  barbershops: MarketingBarbershop[];
};

function dateForInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
function formatHour(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${date}T12:00:00`));
}
function currentTimeMs() {
  return Date.now();
}
const pendingBookingKey = "barbeariasp.pending-booking";
const pendingBookingMaxAgeMs = 30 * 60 * 1000;
const pendingBookingExpiredMessage =
  "Sua reserva pendente expirou. Selecione um novo horário.";

export default function PublicBarbershop() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [publicProfessionals, setPublicProfessionals] = useState<
    Record<string, PublicProfessional>
  >({});
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateForInput());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdministrativeShopMember, setIsAdministrativeShopMember] =
    useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showMarketingPreferences, setShowMarketingPreferences] = useState(false);
  const [showPlatformMarketingPreference, setShowPlatformMarketingPreference] = useState(false);
  const [showBarbershopMarketingPreference, setShowBarbershopMarketingPreference] = useState(false);
  const [barbershopMarketing, setBarbershopMarketing] = useState(false);
  const [platformMarketing, setPlatformMarketing] = useState(false);
  const [savingMarketingPreferences, setSavingMarketingPreferences] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState("");
  const [message, setMessage] = useState("Carregando barbearia...");
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [sendingLogin, setSendingLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
  const [showAuthenticationOptions, setShowAuthenticationOptions] =
    useState(false);
  const homeRef = useRef<HTMLElement | null>(null);
  const bookingRef = useRef<HTMLElement | null>(null);
  const aboutRef = useRef<HTMLElement | null>(null);
  const marketingDialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedDate = query.get("date");
    if (
      requestedDate &&
      requestedDate >= dateForInput() &&
      requestedDate <= dateForInput(90)
    )
      setSelectedDate(requestedDate);
    async function load() {
      const { data: currentShop, error } = await supabase
        .from("public_barbershop_pages")
        .select("id,slug,name,phone,whatsapp,address,description,photo_url")
        .eq(
          "slug",
          window.location.pathname.split("/").filter(Boolean).pop() || "",
        )
        .maybeSingle();
      if (error || !currentShop) {
        setMessage("Esta página de barbearia não foi encontrada.");
        return;
      }
      const [servicesResult, professionalsResult] = await Promise.all([
        supabase
          .from("public_barbershop_services")
          .select("id,name,price,duration_minutes")
          .eq("barbershop_id", currentShop.id)
          .order("name"),
        supabase
          .from("public_professionals")
          .select("id,name,photo_url,instagram_url")
          .eq("barbershop_id", currentShop.id)
          .order("name"),
      ]);
      const currentServices = servicesResult.data;
      const loadedServices = currentServices || [];
      const requestedServiceIds = (
        query.get("services") ||
        query.get("service") ||
        ""
      )
        .split(",")
        .filter((id) => loadedServices.some((service) => service.id === id));
      if (requestedServiceIds.length)
        setSelectedServiceIds(requestedServiceIds);
      setPublicProfessionals(
        Object.fromEntries(
          ((professionalsResult.data || []) as PublicProfessional[]).map(
            (professional) => [professional.id, professional],
          ),
        ),
      );
      setPhotoUnavailable(false);
      setShop(currentShop);
      setServices(loadedServices);
      setMessage("");
    }
    void load();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setEmail(data.user?.email || "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setEmail(session?.user?.email || "");
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !shop) {
      setIsAdministrativeShopMember(false);
      return;
    }

    let active = true;
    void getPanelContext(supabase)
      .then((context) => {
        if (!active) return;
        setIsAdministrativeShopMember(
          context.barbershopId === shop.id && context.role !== null,
        );
      })
      .catch(() => {
        if (active) setIsAdministrativeShopMember(false);
      });

    return () => {
      active = false;
    };
  }, [shop, user]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    void supabase
      .from("customers")
      .select("name,phone")
      .eq("auth_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setCustomerName((current) => current || data.name || "");
        setCustomerPhone((current) => current || data.phone || "");
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (showMarketingPreferences) marketingDialogRef.current?.focus();
  }, [showMarketingPreferences]);

  useEffect(() => {
    if (!shop || !selectedServiceIds.length || !selectedDate) {
      setAvailability([]);
      return;
    }
    const currentShop = shop;
    async function loadAvailability() {
      setLoadingAvailability(true);
      setSelectedSlot(null);
      const { data, error } = await supabase.rpc("get_public_availability", {
        p_slug: currentShop.slug,
        p_date: selectedDate,
        p_service_ids: selectedServiceIds,
      });
      const slots: Availability[] = error ? [] : data || [];
      setAvailability(slots);
      setLoadingAvailability(false);
      const query = new URLSearchParams(window.location.search);
      const restored = slots.find(
        (slot) =>
          slot.professional_id === query.get("professional") &&
          slot.starts_at === query.get("starts"),
      );
      if (restored) setSelectedSlot(restored);
    }
    void loadAvailability();
  }, [shop, selectedServiceIds, selectedDate]);

  const whatsappLink = useMemo(
    () =>
      buildWhatsAppLink(
        shop?.whatsapp,
        "Olá! Encontrei a barbearia pelo BarbeariaSP e gostaria de mais informações.",
      ),
    [shop?.whatsapp],
  );
  const mapsLink = useMemo(
    () => buildGoogleMapsLink({ address: shop?.address }),
    [shop?.address],
  );
  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id),
  );
  const totalDuration = selectedServices.reduce(
    (total, service) => total + Number(service.duration_minutes || 0),
    0,
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + Number(service.price || 0),
    0,
  );
  const availabilityByProfessional = useMemo(
    () =>
      availability.reduce<Record<string, Availability[]>>(
        (groups, slot) => ({
          ...groups,
          [slot.professional_id]: [
            ...(groups[slot.professional_id] || []),
            slot,
          ],
        }),
        {},
      ),
    [availability],
  );
  const loginRedirect =
    typeof window === "undefined" ? "" : window.location.href;
  const photoUrl = shop?.photo_url?.trim() || null;

  function savePendingBooking(phone = customerPhone) {
    if (!shop || !selectedSlot || !selectedServices.length) return;
    const pendingBooking = JSON.stringify({
      barbershopId: shop.id,
      slug: shop.slug,
      serviceIds: selectedServices.map((service) => service.id),
      professionalId: selectedSlot.professional_id,
      startsAt: selectedSlot.starts_at,
      customerName,
      customerPhone: phone,
      savedAt: currentTimeMs(),
    });
    sessionStorage.setItem(pendingBookingKey, pendingBooking);
    localStorage.setItem(pendingBookingKey, pendingBooking);
  }

  function clearPendingBooking() {
    sessionStorage.removeItem(pendingBookingKey);
    localStorage.removeItem(pendingBookingKey);
  }

  function discardExpiredPendingBooking() {
    clearPendingBooking();
    setSelectedSlot(null);
    const query = new URLSearchParams(window.location.search);
    query.delete("professional");
    query.delete("starts");
    const search = query.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
    setMessage(pendingBookingExpiredMessage);
  }

  function restorePendingBooking() {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(pendingBookingKey) ||
          localStorage.getItem(pendingBookingKey) ||
          "null",
      );
      if (
        !saved ||
        saved.slug !== shop?.slug ||
        !Array.isArray(saved.serviceIds)
      )
        return;
      const savedAt = Number(saved.savedAt);
      const startsAt =
        typeof saved.startsAt === "string" ? Date.parse(saved.startsAt) : NaN;
      if (
        !Number.isFinite(savedAt) ||
        !Number.isFinite(startsAt) ||
        currentTimeMs() - savedAt > pendingBookingMaxAgeMs ||
        startsAt <= currentTimeMs()
      ) {
        discardExpiredPendingBooking();
        return;
      }
      setSelectedServiceIds(saved.serviceIds);
      setCustomerName(saved.customerName || "");
      setCustomerPhone(saved.customerPhone || "");
      const query = new URLSearchParams({
        services: saved.serviceIds.join(","),
        date: saved.startsAt.slice(0, 10),
        professional: saved.professionalId,
        starts: saved.startsAt,
      });
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${query.toString()}`,
      );
    } catch {
      clearPendingBooking();
    }
  }

  useEffect(() => {
    if (!shop || !user) return;
    const restoreTimer = window.setTimeout(() => restorePendingBooking(), 0);
    return () => window.clearTimeout(restoreTimer);
    // restore is intentionally driven only after the authenticated shop loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, user]);

  function chooseSlot(slot: Availability) {
    setSelectedSlot(slot);
    setConfirmed(false);
    setShowAuthenticationOptions(false);
    setMessage("");
    const query = new URLSearchParams({
      services: selectedServiceIds.join(","),
      date: selectedDate,
      professional: slot.professional_id,
      starts: slot.starts_at,
    });
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${query.toString()}`,
    );
  }

  function startNewBooking() {
    setSelectedServiceIds([]);
    setSelectedSlot(null);
    setConfirmed(false);
    setShowAuthenticationOptions(false);
    setMessage("");
    clearPendingBooking();
    const query = new URLSearchParams(window.location.search);
    query.delete("services");
    query.delete("service");
    query.delete("professional");
    query.delete("starts");
    const search = query.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
    scrollToSection("booking");
  }

  function scrollToSection(section: "home" | "booking" | "about") {
    const targets = { home: homeRef, booking: bookingRef, about: aboutRef };
    targets[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function normalizedCustomerPhone() {
    const normalizedPhone = customerPhone.replace(/\D/g, "");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      setMessage("Informe um telefone válido com DDD.");
      return null;
    }
    return normalizedPhone;
  }

  function requestAuthentication(event: FormEvent) {
    event.preventDefault();
    const normalizedPhone = normalizedCustomerPhone();
    if (!normalizedPhone) return;
    setCustomerPhone(normalizedPhone);
    savePendingBooking(normalizedPhone);
    setShowAuthenticationOptions(true);
    setMessage("Escolha como deseja confirmar seu e-mail para continuar.");
  }

  async function continueWithGoogle() {
    const normalizedPhone = normalizedCustomerPhone();
    if (!normalizedPhone) return;
    savePendingBooking(normalizedPhone);
    setSendingLogin(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: loginRedirect },
    });
    if (error) {
      setSendingLogin(false);
      setMessage("Não foi possível abrir o login Google.");
    }
  }

  async function sendMagicLink() {
    const normalizedPhone = normalizedCustomerPhone();
    if (!normalizedPhone) return;
    if (!email) {
      setMessage("Informe seu e-mail para receber o link de acesso.");
      return;
    }
    savePendingBooking(normalizedPhone);
    setSendingLogin(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: loginRedirect },
    });
    setSendingLogin(false);
    setMessage(
      error
        ? "Não foi possível enviar o link. Confira seu e-mail."
        : "Enviamos um link de acesso para seu e-mail. Abra-o para continuar o agendamento.",
    );
  }

  async function confirmAppointment(event: FormEvent) {
    event.preventDefault();
    if (!shop || !selectedServices.length || !selectedSlot || !user) return;
    if (isAdministrativeShopMember) {
      setMessage(
        "Use uma conta de cliente separada para agendar na sua própria barbearia.",
      );
      return;
    }
    const normalizedPhone = normalizedCustomerPhone();
    if (!normalizedPhone) return;
    setSaving(true);
    setMessage("");
    const { data: refreshedAvailability, error: availabilityError } =
      await supabase.rpc("get_public_availability", {
        p_slug: shop.slug,
        p_date: selectedDate,
        p_service_ids: selectedServices.map((service) => service.id),
      });
    const slotIsStillAvailable =
      !availabilityError &&
      (refreshedAvailability || []).some(
        (slot: Availability) =>
          slot.professional_id === selectedSlot.professional_id &&
          slot.starts_at === selectedSlot.starts_at,
      );
    if (!slotIsStillAvailable) {
      setSaving(false);
      setSelectedSlot(null);
      setMessage(
        "Este horário não está mais disponível. Selecione um novo horário.",
      );
      return;
    }
    const { error } = await supabase.rpc("book_customer_appointment", {
      p_barbershop_id: shop.id,
      p_service_ids: selectedServices.map((service) => service.id),
      p_professional_id: selectedSlot.professional_id,
      p_starts_at: selectedSlot.starts_at,
      p_customer_name: customerName.trim(),
      p_customer_phone: normalizedPhone,
    });
    setSaving(false);
    if (error) {
      console.error("Falha na RPC de confirmação de agendamento", {
        code: error.code || "operation_failed",
      });
      setMessage(bookingErrorMessage(error));
      return;
    }
    clearPendingBooking();
    setConfirmed(true);
    setMessage("");
    void prepareMarketingPreferences();
  }

  async function prepareMarketingPreferences() {
    if (!shop) return;
    const { data, error } = await supabase.rpc("get_my_customer_marketing_preferences");
    if (error || !data) return;
    const preferences = data as MarketingPreferences;
    const currentBarbershop = preferences.barbershops.find(
      (barbershop) => barbershop.barbershop_id === shop.id,
    );
    const needsPlatform = !preferences.platform_choice_recorded;
    const needsBarbershop = !currentBarbershop?.barbershop_choice_recorded;
    if (!needsPlatform && !needsBarbershop) return;

    setShowPlatformMarketingPreference(needsPlatform);
    setShowBarbershopMarketingPreference(needsBarbershop);
    setPlatformMarketing(false);
    setBarbershopMarketing(false);
    setMarketingMessage("");
    setShowMarketingPreferences(true);
  }

  async function saveMarketingPreferences(continueWithoutMarketing = false) {
    if (!shop) return;
    setSavingMarketingPreferences(true);
    setMarketingMessage("");
    const { error } = await supabase.rpc("save_my_customer_marketing_preferences", {
      p_barbershop_id: shop.id,
      p_barbershop_marketing: continueWithoutMarketing ? false : barbershopMarketing,
      p_platform_marketing: continueWithoutMarketing ? false : platformMarketing,
      p_save_barbershop: showBarbershopMarketingPreference,
      p_save_platform: showPlatformMarketingPreference,
    });
    setSavingMarketingPreferences(false);
    if (error) {
      setMarketingMessage("Não foi possível salvar suas preferências agora. Seu agendamento continua confirmado.");
      return;
    }
    setShowMarketingPreferences(false);
  }

  if (!shop)
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#f6f2ed",
          color: "#1b1714",
          fontFamily: "Arial,sans-serif",
        }}
      >
        <p>{message}</p>
      </main>
    );
  return (
    <main
      className={styles.page}
      data-public-visitor={!user || isAdministrativeShopMember ? "true" : "false"}
    >
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="BarbeariaSP, início">
          BARBEARIA<span>SP</span>
        </a>
        <nav className={styles.desktopNav} aria-label="Navegação da barbearia">
          <button type="button" onClick={() => scrollToSection("home")}>
            Barbearia
          </button>
          <button type="button" onClick={() => scrollToSection("booking")}>
            Agenda
          </button>
          {!user && <a href="/entrar">Gestão</a>}
          <a href="/meu-perfil">Meu perfil</a>
        </nav>
      </header>

      <section className={styles.hero} ref={homeRef}>
        <div className={styles.heroImage} style={{ position: "relative" }}>
          {photoUrl && !photoUnavailable ? (
            <Image
              src={photoUrl}
              alt={`Foto da ${shop.name}`}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 55vw"
              onError={() => setPhotoUnavailable(true)}
            />
          ) : (
            <div className={styles.photoFallback}>BarbeariaSP</div>
          )}
        </div>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>SUA PRÓXIMA VISITA</p>
          <h1>{shop.name}</h1>
          <p className={styles.heroDescription}>
            {shop.description ||
              "Cortes, barba e estilo. Reserve seu horário de forma simples e segura."}
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => scrollToSection("booking")}
            >
              Agendar horário
            </button>
            {whatsappLink && (
              <a
                className={styles.whatsappButton}
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </a>
            )}
            {mapsLink && (
              <a
                className={styles.ghostButton}
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
              >
                Como chegar
              </a>
            )}
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.quickActions} aria-label="Ações rápidas">
          <button type="button" onClick={() => scrollToSection("booking")}>
            <strong>Agendar</strong>
            <span>Escolha serviço, profissional e horário</span>
          </button>
          <a href="/meus-agendamentos">
            <strong>Meus horários</strong>
            <span>Reagende ou cancele quando precisar</span>
          </a>
        </section>

        <section className={styles.bookingSection} ref={bookingRef}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>AGENDAMENTO ONLINE</p>
            <h2>Escolha como quer se cuidar</h2>
            <p>
              Selecione um ou mais serviços. A agenda calcula automaticamente a
              duração total.
            </p>
          </div>

          <div className={styles.serviceGrid}>
            {services.length ? (
              services.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    className={styles.serviceCard}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => {
                      setSelectedServiceIds((current) =>
                        isSelected
                          ? current.filter((id) => id !== service.id)
                          : [...current, service.id],
                      );
                      setConfirmed(false);
                    }}
                  >
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.duration_minutes} minutos</small>
                    </span>
                    <b>
                      R$ {Number(service.price).toFixed(2).replace(".", ",")}
                    </b>
                  </button>
                );
              })
            ) : (
              <p className={styles.emptyState}>
                Os serviços serão publicados em breve.
              </p>
            )}
          </div>

          {selectedServices.length > 0 && (
            <div className={styles.selectionSummary}>
              <strong>
                {selectedServices.length === 1
                  ? "Serviço selecionado"
                  : "Serviços selecionados"}
              </strong>
              <span>
                {selectedServices.map((service) => service.name).join(" + ")} ·{" "}
                {totalDuration} min · R${" "}
                {totalPrice.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}

          {selectedServices.length > 0 && (
            <div className={styles.availabilityArea}>
              <label className={styles.fieldLabel} htmlFor="appointment-date">
                Data desejada
              </label>
              <input
                className={styles.dateInput}
                id="appointment-date"
                type="date"
                value={selectedDate}
                min={dateForInput()}
                max={dateForInput(90)}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setConfirmed(false);
                }}
              />
              <div className={styles.availabilityHeading}>
                <h3>Profissionais e horários disponíveis</h3>
                <p>Escolha o profissional e o horário que preferir.</p>
              </div>
              {loadingAvailability ? (
                <p className={styles.emptyState}>Consultando a agenda...</p>
              ) : Object.keys(availabilityByProfessional).length ? (
                <div className={styles.professionalGrid}>
                  {Object.values(availabilityByProfessional).map((slots) => {
                    const professional =
                      publicProfessionals[slots[0].professional_id];
                    return (
                      <article
                        key={slots[0].professional_id}
                        className={styles.professionalCard}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                          }}
                        >
                          {professional?.photo_url ? (
                            <Image
                              src={professional.photo_url}
                              alt={professional.name}
                              width={42}
                              height={42}
                              sizes="42px"
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                display: "grid",
                                width: 42,
                                height: 42,
                                placeItems: "center",
                                borderRadius: "50%",
                                background: "#ead8bc",
                                color: "#593d16",
                                fontWeight: 900,
                              }}
                            >
                              {slots[0].professional_name.slice(0, 1)}
                            </span>
                          )}
                          <div style={{ display: "grid", gap: 3 }}>
                            <strong>{slots[0].professional_name}</strong>
                            <span>Profissional disponível</span>
                            {professional?.instagram_url && (
                              <a
                                href={professional.instagram_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#9a5a00",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                Ver Instagram
                              </a>
                            )}
                          </div>
                        </div>
                        <div className={styles.slotList}>
                          {slots.map((slot) => (
                            <button
                              key={slot.starts_at}
                              type="button"
                              data-selected={
                                selectedSlot?.starts_at === slot.starts_at &&
                                selectedSlot.professional_id ===
                                  slot.professional_id
                                  ? "true"
                                  : "false"
                              }
                              onClick={() => chooseSlot(slot)}
                            >
                              {formatHour(slot.starts_at)}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyState}>
                  Não há horário disponível nesta data. Escolha outro dia.
                </p>
              )}
            </div>
          )}

          {selectedSlot && selectedServices.length > 0 && (
            <section className={styles.confirmationCard}>
              <div>
                <p className={styles.eyebrow}>SEU HORÁRIO</p>
                <h3>Confirme seus dados</h3>
                <p>
                  Você escolheu{" "}
                  <b>
                    {selectedServices
                      .map((service) => service.name)
                      .join(" + ")}
                  </b>{" "}
                  com <b>{selectedSlot.professional_name}</b>,{" "}
                  {formatDate(selectedDate)} às{" "}
                  <b>{formatHour(selectedSlot.starts_at)}</b>.
                </p>
              </div>
              {confirmed ? (
                <section className={styles.bookingSuccess} role="status">
                  <div className={styles.successIcon} aria-hidden="true">
                    ✓
                  </div>
                  <div>
                    <p className={styles.eyebrow}>AGENDADO!</p>
                    <h3>Seu horário está reservado.</h3>
                    <p>
                      Você receberá a confirmação pelos contatos informados. Se
                      precisar, a barbearia também poderá falar com você.
                    </p>
                  </div>
                  <dl className={styles.successDetails}>
                    <div>
                      <dt>Serviço</dt>
                      <dd>
                        {selectedServices
                          .map((service) => service.name)
                          .join(" + ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Profissional</dt>
                      <dd>{selectedSlot.professional_name}</dd>
                    </div>
                    <div>
                      <dt>Data</dt>
                      <dd>{formatDate(selectedDate)}</dd>
                    </div>
                    <div>
                      <dt>Horário</dt>
                      <dd>{formatHour(selectedSlot.starts_at)}</dd>
                    </div>
                    <div>
                      <dt>Valor</dt>
                      <dd>R$ {totalPrice.toFixed(2).replace(".", ",")}</dd>
                    </div>
                  </dl>
                  <div className={styles.successActions}>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      onClick={startNewBooking}
                    >
                      Novo agendamento
                    </button>
                    <a
                      className={styles.secondaryButton}
                      href="/meus-agendamentos"
                    >
              Gerenciar agendamento
                    </a>
                  </div>
                  {showMarketingPreferences && (
                    <section
                      aria-labelledby="marketing-preferences-title"
                      aria-modal="true"
                      className={styles.marketingPreferences}
                      ref={marketingDialogRef}
                      role="dialog"
                      tabIndex={-1}
                    >
                      <div>
                        <p className={styles.eyebrow}>OPCIONAL</p>
                        <h4 id="marketing-preferences-title">Preferências de comunicação</h4>
                        <p>
                          Seu agendamento já está confirmado. Você pode alterar estas escolhas a qualquer momento em Meu perfil.
                        </p>
                      </div>
                      <form
                        className={styles.marketingPreferenceForm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveMarketingPreferences();
                        }}
                      >
                        {showBarbershopMarketingPreference && (
                          <label className={styles.consent}>
                            <input
                              checked={barbershopMarketing}
                              onChange={(event) => setBarbershopMarketing(event.target.checked)}
                              type="checkbox"
                            />
                            <span>Aceito receber promoções e novidades desta barbearia.</span>
                          </label>
                        )}
                        {showPlatformMarketingPreference && (
                          <label className={styles.consent}>
                            <input
                              checked={platformMarketing}
                              onChange={(event) => setPlatformMarketing(event.target.checked)}
                              type="checkbox"
                            />
                            <span>Aceito receber novidades e benefícios do aplicativo BarbeariaSP.</span>
                          </label>
                        )}
                        {marketingMessage && <p className={styles.statusMessage} role="status">{marketingMessage}</p>}
                        <div className={styles.marketingPreferenceActions}>
                          <button className={styles.primaryButton} disabled={savingMarketingPreferences}>
                            {savingMarketingPreferences ? "Salvando..." : "Salvar preferências"}
                          </button>
                          <button
                            className={styles.secondaryButton}
                            disabled={savingMarketingPreferences}
                            onClick={() => void saveMarketingPreferences(true)}
                            type="button"
                          >
                            Continuar sem receber novidades
                          </button>
                        </div>
                      </form>
                    </section>
                  )}
                </section>
              ) : (
                <form
                  onSubmit={user ? confirmAppointment : requestAuthentication}
                  className={styles.confirmationForm}
                >
                  {user && (
                    <label>
                      <span>E-mail</span>
                      <input
                        value={user.email || ""}
                        disabled
                        autoComplete="email"
                      />
                    </label>
                  )}
                  <label>
                    <span>Seu nome</span>
                    <input
                      required
                      minLength={2}
                      autoComplete="name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Celular com DDD</span>
                    <input
                      required
                      inputMode="tel"
                      minLength={10}
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </label>
                  {isAdministrativeShopMember && (
                    <p className={styles.statusMessage} role="status">
                      Para agendar nesta barbearia, entre com uma conta de cliente.
                    </p>
                  )}
                  {user ? (
                    <button
                      className={styles.primaryButton}
                      disabled={saving || isAdministrativeShopMember}
                    >
                      {saving ? "Confirmando..." : "Confirmar agendamento"}
                    </button>
                  ) : (
                    !showAuthenticationOptions && (
                      <button className={styles.primaryButton}>
                        Continuar
                      </button>
                    )
                  )}
                  {!user && showAuthenticationOptions && (
                    <div className={styles.authenticationOptions}>
                      <p>
                        Escolha como deseja confirmar seu e-mail. Seus dados e
                        horário ficam preservados enquanto você entra.
                      </p>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={continueWithGoogle}
                        disabled={sendingLogin}
                      >
                        Continuar com Google
                      </button>
                      <label>
                        <span>Seu e-mail</span>
                        <input
                          required
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="voce@email.com"
                        />
                      </label>
                      <button
                        type="button"
                        className={styles.darkButton}
                        onClick={() => void sendMagicLink()}
                        disabled={sendingLogin}
                      >
                        {sendingLogin
                          ? "Enviando..."
                          : "Receber link por e-mail"}
                      </button>
                    </div>
                  )}
                </form>
              )}
              {message && (
                <p className={styles.statusMessage} role="status">
                  {message}
                </p>
              )}
            </section>
          )}
        </section>

        <section className={styles.aboutSection} ref={aboutRef}>
          <div>
            <p className={styles.eyebrow}>SOBRE A BARBEARIA</p>
            <h2>Informações para sua visita</h2>
            <p>
              {shop.description ||
                "Um atendimento feito para você sair bem e voltar sempre."}
            </p>
          </div>
          <dl>
            <div>
              <dt>Endereço</dt>
              <dd>{shop.address || "Endereço a confirmar"}</dd>
            </div>
            {shop.phone && (
              <div>
                <dt>Telefone</dt>
                <dd>{shop.phone}</dd>
              </div>
            )}
            {mapsLink && (
              <div>
                <dt>Localização</dt>
                <dd>
                  <a href={mapsLink} target="_blank" rel="noreferrer">
                    Abrir rota no mapa
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>BarbeariaSP · sua agenda, sua marca, seu atendimento.</span>
        <span>
          Desenvolvido pela Cullentech · {user && isAdministrativeShopMember ? (
            <a href="/painel">Acessar minha área</a>
          ) : !user ? (
            <a href="/entrar">Acesso da equipe</a>
          ) : null}
        </span>
      </footer>

      <nav className={styles.mobileNav} aria-label="Menu rápido">
        <button type="button" onClick={() => scrollToSection("home")}>
          Barbearia
        </button>
        <button type="button" onClick={() => scrollToSection("booking")}>
          Agenda
        </button>
        {!user && <a href="/entrar">Gestão</a>}
        <a href="/meu-perfil">Meu perfil</a>
      </nav>
    </main>
  );
}
