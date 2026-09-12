"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */

import { type User } from "@supabase/supabase-js";
import { customerSupabase as supabase } from "@/utils/supabase";
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
type BusinessHour = {
  weekday: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
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
function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
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
function formatBusinessHour(hour: BusinessHour) {
  if (hour.is_closed || !hour.opens_at || !hour.closes_at) return "Fechado";
  return `${hour.opens_at.slice(0, 5)} às ${hour.closes_at.slice(0, 5)}`;
}
const weekdayLabels = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
function currentTimeMs() {
  return Date.now();
}
function serviceImage(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("sobrancelha")) return "/services/sobrancelha.png";
  if (lower.includes("barba") && lower.includes("corte")) return "/services/corte-barba.png";
  if (lower.includes("barba")) return "/services/barba.png";
  return "/services/corte.png";
}
const pendingBookingKey = "barbeariasp.pending-booking";
const pendingBookingMaxAgeMs = 15 * 60 * 1000;
const pendingBookingExpiredMessage =
  "Sua reserva pendente expirou. Selecione um novo horário.";

export default function PublicBarbershop() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [publicProfessionals, setPublicProfessionals] = useState<
    Record<string, PublicProfessional>
  >({});
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateForInput());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initial = new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4 | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [calendarAvailability, setCalendarAvailability] = useState<
    Record<string, boolean>
  >({});
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [bookingAvailable, setBookingAvailable] = useState(false);
  const [bookingStatusLoaded, setBookingStatusLoaded] = useState(false);
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
  const confirmationRef = useRef<HTMLElement | null>(null);
  const activeStepHeadingRef = useRef<HTMLHeadingElement | null>(null);
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
      const [servicesResult, professionalsResult, businessHoursResult, bookingStatusResult] = await Promise.all([
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
        supabase
          .from("business_hours")
          .select("weekday,opens_at,closes_at,is_closed")
          .eq("barbershop_id", currentShop.id)
          .order("weekday"),
        supabase.rpc("get_public_booking_status", { p_slug: currentShop.slug }),
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
      setBusinessHours(businessHoursResult.error ? [] : (businessHoursResult.data || []) as BusinessHour[]);
      setBookingAvailable(!bookingStatusResult.error && bookingStatusResult.data === true);
      setBookingStatusLoaded(true);
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
    if (!user) {
      return;
    }

    let active = true;
    void supabase
      .from("customers")
      .select("name,phone")
      .eq("auth_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setCustomerName((current) => current || data.name || "");
          setCustomerPhone((current) => current || data.phone || "");
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (showMarketingPreferences) marketingDialogRef.current?.focus();
  }, [showMarketingPreferences]);

  useEffect(() => {
    if (!bookingAvailable || !shop || !selectedServiceIds.length || !selectedDate) {
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
      if (restored) {
        setSelectedSlot(restored);
        setSelectedProfessionalId(restored.professional_id);
        if (user) setBookingStep(4);
      }
    }
    void loadAvailability();
  }, [bookingAvailable, shop, selectedServiceIds, selectedDate, user]);

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
      availability.filter((slot) => !selectedProfessionalId || slot.professional_id === selectedProfessionalId).reduce<Record<string, Availability[]>>(
        (groups, slot) => ({
          ...groups,
          [slot.professional_id]: [
            ...(groups[slot.professional_id] || []),
            slot,
          ],
        }),
        {},
      ),
    [availability, selectedProfessionalId],
  );
  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [calendarMonth]);

  useEffect(() => {
    if (!bookingAvailable || !shop || !services.length || bookingStep !== 1) {
      setCalendarAvailability({});
      return;
    }

    let active = true;
    // T02 preliminary availability invariant:
    // There is no professional-to-service association in the current model;
    // all active professionals are eligible for all active shop services, and
    // the only availability effect of a service is its duration. Therefore, if
    // no slot fits the shortest active service, no slot can fit a longer one.
    // Revisit this probe when "serviços realizados por profissional" exists.
    const probeService = services.reduce((shortest, service) =>
      Number(service.duration_minutes || 0) <
      Number(shortest.duration_minutes || 0)
        ? service
        : shortest,
    );
    const dateKeys = [...new Set(
      calendarDays
        .map(dateKey)
        .filter((key) => key >= dateForInput() && key <= dateForInput(90)),
    )];

    void Promise.all(
      dateKeys.map(async (key) => {
        const { data, error } = await supabase.rpc(
          "get_public_availability",
          {
            p_slug: shop.slug,
            p_date: key,
            p_service_ids: [probeService.id],
          },
        );
        return [key, !error && Boolean(data?.length)] as const;
      }),
    ).then((entries) => {
      if (active) setCalendarAvailability(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [bookingAvailable, bookingStep, calendarDays, services, shop]);
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
  }

  function clearPendingBooking() {
    sessionStorage.removeItem(pendingBookingKey);
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
        sessionStorage.getItem(pendingBookingKey) || "null",
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
      setSelectedProfessionalId(saved.professionalId || null);
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
      setBookingStep(4);
      focusBookingStep(4);
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
    setSelectedProfessionalId(slot.professional_id);
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
    setBookingStep(3);
  }

  function startNewBooking() {
    setSelectedServiceIds([]);
    setSelectedSlot(null);
    setSelectedProfessionalId(null);
    setConfirmed(false);
    setShowAuthenticationOptions(false);
    setMessage("");
    setBookingStep(1);
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

  function focusBookingStep(step: 1 | 2 | 3 | 4) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const target = step === 4 ? confirmationRef : bookingRef;
        target.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        activeStepHeadingRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function openBooking(step: 1 | 2 | 3 | 4 = 1) {
    if (!bookingAvailable) {
      setMessage("O agendamento online desta barbearia ainda não está disponível.");
      return;
    }
    setBookingStep(step);
    focusBookingStep(step);
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
      data-public-visitor={!user ? "true" : "false"}
    >
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="BarbeariaSP, início">
          BARBEARIA<span>SP</span>
        </a>
        <nav className={styles.desktopNav} aria-label="Navegação da barbearia">
          <button type="button" onClick={() => scrollToSection("home")}>
            Barbearia
          </button>
          <button type="button" disabled={!bookingAvailable} onClick={() => scrollToSection("booking")}>
            Agenda
          </button>
          {!user && <a href="/entrar">Gestão</a>}
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
              sizes="(max-width: 760px) 100vw, 480px"
              unoptimized
              onError={() => setPhotoUnavailable(true)}
            />
          ) : (
            <Image
              src="/barbeariasp-institutional-hero.png"
              alt={`Foto da ${shop.name}`}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 480px"
            />
          )}
        </div>
        <div className={styles.heroContent}>
          <h1>{shop.name}</h1>
          {shop.address && (
            <p className={styles.addressBadge}>
              <span>📍</span> {shop.address}
            </p>
          )}
          <p className={styles.heroDescription}>
            {shop.description ||
              "Tradição, cuidado e estilo desde 2015. Mais que um corte, uma experiência feita para você sair sempre na sua melhor versão."}
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.heroPrimaryCta}
              type="button"
              disabled={!bookingAvailable}
              onClick={() => openBooking(1)}
            >
              <span>📅 Agendar horário</span>
              <small>Escolha a data</small>
            </button>
            <div className={styles.heroSecondaryRow}>
              {whatsappLink && (
                <a
                  className={styles.whatsappButton}
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>💬</span> WhatsApp
                </a>
              )}
              {mapsLink && (
                <a
                  className={styles.ghostButton}
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>📍</span> Como chegar
                </a>
              )}
            </div>
          </div>
          {bookingStatusLoaded && !bookingAvailable && (
            <p className={styles.bookingUnavailable} role="status">
              <strong>Agendamento online indisponível</strong>
              Esta barbearia ainda está preparando o agendamento online.
            </p>
          )}
        </div>
      </section>

      <div className={styles.content}>
        {bookingStep === null && <>
        {/* Serviços em destaque conforme mockup exec-7b8e1062 */}
        <section className={styles.showcaseSection}>
          <div className={styles.sectionHeaderRow}>
            <h2>Serviços</h2>
            <button
              type="button"
              className={styles.seeAllButton}
              disabled={!bookingAvailable}
              onClick={() => openBooking(2)}
            >
              Ver todos &rsaquo;
            </button>
          </div>
          <div className={styles.serviceCirclesRow}>
            {services.slice(0, 4).map((service) => (
              <button
                key={service.id}
                type="button"
                className={styles.serviceCircleItem}
                disabled={!bookingAvailable}
                onClick={() => {
                  setSelectedServiceIds([service.id]);
                  openBooking(2);
                }}
              >
                <div className={styles.serviceCircleIcon} aria-hidden="true">
                  <Image src={serviceImage(service.name)} alt="" width={48} height={48} />
                </div>
                <strong>{service.name}</strong>
                <span>{service.duration_minutes || 0} min · R$ {Number(service.price).toFixed(2).replace(".", ",")}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Equipe conforme mockup exec-7b8e1062 */}
        <section className={styles.showcaseSection}>
          <div className={styles.sectionHeaderRow}>
            <h2>Nossa equipe</h2>
            <button
              type="button"
              className={styles.seeAllButton}
              disabled={!bookingAvailable}
              onClick={() => scrollToSection("booking")}
            >
              Ver todos &rsaquo;
            </button>
          </div>
          <div className={styles.teamCirclesRow}>
            {Object.values(publicProfessionals).map((professional) => (
              <button key={professional.id} type="button" className={styles.teamCircleItem} disabled={!bookingAvailable} data-has-photo={Boolean(professional.photo_url)} onClick={() => openBooking(2)}>
                {professional.photo_url && <div className={styles.teamCircleAvatar}>
                  <Image src={professional.photo_url} alt="" width={68} height={68} unoptimized />
                </div>}
                <strong>{professional.name}</strong>
                <span>Profissional</span>
              </button>
            ))}
          </div>
        </section>

        {businessHours.length > 0 && (
          <section className={styles.infoCard}>
            <div className={styles.infoCardIcon}>🕒</div>
            <div className={styles.infoCardBody}>
              <h3>Horários de atendimento</h3>
              <div className={styles.infoCardHours}>
                {businessHours.map((hour) => (
                  <p key={hour.weekday}>
                    <span>{weekdayLabels[hour.weekday]}</span>
                    {formatBusinessHour(hour)}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Endereço e contato conforme mockup exec-7b8e1062 */}
        <section className={styles.infoCard}>
          <div className={styles.infoCardIcon}>📍</div>
          <div className={styles.infoCardBody}>
            <h3>Endereço e contato</h3>
            {shop.address && <p className={styles.infoCardAddress}>{shop.address}</p>}
            {shop.phone && <p className={styles.infoCardPhone}>📞 {shop.phone}</p>}
          </div>
        </section>

        </>}

        {bookingStep !== null && <section className={styles.bookingSection} ref={bookingRef}>
          {/* Stepper visual inspirado nos mockups aprovados */}
          <div className={styles.bookingStepper} aria-hidden="true">
            <div className={styles.stepperStep} data-active="true" data-completed={Boolean(selectedDate)}>
              <div className={styles.stepperNode}>1</div>
              <span className={styles.stepperLabel}>Data</span>
            </div>
            <div className={styles.stepperLine} data-completed={selectedServices.length > 0} />
            <div className={styles.stepperStep} data-active={selectedServices.length > 0} data-completed={selectedServices.length > 0}>
              <div className={styles.stepperNode}>2</div>
              <span className={styles.stepperLabel}>Serviços</span>
            </div>
            <div className={styles.stepperLine} data-completed={Boolean(selectedSlot)} />
            <div className={styles.stepperStep} data-active={Boolean(selectedSlot)} data-completed={Boolean(selectedSlot)}>
              <div className={styles.stepperNode}>3</div>
              <span className={styles.stepperLabel}>Horário</span>
            </div>
            <div className={styles.stepperLine} data-completed={confirmed} />
            <div className={styles.stepperStep} data-active={confirmed} data-completed={confirmed}>
              <div className={styles.stepperNode}>4</div>
              <span className={styles.stepperLabel}>Confirmação</span>
            </div>
          </div>

          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>AGENDAMENTO ONLINE</p>
            <h2 ref={activeStepHeadingRef} tabIndex={-1}>{bookingStep === 1 ? "Escolha a data" : bookingStep === 2 ? "Serviços e profissional" : bookingStep === 3 ? "Escolha o horário" : "Confirme seu agendamento"}</h2>
            <p>{bookingStep === 1 ? "Selecione o dia desejado para o seu agendamento." : bookingStep === 2 ? "Selecione de um a três serviços. Você escolherá o horário com o profissional disponível." : bookingStep === 3 ? "Escolha o profissional e o horário que preferir." : "Revise os detalhes antes de confirmar."}</p>
          </div>

          {bookingStep === 1 && (
            <div className={styles.dateStep}>
              <div className={styles.calendarHeader}>
                <button type="button" className={styles.calendarMonthButton} aria-label="Mês anterior" disabled={calendarMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)} onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button>
                <h3>{monthLabel(calendarMonth)}</h3>
                <button type="button" className={styles.calendarMonthButton} aria-label="Próximo mês" disabled={calendarMonth >= new Date(new Date(dateForInput(90)).getFullYear(), new Date(dateForInput(90)).getMonth(), 1)} onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button>
              </div>
              <div className={styles.calendarWeekdays} aria-hidden="true">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className={styles.calendarGrid} role="grid" aria-label="Escolha a data do agendamento">
                {calendarDays.map((day) => {
                  const key = dateKey(day);
                  const available = key >= dateForInput() && key <= dateForInput(90) && calendarAvailability[key] === true;
                const selected = key === selectedDate && available;
                  return <button key={key} type="button" className={styles.calendarDay} data-selected={selected ? "true" : "false"} disabled={!available} aria-pressed={selected} aria-label={new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(day)} onClick={() => { setCalendarMonth(new Date(day.getFullYear(), day.getMonth(), 1)); setSelectedDate(key); setSelectedSlot(null); setConfirmed(false); }}>{day.getDate()}</button>;
                })}
              </div>
              <div className={styles.calendarLegend}><span><i data-kind="selected" />Selecionado</span><span><i data-kind="today" />Hoje</span><span><i data-kind="unavailable" />Indisponível</span></div>
              <button type="button" className={styles.primaryButton} disabled={calendarAvailability[selectedDate] !== true} onClick={() => openBooking(2)}>Continuar</button>
              <button type="button" className={styles.secondaryButton} onClick={() => scrollToSection("home")}>Voltar</button>
            </div>
          )}

          {bookingStep === 2 && <>
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
                    disabled={!isSelected && selectedServiceIds.length >= 3}
                    onClick={() => {
                      setSelectedServiceIds((current) => {
                        if (isSelected) return current.filter((id) => id !== service.id);
                        if (current.length >= 3) {
                          setMessage("Selecione no máximo três serviços por agendamento.");
                          return current;
                        }
                        return [...current, service.id];
                      });
                      setConfirmed(false);
                    }}
                  >
                    <div className={styles.serviceItemLeft}>
                      <div className={styles.serviceCheckbox}>
                        {isSelected ? "✓" : ""}
                      </div>
                      <div className={styles.serviceItemIcon}>
                        <Image src={serviceImage(service.name)} alt="" width={30} height={30} />
                      </div>
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.duration_minutes} minutos</small>
                      </span>
                    </div>
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

          <p className={styles.selectionHint} role="status">
            Escolha até três serviços para o mesmo profissional.
          </p>

          {selectedServices.length > 0 && (
            <>
              <div className={styles.selectionSummary}>
                <strong>{selectedServices.length} de 3 serviços</strong>
                <span>{totalDuration} min · R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
              </div>
              <fieldset className={styles.professionalPicker}>
                <legend>Profissional</legend>
                <div className={styles.professionalPickerRow}>
                  <button type="button" className={styles.professionalChoice} data-selected={selectedProfessionalId === null ? "true" : "false"} onClick={() => setSelectedProfessionalId(null)}>
                    <span className={styles.professionalChoiceAvatar}>✓</span>
                    Sem preferência
                  </button>
                  {Object.values(publicProfessionals).map((professional) => (
                    <button key={professional.id} type="button" className={styles.professionalChoice} data-selected={selectedProfessionalId === professional.id ? "true" : "false"} onClick={() => setSelectedProfessionalId(professional.id)}>
                      {professional.photo_url && (
                        <span className={styles.professionalChoiceAvatar}>
                          <Image src={professional.photo_url} alt="" width={42} height={42} unoptimized />
                        </span>
                      )}
                      {professional.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button type="button" className={styles.primaryButton} onClick={() => openBooking(3)}>Continuar para horários</button>
            </>
          )}
          <button type="button" className={styles.secondaryButton} onClick={() => openBooking(1)}>Voltar</button>
          </>}

          {bookingStep === 3 && selectedServices.length > 0 && (
            <div className={styles.availabilityArea}>
              <button type="button" className={styles.changeDateButton} onClick={() => openBooking(1)}>Alterar data: {formatDate(selectedDate)}</button>
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
                              unoptimized
                              sizes="42px"
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : null}
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
              {selectedSlot && <button type="button" className={styles.primaryButton} onClick={() => openBooking(4)}>Revisar agendamento</button>}
              <button type="button" className={styles.secondaryButton} onClick={() => openBooking(2)}>Voltar</button>
            </div>
          )}

          {bookingStep === 4 && selectedSlot && selectedServices.length > 0 && (
            <section className={styles.confirmationCard} ref={confirmationRef}>
              {user && (
                <div className="user-logged-card">
                  <div className="user-avatar-circle">👤</div>
                  <div>
                    <div className="user-logged-name">
                      Olá, {customerName || user.email?.split("@")[0] || "Cliente"}
                    </div>
                    <div className="user-logged-email">{user.email}</div>
                  </div>
                </div>
              )}

              <div>
                <p className={styles.eyebrow}>BARBEARIASP</p>
                <h3 className={styles.confirmationTitle}>
                  {user ? "Confirme seu agendamento" : "Entre para confirmar"}
                </h3>
                <p className={styles.confirmationIntro}>
                  {user
                    ? "Revise os detalhes do seu agendamento antes de confirmar."
                    : "Entre ou crie sua conta para finalizar. Seus dados e horário serão preservados."}
                </p>
              </div>

              {/* Stepper conectado idêntico à Imagem 5 */}
              <div className="stepper-connected-bar" aria-hidden="true">
                <div className="stepper-step-node">
                  <div className="stepper-circle completed">✓</div>
                  <span className="stepper-step-label">Data</span>
                </div>
                <div className="stepper-connector-line active" />
                <div className="stepper-step-node">
                  <div className="stepper-circle completed">✓</div>
                  <span className="stepper-step-label">Serviço e profissional</span>
                </div>
                <div className="stepper-connector-line active" />
                <div className="stepper-step-node">
                  <div className="stepper-circle completed">✓</div>
                  <span className="stepper-step-label">Horário</span>
                </div>
                <div className="stepper-connector-line active" />
                <div className="stepper-step-node active">
                  <div className="stepper-circle active">4</div>
                  <span className="stepper-step-label">Confirmação</span>
                </div>
              </div>

              {/* Card detalhado de confirmação idêntico à Imagem 5 */}
              <div className="editorial-receipt-card" style={{ marginBottom: 12 }}>
                <div className="editorial-receipt-row">
                  <div className="editorial-receipt-left">
                    <div className="editorial-receipt-icon">📅</div>
                    <div>
                      <div className="editorial-receipt-label">Data</div>
                      <div className="editorial-receipt-value" style={{ textAlign: "left" }}>
                        {formatDate(selectedDate)}
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="editorial-receipt-divider" />
                <div className="editorial-receipt-row">
                  <div className="editorial-receipt-left">
                    <div className="editorial-receipt-icon">🕒</div>
                    <div>
                      <div className="editorial-receipt-label">Horário</div>
                      <div className="editorial-receipt-value" style={{ textAlign: "left" }}>
                        {formatHour(selectedSlot.starts_at)}
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="editorial-receipt-divider" />
                <div className="editorial-receipt-row">
                  <div className="editorial-receipt-left">
                    <div className="editorial-receipt-icon">✂</div>
                    <div>
                      <div className="editorial-receipt-label">Serviços</div>
                      <div className="editorial-receipt-value" style={{ textAlign: "left" }}>
                        {selectedServices.map((s) => `${s.name} — R$ ${s.price.toFixed(2).replace(".", ",")}`).join(" | ")}
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="editorial-receipt-divider" />
                <div className="editorial-receipt-row">
                  <div className="editorial-receipt-left">
                    <div className="editorial-receipt-icon">👤</div>
                    <div>
                      <div className="editorial-receipt-label">Profissional</div>
                      <div className="editorial-receipt-value" style={{ textAlign: "left" }}>
                        {selectedSlot.professional_name}
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="editorial-receipt-divider" />
                <div className="editorial-receipt-row">
                  <div className="editorial-receipt-left">
                    <div className="editorial-receipt-icon">🕒</div>
                    <div>
                      <div className="editorial-receipt-label">Duração</div>
                      <div className="editorial-receipt-value" style={{ textAlign: "left" }}>
                        {totalDuration} min
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="editorial-receipt-divider" />
                <div className="editorial-receipt-row">
                  <div className="editorial-receipt-left">
                    <div className="editorial-receipt-icon">💈</div>
                    <div>
                      <div className="editorial-receipt-label">Barbearia</div>
                      <div className="editorial-receipt-value" style={{ textAlign: "left" }}>
                        {shop.name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Box com destaque terracota */}
              <div className="confirmation-total-box">
                <span className="confirmation-total-label">Total</span>
                <span className="confirmation-total-amount">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {/* Nota de disponibilidade */}
              <div className="confirmation-note-box">
                <span>ⓘ</span>
                <span>A disponibilidade será verificada novamente no momento da confirmação.</span>
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
                    <>
                      <button
                        className={styles.primaryButton}
                        disabled={saving || isAdministrativeShopMember}
                      >
                        {saving ? "Confirmando..." : "Confirmar agendamento"}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        style={{ marginTop: 8, borderColor: "#B45334", color: "#B45334", fontWeight: 700 }}
                        onClick={() => setSelectedSlot(null)}
                      >
                        Alterar agendamento
                      </button>
                    </>
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
        </section>}

        {bookingStep === null && <section className={styles.aboutSection} ref={aboutRef}>
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
        </section>}
      </div>

      <footer className={styles.footer}>
        <span>BarbeariaSP · sua agenda, sua marca, seu atendimento.</span>
        <span>
          Desenvolvido pela Cullentech · {!user ? (
            <a href="/entrar">Acesso da equipe</a>
          ) : null}
        </span>
      </footer>
    </main>
  );
}
