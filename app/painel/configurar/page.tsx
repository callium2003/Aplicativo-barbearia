"use client";

import { supabase } from "@/utils/supabase";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { normalizeCommissionRate } from "../../../utils/commission";

import { getPanelContext } from "@/utils/panel-context";
import { isSafePublicStorageImageUrl } from "@/utils/storage-image-url";
import BusinessHoursSection from "./BusinessHoursSection";
import ProfessionalsSection from "./ProfessionalsSection";
import { resolveBarbershopPhotoPresentation } from "./photo-presentation.mjs";
import ServicesSection from "./ServicesSection";
import SettingsIndex from "./SettingsIndex";
import ShopProfileSection from "./ShopProfileSection";
import { button, card, days, input, type Hours, type Item, type RegistrationDetails, type Shop, type TeamInvitation, type TeamMember } from "./settings-shared";
import TeamAccessSection from "./TeamAccessSection";

const defaultHours: Hours[] = days.map((_, weekday) => ({
  weekday,
  opens_at: weekday === 0 ? "" : "09:00",
  closes_at: weekday === 0 ? "" : weekday === 6 ? "18:00" : "20:00",
  is_closed: weekday === 0,
}));
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const IMAGE_VALIDATION_MESSAGE =
  "A imagem deve estar nos formatos JPG, PNG ou WebP e ter no máximo 3 MB.";
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const acceptedImageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

function imageExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

async function loadImage(source: string) {
  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
  });
  return image;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível preparar a imagem."))),
      type,
      quality,
    );
  });
}

async function imageHasTransparency(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(image.naturalWidth, MAX_IMAGE_SIDE);
  canvas.height = Math.min(image.naturalHeight, MAX_IMAGE_SIDE);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) return true;
  }
  return false;
}

async function prepareImageForUpload(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const keepPng = file.type === "image/png" && (await imageHasTransparency(image));
    const contentType = keepPng ? "image/png" : "image/webp";
    const extension = keepPng ? "png" : "webp";
    let scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(
        canvas,
        contentType,
        keepPng ? undefined : Math.max(0.68, 0.88 - attempt * 0.04),
      );
      if (blob.size <= MAX_IMAGE_BYTES) return { blob, contentType, extension };
      scale *= 0.82;
    }
    throw new Error(IMAGE_VALIDATION_MESSAGE);
  } finally {
    URL.revokeObjectURL(source);
  }
}

function storagePathFromPublicUrl(url: string | null, barbershopId: string) {
  if (!url || !isSafePublicStorageImageUrl(url, "barbershop-images", barbershopId)) return null;
  return decodeURIComponent(new URL(url).pathname.split("/barbershop-images/")[1] || "");
}

