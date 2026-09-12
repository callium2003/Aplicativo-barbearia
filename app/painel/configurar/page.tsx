"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NextImage from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { normalizeCommissionRate } from "../../../utils/commission";

import { getPanelContext } from "@/utils/panel-context";
import { isSafePublicStorageImageUrl } from "@/utils/storage-image-url";
import ActionFeedback from "../ActionFeedback";
import { resolveBarbershopPhotoPresentation } from "./photo-presentation.mjs";

type Item = {
  id: string;
  name: string;
  active: boolean;
  price?: number;
  duration_minutes?: number | null;
  scheduleConfigured?: boolean;
  commission_rate_percent?: number;
};
type Shop = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  notification_email: string | null;
  description: string | null;
  photo_url: string | null;
  role: "owner" | "manager";
};
type TeamMember = {
  id: string;
  user_id: string;
  role: "manager" | "barber";
  status: string;
  professional_id?: string | null;
  professionals?: { name: string } | null;
};
type TeamInvitation = {
  id: string;
  email_normalized: string;
  role: "manager" | "barber";
  professional_id?: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  professionals?: { name: string } | null;
};
type RegistrationDetails = {
  responsible_name: string;
  responsible_phone: string;
  tax_document: string | null;
  postal_code: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
  total_people: number;
  attending_professionals: number;
  service_positions: number;
};
type Hours = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

