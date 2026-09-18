"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { type User } from "@supabase/supabase-js";
import { customerSupabase as supabase } from "@/utils/supabase";
import { buildCustomerRescheduleRequest } from "@/app/customer-reschedule-request.mjs";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  buildGoogleMapsLink,
  buildTelephoneLink,
  buildWhatsAppLink,
} from "@/app/contact-links.mjs";
import { getPanelContext } from "@/utils/panel-context";
import { bookingErrorMessage } from "./booking-errors.mjs";
import { PublicBarbershopFooter } from "./PublicBarbershopFooter";
import { PublicBarbershopHeader } from "./PublicBarbershopHeader";
import { PublicBookingFlow } from "./PublicBookingFlow";
import styles from "./public-page.module.css";

import type {
  Availability,
  BusinessHour,
  MarketingPreferences,
  PublicBookingStatus,
  PublicProfessional,
  Service,
  Shop,
} from "./types";

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
const pendingBookingMaxAgeMs = 15 * 60 * 1000;
const pendingBookingExpiredMessage =
  "Sua reserva pendente expirou. Selecione um novo horário.";

async function publicBookingRequest<T>(
  action: "booking_status" | "availability" | "monthly_availability",
  args: Record<string, unknown>,
): Promise<{ data: T | null; error: unknown | null }> {
  const { data, error } = await supabase.functions.invoke("public-booking-gateway", {
    body: { action, args },
  });
  if (error || !data || typeof data !== "object" || !("data" in data)) {
    return { data: null, error: error || new Error("Resposta pública inválida") };
  }
  return { data: (data as { data: T }).data, error: null };
}

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
  const [bookingUnavailableReason, setBookingUnavailableReason] = useState<PublicBookingStatus>("unavailable");
  const [bookingStatusLoaded, setBookingStatusLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdministrativeShopMember, setIsAdministrativeShopMember] =
    useState(false);
  const [customerNavigationEligible, setCustomerNavigationEligible] =
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
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);
  const homeRef = useRef<HTMLElement | null>(null);
  const bookingRef = useRef<HTMLElement | null>(null);
  const confirmationRef = useRef<HTMLElement | null>(null);
  const activeStepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const marketingDialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setRescheduleAppointmentId(query.get("reschedule"));
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
        publicBookingRequest<PublicBookingStatus>("booking_status", { p_slug: currentShop.slug }),
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
      const publicBookingStatus: PublicBookingStatus = !bookingStatusResult.error && ["available", "setup", "subscription", "unavailable"].includes(String(bookingStatusResult.data))
        ? bookingStatusResult.data as PublicBookingStatus
        : "unavailable";
      setBookingAvailable(publicBookingStatus === "available");
      setBookingUnavailableReason(publicBookingStatus);
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
      const { data, error } = await publicBookingRequest<Availability[]>("availability", {
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
  const telephoneLink = useMemo(
    () => buildTelephoneLink(shop?.phone),
    [shop?.phone],
  );
  const showOperationalLinks = bookingUnavailableReason !== "subscription";
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
    const firstVisibleDate = dateKey(calendarDays[0]);
    void publicBookingRequest<Array<{ available_date: string }>>(
      "monthly_availability",
      { p_slug: shop.slug, p_start_date: firstVisibleDate, p_service_ids: [probeService.id] },
    ).then(({ data, error }) => {
      if (!active) return;
      const availableDates = new Set(!error ? (data || []).map((entry) => entry.available_date) : []);
      setCalendarAvailability(Object.fromEntries(calendarDays.map((day) => [dateKey(day), availableDates.has(dateKey(day))])));
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
      rescheduleAppointmentId,
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
      setRescheduleAppointmentId(saved.rescheduleAppointmentId || null);
      const query = new URLSearchParams({
        services: saved.serviceIds.join(","),
        date: saved.startsAt.slice(0, 10),
        professional: saved.professionalId,
        starts: saved.startsAt,
      });
      if (saved.rescheduleAppointmentId) query.set("reschedule", saved.rescheduleAppointmentId);
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

  useEffect(() => {
    if (!user) {
      setCustomerNavigationEligible(false);
      return;
    }

    let active = true;
    void Promise.all([
      supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle<{ id: string }>(),
      getPanelContext(supabase),
    ])
      .then(([customerResult, panelContext]) => {
        if (!active) return;
        setCustomerNavigationEligible(
          Boolean(customerResult.data) && panelContext.role === null,
        );
      })
      .catch(() => {
        if (active) setCustomerNavigationEligible(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

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
    if (rescheduleAppointmentId) query.set("reschedule", rescheduleAppointmentId);
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
    query.delete("reschedule");
    setRescheduleAppointmentId(null);
    const search = query.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
    scrollToSection("booking");
  }

  function scrollToSection(section: "home" | "booking") {
    const targets = { home: homeRef, booking: bookingRef };
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
      setMessage(bookingUnavailableReason === "subscription"
        ? "Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP."
        : "O agendamento online desta barbearia ainda não está disponível.");
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
    setMessage("");
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
      await publicBookingRequest<Availability[]>("availability", {
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
    const bookingPayload = {
      p_barbershop_id: shop.id,
      p_service_ids: selectedServices.map((service) => service.id),
      p_professional_id: selectedSlot.professional_id,
      p_starts_at: selectedSlot.starts_at,
      p_customer_name: customerName.trim(),
      p_customer_phone: normalizedPhone,
    };
    const { error } = await supabase.rpc(
      rescheduleAppointmentId ? "reschedule_customer_appointment" : "book_customer_appointment",
      rescheduleAppointmentId ? buildCustomerRescheduleRequest({
        appointmentId: rescheduleAppointmentId,
        barbershopId: bookingPayload.p_barbershop_id,
        serviceIds: bookingPayload.p_service_ids,
        professionalId: bookingPayload.p_professional_id,
        startsAt: bookingPayload.p_starts_at,
        customerName: bookingPayload.p_customer_name,
        customerPhone: bookingPayload.p_customer_phone,
      }) : bookingPayload,
    );
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
      data-customer-navigation={customerNavigationEligible ? "true" : "false"}
    >
      <PublicBarbershopHeader
        shop={shop}
        user={user}
        bookingAvailable={bookingAvailable}
        bookingStatusLoaded={bookingStatusLoaded}
        bookingUnavailableReason={bookingUnavailableReason}
        photoUrl={photoUrl}
        photoUnavailable={photoUnavailable}
        showOperationalLinks={showOperationalLinks}
        whatsappLink={whatsappLink}
        mapsLink={mapsLink}
        homeRef={homeRef}
        onPhotoError={() => setPhotoUnavailable(true)}
        onScrollHome={() => scrollToSection("home")}
        onScrollBooking={() => scrollToSection("booking")}
        onOpenBooking={() => openBooking(1)}
      />
      <PublicBookingFlow
        shop={shop}
        services={services}
        businessHours={businessHours}
        publicProfessionals={publicProfessionals}
        bookingStep={bookingStep}
        bookingAvailable={bookingAvailable}
        selectedServiceIds={selectedServiceIds}
        selectedDate={selectedDate}
        calendarMonth={calendarMonth}
        calendarDays={calendarDays}
        calendarAvailability={calendarAvailability}
        selectedServices={selectedServices}
        totalDuration={totalDuration}
        totalPrice={totalPrice}
        selectedProfessionalId={selectedProfessionalId}
        selectedSlot={selectedSlot}
        confirmed={confirmed}
        availabilityByProfessional={availabilityByProfessional}
        loadingAvailability={loadingAvailability}
        telephoneLink={telephoneLink}
        user={user}
        customerName={customerName}
        customerPhone={customerPhone}
        email={email}
        isAdministrativeShopMember={isAdministrativeShopMember}
        saving={saving}
        sendingLogin={sendingLogin}
        showAuthenticationOptions={showAuthenticationOptions}
        showMarketingPreferences={showMarketingPreferences}
        showBarbershopMarketingPreference={showBarbershopMarketingPreference}
        showPlatformMarketingPreference={showPlatformMarketingPreference}
        barbershopMarketing={barbershopMarketing}
        platformMarketing={platformMarketing}
        marketingMessage={marketingMessage}
        savingMarketingPreferences={savingMarketingPreferences}
        message={message}
        bookingRef={bookingRef}
        confirmationRef={confirmationRef}
        activeStepHeadingRef={activeStepHeadingRef}
        marketingDialogRef={marketingDialogRef}
        setSelectedServiceIds={setSelectedServiceIds}
        setCalendarMonth={setCalendarMonth}
        setSelectedDate={setSelectedDate}
        setSelectedSlot={setSelectedSlot}
        setConfirmed={setConfirmed}
        setMessage={setMessage}
        setSelectedProfessionalId={setSelectedProfessionalId}
        setCustomerName={setCustomerName}
        setCustomerPhone={setCustomerPhone}
        setEmail={setEmail}
        setBarbershopMarketing={setBarbershopMarketing}
        setPlatformMarketing={setPlatformMarketing}
        onOpenBooking={openBooking}
        onScrollHome={() => scrollToSection("home")}
        onScrollBooking={() => scrollToSection("booking")}
        onChooseSlot={chooseSlot}
        onStartNewBooking={startNewBooking}
        onConfirmAppointment={confirmAppointment}
        onRequestAuthentication={requestAuthentication}
        onContinueWithGoogle={() => void continueWithGoogle()}
        onSendMagicLink={() => void sendMagicLink()}
        onSaveMarketingPreferences={(continueWithoutMarketing) =>
          void saveMarketingPreferences(continueWithoutMarketing)
        }
        dateForInput={dateForInput}
        dateKey={dateKey}
        formatDate={formatDate}
      />
      <PublicBarbershopFooter
        user={user}
        customerNavigationEligible={customerNavigationEligible}
      />
    </main>
  );
}