export default function Configurar() {
  const pathname = usePathname();
  const section = pathname === "/painel/dados-da-barbearia" ? "shop"
    : pathname === "/painel/servicos" ? "services"
      : pathname === "/painel/horarios" ? "hours"
        : pathname === "/painel/minha-conta" ? "account" : "all";
  const isVisible = (name: "shop" | "services" | "hours" | "account" | "team") => section === "all" || section === name;
  const [shop, setShop] = useState<Shop | null>(null);
  const [savedShop, setSavedShop] = useState<Shop | null>(null);
  const [registrationDetails, setRegistrationDetails] = useState<RegistrationDetails | null>(null);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [editingRegistration, setEditingRegistration] = useState(false);
  const [services, setServices] = useState<Item[]>([]);
  const [professionals, setProfessionals] = useState<Item[]>([]);
  const [hours, setHours] = useState<Hours[]>(defaultHours);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "barber">("barber");
  const [inviteProfessionalId, setInviteProfessionalId] = useState("");
  const [generatedTokenLink, setGeneratedTokenLink] = useState<string | null>(null);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [copyLinkMessage, setCopyLinkMessage] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [professionalPhone, setProfessionalPhone] = useState("");
  const [message, setMessage] = useState("Carregando...");
  const [profileMessage, setProfileMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<Item | null>(null);
  const [serviceFilter, setServiceFilter] = useState<"active" | "inactive">("active");
  const [showServiceCreate, setShowServiceCreate] = useState(false);
  const [editingProfessionalName, setEditingProfessionalName] = useState<Item | null>(null);
  const [editingProfessionalCommission, setEditingProfessionalCommission] = useState<Item | null>(null);
  const [savingCommission, setSavingCommission] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editCommissionRate, setEditCommissionRate] = useState("0.00");
  const [editingProfessionalSchedule, setEditingProfessionalSchedule] =
    useState<Item | null>(null);
  const [professionalSchedule, setProfessionalSchedule] =
    useState<Hours[]>(defaultHours);
  const [selectedProfessionalWeekday, setSelectedProfessionalWeekday] = useState(1);
  const [professionalBreaks, setProfessionalBreaks] = useState<Record<number, { starts_at: string; ends_at: string }>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [failedPhotoSource, setFailedPhotoSource] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publicLinkMessage, setPublicLinkMessage] = useState("");
  const [setupRequirements, setSetupRequirements] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inviteFormRef = useRef<HTMLFormElement>(null);
  const inviteEmailInputRef = useRef<HTMLInputElement>(null);
  const actionMessage = message === "Carregando..." || message === "Dados salvos nesta barbearia." ? "" : message;

  const whatsappLink = useMemo(() => {
    const number = (shop?.whatsapp || "").replace(/\D/g, "");
    return number ? `https://wa.me/${number}` : "";
  }, [shop?.whatsapp]);
  const mapsLink = useMemo(
    () =>
      shop?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`
        : "",
    [shop],
  );
  const publicLink = shop?.slug ? `${window.location.origin}/${shop.slug}` : "";
  const photoPresentation = useMemo(
    () => resolveBarbershopPhotoPresentation({
      previewUrl: imagePreview,
      savedUrl: shop?.photo_url,
      failedUrl: failedPhotoSource,
      shopName: shop?.name,
    }),
    [failedPhotoSource, imagePreview, shop?.name, shop?.photo_url],
  );
  const displayPublicLink = publicLink.replace(/^https?:\/\//, "");
  const profileDirty = useMemo(() => {
    if (!shop || !savedShop) return false;
    return (["name", "address", "phone", "whatsapp", "notification_email", "description"] as const)
      .some((field) => (shop[field] || "") !== (savedShop[field] || ""));
  }, [savedShop, shop]);
  const filteredServices = useMemo(
    () => services.filter((service) => service.active === (serviceFilter === "active")),
    [serviceFilter, services],
  );

  async function copyPublicLink() {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setPublicLinkMessage("Link copiado com sucesso.");
    } catch {
      setPublicLinkMessage("Não foi possível copiar o link. Tente novamente.");
    }
  }

  async function load() {
    const context = await getPanelContext(supabase);
    if (!context.userId) {
      window.location.replace("/entrar");
      return;
    }

    if (context.role === "barber") {
      window.location.replace("/painel/agenda");
      return;
    }

    if (!context.role || !context.barbershopId) {
      window.location.replace("/cadastro-inicial");
      return;
    }

    setRegistrationEmail(context.userEmail || "");
    const [{ data: currentShop, error: shopError }, { data: notificationEmail }] = await Promise.all([
      supabase
        .from("barbershops")
        .select(
          "id,name,slug,address,phone,whatsapp,description,photo_url",
        )
        .eq("id", context.barbershopId)
        .maybeSingle<Omit<Shop, "role" | "notification_email">>(),
      // notification_email é sensível: sai da tabela-base e vem pela RPC com escopo owner/manager.
      supabase.rpc("get_barbershop_notification_email", { p_barbershop_id: context.barbershopId }),
    ]);

    if (shopError || !currentShop) {
      window.location.replace("/painel/inicio");
      return;
    }
    const fullShop: Shop = { ...currentShop, notification_email: (notificationEmail as string | null) ?? null, role: context.role as "owner" | "manager" };
    setShop(fullShop);
    setSavedShop(fullShop);
    let hasRegistrationDetails = context.role !== "owner";
    if (context.role === "owner") {
      const { data: savedRegistrationDetails } = await supabase
        .from("barbershop_registration_details")
        .select("responsible_name,responsible_phone,tax_document,postal_code,address_number,neighborhood,city,state,total_people,attending_professionals,service_positions")
        .eq("barbershop_id", currentShop.id)
        .maybeSingle<RegistrationDetails>();
      setRegistrationDetails(savedRegistrationDetails || null);
      hasRegistrationDetails = Boolean(savedRegistrationDetails);
    } else {
      setRegistrationDetails(null);
    }
    const [
      serviceResult,
      professionalResult,
      hoursResult,
      professionalHoursResult,
      teamMembersResult,
      invitationsResult,
    ] = await Promise.all([
      supabase
        .from("services")
        .select("id,name,price,duration_minutes,active")
        .eq("barbershop_id", currentShop.id)
        .order("created_at"),
      supabase
        .rpc("get_professional_commission_rates", { p_barbershop_id: currentShop.id })
        .then(({ data, error }) => ({ data: data?.map((p: { professional_id: string; professional_name: string; professional_active: boolean; commission_rate_percent: number }) => ({ id: p.professional_id, name: p.professional_name, active: p.professional_active, commission_rate_percent: p.commission_rate_percent })), error })),
      supabase
        .from("business_hours")
        .select("weekday,opens_at,closes_at,is_closed")
        .eq("barbershop_id", currentShop.id),
      supabase
        .from("professional_hours")
        .select("professional_id,is_closed,opens_at,closes_at")
        .eq("is_closed", false)
        .limit(1000),
      supabase
        .from("team_members")
        .select("id,user_id,role,status,professional_id,professionals(name)")
        .eq("barbershop_id", currentShop.id),
      supabase
        .from("team_invitations")
        .select("id,email_normalized,role,professional_id,status,created_at,expires_at,professionals(name)")
        .eq("barbershop_id", currentShop.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const configuredProfessionals = new Set(
      (professionalHoursResult.data || [])
        .filter((hour) => hour.opens_at && hour.closes_at)
        .map((hour) => hour.professional_id),
    );
    const activeProfessionals = ((professionalResult.data as Item[]) || []).filter((professional) => professional.active);
    const missingRequirements = [
      !(serviceResult.data || []).some((service) => service.active) ? "cadastre ao menos um serviço ativo" : "",
      !activeProfessionals.length ? "cadastre ao menos um profissional ativo" : "",
      !hoursResult.data?.some((hour) => !hour.is_closed) ? "defina os horários de funcionamento da barbearia" : "",
      activeProfessionals.some((professional) => !configuredProfessionals.has(professional.id)) ? "configure a agenda de cada profissional ativo" : "",
    ].filter(Boolean);
    setSetupRequirements(hasRegistrationDetails ? missingRequirements : []);
    setServices(serviceResult.data || []);
    setProfessionals(
      ((professionalResult.data as Item[]) || []).map((professional) => ({
        ...professional,
        scheduleConfigured: configuredProfessionals.has(professional.id),
      })),
    );
    setTeamMembers((teamMembersResult.data || []) as unknown as TeamMember[]);
    setTeamInvitations((invitationsResult.data || []) as unknown as TeamInvitation[]);
    if (hoursResult.data?.length) {
      setHours(
        defaultHours.map((day) => {
          const saved = hoursResult.data?.find(
            (item) => item.weekday === day.weekday,
          );
          return saved
            ? {
                weekday: saved.weekday,
                is_closed: saved.is_closed,
                opens_at: saved.opens_at?.slice(0, 5) || "",
                closes_at: saved.closes_at?.slice(0, 5) || "",
              }
            : day;
        }),
      );
    }
    setMessage("Dados salvos nesta barbearia.");
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    setProfileMessage("");
    setSaving(true);
    const { error } = await supabase
      .from("barbershops")
      .update({
        name: shop.name.trim(),
        address: shop.address?.trim() || null,
        phone: shop.phone?.trim() || null,
        whatsapp: shop.whatsapp?.trim() || null,
        notification_email: shop.notification_email?.trim() || null,
        description: shop.description?.trim() || null,
      })
      .eq("id", shop.id);
    setSaving(false);
    if (error) {
      setMessage("Não foi possível salvar os dados da barbearia.");
      setProfileMessage("Não foi possível salvar os dados da barbearia. Suas alterações foram mantidas.");
      return;
    }
    setSavedShop(shop);
    setMessage("Dados da barbearia salvos.");
    setProfileMessage("Dados da barbearia salvos com sucesso.");
  }
  async function saveRegistrationDetails(event: FormEvent) {
    event.preventDefault();
    if (!shop || !registrationDetails) return;
    const phone = registrationDetails.responsible_phone.replace(/\D/g, "");
    const document = (registrationDetails.tax_document || "").replace(/\D/g, "");
    if (registrationDetails.responsible_name.trim().length < 2 || !/^(?:[1-9][0-9])(?:9[0-9]{8}|[2-5][0-9]{7})$/.test(phone) || !/^\d{8}$/.test(registrationDetails.postal_code) || !registrationDetails.address_number.trim() || !registrationDetails.neighborhood.trim() || !registrationDetails.city.trim() || !/^[A-Z]{2}$/.test(registrationDetails.state) || registrationDetails.total_people <= 0 || registrationDetails.attending_professionals <= 0 || registrationDetails.attending_professionals > registrationDetails.total_people || registrationDetails.service_positions <= 0 || (document && !/^\d{11}$|^\d{14}$/.test(document))) {
      setMessage("Revise os dados cadastrais antes de salvar.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("barbershop_registration_details").update({ ...registrationDetails, responsible_name: registrationDetails.responsible_name.trim(), responsible_phone: phone, tax_document: document || null, postal_code: registrationDetails.postal_code.replace(/\D/g, ""), address_number: registrationDetails.address_number.trim(), neighborhood: registrationDetails.neighborhood.trim(), city: registrationDetails.city.trim(), state: registrationDetails.state.toUpperCase() }).eq("barbershop_id", shop.id);
    setSaving(false);
    if (error) { setMessage("Não foi possível salvar os dados cadastrais."); return; }
    setEditingRegistration(false);
    setMessage("Dados cadastrais salvos.");
  }
  function clearSelectedImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
    setFailedPhotoSource(null);
    setImageMessage("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  }
  function selectImage(file: File | null) {
    setImageMessage("");
    if (!file) return;
    if (
      !acceptedImageTypes.has(file.type) ||
      !acceptedImageExtensions.has(imageExtension(file)) ||
      file.size > MAX_IMAGE_BYTES
    ) {
      clearSelectedImage();
      setImageMessage(IMAGE_VALIDATION_MESSAGE);
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    const nextPreview = URL.createObjectURL(file);
    setFailedPhotoSource(null);
    setImagePreview(nextPreview);
  }
  async function uploadSelectedImage() {
    if (!shop || !selectedImage || uploadingImage) return;
    setUploadingImage(true);
    setImageMessage("Preparando e enviando imagem...");
    let uploadedPath: string | null = null;
    try {
      const prepared = await prepareImageForUpload(selectedImage);
      if (prepared.blob.size > MAX_IMAGE_BYTES) throw new Error(IMAGE_VALIDATION_MESSAGE);
      uploadedPath = `${shop.id}/${crypto.randomUUID()}.${prepared.extension}`;
      const { error: uploadError } = await supabase.storage
        .from("barbershop-images")
        .upload(uploadedPath, prepared.blob, {
          cacheControl: "3600",
          contentType: prepared.contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage
        .from("barbershop-images")
        .getPublicUrl(uploadedPath);
      const { error: saveError } = await supabase.rpc("set_barbershop_photo_url", {
        p_barbershop_id: shop.id,
        p_photo_url: publicUrl.publicUrl,
      });
      if (saveError) throw saveError;
      const oldPath = storagePathFromPublicUrl(shop.photo_url, shop.id);
      setShop({ ...shop, photo_url: publicUrl.publicUrl });
      clearSelectedImage();
      setImageMessage("Imagem da barbearia atualizada.");
      if (oldPath) {
        const { error: removeError } = await supabase.storage
          .from("barbershop-images")
          .remove([oldPath]);
        if (removeError) setImageMessage("Imagem atualizada. A foto anterior será removida depois.");
      }
    } catch {
      console.error("Falha ao enviar a foto da barbearia", { code: "operation_failed" });
      if (uploadedPath) await supabase.storage.from("barbershop-images").remove([uploadedPath]);
      setImageMessage(
        "Não foi possível enviar a imagem. A foto anterior foi mantida.",
      );
    } finally {
      setUploadingImage(false);
    }
  }
  async function saveHours(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    setSaving(true);
    const values = hours.map((day) => ({
      barbershop_id: shop.id,
      weekday: day.weekday,
      is_closed: day.is_closed,
      opens_at: day.is_closed ? null : day.opens_at,
      closes_at: day.is_closed ? null : day.closes_at,
    }));
    const { data: savedHours, error } = await supabase
      .from("business_hours")
      .upsert(values, { onConflict: "barbershop_id,weekday" })
      .select("weekday,opens_at,closes_at,is_closed");
    setSaving(false);
    if (error || !savedHours || savedHours.length !== values.length) {
      setMessage("Não foi possível confirmar o salvamento dos horários. Suas alterações foram mantidas na tela para nova tentativa.");
      return;
    }
    setHours(
      defaultHours.map((day) => {
        const saved = savedHours.find((item) => item.weekday === day.weekday);
        return saved
          ? {
              weekday: saved.weekday,
              is_closed: saved.is_closed,
              opens_at: saved.opens_at?.slice(0, 5) || "",
              closes_at: saved.closes_at?.slice(0, 5) || "",
            }
          : day;
      }),
    );
    setMessage("Horários confirmados e salvos.");
  }
  async function addService(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    const { error } = await supabase
      .from("services")
      .insert({
        barbershop_id: shop.id,
        name: serviceName,
        price: Number(price),
        duration_minutes: Number(duration),
      });
    if (error) {
      setMessage("Nao foi possivel adicionar o servico.");
      return;
    }
    setServiceName("");
    setPrice("");
    setDuration("");
    setShowServiceCreate(true);
    setMessage("Serviço adicionado. Você pode cadastrar outro agora.");
    await load();
  }
  async function addProfessional(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    const { error } = await supabase
      .from("professionals")
      .insert({
        barbershop_id: shop.id,
        name: professionalName.trim(),
        phone: professionalPhone.trim() || null,
      });
    if (error) {
      setMessage("Nao foi possivel adicionar o profissional.");
      return;
    }
    setProfessionalName("");
    setProfessionalPhone("");
    setMessage("Profissional adicionado.");
    await load();
  }
  async function toggle(table: "services" | "professionals", item: Item) {
    const { error } = await supabase
      .from(table)
      .update({ active: !item.active })
      .eq("id", item.id);
    setMessage(
      error ? "Nao foi possivel atualizar o status." : "Status atualizado.",
    );
    await load();
  }
  function beginServiceEdit(item: Item) {
    setEditingService(item);
    setEditName(item.name);
    setEditPrice(String(item.price ?? ""));
    setEditDuration(String(item.duration_minutes ?? ""));
  }
  async function saveServiceEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingService) return;
    const { error } = await supabase
      .from("services")
      .update({
        name: editName.trim(),
        price: Number(editPrice),
        duration_minutes: Number(editDuration),
      })
      .eq("id", editingService.id);
    if (error) {
      setMessage("Nao foi possivel editar o servico.");
      return;
    }
    setEditingService(null);
    setMessage(
      "Servico atualizado. Agendamentos concluidos mantem os valores originais.",
    );
    await load();
  }
  function beginProfessionalNameEdit(item: Item) {
    setEditingProfessionalName(item);
    setEditName(item.name);
  }
  async function saveProfessionalNameEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingProfessionalName) return;
    setSaving(true);
    const { error } = await supabase
      .from("professionals")
      .update({ name: editName.trim() })
      .eq("id", editingProfessionalName.id);
    setSaving(false);
    if (error) {
      setMessage("Não foi possível editar o nome do profissional.");
      return;
    }
    setEditingProfessionalName(null);
    setMessage("Nome do profissional atualizado com sucesso.");
    await load();
  }

  function beginProfessionalCommissionEdit(item: Item) {
    setEditingProfessionalCommission(item);
    setEditCommissionRate(Number(item.commission_rate_percent || 0).toFixed(2).replace(".", ","));
  }
  async function saveProfessionalCommissionEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingProfessionalCommission) return;

    const result = normalizeCommissionRate(editCommissionRate);
    if (typeof result !== "string") {
      setMessage(result.error);
      return;
    }
    const rawRate = result;
    setSavingCommission(true);
    const { error: rpcError } = await supabase.rpc("set_professional_commission_rate", {
      p_professional_id: editingProfessionalCommission.id,
      p_commission_rate_percent_text: rawRate,
    });
    setSavingCommission(false);
    if (rpcError) {
      setMessage("Não foi possível editar a comissão. (código: operation_failed)");
      return;
    }
    setEditingProfessionalCommission(null);
    setMessage("Comissão atualizada com sucesso.");
    await load();
  }
  function changeHour(weekday: number, update: Partial<Hours>) {
    setHours((current) =>
      current.map((day) =>
        day.weekday === weekday ? { ...day, ...update } : day,
      ),
    );
  }
  function changeProfessionalHour(weekday: number, update: Partial<Hours>) {
    setProfessionalSchedule((current) =>
      current.map((day) =>
        day.weekday === weekday ? { ...day, ...update } : day,
      ),
    );
  }
  async function beginProfessionalSchedule(item: Item) {
    const [{ data }, { data: breaks }] = await Promise.all([supabase
      .from("professional_hours")
      .select("weekday,opens_at,closes_at,is_closed")
      .eq("professional_id", item.id), supabase.from("professional_breaks").select("weekday,starts_at,ends_at").eq("professional_id", item.id)]);
    const saved = data || [];
    setProfessionalSchedule(
      hours.map((day) => {
        const stored = saved.find((row) => row.weekday === day.weekday);
        return stored
          ? {
              weekday: day.weekday,
              opens_at: stored.opens_at?.slice(0, 5) || "",
              closes_at: stored.closes_at?.slice(0, 5) || "",
              is_closed: stored.is_closed,
            }
          : { ...day };
      }),
    );
    setProfessionalBreaks(Object.fromEntries((breaks || []).map(row => [row.weekday, { starts_at: row.starts_at.slice(0, 5), ends_at: row.ends_at.slice(0, 5) }])));
    setSelectedProfessionalWeekday(1);
    setEditingProfessionalSchedule(item);
  }
  async function saveProfessionalSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProfessionalSchedule) return;
    setSaving(true);
    const values = professionalSchedule.map((day) => {
      return {
        professional_id: editingProfessionalSchedule.id,
        weekday: day.weekday,
        is_closed: day.is_closed,
        opens_at: day.is_closed ? null : day.opens_at,
        closes_at: day.is_closed ? null : day.closes_at,
      };
    });
    const { data: savedSchedule, error } = await supabase
      .from("professional_hours")
      .upsert(values, { onConflict: "professional_id,weekday" })
      .select("weekday,opens_at,closes_at,is_closed");
    let scheduleFailed = Boolean(error);
    if (!scheduleFailed && (!savedSchedule || savedSchedule.length !== values.length)) {
      scheduleFailed = true;
    }
    if (!scheduleFailed) {
      const { error: deleteBreaksError } = await supabase.from("professional_breaks").delete().eq("professional_id", editingProfessionalSchedule.id);
      scheduleFailed ||= Boolean(deleteBreaksError);
      const pauseValues = professionalSchedule.flatMap(day => {
        const pause = professionalBreaks[day.weekday];
        return !day.is_closed && pause?.starts_at && pause?.ends_at ? [{ professional_id: editingProfessionalSchedule.id, weekday: day.weekday, starts_at: pause.starts_at, ends_at: pause.ends_at }] : [];
      });
      if (!scheduleFailed && pauseValues.length) {
        const { error: insertBreaksError } = await supabase.from("professional_breaks").insert(pauseValues);
        scheduleFailed ||= Boolean(insertBreaksError);
      }
    }
    setSaving(false);
    if (scheduleFailed) {
      setMessage("Nao foi possivel salvar a agenda do profissional.");
      return;
    }
    setEditingProfessionalSchedule(null);
    setMessage(
      "Agenda individual salva. Profissional liberado para os horarios configurados.",
    );
    await load();
  }

  async function handleCreateInvitation(event: FormEvent) {
    event.preventDefault();
    if (!shop || !inviteEmail.trim()) return;
    setInvitationMessage("");
    setGeneratedTokenLink(null);
    setCopyLinkMessage("");
    try {
      const { data, error } = await supabase.rpc("create_team_invitation", {
        p_barbershop_id: shop.id,
        p_email: inviteEmail.trim(),
        p_role: inviteRole,
        p_professional_id: inviteRole === "barber" ? inviteProfessionalId || null : null,
      });
      if (error) {
        setInvitationMessage(`Não foi possível criar convite: ${"Falha técnica"}`);
      } else if (data) {
        const link = `${window.location.origin}/convite/equipe?token=${data}`;
        setGeneratedTokenLink(link);
        setInvitationMessage("Convite criado com sucesso! Copie o link abaixo para enviar ao convidado.");
        setInviteEmail("");
        setInviteProfessionalId("");
        await load();
      }
    } catch (err) {
      setInvitationMessage(`Erro ao criar convite: ${err instanceof Error ? err.message : "desconhecido"}`);
    }
  }

  function focusInvitationForm(professionalId: string) {
    setInviteRole("barber");
    setInviteProfessionalId(professionalId);
    window.requestAnimationFrame(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      inviteFormRef.current?.scrollIntoView({ behavior, block: "start" });
      window.requestAnimationFrame(() => {
        inviteEmailInputRef.current?.focus({ preventScroll: true });
      });
    });
  }

  async function handleRevokeInvitation(id: string) {
    setInvitationMessage("");
    try {
      const { error } = await supabase.rpc("revoke_team_invitation", {
        p_invitation_id: id,
      });
      if (error) {
        setInvitationMessage(`Não foi possível revogar convite: ${"Falha técnica"}`);
      } else {
        setInvitationMessage("Convite revogado.");
        await load();
      }
    } catch (err) {
      setInvitationMessage(`Erro ao revogar convite: ${err instanceof Error ? err.message : "desconhecido"}`);
    }
  }

  async function setTeamMemberAccess(member: TeamMember, active: boolean) {
    if (!shop) return;
    if (!member.professional_id) {
      setInvitationMessage("Não foi possível alterar o acesso deste membro da equipe.");
      return;
    }
    const professionalName = member.professionals?.name || "este membro";
    const action = active ? "ativar" : "desativar";
    if (!window.confirm(`${action === "ativar" ? "Ativar" : "Desativar"} o acesso de ${professionalName}? ${active ? "O profissional voltara a receber novos agendamentos." : "O historico de atendimentos e pagamentos sera mantido."}`)) return;

    setInvitationMessage("");
    const { error } = await supabase.rpc("set_team_member_access", {
      p_team_member_id: member.id,
      p_active: active,
    });
    if (error) {
      setInvitationMessage(`Nao foi possivel ${action} o acesso: ${"Falha técnica"}`);
      return;
    }
    setInvitationMessage(active ? "Acesso ativado e profissional liberado para novos agendamentos." : "Acesso desativado. O historico de atendimentos e pagamentos foi preservado.");
    await load();
  }

  async function copyGeneratedLink() {
    if (!generatedTokenLink) return;
    try {
      await navigator.clipboard.writeText(generatedTokenLink);
      setCopyLinkMessage("Link do convite copiado!");
    } catch {
      setCopyLinkMessage("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  if (!shop)
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 30,
          background: "#f6f2ed",
          fontFamily: "Arial,sans-serif",
        }}
      >
        <p>{message}</p>
      </main>
    );
  return (
    <main className="management-settings-content">
    <div
      className="configuration-page"
      style={{
        color: "#1b1714",
        padding: 0,
      }}
    >
      <section className="configuration-shell" style={{ maxWidth: 920, margin: "0 auto" }}>
        {section === "all" && <SettingsIndex />}

        {/* O atalho "Minha conta" foi removido da interface por duplicar a seção Dados cadastrais. */}
        {/* Índice legado removido da interface; SettingsIndex é a única navegação visível. */}

        <div className="configuration-content" style={{ display: "grid", gap: 18 }}>
          {isVisible("shop") && (
            <ShopProfileSection
              shop={shop}
              setShop={setShop}
              savedShop={savedShop}
              imageInputRef={imageInputRef}
              uploadingImage={uploadingImage}
              selectImage={selectImage}
              photoPresentation={photoPresentation}
              setFailedPhotoSource={setFailedPhotoSource}
              selectedImage={selectedImage}
              clearSelectedImage={clearSelectedImage}
              uploadSelectedImage={uploadSelectedImage}
              imageMessage={imageMessage}
              imageValidationMessage={IMAGE_VALIDATION_MESSAGE}
              saveProfile={saveProfile}
              profileDirty={profileDirty}
              saving={saving}
              profileMessage={profileMessage}
              publicLink={publicLink}
              displayPublicLink={displayPublicLink}
              setupRequirements={setupRequirements}
              copyPublicLink={copyPublicLink}
              whatsappLink={whatsappLink}
              mapsLink={mapsLink}
              publicLinkMessage={publicLinkMessage}
            />
          )}
          {isVisible("account") && shop.role === "owner" && registrationDetails && <section className="configuration-card management-registration-details" id="dados-cadastrais" style={card}>
            <header className="management-section-heading"><p>MINHA CONTA</p><h2>Dados cadastrais</h2><span>Informações do responsável e da operação.</span></header>
            {!editingRegistration ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, lineHeight: 1.55 }}>
              <div><b>Responsável</b><br />{registrationDetails.responsible_name}</div><div><b>E-mail de acesso</b><br />{registrationEmail || "Não informado"}</div><div><b>Telefone do responsável</b><br />{registrationDetails.responsible_phone}</div><div><b>CPF ou CNPJ</b><br />{registrationDetails.tax_document || "Não informado"}</div><div><b>CEP</b><br />{registrationDetails.postal_code}</div><div><b>Número</b><br />{registrationDetails.address_number}</div><div><b>Bairro</b><br />{registrationDetails.neighborhood}</div><div><b>Cidade/estado</b><br />{registrationDetails.city} - {registrationDetails.state}</div><div><b>Total de pessoas</b><br />{registrationDetails.total_people}</div><div><b>Profissionais que atendem</b><br />{registrationDetails.attending_professionals}</div><div><b>Posições de atendimento</b><br />{registrationDetails.service_positions}</div>
            </div><button onClick={() => setEditingRegistration(true)} style={{ ...button, marginTop: 16 }}>Editar dados cadastrais</button></> : <form onSubmit={saveRegistrationDetails}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <label>Nome completo<input required style={input} value={registrationDetails.responsible_name} onChange={(event) => setRegistrationDetails({ ...registrationDetails, responsible_name: event.target.value })} /></label><label>E-mail<input readOnly style={{ ...input, background: "#f3efeb" }} value={registrationEmail} /></label><label>Telefone/WhatsApp<input required style={input} value={registrationDetails.responsible_phone} onChange={(event) => setRegistrationDetails({ ...registrationDetails, responsible_phone: event.target.value })} /></label><label>CPF ou CNPJ (opcional)<input inputMode="numeric" style={input} value={registrationDetails.tax_document || ""} onChange={(event) => setRegistrationDetails({ ...registrationDetails, tax_document: event.target.value.replace(/\D/g, "").slice(0, 14) })} /></label><label>CEP<input required inputMode="numeric" style={input} value={registrationDetails.postal_code} onChange={(event) => setRegistrationDetails({ ...registrationDetails, postal_code: event.target.value.replace(/\D/g, "").slice(0, 8) })} /></label><label>Número<input required style={input} value={registrationDetails.address_number} onChange={(event) => setRegistrationDetails({ ...registrationDetails, address_number: event.target.value })} /></label><label>Bairro<input required style={input} value={registrationDetails.neighborhood} onChange={(event) => setRegistrationDetails({ ...registrationDetails, neighborhood: event.target.value })} /></label><label>Cidade<input required style={input} value={registrationDetails.city} onChange={(event) => setRegistrationDetails({ ...registrationDetails, city: event.target.value })} /></label><label>Estado<input required maxLength={2} style={input} value={registrationDetails.state} onChange={(event) => setRegistrationDetails({ ...registrationDetails, state: event.target.value.toUpperCase() })} /></label><label>Total de pessoas<input required min="1" type="number" style={input} value={registrationDetails.total_people} onChange={(event) => setRegistrationDetails({ ...registrationDetails, total_people: Number(event.target.value) })} /></label><label>Profissionais que atendem<input required min="1" type="number" style={input} value={registrationDetails.attending_professionals} onChange={(event) => setRegistrationDetails({ ...registrationDetails, attending_professionals: Number(event.target.value) })} /></label><label>Posições de atendimento<input required min="1" type="number" style={input} value={registrationDetails.service_positions} onChange={(event) => setRegistrationDetails({ ...registrationDetails, service_positions: Number(event.target.value) })} /></label>
            </div><p style={{ color: "#6d6257", fontSize: 14 }}>Você poderá informar ou atualizar este dado posteriormente, antes de contratar um plano pago.</p><div style={{ display: "flex", gap: 8 }}><button disabled={saving} style={button}>{saving ? "Salvando..." : "Salvar dados cadastrais"}</button><button type="button" onClick={() => { setEditingRegistration(false); void load(); }} style={{ ...button, background: "#725b4b" }}>Cancelar</button></div></form>}
          </section>}
          {isVisible("hours") && (
            <BusinessHoursSection
              hours={hours}
              changeHour={changeHour}
              saveHours={saveHours}
              saving={saving}
              actionMessage={actionMessage}
            />
          )}
          {(isVisible("services") || section === "all") && (
            <div
              className="configuration-catalog-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
                gap: 18,
              }}
            >
              {isVisible("services") && (
                <ServicesSection
                  showServiceCreate={showServiceCreate}
                  setShowServiceCreate={setShowServiceCreate}
                  addService={addService}
                  serviceName={serviceName}
                  setServiceName={setServiceName}
                  price={price}
                  setPrice={setPrice}
                  duration={duration}
                  setDuration={setDuration}
                  actionMessage={actionMessage}
                  serviceFilter={serviceFilter}
                  setServiceFilter={setServiceFilter}
                  filteredServices={filteredServices}
                  editingService={editingService}
                  saveServiceEdit={saveServiceEdit}
                  editName={editName}
                  setEditName={setEditName}
                  editPrice={editPrice}
                  setEditPrice={setEditPrice}
                  editDuration={editDuration}
                  setEditDuration={setEditDuration}
                  setEditingService={setEditingService}
                  beginServiceEdit={beginServiceEdit}
                  toggle={toggle}
                />
              )}
              {section === "all" && (
                <ProfessionalsSection
                  shop={shop}
                  addProfessional={addProfessional}
                  professionalName={professionalName}
                  setProfessionalName={setProfessionalName}
                  professionalPhone={professionalPhone}
                  setProfessionalPhone={setProfessionalPhone}
                  professionals={professionals}
                  editingProfessionalName={editingProfessionalName}
                  saveProfessionalNameEdit={saveProfessionalNameEdit}
                  editName={editName}
                  setEditName={setEditName}
                  saving={saving}
                  setEditingProfessionalName={setEditingProfessionalName}
                  editingProfessionalCommission={editingProfessionalCommission}
                  saveProfessionalCommissionEdit={saveProfessionalCommissionEdit}
                  editCommissionRate={editCommissionRate}
                  setEditCommissionRate={setEditCommissionRate}
                  savingCommission={savingCommission}
                  setEditingProfessionalCommission={setEditingProfessionalCommission}
                  beginProfessionalNameEdit={beginProfessionalNameEdit}
                  beginProfessionalCommissionEdit={beginProfessionalCommissionEdit}
                  beginProfessionalSchedule={beginProfessionalSchedule}
                  focusInvitationForm={focusInvitationForm}
                  toggle={toggle}
                  editingProfessionalSchedule={editingProfessionalSchedule}
                  saveProfessionalSchedule={saveProfessionalSchedule}
                  professionalSchedule={professionalSchedule}
                  selectedProfessionalWeekday={selectedProfessionalWeekday}
                  setSelectedProfessionalWeekday={setSelectedProfessionalWeekday}
                  changeProfessionalHour={changeProfessionalHour}
                  professionalBreaks={professionalBreaks}
                  setProfessionalBreaks={setProfessionalBreaks}
                  setEditingProfessionalSchedule={setEditingProfessionalSchedule}
                />
              )}
            </div>
          )}
          {section === "all" && (
            <TeamAccessSection
              shop={shop}
              invitationMessage={invitationMessage}
              generatedTokenLink={generatedTokenLink}
              copyGeneratedLink={copyGeneratedLink}
              copyLinkMessage={copyLinkMessage}
              inviteFormRef={inviteFormRef}
              handleCreateInvitation={handleCreateInvitation}
              inviteEmailInputRef={inviteEmailInputRef}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              inviteProfessionalId={inviteProfessionalId}
              setInviteProfessionalId={setInviteProfessionalId}
              professionals={professionals}
              teamInvitations={teamInvitations}
              handleRevokeInvitation={handleRevokeInvitation}
              teamMembers={teamMembers}
              setTeamMemberAccess={setTeamMemberAccess}
            />
          )}
        </div>
      </section>
    </div>
    </main>
  );
}