const days = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];
const defaultHours: Hours[] = days.map((_, weekday) => ({
  weekday,
  opens_at: weekday === 0 ? "" : "09:00",
  closes_at: weekday === 0 ? "" : weekday === 6 ? "18:00" : "20:00",
  is_closed: weekday === 0,
}));
const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #d9d0c8",
  borderRadius: 7,
  padding: 11,
  fontSize: 15,
  background: "#fff",
};
const card = {
  background: "#fff",
  padding: 22,
  borderRadius: 12,
  border: "1px solid #e8e0d8",
};
const button = {
  border: 0,
  borderRadius: 7,
  padding: "11px 14px",
  background: "#d7612c",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
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
    const { data: currentShop, error: shopError } = await supabase
      .from("barbershops")
      .select(
        "id,name,slug,address,phone,whatsapp,notification_email,description,photo_url",
      )
      .eq("id", context.barbershopId)
      .maybeSingle<Omit<Shop, "role">>();

    if (shopError || !currentShop) {
      window.location.replace("/painel/inicio");
      return;
    }
    const fullShop: Shop = { ...currentShop, role: context.role as "owner" | "manager" };
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
        {section === "all" && <nav className="ios-settings-group management-settings-index" aria-label="Áreas de configuração">
          <a href="#dados-barbearia" className="ios-settings-item">
            <div className="ios-settings-item-left">
              <div>
                <div className="ios-settings-item-title">Dados da barbearia</div>
                <div className="ios-settings-item-sub">Endereço, contato e perfil público</div>
              </div>
            </div>
            <span className="ios-settings-chevron">›</span>
          </a>
          <a href="#servicos" className="ios-settings-item">
            <div className="ios-settings-item-left">
              <div>
                <div className="ios-settings-item-title">Serviços</div>
                <div className="ios-settings-item-sub">Preços e duração</div>
              </div>
            </div>
            <span className="ios-settings-chevron">›</span>
          </a>
          <a href="#profissionais" className="ios-settings-item">
            <div className="ios-settings-item-left">
              <div>
                <div className="ios-settings-item-title">Profissionais</div>
                <div className="ios-settings-item-sub">Equipe que atende</div>
              </div>
            </div>
            <span className="ios-settings-chevron">›</span>
          </a>
          <a href="#agenda-horarios" className="ios-settings-item">
            <div className="ios-settings-item-left">
              <div>
                <div className="ios-settings-item-title">Agenda e horários</div>
                <div className="ios-settings-item-sub">Expediente e disponibilidade</div>
              </div>
            </div>
            <span className="ios-settings-chevron">›</span>
          </a>
          <Link href="/painel/relatorios" className="ios-settings-item">
            <div className="ios-settings-item-left"><div><div className="ios-settings-item-title">Relatórios e comissões</div><div className="ios-settings-item-sub">Resultados, equipe e repasses</div></div></div>
            <span className="ios-settings-chevron">›</span>
          </Link>
          <Link href="/painel/assinatura" className="ios-settings-item">
            <div className="ios-settings-item-left">
              <div>
                <div className="ios-settings-item-title">Assinatura e plano</div>
                <div className="ios-settings-item-sub">Plano atual e cobrança</div>
              </div>
            </div>
            <span className="ios-settings-chevron">›</span>
          </Link>
        </nav>}

        {/* O atalho "Minha conta" foi removido da interface por duplicar a seção Dados cadastrais.
          <a href="#dados-cadastrais" className="ios-settings-item">
            <div className="ios-settings-item-left">
              <div>
                <div className="ios-settings-item-title">Minha conta</div>
                <div className="ios-settings-item-sub">Responsável e dados cadastrais</div>
              </div>
            </div>
            <span className="ios-settings-chevron">›</span>
          </a>
        */}

        {/* Índice legado removido da interface; o índice acima é a única navegação visível.
        <nav className="settings-hub" aria-label="Áreas de configuração" style={{ display: "none" }}>
          <a href="#dados-barbearia"><b>Dados da barbearia</b><small>Perfil, contatos, endereço e foto</small></a>
          <a href="#servicos"><b>Serviços</b><small>Preços, duração e disponibilidade</small></a>
          <a href="#profissionais"><b>Profissionais</b><small>Cadastro, comissão e acesso</small></a>
          <a href="#agenda-horarios"><b>Agenda e horários</b><small>Funcionamento e jornada individual</small></a>
          <Link href="/painel/relatorios"><b>Relatórios e comissões</b><small>Resultados, equipe e repasses</small></Link>
          <a href="#equipe-acessos"><b>Equipe e convites</b><small>E-mail, link e WhatsApp</small></a>
          <a href="#dados-cadastrais"><b>Minha conta</b><small>Responsável e dados cadastrais</small></a>
          <Link href="/painel/assinatura"><b>Plano BarbeariaSP</b><small>Assinatura, cobranças e dados</small></Link>
        </nav>
        */}
        <div className="configuration-content" style={{ display: "grid", gap: 18 }}>
          {isVisible("shop") && <section className="management-shop-profile" id="dados-barbearia">
            <header className="management-shop-profile-heading">
              <p>PERFIL PÚBLICO</p>
              <h2>{shop.name}</h2>
              <span>Estas informações aparecem para seus clientes.</span>
            </header>
            <form className="management-shop-form" onSubmit={saveProfile}>
              <div className="management-shop-profile-card">
                <section className="management-shop-photo-section" aria-labelledby="barbershop-photo-title">
                  <h3 id="barbershop-photo-title">Foto da barbearia</h3>
                  <input
                    id="barbershop-image-input"
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    aria-describedby="barbershop-image-help"
                    disabled={uploadingImage}
                    className="management-shop-file-input"
                    onChange={(event) => selectImage(event.target.files?.[0] || null)}
                  />
                  <div className="management-shop-photo-row">
                    <div className="management-shop-photo">
                      {photoPresentation.source ? (
                        <NextImage
                          src={photoPresentation.source}
                          unoptimized
                          alt={photoPresentation.alt}
                          width={120}
                          height={120}
                          sizes="120px"
                          onError={() => setFailedPhotoSource(photoPresentation.source)}
                        />
                      ) : (
                        <span aria-label={photoPresentation.alt}>{photoPresentation.initials}</span>
                      )}
                    </div>
                    <label
                      htmlFor="barbershop-image-input"
                      aria-disabled={uploadingImage}
                      className="management-shop-secondary-action"
                    >
                      Trocar foto
                    </label>
                  </div>
                  <p id="barbershop-image-help">
                    Esta foto aparece no perfil público da barbearia. Use JPG, PNG ou WebP, com no máximo 3 MB.
                    No celular, escolha na galeria/Fotos ou em Arquivos. A prévia ainda não publica a foto.
                  </p>
                  {selectedImage && (
                    <div className="management-shop-photo-pending">
                      <p>
                        Nova imagem: <b>{selectedImage.name}</b> ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB).
                      </p>
                      <div>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          className="management-shop-secondary-action"
                          onClick={clearSelectedImage}
                        >
                          Descartar seleção
                        </button>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          className="management-shop-primary-action"
                          onClick={() => void uploadSelectedImage()}
                        >
                          {uploadingImage ? "Enviando e salvando foto..." : "Enviar e salvar foto"}
                        </button>
                      </div>
                    </div>
                  )}
                  {imageMessage && (
                    <p
                      role="status"
                      className={imageMessage === IMAGE_VALIDATION_MESSAGE || imageMessage.startsWith("Não foi") ? "management-shop-feedback error" : "management-shop-feedback success"}
                    >
                      {imageMessage}
                    </p>
                  )}
                </section>

                <div className="management-shop-fields">
                  <label>
                    Nome da barbearia
                    <input
                      required
                      value={shop.name}
                      onChange={(event) => setShop({ ...shop, name: event.target.value })}
                    />
                  </label>
                  <div className="management-shop-field-grid">
                    <label>
                      Telefone
                      <input
                        value={shop.phone || ""}
                        placeholder="(11) 3333-3333"
                        onChange={(event) => setShop({ ...shop, phone: event.target.value })}
                      />
                    </label>
                    <label>
                      WhatsApp
                      <input
                        value={shop.whatsapp || ""}
                        placeholder="5511999999999"
                        onChange={(event) => setShop({ ...shop, whatsapp: event.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    E-mail para notificações
                    <input
                      required
                      type="email"
                      value={shop.notification_email || ""}
                      placeholder="contato@barbearia.com"
                      onChange={(event) => setShop({ ...shop, notification_email: event.target.value })}
                    />
                  </label>

                  <div className="management-shop-fields-divider">
                    <span>LOCALIZAÇÃO E PERFIL</span>
                  </div>

                  <label>
                    Endereço completo
                  <input
                    value={shop.address || ""}
                    placeholder="Rua, número, bairro, cidade"
                    onChange={(event) => setShop({ ...shop, address: event.target.value })}
                  />
                  </label>
                  <label>
                    Descrição curta
                  <textarea
                    value={shop.description || ""}
                    onChange={(event) => setShop({ ...shop, description: event.target.value })}
                  />
                  </label>
                </div>
              </div>

              <div className="management-shop-form-actions">
                <button
                  className="management-shop-primary-action"
                  disabled={!profileDirty || saving || uploadingImage}
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
                <button
                  type="button"
                  className="management-shop-secondary-action"
                  disabled={!profileDirty || saving || uploadingImage}
                  onClick={() => savedShop && setShop(savedShop)}
                >
                  Descartar alterações
                </button>
              </div>
              <ActionFeedback message={profileMessage} tone={profileMessage.startsWith("Não foi") ? "error" : "success"} />
            </form>

            <aside className="management-shop-public-tools" aria-labelledby="management-shop-public-tools-title">
              <div>
                <p>VISUALIZAÇÃO PÚBLICA</p>
                <h3 id="management-shop-public-tools-title">Link público da barbearia</h3>
                <span>Confira como seus clientes veem a barbearia.</span>
                {publicLink && <code>{displayPublicLink}</code>}
              </div>
              {!!setupRequirements.length && (
                <div className="management-public-booking-warning" role="status">
                  <b>Agendamento online indisponível</b>
                  <p>Configure as informações de agenda, profissionais e serviços na aba Mais para começar a usufruir da sua nova ferramenta de gestão da barbearia.</p>
                </div>
              )}
              <div className="management-shop-public-actions">
                {publicLink && (
                  <>
                    <a href={publicLink} target="_blank" rel="noreferrer">
                      Ver página pública
                    </a>
                    <button type="button" onClick={() => void copyPublicLink()}>
                      Copiar link público
                    </button>
                  </>
                )}
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    Testar WhatsApp
                  </a>
                )}
                {mapsLink && (
                  <a href={mapsLink} target="_blank" rel="noreferrer">
                    Testar Google Maps
                  </a>
                )}
              </div>
              {publicLinkMessage && (
                <p
                  role="status"
                  className={publicLinkMessage === "Link copiado com sucesso." ? "management-shop-feedback success" : "management-shop-feedback error"}
                >
                  {publicLinkMessage}
                </p>
              )}
            </aside>
          </section>}
          {isVisible("account") && shop.role === "owner" && registrationDetails && <section className="configuration-card management-registration-details" id="dados-cadastrais" style={card}>
            <header className="management-section-heading"><p>MINHA CONTA</p><h2>Dados cadastrais</h2><span>Informações do responsável e da operação.</span></header>
            {!editingRegistration ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, lineHeight: 1.55 }}>
              <div><b>Responsável</b><br />{registrationDetails.responsible_name}</div><div><b>E-mail de acesso</b><br />{registrationEmail || "Não informado"}</div><div><b>Telefone do responsável</b><br />{registrationDetails.responsible_phone}</div><div><b>CPF ou CNPJ</b><br />{registrationDetails.tax_document || "Não informado"}</div><div><b>CEP</b><br />{registrationDetails.postal_code}</div><div><b>Número</b><br />{registrationDetails.address_number}</div><div><b>Bairro</b><br />{registrationDetails.neighborhood}</div><div><b>Cidade/estado</b><br />{registrationDetails.city} - {registrationDetails.state}</div><div><b>Total de pessoas</b><br />{registrationDetails.total_people}</div><div><b>Profissionais que atendem</b><br />{registrationDetails.attending_professionals}</div><div><b>Posições de atendimento</b><br />{registrationDetails.service_positions}</div>
            </div><button onClick={() => setEditingRegistration(true)} style={{ ...button, marginTop: 16 }}>Editar dados cadastrais</button></> : <form onSubmit={saveRegistrationDetails}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <label>Nome completo<input required style={input} value={registrationDetails.responsible_name} onChange={(event) => setRegistrationDetails({ ...registrationDetails, responsible_name: event.target.value })} /></label><label>E-mail<input readOnly style={{ ...input, background: "#f3efeb" }} value={registrationEmail} /></label><label>Telefone/WhatsApp<input required style={input} value={registrationDetails.responsible_phone} onChange={(event) => setRegistrationDetails({ ...registrationDetails, responsible_phone: event.target.value })} /></label><label>CPF ou CNPJ (opcional)<input inputMode="numeric" style={input} value={registrationDetails.tax_document || ""} onChange={(event) => setRegistrationDetails({ ...registrationDetails, tax_document: event.target.value.replace(/\D/g, "").slice(0, 14) })} /></label><label>CEP<input required inputMode="numeric" style={input} value={registrationDetails.postal_code} onChange={(event) => setRegistrationDetails({ ...registrationDetails, postal_code: event.target.value.replace(/\D/g, "").slice(0, 8) })} /></label><label>Número<input required style={input} value={registrationDetails.address_number} onChange={(event) => setRegistrationDetails({ ...registrationDetails, address_number: event.target.value })} /></label><label>Bairro<input required style={input} value={registrationDetails.neighborhood} onChange={(event) => setRegistrationDetails({ ...registrationDetails, neighborhood: event.target.value })} /></label><label>Cidade<input required style={input} value={registrationDetails.city} onChange={(event) => setRegistrationDetails({ ...registrationDetails, city: event.target.value })} /></label><label>Estado<input required maxLength={2} style={input} value={registrationDetails.state} onChange={(event) => setRegistrationDetails({ ...registrationDetails, state: event.target.value.toUpperCase() })} /></label><label>Total de pessoas<input required min="1" type="number" style={input} value={registrationDetails.total_people} onChange={(event) => setRegistrationDetails({ ...registrationDetails, total_people: Number(event.target.value) })} /></label><label>Profissionais que atendem<input required min="1" type="number" style={input} value={registrationDetails.attending_professionals} onChange={(event) => setRegistrationDetails({ ...registrationDetails, attending_professionals: Number(event.target.value) })} /></label><label>Posições de atendimento<input required min="1" type="number" style={input} value={registrationDetails.service_positions} onChange={(event) => setRegistrationDetails({ ...registrationDetails, service_positions: Number(event.target.value) })} /></label>
            </div><p style={{ color: "#6d6257", fontSize: 14 }}>Você poderá informar ou atualizar este dado posteriormente, antes de contratar um plano pago.</p><div style={{ display: "flex", gap: 8 }}><button disabled={saving} style={button}>{saving ? "Salvando..." : "Salvar dados cadastrais"}</button><button type="button" onClick={() => { setEditingRegistration(false); void load(); }} style={{ ...button, background: "#725b4b" }}>Cancelar</button></div></form>}
          </section>}
           {isVisible("hours") && <form className="configuration-card management-business-hours" id="agenda-horarios" onSubmit={saveHours}>
            <header className="management-section-heading">
              <p>DISPONIBILIDADE</p>
              <h2>Agenda da barbearia</h2>
              <span>Defina os dias e horários gerais em que a barbearia aceita reservas.</span>
            </header>
            <div className="management-business-hours-list">
              {hours.map((day) => (
                <div
                  className="configuration-hours-row"
                  key={day.weekday}
                >
                  <div className="management-hours-day"><b>{days[day.weekday]}</b><small>{day.is_closed ? "Fechado" : `${day.opens_at}–${day.closes_at}`}</small></div>
                  <input
                    required={!day.is_closed}
                    disabled={day.is_closed}
                    aria-label={`Abertura ${days[day.weekday]}`}
                    type="time"
                    style={input}
                    value={day.opens_at || ""}
                    onChange={(event) =>
                      changeHour(day.weekday, { opens_at: event.target.value })
                    }
                  />
                  <input
                    required={!day.is_closed}
                    disabled={day.is_closed}
                    aria-label={`Fechamento ${days[day.weekday]}`}
                    type="time"
                    style={input}
                    value={day.closes_at || ""}
                    onChange={(event) =>
                      changeHour(day.weekday, { closes_at: event.target.value })
                    }
                  />
                  <label className="management-availability-toggle">
                    <input
                      type="checkbox"
                      checked={!day.is_closed}
                      onChange={(event) =>
                        changeHour(day.weekday, {
                          is_closed: !event.target.checked,
                        })
                      }
                    />{" "}
                    <span>{day.is_closed ? "Abrir neste dia" : "Agenda aberta"}</span>
                  </label>
                </div>
              ))}
            </div>
            <p className="management-information-note">Cada dia é independente. Você pode abrir a agenda aos domingos e definir um horário específico quando necessário.</p>
            <button className="management-primary-action" disabled={saving} style={{ ...button, marginTop: 16 }}>
              {saving ? "Salvando..." : "Salvar horários"}
            </button>
            <ActionFeedback message={isVisible("hours") ? actionMessage : ""} tone={actionMessage.startsWith("Não foi") || actionMessage.startsWith("Revise") ? "error" : "success"} />
          </form>}
          {(isVisible("services") || section === "all") && <div
            className="configuration-catalog-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 18,
            }}
          >
            {isVisible("services") && <article className="configuration-card management-services-catalog" id="servicos">
              <div className="management-services-heading"><p className="product-eyebrow">Catálogo</p><h2>Serviços oferecidos</h2><p>Defina preço, duração e o que aparece para os clientes.</p></div>
              <button className="management-service-new" type="button" onClick={() => setShowServiceCreate((current) => !current)} aria-expanded={showServiceCreate} aria-controls="new-service-form">{showServiceCreate ? "Fechar novo serviço" : "Novo serviço"}</button>
              {showServiceCreate && <div id="new-service-form">
              <form className="management-service-create" onSubmit={addService}>
                <h3>Novo serviço</h3>
                <label>
                  Nome do serviço
                  <input
                    required
                    style={input}
                    value={serviceName}
                    onChange={(event) => setServiceName(event.target.value)}
                  />
                </label>
                <div className="management-service-create-fields">
                  <label>
                    Valor (R$)
                    <input
                      required
                      min="0"
                      type="number"
                      step="0.01"
                      style={input}
                      value={price}
                      placeholder="Ex.: 55,00"
                      onChange={(event) => setPrice(event.target.value)}
                    />
                  </label>
                  <label>
                    Duração (minutos)
                    <input
                      required
                      min="5"
                      type="number"
                      style={input}
                      value={duration}
                      placeholder="Ex.: 45"
                      onChange={(event) => setDuration(event.target.value)}
                    />
                  </label>
                </div>
                <button className="management-primary-action management-service-create-action">Adicionar serviço</button>
                <ActionFeedback message={isVisible("services") ? actionMessage : ""} tone={actionMessage.startsWith("Não foi") ? "error" : "success"} />
              </form>
              </div>}
              <div className="management-services-tabs" role="tablist" aria-label="Filtrar serviços">
                <button type="button" role="tab" aria-selected={serviceFilter === "active"} onClick={() => setServiceFilter("active")}>Ativos</button>
                <button type="button" role="tab" aria-selected={serviceFilter === "inactive"} onClick={() => setServiceFilter("inactive")}>Inativos</button>
              </div>
              <div className="management-services-list">
              {filteredServices.map((item) => (
                <div
                  className="management-service-card"
                  key={item.id}
                >
                  {editingService?.id === item.id ? (
                    <form
                      className="management-service-edit"
                      onSubmit={saveServiceEdit}
                    >
                      <p className="management-service-edit-eyebrow">CATÁLOGO · EDITAR SERVIÇO</p>
                      <label>
                        Nome do serviço
                        <input
                          required
                          style={input}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                      </label>
                      <label>
                        Valor (R$)
                        <input
                          required
                          min="0"
                          type="number"
                          step="0.01"
                          style={input}
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                        />
                      </label>
                      <label>
                        Duração (minutos)
                        <input
                          required
                          min="5"
                          type="number"
                          style={input}
                          value={editDuration}
                          onChange={(event) =>
                            setEditDuration(event.target.value)
                          }
                        />
                      </label>
                      <button className="management-primary-action management-service-edit-save">
                        Salvar edição
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="management-secondary-action"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="management-service-summary">
                        <span>
                          <b>{item.name}</b>
                          <br />
                          <small>
                            {item.duration_minutes} min · {Number(item.price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </small>
                        </span>
                        <span className={`management-service-status ${item.active ? "active" : "inactive"}`}>{item.active ? "Ativo" : "Inativo"}</span>
                      </div>
                      <div className="management-service-actions">
                        <button
                          onClick={() => beginServiceEdit(item)}
                          className="management-secondary-action"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void toggle("services", item)}
                          className={item.active ? "management-secondary-action" : "management-primary-action"}
                        >
                          {item.active ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {!filteredServices.length && <p className="product-empty">Nenhum serviço {serviceFilter === "active" ? "ativo" : "inativo"} cadastrado.</p>}
              </div>
              <ActionFeedback message={isVisible("services") && !showServiceCreate ? actionMessage : ""} tone={actionMessage.startsWith("Não foi") ? "error" : "success"} />
              <p className="management-services-note">Serviços inativos não aparecem para novos agendamentos. O histórico é preservado.</p>
            </article>}
            {section === "all" && <article className="configuration-card management-professionals" id="profissionais">
              <header className="management-section-heading">
                <p>EQUIPE</p>
                <h2>Profissionais</h2>
                <span>Cadastre quem atende e configure cada agenda individual.</span>
              </header>
              {shop.role === "owner" && (
                <form
                  className="management-professional-create"
                  onSubmit={addProfessional}
                >
                  <p>NOVO PROFISSIONAL</p>
                  <h3>Adicione um profissional</h3>
                  <span>Ele poderá organizar a própria agenda depois.</span>
                  <label>
                    Nome completo
                    <input
                      required
                      style={input}
                      value={professionalName}
                      placeholder="Ex.: Matheus Costa"
                      onChange={(event) => setProfessionalName(event.target.value)}
                    />
                  </label>
                  <label>
                    Telefone / WhatsApp
                    <input
                      type="tel"
                      inputMode="tel"
                      style={input}
                      value={professionalPhone}
                      placeholder="(11) 99999-9999"
                      onChange={(event) => setProfessionalPhone(event.target.value)}
                    />
                  </label>
                  <button className="management-primary-action" style={button}>Salvar profissional</button>
                </form>
              )}
              {professionals.map((item) => (
                <div
                  className="management-professional-card"
                  key={item.id}
                >
                  {editingProfessionalName?.id === item.id && shop.role === "owner" ? (
                    <form className="management-professional-edit-form" onSubmit={saveProfessionalNameEdit}>
                      <div className="management-professional-edit-note">
                        <b>Editando nome de {item.name}</b>
                        <br />
                        <small>Esta alteração aparece na agenda e na página pública da barbearia.</small>
                      </div>
                      <label>Nome do profissional<input required style={input} value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
                      <div className="management-professional-edit-actions">
                        <button disabled={saving} style={button}>{saving ? "Salvando..." : "Salvar Nome"}</button>
                        <button className="management-professional-secondary-action" type="button" disabled={saving} onClick={() => setEditingProfessionalName(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : editingProfessionalCommission?.id === item.id ? (
                    <form className="management-professional-edit-form" onSubmit={saveProfessionalCommissionEdit}>
                      <div className="management-professional-edit-note">
                        <b>Comissão de {item.name}</b>
                        <br />
                        <small>Defina a porcentagem que será usada nos próximos atendimentos concluídos.</small>
                      </div>
                      <label>Comissão (%)<input type="text" required style={input} value={editCommissionRate} onChange={(event) => setEditCommissionRate(event.target.value)} /></label>
                      <div className="management-professional-edit-actions">
                        <button disabled={savingCommission} style={button}>{savingCommission ? "Salvando..." : "Salvar Comissão"}</button>
                        <button className="management-professional-secondary-action" type="button" disabled={savingCommission} onClick={() => setEditingProfessionalCommission(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span>
                        <b>{item.name}</b>
                        <br />
                        <small style={{ color: "#4b3e35" }}>
                          Comissão: <b>{Number(item.commission_rate_percent || 0).toFixed(2).replace(".", ",")}%</b> · {item.active ? "Ativo para agenda" : "Inativo"}
                        </small>
                        {!item.scheduleConfigured && (
                          <>
                            <br />
                            <small
                              style={{
                                display: "inline-block",
                                marginTop: 5,
                                color: "#9a3a13",
                                fontWeight: 800,
                              }}
                            >
                              Agenda nao configurada - indisponivel para
                              agendamento
                            </small>
                          </>
                        )}
                      </span>
                      <div className="management-professional-actions">
                        {shop.role === "owner" && (
                          <button className="management-professional-secondary-action" onClick={() => beginProfessionalNameEdit(item)}>Editar nome</button>
                        )}
                        <button className="management-professional-secondary-action" onClick={() => beginProfessionalCommissionEdit(item)}>Editar comissão</button>
                        {(shop.role === "owner" || shop.role === "manager") && (
                          <button className="management-professional-secondary-action" onClick={() => void beginProfessionalSchedule(item)}>
                            {item.scheduleConfigured ? "Editar agenda" : "Configurar agenda"}
                          </button>
                        )}
                        {item.active && shop.role === "owner" && (
                          <button className="management-professional-secondary-action" onClick={() => focusInvitationForm(item.id)}>
                            Conceder acesso ao painel
                          </button>
                        )}
                        {shop.role === "owner" && (
                          <button className={item.active ? "management-professional-danger-action" : "management-primary-action"} onClick={() => void toggle("professionals", item)}>
                            {item.active ? "Inativar" : "Ativar"}
                          </button>
                        )}
                      </div>
                      {editingProfessionalSchedule?.id === item.id && (
                        <form
                          className="management-professional-schedule"
                          onSubmit={saveProfessionalSchedule}
                        >
                          <header className="management-section-heading">
                            <p>AGENDA DO PROFISSIONAL</p>
                            <h3>Horários de trabalho</h3>
                            <span className="management-professional-chip">{item.name}</span>
                          </header>
                          <p className="management-professional-schedule-help">
                            Defina o horário de cada dia. A pausa é semanal: ela
                            se repete somente no dia da linha correspondente e
                            bloqueia novos agendamentos nesse intervalo.
                          </p>
                          <div className="management-professional-day-tabs" role="tablist" aria-label="Escolher dia da agenda">
                            {professionalSchedule.map((day) => (
                              <button
                                key={day.weekday}
                                type="button"
                                role="tab"
                                aria-selected={selectedProfessionalWeekday === day.weekday}
                                onClick={() => setSelectedProfessionalWeekday(day.weekday)}
                              >
                                {days[day.weekday].slice(0, 3)}
                                <small>{day.is_closed ? "Fechado" : "Aberto"}</small>
                              </button>
                            ))}
                          </div>
                          <div className="management-professional-day-editor">
                            {professionalSchedule.filter((day) => day.weekday === selectedProfessionalWeekday).map((day) => (
                              <div
                                className="management-professional-day-row"
                                key={day.weekday}
                              >
                                <div className="management-professional-day-title"><b>{days[day.weekday]}</b><span>{day.is_closed ? "Sem atendimento" : "Atendimento ativo"}</span></div>
                                <label className="management-availability-toggle management-professional-open-toggle">
                                  <input
                                    name={`closed-${day.weekday}`}
                                    type="checkbox"
                                    checked={!day.is_closed}
                                    onChange={(event) =>
                                      changeProfessionalHour(day.weekday, {
                                        is_closed: !event.target.checked,
                                      })
                                    }
                                  />
                                  <span>Atende neste dia</span>
                                </label>
                                <div className="management-professional-time-grid">
                                  <label>Entrada<input required={!day.is_closed} name={`opens-${day.weekday}`} disabled={day.is_closed} aria-label={`Inicio ${days[day.weekday]}`} type="time" style={input} value={day.opens_at || ""} onChange={(event) => changeProfessionalHour(day.weekday, { opens_at: event.target.value })} /></label>
                                  <label>Saída<input required={!day.is_closed} name={`closes-${day.weekday}`} disabled={day.is_closed} aria-label={`Fim ${days[day.weekday]}`} type="time" style={input} value={day.closes_at || ""} onChange={(event) => changeProfessionalHour(day.weekday, { closes_at: event.target.value })} /></label>
                                </div>
                                <div className="management-professional-break-grid">
                                  <div><b>Intervalo</b><small>Opcional e específico deste dia</small></div>
                                  <label>Início<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.starts_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: event.target.value, ends_at: current[day.weekday]?.ends_at || "" } }))} /></label>
                                  <label>Fim<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.ends_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: current[day.weekday]?.starts_at || "", ends_at: event.target.value } }))} /></label>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="management-schedule-actions">
                            <button className="management-primary-action" disabled={saving} style={button}>
                              {saving ? "Salvando..." : "Salvar horários"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProfessionalSchedule(null)
                              }
                              className="management-professional-secondary-action"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              ))}
            </article>}
          </div>}

          {section === "all" && <section className="configuration-card management-team-access" id="equipe-acessos">
            <header className="management-section-heading"><p>ACESSO AO PAINEL</p><h2>Equipe e convites</h2><span>Convide pessoas e acompanhe os vínculos desta barbearia.</span></header>
            <p className="management-team-intro">
              Convide membros para a equipe da barbearia. O vínculo é criado somente após o convidado aceitar o convite.
            </p>

            {invitationMessage && (
              <p role="status" className={`management-team-feedback ${invitationMessage.startsWith("Não foi") || invitationMessage.startsWith("Erro") ? "error" : "success"}`}>
                {invitationMessage}
              </p>
            )}

            {generatedTokenLink && (
              <div className="management-invite-result">
                <b>Link de convite individual criado:</b>
                <code
                  role="button"
                  tabIndex={0}
                  aria-label="Copiar link de convite"
                  title="Toque para copiar o link"
                  onClick={() => void copyGeneratedLink()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void copyGeneratedLink();
                    }
                  }}
                  className="management-invite-code"
                >
                  {generatedTokenLink}
                </code>
                <div className="management-invite-result-actions">
                  <button
                    type="button"
                    onClick={() => void copyGeneratedLink()}
                    className="management-secondary-action"
                  >
                    Copiar link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para acessar a equipe de ${shop.name}! Acesse o link para aceitar: ${generatedTokenLink}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="management-team-whatsapp-action"
                  >
                    Enviar pelo WhatsApp
                  </a>
                </div>
                {copyLinkMessage && (
                  <p role="status" className="management-team-copy-feedback">
                    {copyLinkMessage}
                  </p>
                )}
              </div>
            )}

            <form ref={inviteFormRef} className="management-invite-form" id="novo-convite" onSubmit={handleCreateInvitation}>
              <b>Criar novo convite</b>
              <div className="management-invite-fields">
                <label>
                  E-mail do convidado
                  <input
                    required
                    ref={inviteEmailInputRef}
                    type="email"
                    style={input}
                    value={inviteEmail}
                    placeholder="funcionario@email.com"
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </label>
                <label>
                  Papel de acesso
                  <select
                    style={input}
                    value={inviteRole}
                    onChange={(e) => {
                      const role = e.target.value as "manager" | "barber";
                      setInviteRole(role);
                      if (role === "manager") setInviteProfessionalId("");
                    }}
                  >
                    {shop.role === "owner" && <option value="manager">Gerente (Manager)</option>}
                    <option value="barber">Barbeiro (Barber)</option>
                  </select>
                </label>
                {inviteRole === "barber" && (
                  <label>
                    Profissional da agenda
                    <select
                      required
                      style={input}
                      value={inviteProfessionalId}
                      onChange={(e) => setInviteProfessionalId(e.target.value)}
                    >
                      <option value="">Selecione o profissional...</option>
                      {professionals
                        .filter((p) => p.active)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
              <button className="management-primary-action management-invite-submit">Gerar link de convite</button>
            </form>

            {!!teamInvitations.length && (
              <div className="management-team-group">
                <h3>Convites pendentes</h3>
                <div className="management-team-list">
                  {teamInvitations.map((inv) => (
                    <div className="management-team-row" key={inv.id}>
                      <div>
                        <b>{inv.email_normalized}</b> —{" "}
                        <span className="management-team-role">
                          {inv.role === "manager" ? "Gerente" : "Barbeiro"}
                        </span>
                        {inv.professionals?.name && (
                          <span> (Profissional: {inv.professionals.name})</span>
                        )}
                        <br />
                        <small>
                          Criado em: {new Date(inv.created_at).toLocaleDateString("pt-BR")} |
                          Expira em: {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRevokeInvitation(inv.id)}
                        className="management-team-danger-action"
                      >
                        Revogar convite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="management-team-group">
              <h3>Membros da equipe ativos</h3>
              <div className="management-team-list">
                {teamMembers.length === 0 ? (
                  <p className="product-empty">Nenhum membro adicional de equipe cadastrado.</p>
                ) : (
                  teamMembers.map((member) => (
                    <div className="management-team-member" key={member.id}>
                      <b className="management-team-role">
                        {member.role === "manager" ? "Gerente" : "Barbeiro"}
                      </b>
                      {member.professionals?.name && (
                        <span> — Profissional: {member.professionals.name}</span>
                      )}
                      <br />
                      <small>Status: {member.status}</small>
                      {shop.role === "owner" && (
                        <div className="management-team-member-actions">
                          <button
                            type="button"
                            onClick={() => void setTeamMemberAccess(member, member.status !== "active")}
                            className={member.status === "active" ? "management-team-danger-action" : "management-primary-action"}
                          >
                            {member.status === "active" ? "Desativar acesso" : "Ativar acesso"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>}
        </div>
      </section>
    </div>
    </main>
  );
}
