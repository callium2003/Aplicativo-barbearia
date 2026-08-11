"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { normalizeCommissionRate } from "../../../utils/commission";

import { getPanelContext } from "@/utils/panel-context";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
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

function storagePathFromPublicUrl(url: string | null) {
  if (!url) return null;
  try {
    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    const imageUrl = new URL(url);
    const prefix = "/storage/v1/object/public/barbershop-images/";
    if (imageUrl.origin !== projectUrl.origin || !imageUrl.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(imageUrl.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

export default function Configurar() {
  const [shop, setShop] = useState<Shop | null>(null);
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
  const [message, setMessage] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingService, setEditingService] = useState<Item | null>(null);
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
  const [professionalBreaks, setProfessionalBreaks] = useState<Record<number, { starts_at: string; ends_at: string }>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publicLinkMessage, setPublicLinkMessage] = useState("");
  const [setupRequirements, setSetupRequirements] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
        .select("professional_id,is_closed")
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
      (professionalHoursResult.data || []).map((hour) => hour.professional_id),
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
    if (hoursResult.data?.length)
      setHours(
        defaultHours.map(
          (day) =>
            hoursResult.data?.find((saved) => saved.weekday === day.weekday) ||
            day,
        ),
      );
    setMessage("Dados salvos nesta barbearia.");
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
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
      setMessage("Nao foi possivel salvar os dados cadastrais.");
      return;
    }
    setEditingProfile(false);
    setMessage("Dados cadastrais salvos.");
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
    setImagePreview(URL.createObjectURL(file));
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
      const oldPath = storagePathFromPublicUrl(shop.photo_url);
      setShop({ ...shop, photo_url: publicUrl.publicUrl });
      clearSelectedImage();
      setImageMessage("Imagem da barbearia atualizada.");
      if (oldPath) {
        const { error: removeError } = await supabase.storage
          .from("barbershop-images")
          .remove([oldPath]);
        if (removeError) setImageMessage("Imagem atualizada. A foto anterior será removida depois.");
      }
    } catch (error) {
      console.error("Falha ao enviar a foto da barbearia:", error);
      if (uploadedPath) await supabase.storage.from("barbershop-images").remove([uploadedPath]);
      const errorDetail = error instanceof Error && error.message ? ` (${error.message})` : "";
      setImageMessage(
        error instanceof Error && error.message === IMAGE_VALIDATION_MESSAGE
          ? IMAGE_VALIDATION_MESSAGE
          : `Não foi possível enviar a imagem. A foto anterior foi mantida.${errorDetail}`,
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
    const { error } = await supabase
      .from("business_hours")
      .upsert(values, { onConflict: "barbershop_id,weekday" });
    setSaving(false);
    setMessage(
      error
        ? "Nao foi possivel salvar os horarios."
        : "Dias e horarios salvos.",
    );
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
    setMessage("Servico adicionado.");
    await load();
  }
  async function addProfessional(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    const { error } = await supabase
      .from("professionals")
      .insert({ barbershop_id: shop.id, name: professionalName });
    if (error) {
      setMessage("Nao foi possivel adicionar o profissional.");
      return;
    }
    setProfessionalName("");
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
      setMessage(`Não foi possível editar a comissão: ${rpcError.message}`);
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
    setEditingProfessionalSchedule(item);
  }
  async function saveProfessionalSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProfessionalSchedule) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const values = professionalSchedule.map((day) => {
      const isClosed = form.get(`closed-${day.weekday}`) === "on";
      return {
        professional_id: editingProfessionalSchedule.id,
        weekday: day.weekday,
        is_closed: isClosed,
        opens_at: isClosed
          ? null
          : String(form.get(`opens-${day.weekday}`) || ""),
        closes_at: isClosed
          ? null
          : String(form.get(`closes-${day.weekday}`) || ""),
      };
    });
    const { error } = await supabase
      .from("professional_hours")
      .upsert(values, { onConflict: "professional_id,weekday" });
    if (!error) {
      await supabase.from("professional_breaks").delete().eq("professional_id", editingProfessionalSchedule.id);
      const pauseValues = professionalSchedule.flatMap(day => {
        const pause = professionalBreaks[day.weekday];
        return !day.is_closed && pause?.starts_at && pause?.ends_at ? [{ professional_id: editingProfessionalSchedule.id, weekday: day.weekday, starts_at: pause.starts_at, ends_at: pause.ends_at }] : [];
      });
      if (pauseValues.length) await supabase.from("professional_breaks").insert(pauseValues);
    }
    setSaving(false);
    if (error) {
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
        setInvitationMessage(`Não foi possível criar convite: ${error.message}`);
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

  async function handleRevokeInvitation(id: string) {
    setInvitationMessage("");
    try {
      const { error } = await supabase.rpc("revoke_team_invitation", {
        p_invitation_id: id,
      });
      if (error) {
        setInvitationMessage(`Não foi possível revogar convite: ${error.message}`);
      } else {
        setInvitationMessage("Convite revogado.");
        await load();
      }
    } catch (err) {
      setInvitationMessage(`Erro ao revogar convite: ${err instanceof Error ? err.message : "desconhecido"}`);
    }
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
    <main
      className="configuration-page"
      style={{
        minHeight: "100vh",
        background: "#f6f2ed",
        color: "#1b1714",
        fontFamily: "Arial,sans-serif",
        padding: "32px 18px 72px",
      }}
    >
      <section className="configuration-shell" style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link href="/painel" style={{ color: "#1b1714", fontWeight: 900, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link>
        <p
          style={{
            color: "#d7612c",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 1.2,
          }}
        >
          CONFIGURACAO DA BARBEARIA
        </p>
        <h1
          style={{
            font: "bold clamp(30px,5vw,46px) Georgia,serif",
            margin: "0 0 8px",
          }}
        >
          {shop.name}
        </h1>
        <p style={{ color: "#6d6257", marginBottom: 18 }}>{message}</p>
        {!!setupRequirements.length && <section className="configuration-card" role="alert" style={{ ...card, background: "#fff4e8", borderColor: "#e4a36f" }}><b>Finalize a configuração antes de abrir o painel de gestão.</b><p style={{ margin: "8px 0", color: "#6d6257" }}>O acesso ao painel será liberado assim que você:</p><ul style={{ margin: 0, paddingLeft: 20, color: "#6d6257" }}>{setupRequirements.map((requirement) => <li key={requirement}>{requirement}.</li>)}</ul></section>}
        <div className="configuration-content" style={{ display: "grid", gap: 18 }}>
          {shop.role === "owner" && registrationDetails && <section className="configuration-card" style={card}>
            <h2 style={{ marginTop: 0 }}>Dados cadastrais</h2>
            {!editingRegistration ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, lineHeight: 1.55 }}>
              <div><b>Responsável</b><br />{registrationDetails.responsible_name}</div><div><b>E-mail de acesso</b><br />{registrationEmail || "Não informado"}</div><div><b>Telefone do responsável</b><br />{registrationDetails.responsible_phone}</div><div><b>CPF ou CNPJ</b><br />{registrationDetails.tax_document || "Não informado"}</div><div><b>CEP</b><br />{registrationDetails.postal_code}</div><div><b>Número</b><br />{registrationDetails.address_number}</div><div><b>Bairro</b><br />{registrationDetails.neighborhood}</div><div><b>Cidade/estado</b><br />{registrationDetails.city} - {registrationDetails.state}</div><div><b>Total de pessoas</b><br />{registrationDetails.total_people}</div><div><b>Profissionais que atendem</b><br />{registrationDetails.attending_professionals}</div><div><b>Posições de atendimento</b><br />{registrationDetails.service_positions}</div>
            </div><button onClick={() => setEditingRegistration(true)} style={{ ...button, marginTop: 16 }}>Editar dados cadastrais</button></> : <form onSubmit={saveRegistrationDetails}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <label>Nome completo<input required style={input} value={registrationDetails.responsible_name} onChange={(event) => setRegistrationDetails({ ...registrationDetails, responsible_name: event.target.value })} /></label><label>E-mail<input readOnly style={{ ...input, background: "#f3efeb" }} value={registrationEmail} /></label><label>Telefone/WhatsApp<input required style={input} value={registrationDetails.responsible_phone} onChange={(event) => setRegistrationDetails({ ...registrationDetails, responsible_phone: event.target.value })} /></label><label>CPF ou CNPJ (opcional)<input inputMode="numeric" style={input} value={registrationDetails.tax_document || ""} onChange={(event) => setRegistrationDetails({ ...registrationDetails, tax_document: event.target.value.replace(/\D/g, "").slice(0, 14) })} /></label><label>CEP<input required inputMode="numeric" style={input} value={registrationDetails.postal_code} onChange={(event) => setRegistrationDetails({ ...registrationDetails, postal_code: event.target.value.replace(/\D/g, "").slice(0, 8) })} /></label><label>Número<input required style={input} value={registrationDetails.address_number} onChange={(event) => setRegistrationDetails({ ...registrationDetails, address_number: event.target.value })} /></label><label>Bairro<input required style={input} value={registrationDetails.neighborhood} onChange={(event) => setRegistrationDetails({ ...registrationDetails, neighborhood: event.target.value })} /></label><label>Cidade<input required style={input} value={registrationDetails.city} onChange={(event) => setRegistrationDetails({ ...registrationDetails, city: event.target.value })} /></label><label>Estado<input required maxLength={2} style={input} value={registrationDetails.state} onChange={(event) => setRegistrationDetails({ ...registrationDetails, state: event.target.value.toUpperCase() })} /></label><label>Total de pessoas<input required min="1" type="number" style={input} value={registrationDetails.total_people} onChange={(event) => setRegistrationDetails({ ...registrationDetails, total_people: Number(event.target.value) })} /></label><label>Profissionais que atendem<input required min="1" type="number" style={input} value={registrationDetails.attending_professionals} onChange={(event) => setRegistrationDetails({ ...registrationDetails, attending_professionals: Number(event.target.value) })} /></label><label>Posições de atendimento<input required min="1" type="number" style={input} value={registrationDetails.service_positions} onChange={(event) => setRegistrationDetails({ ...registrationDetails, service_positions: Number(event.target.value) })} /></label>
            </div><p style={{ color: "#6d6257", fontSize: 14 }}>Você poderá informar ou atualizar este dado posteriormente, antes de contratar um plano pago.</p><div style={{ display: "flex", gap: 8 }}><button disabled={saving} style={button}>{saving ? "Salvando..." : "Salvar dados cadastrais"}</button><button type="button" onClick={() => { setEditingRegistration(false); void load(); }} style={{ ...button, background: "#725b4b" }}>Cancelar</button></div></form>}
          </section>}
          <section className="configuration-card" style={card}>
            <h2 style={{ marginTop: 0 }}>Dados operacionais e contatos</h2>
            {!editingProfile ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                    gap: 12,
                    lineHeight: 1.55,
                  }}
                >
                  <div>
                    <b>Telefone</b>
                    <br />
                    {shop.phone || "Nao informado"}
                  </div>
                  <div>
                    <b>WhatsApp</b>
                    <br />
                    {shop.whatsapp || "Nao informado"}
                  </div>
                  <div>
                    <b>E-mail para notificacoes</b>
                    <br />
                    {shop.notification_email || "Nao informado"}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <b>Endereco</b>
                    <br />
                    {shop.address || "Nao informado"}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <b>Descricao</b>
                    <br />
                    {shop.description || "Nao informada"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    onClick={() => setEditingProfile(true)}
                    style={button}
                  >
                    Editar dados operacionais
                  </button>
                  {publicLink && (
                    <>
                      <a
                        href={publicLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...button, textDecoration: "none", background: "#425e9b" }}
                      >
                        Ver página pública
                      </a>
                      <button type="button" onClick={() => void copyPublicLink()} style={{ ...button, background: "#6b3018" }}>
                        Copiar link público
                      </button>
                    </>
                  )}
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...button,
                        textDecoration: "none",
                        background: "#16874b",
                      }}
                    >
                      Testar WhatsApp
                    </a>
                  )}
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...button,
                        textDecoration: "none",
                        background: "#425e9b",
                      }}
                    >
                      Testar Google Maps
                    </a>
                  )}
                </div>
                {publicLink && <><p style={{ margin: "14px 0 0", color: "#6d6257", overflowWrap: "anywhere" }}><b>Link público da barbearia</b><br /><code>{publicLink}</code></p>{publicLinkMessage && <p role="status" style={{ margin: "8px 0 0", color: publicLinkMessage === "Link copiado com sucesso." ? "#176b3a" : "#b3261e" }}>{publicLinkMessage}</p>}</>}
              </>
            ) : (
              <form onSubmit={saveProfile}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    Nome da barbearia
                    <input
                      required
                      style={input}
                      value={shop.name}
                      onChange={(event) =>
                        setShop({ ...shop, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Telefone
                    <input
                      style={input}
                      value={shop.phone || ""}
                      placeholder="(11) 3333-3333"
                      onChange={(event) =>
                        setShop({ ...shop, phone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      style={input}
                      value={shop.whatsapp || ""}
                      placeholder="5511999999999"
                      onChange={(event) =>
                        setShop({ ...shop, whatsapp: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    E-mail para notificacoes
                    <input
                      required
                      type="email"
                      style={input}
                      value={shop.notification_email || ""}
                      placeholder="contato@barbearia.com"
                      onChange={(event) =>
                        setShop({
                          ...shop,
                          notification_email: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <section
                  style={{
                    marginTop: 16,
                    padding: 14,
                    border: "1px solid #e8e0d8",
                    borderRadius: 10,
                    background: "#fffaf6",
                  }}
                >
                  <b style={{ display: "block" }}>Foto da barbearia</b>
                  <p id="barbershop-image-help" style={{ margin: "6px 0 12px", color: "#6d6257", fontSize: 14 }}>
                    JPG, PNG ou WebP, com no máximo 3 MB. No celular, escolha na galeria/Fotos ou em Arquivos.
                  </p>
                  <input
                    id="barbershop-image-input"
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    aria-describedby="barbershop-image-help"
                    disabled={uploadingImage}
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
                    onChange={(event) => selectImage(event.target.files?.[0] || null)}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <label
                      htmlFor="barbershop-image-input"
                      aria-disabled={uploadingImage}
                      style={{ ...button, display: "inline-block", opacity: uploadingImage ? 0.65 : 1, pointerEvents: uploadingImage ? "none" : "auto" }}
                    >
                      Escolher imagem
                    </label>
                    {selectedImage && (
                      <>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          style={{ ...button, background: "#725b4b", opacity: uploadingImage ? 0.65 : 1 }}
                          onClick={clearSelectedImage}
                        >
                          Remover seleção
                        </button>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          style={{ ...button, opacity: uploadingImage ? 0.65 : 1 }}
                          onClick={() => void uploadSelectedImage()}
                        >
                          {uploadingImage ? "Enviando e salvando foto..." : "Enviar e salvar foto"}
                        </button>
                      </>
                    )}
                  </div>
                  {selectedImage && (
                    <p style={{ margin: "12px 0 0", color: "#4b3e35", fontSize: 14 }}>
                      Nova imagem: <b>{selectedImage.name}</b> ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB). A prévia ainda não publica a foto: clique em <b>Enviar e salvar foto</b>.
                    </p>
                  )}
                  {imageMessage && (
                    <p role="status" style={{ margin: "12px 0 0", color: imageMessage === IMAGE_VALIDATION_MESSAGE || imageMessage.startsWith("Não foi") ? "#b3261e" : "#176b3a" }}>
                      {imageMessage}
                    </p>
                  )}
                  {(imagePreview || shop.photo_url) && (
                    <img
                      src={imagePreview || shop.photo_url || ""}
                      alt={imagePreview ? "Prévia da nova foto da barbearia" : "Foto atual da barbearia"}
                      style={{ marginTop: 14, width: 160, height: 120, borderRadius: 10, objectFit: "cover", display: "block" }}
                    />
                  )}
                </section>
                <label style={{ display: "block", marginTop: 12 }}>
                  Endereco completo
                  <input
                    style={input}
                    value={shop.address || ""}
                    placeholder="Rua, numero, bairro, cidade"
                    onChange={(event) =>
                      setShop({ ...shop, address: event.target.value })
                    }
                  />
                </label>
                <label style={{ display: "block", marginTop: 12 }}>
                  Descricao curta
                  <textarea
                    style={{ ...input, minHeight: 82, resize: "vertical" }}
                    value={shop.description || ""}
                    onChange={(event) =>
                      setShop({ ...shop, description: event.target.value })
                    }
                  />
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button disabled={saving || uploadingImage} style={{ ...button, opacity: saving || uploadingImage ? 0.65 : 1 }}>
                    Salvar dados
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    style={{ ...button, background: "#725b4b" }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>
          <form className="configuration-card" onSubmit={saveHours} style={card}>
            <h2 style={{ marginTop: 0 }}>2. Dias e horarios</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {hours.map((day) => (
                <div
                  className="configuration-hours-row"
                  key={day.weekday}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(105px,1fr) 88px 88px auto",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <b>{days[day.weekday]}</b>
                  <input
                    disabled={day.is_closed}
                    type="time"
                    style={input}
                    value={day.opens_at}
                    onChange={(event) =>
                      changeHour(day.weekday, { opens_at: event.target.value })
                    }
                  />
                  <input
                    disabled={day.is_closed}
                    type="time"
                    style={input}
                    value={day.closes_at}
                    onChange={(event) =>
                      changeHour(day.weekday, { closes_at: event.target.value })
                    }
                  />
                  <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={day.is_closed}
                      onChange={(event) =>
                        changeHour(day.weekday, {
                          is_closed: event.target.checked,
                        })
                      }
                    />{" "}
                    Fechado
                  </label>
                </div>
              ))}
            </div>
            <button disabled={saving} style={{ ...button, marginTop: 16 }}>
              Salvar horarios
            </button>
          </form>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 18,
            }}
          >
            <article className="configuration-card" style={card}>
              <h2 style={{ marginTop: 0 }}>3. Servicos e precos</h2>
              <form onSubmit={addService} style={{ display: "grid", gap: 8 }}>
                <label>
                  Nome do servico
                  <input
                    required
                    style={input}
                    value={serviceName}
                    onChange={(event) => setServiceName(event.target.value)}
                  />
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
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
                    Duracao (minutos)
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
                <button style={button}>Adicionar servico</button>
              </form>
              {services.map((item) => (
                <div
                  key={item.id}
                  style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}
                >
                  {editingService?.id === item.id ? (
                    <form
                      onSubmit={saveServiceEdit}
                      style={{
                        display: "grid",
                        gap: 8,
                        gridTemplateColumns: "minmax(0,1fr) 120px 120px",
                      }}
                    >
                      <label>
                        Nome do servico
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
                        Duracao (minutos)
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
                      <button style={{ ...button, gridColumn: "1 / 3" }}>
                        Salvar edicao
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        style={{ ...button, background: "#725b4b" }}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span>
                          <b>{item.name}</b>
                          <br />
                          <small>
                            R$ {item.price} | {item.duration_minutes} min |{" "}
                            {item.active ? "Ativo" : "Inativo"}
                          </small>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => beginServiceEdit(item)}
                          style={{ ...button, background: "#425e9b" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void toggle("services", item)}
                          style={{
                            ...button,
                            background: item.active ? "#725b4b" : "#39723f",
                          }}
                        >
                          {item.active ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </article>
            <article className="configuration-card" style={card}>
              <h2 style={{ marginTop: 0 }}>4. Profissionais</h2>
              {shop.role === "owner" && (
                <form
                  onSubmit={addProfessional}
                  style={{ display: "flex", gap: 8 }}
                >
                  <input
                    required
                    style={input}
                    value={professionalName}
                    placeholder="Nome do profissional"
                    onChange={(event) => setProfessionalName(event.target.value)}
                  />
                  <button style={button}>Adicionar</button>
                </form>
              )}
              {professionals.map((item) => (
                <div
                  key={item.id}
                  style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}
                >
                  {editingProfessionalName?.id === item.id && shop.role === "owner" ? (
                    <form onSubmit={saveProfessionalNameEdit} style={{ display: "grid", gap: 10, marginTop: 8 }}>
                      <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fff5e6", color: "#52300a" }}>
                        <b>Editando nome de {item.name}</b>
                        <br />
                        <small>Esta alteração aparece na agenda e na página pública da barbearia.</small>
                      </div>
                      <label style={{ fontWeight: 700 }}>Nome do profissional<input required style={input} value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={saving} style={button}>{saving ? "Salvando..." : "Salvar Nome"}</button>
                        <button type="button" disabled={saving} onClick={() => setEditingProfessionalName(null)} style={{ ...button, background: "#725b4b" }}>Cancelar</button>
                      </div>
                    </form>
                  ) : editingProfessionalCommission?.id === item.id ? (
                    <form onSubmit={saveProfessionalCommissionEdit} style={{ display: "grid", gap: 10, marginTop: 8 }}>
                      <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fff5e6", color: "#52300a" }}>
                        <b>Comissão de {item.name}</b>
                        <br />
                        <small>Defina a porcentagem que será usada nos próximos atendimentos concluídos.</small>
                      </div>
                      <label style={{ fontWeight: 700 }}>Comissão (%)<input type="text" required style={input} value={editCommissionRate} onChange={(event) => setEditCommissionRate(event.target.value)} /></label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={savingCommission} style={button}>{savingCommission ? "Salvando..." : "Salvar Comissão"}</button>
                        <button type="button" disabled={savingCommission} onClick={() => setEditingProfessionalCommission(null)} style={{ ...button, background: "#725b4b" }}>Cancelar</button>
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
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {shop.role === "owner" && (
                          <button onClick={() => beginProfessionalNameEdit(item)} style={{ ...button, background: "#425e9b" }}>Editar nome</button>
                        )}
                        <button onClick={() => beginProfessionalCommissionEdit(item)} style={{ ...button, background: "#425e9b" }}>Editar comissão</button>
                        {(shop.role === "owner" || shop.role === "manager") && (
                          <button onClick={() => void beginProfessionalSchedule(item)} style={{ ...button, background: "#4c6b45" }}>
                            {item.scheduleConfigured ? "Editar agenda" : "Configurar agenda"}
                          </button>
                        )}
                        {item.active && shop.role === "owner" && (
                          <button onClick={() => { setInviteRole("barber"); setInviteProfessionalId(item.id); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }} style={{ ...button, background: "#e4773a" }}>
                            Conceder acesso ao painel
                          </button>
                        )}
                        {shop.role === "owner" && (
                          <button onClick={() => void toggle("professionals", item)} style={{ ...button, background: item.active ? "#725b4b" : "#39723f" }}>
                            {item.active ? "Inativar" : "Ativar"}
                          </button>
                        )}
                      </div>
                      {editingProfessionalSchedule?.id === item.id && (
                        <form
                          onSubmit={saveProfessionalSchedule}
                          style={{
                            marginTop: 14,
                            padding: 12,
                            background: "#f6f2ed",
                            borderRadius: 8,
                          }}
                        >
                          <b>Agenda de {item.name}</b>
                          <p
                            style={{
                              margin: "6px 0 10px",
                              fontSize: 13,
                              color: "#6d6257",
                            }}
                          >
                            Defina o horário de cada dia. A pausa é semanal: ela
                            se repete somente no dia da linha correspondente e
                            bloqueia novos agendamentos nesse intervalo.
                          </p>
                          <div style={{ display: "grid", gap: 7 }}>
                            {professionalSchedule.map((day) => (
                              <div
                                key={day.weekday}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "78px minmax(90px,1fr) minmax(90px,1fr) auto",
                                  gap: 6,
                                  alignItems: "center",
                                }}
                              >
                                <b style={{ fontSize: 12 }}>
                                  {days[day.weekday]}
                                </b>
                                <input
                                  name={`opens-${day.weekday}`}
                                  disabled={day.is_closed}
                                  aria-label={`Inicio ${days[day.weekday]}`}
                                  type="time"
                                  style={input}
                                  value={day.opens_at}
                                  onChange={(event) =>
                                    changeProfessionalHour(day.weekday, {
                                      opens_at: event.target.value,
                                    })
                                  }
                                />
                                <input
                                  name={`closes-${day.weekday}`}
                                  disabled={day.is_closed}
                                  aria-label={`Fim ${days[day.weekday]}`}
                                  type="time"
                                  style={input}
                                  value={day.closes_at}
                                  onChange={(event) =>
                                    changeProfessionalHour(day.weekday, {
                                      closes_at: event.target.value,
                                    })
                                  }
                                />
                                <label
                                  style={{ fontSize: 12, whiteSpace: "nowrap" }}
                                >
                                  <input
                                    name={`closed-${day.weekday}`}
                                    type="checkbox"
                                    checked={day.is_closed}
                                    onChange={(event) =>
                                      changeProfessionalHour(day.weekday, {
                                        is_closed: event.target.checked,
                                      })
                                    }
                                  />{" "}
                                  Fechado
                                </label>
                                <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                  <label style={{ fontSize: 12 }}>Pausa início<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.starts_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: event.target.value, ends_at: current[day.weekday]?.ends_at || "" } }))} /></label>
                                  <label style={{ fontSize: 12 }}>Pausa fim<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.ends_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: current[day.weekday]?.starts_at || "", ends_at: event.target.value } }))} /></label>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{ display: "flex", gap: 8, marginTop: 12 }}
                          >
                            <button disabled={saving} style={button}>
                              Salvar agenda
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProfessionalSchedule(null)
                              }
                              style={{ ...button, background: "#725b4b" }}
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
            </article>
          </div>

          <section className="configuration-card" style={card}>
            <h2 style={{ marginTop: 0 }}>5. Equipe e acessos ao painel</h2>
            <p style={{ color: "#6d6257", lineHeight: 1.5, marginBottom: 16 }}>
              Convide membros para a equipe da barbearia. O vínculo é criado somente após o convidado aceitar o convite.
            </p>

            {invitationMessage && (
              <p
                role="status"
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: invitationMessage.startsWith("Não foi") || invitationMessage.startsWith("Erro") ? "#fef2f2" : "#f0fdf4",
                  color: invitationMessage.startsWith("Não foi") || invitationMessage.startsWith("Erro") ? "#991b1b" : "#166534",
                  border: "1px solid",
                  borderColor: invitationMessage.startsWith("Não foi") || invitationMessage.startsWith("Erro") ? "#fca5a5" : "#bbf7d0",
                  marginBottom: 16,
                }}
              >
                {invitationMessage}
              </p>
            )}

            {generatedTokenLink && (
              <div
                style={{
                  background: "#fff8f3",
                  border: "1px solid #ead8ca",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <b style={{ color: "#d7612c" }}>Link de convite individual criado:</b>
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
                  style={{
                    display: "block",
                    background: "white",
                    padding: 10,
                    borderRadius: 5,
                    border: "1px solid #ddd",
                    margin: "10px 0",
                    overflowWrap: "anywhere",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {generatedTokenLink}
                </code>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void copyGeneratedLink()}
                    style={{ ...button, background: "#166534" }}
                  >
                    Copiar link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para acessar a equipe de ${shop.name}! Acesse o link para aceitar: ${generatedTokenLink}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...button, textDecoration: "none", background: "#15803d" }}
                  >
                    Enviar pelo WhatsApp
                  </a>
                </div>
                {copyLinkMessage && (
                  <p role="status" style={{ margin: "8px 0 0", color: "#166534", fontSize: 14 }}>
                    {copyLinkMessage}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleCreateInvitation} style={{ background: "#fffaf6", border: "1px solid #e8e0d8", padding: 18, borderRadius: 10, marginBottom: 22 }}>
              <b style={{ display: "block", marginBottom: 10 }}>Criar novo convite</b>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                <label>
                  E-mail do convidado
                  <input
                    required
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
              <button style={{ ...button, marginTop: 14 }}>Gerar link de convite</button>
            </form>

            {!!teamInvitations.length && (
              <div style={{ marginBottom: 22 }}>
                <h3>Convites pendentes</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {teamInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 12,
                        border: "1px solid #e8e0d8",
                        borderRadius: 8,
                        background: "white",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div>
                        <b>{inv.email_normalized}</b> —{" "}
                        <span style={{ textTransform: "capitalize" }}>
                          {inv.role === "manager" ? "Gerente" : "Barbeiro"}
                        </span>
                        {inv.professionals?.name && (
                          <span> (Profissional: {inv.professionals.name})</span>
                        )}
                        <br />
                        <small style={{ color: "#6d6257" }}>
                          Criado em: {new Date(inv.created_at).toLocaleDateString("pt-BR")} |
                          Expira em: {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRevokeInvitation(inv.id)}
                        style={{ ...button, background: "#991b1b", padding: "7px 12px", fontSize: 13 }}
                      >
                        Revogar convite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3>Membros da equipe ativos</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {teamMembers.length === 0 ? (
                  <p style={{ color: "#6d6257" }}>Nenhum membro adicional de equipe cadastrado.</p>
                ) : (
                  teamMembers.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        padding: 12,
                        border: "1px solid #e8e0d8",
                        borderRadius: 8,
                        background: "#fcfaf8",
                      }}
                    >
                      <b style={{ textTransform: "capitalize" }}>
                        {member.role === "manager" ? "Gerente" : "Barbeiro"}
                      </b>
                      {member.professionals?.name && (
                        <span> — Profissional: {member.professionals.name}</span>
                      )}
                      <br />
                      <small style={{ color: "#6d6257" }}>Status: {member.status}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
