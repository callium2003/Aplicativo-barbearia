"use client";

import { saoPauloDateTimeToIso } from "@/utils/brazil-time";
import { normalizeCommissionRate } from "@/utils/commission";
import { getPanelContext } from "@/utils/panel-context";
import { isSafePublicStorageImageUrl } from "@/utils/storage-image-url";
import { supabase } from "@/utils/supabase";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ActionFeedback from "../../ActionFeedback";
import PanelShell from "../../PanelShell";
import {
  professionalAccessState,
  professionalInitials,
  professionalSaveError,
} from "../presentation.mjs";

type Role = "owner" | "manager";
type Shop = { id: string; name: string; role: Role };
type Professional = {
  id: string;
  name: string;
  phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  active: boolean;
  schedule_mode: "barbershop" | "custom";
};
type Member = { professional_id: string | null; status: string };
type Invitation = {
  id: string;
  professional_id: string | null;
  status: string;
  expires_at: string;
  email_normalized: string;
};
type Hours = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};
type Break = {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
};
type DeactivationReview = { id: string; open_appointment_count: number };
type FeedbackScope = "data" | "commission" | "schedule" | "break" | "block" | "invite" | "access" | "operational" | "review";
type Feedback = { scope: FeedbackScope; message: string; tone: "success" | "error" };

const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const blankWeek: Hours[] = days.map((_, weekday) => ({
  weekday,
  opens_at: "09:00",
  closes_at: "18:00",
  is_closed: weekday === 0,
}));
const allowedImages = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumImageBytes = 2 * 1024 * 1024;

function professionalImagePath(url: string, professionalId: string) {
  if (!isSafePublicStorageImageUrl(url, "professional-images", professionalId))
    return "";
  const marker = "/storage/v1/object/public/professional-images/";
  return decodeURIComponent(new URL(url).pathname.split(marker)[1] || "");
}

export default function FichaProfissional() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const professionalId = params.id;
  const [shop, setShop] = useState<Shop | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [hours, setHours] = useState<Hours[]>(blankWeek);
  const [businessHours, setBusinessHours] = useState<Hours[]>([]);
  const [editingCustom, setEditingCustom] = useState(false);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [commission, setCommission] = useState("0,00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [editingInvite, setEditingInvite] = useState(false);
  const [futureCount, setFutureCount] = useState(0);
  const [review, setReview] = useState<DeactivationReview | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loadedAt] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [actionFeedback, setActionFeedback] = useState<Feedback | null>(null);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const photoPreview = useMemo(
    () => (photo ? URL.createObjectURL(photo) : ""),
    [photo],
  );
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const load = useCallback(async () => {
    const context = await getPanelContext(supabase);
    if (!context.userId) {
      window.location.replace("/entrar");
      return;
    }
    if (context.role === "barber")
      return window.location.replace("/painel/agenda");
    if (!context.role || !context.barbershopId) {
      window.location.replace("/painel/inicio");
      return;
    }

    const now = new Date().toISOString();
    const [
      shopResult,
      professionalResult,
      metadataResult,
      memberResult,
      inviteResult,
      hoursResult,
      breakResult,
      commissionResult,
      futureResult,
      reviewResult,
    ] = await Promise.all([
      supabase
        .from("barbershops")
        .select("id,name")
        .eq("id", context.barbershopId)
        .maybeSingle<{ id: string; name: string }>(),
      supabase
        .from("professionals")
        .select("id,name,phone,instagram_url,photo_url,active")
        .eq("id", professionalId)
        .eq("barbershop_id", context.barbershopId)
        .maybeSingle<Omit<Professional, "contact_email" | "schedule_mode">>(),
      supabase
        .from("professionals")
        .select("id,contact_email,schedule_mode")
        .eq("id", professionalId)
        .eq("barbershop_id", context.barbershopId)
        .maybeSingle<{
          id: string;
          contact_email: string | null;
          schedule_mode: "barbershop" | "custom";
        }>(),
      supabase
        .from("team_members")
        .select("professional_id,status")
        .eq("barbershop_id", context.barbershopId)
        .eq("professional_id", professionalId),
      supabase
        .from("team_invitations")
        .select("id,professional_id,status,expires_at,email_normalized")
        .eq("barbershop_id", context.barbershopId)
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false }),
      supabase
        .from("professional_hours")
        .select("weekday,opens_at,closes_at,is_closed")
        .eq("professional_id", professionalId),
      supabase
        .from("professional_breaks")
        .select("id,weekday,starts_at,ends_at")
        .eq("professional_id", professionalId)
        .order("weekday"),
      supabase.rpc("get_professional_commission_rates", {
        p_barbershop_id: context.barbershopId,
      }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("barbershop_id", context.barbershopId)
        .eq("professional_id", professionalId)
        .eq("status", "scheduled")
        .gt("starts_at", now),
      supabase
        .from("professional_deactivation_reviews")
        .select("id,open_appointment_count")
        .eq("barbershop_id", context.barbershopId)
        .eq("professional_id", professionalId)
        .eq("status", "open")
        .maybeSingle<DeactivationReview>(),
    ]);

    if (
      shopResult.error ||
      professionalResult.error ||
      !shopResult.data ||
      !professionalResult.data
    ) {
      setMessage("Não foi possível carregar a ficha deste profissional.");
      return;
    }
    const stored = (hoursResult.data || []) as Hours[];
    const business = await supabase.from("business_hours")
      .select("weekday,opens_at,closes_at,is_closed")
      .eq("barbershop_id", context.barbershopId);
    setBusinessHours((business.data || []) as Hours[]);
    const item: Professional = {
      ...professionalResult.data,
      contact_email: metadataResult.data?.contact_email || null,
      schedule_mode:
        metadataResult.data?.schedule_mode ||
        (stored.length ? "custom" : "barbershop"),
    };
    setShop({ ...shopResult.data, role: context.role as Role });
    setProfessional(item);
    setMembers((memberResult.data || []) as Member[]);
    setInvitations((inviteResult.data || []) as Invitation[]);
    setBreaks((breakResult.data || []) as Break[]);
    setFutureCount(futureResult.count || 0);
    setReview(reviewResult.error ? null : reviewResult.data);
    setName(item.name);
    setPhone(item.phone || "");
    setContactEmail(item.contact_email || "");
    setInstagram(item.instagram_url || "");
    if (stored.length)
      setHours(
        blankWeek.map(
          (day) => stored.find((row) => row.weekday === day.weekday) || day,
        ),
      );
    const rate =
      (commissionResult.data || []).find(
        (row: { professional_id: string }) =>
          row.professional_id === professionalId,
      )?.commission_rate_percent || 0;
    setCommission(Number(rate).toFixed(2).replace(".", ","));
    const notice = searchParams.get("notice");
    if (notice === "created")
      setMessage(
        "Profissional criado. Complete a ficha e convide para o acesso quando necessário.",
      );
    if (notice === "photo-upload-failed")
      setMessage(
        "Profissional criado, mas a foto não pôde ser salva. O cadastro foi preservado.",
      );
  }, [professionalId, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function feedbackFor(scope: FeedbackScope) {
    return actionFeedback?.scope === scope
      ? { message: actionFeedback.message, tone: actionFeedback.tone }
      : { message: "", tone: "success" as const };
  }

  function reportAction(scope: FeedbackScope, message: string, error = false) {
    setActionFeedback({ scope, message, tone: error ? "error" : "success" });
  }

  async function saveData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!professional || saving) return;
    setSaving(true);
    setActionFeedback(null);
    let nextPhotoUrl = removePhoto ? null : professional.photo_url;
    let uploadedPath = "";
    try {
      if (photo) {
        const extension =
          photo.type === "image/png"
            ? "png"
            : photo.type === "image/webp"
              ? "webp"
              : "jpg";
        uploadedPath = `${professional.id}/${crypto.randomUUID()}.${extension}`;
        const uploaded = await supabase.storage
          .from("professional-images")
          .upload(uploadedPath, photo, {
            contentType: photo.type,
            upsert: false,
          });
        if (uploaded.error) throw uploaded.error;
        nextPhotoUrl = supabase.storage
          .from("professional-images")
          .getPublicUrl(uploadedPath).data.publicUrl;
      }
      const result = await supabase.rpc("update_professional_v2", {
        p_professional_id: professional.id,
        p_name: name,
        p_phone: phone || null,
        p_contact_email: contactEmail || null,
        p_instagram_url: instagram || null,
        p_photo_url: nextPhotoUrl,
      });
      if (result.error) throw result.error;

      if ((photo || removePhoto) && professional.photo_url) {
        const oldPath = professionalImagePath(
          professional.photo_url,
          professional.id,
        );
        if (oldPath)
          await supabase.storage.from("professional-images").remove([oldPath]);
      }
      setPhoto(null);
      setRemovePhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
      reportAction("data", "Dados profissionais atualizados.");
      await load();
    } catch (error) {
      if (uploadedPath)
        await supabase.storage
          .from("professional-images")
          .remove([uploadedPath]);
      reportAction("data", professionalSaveError(error), true);
    } finally {
      setSaving(false);
    }
  }

  function selectPhoto(file: File | null) {
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!allowedImages.has(file.type) || file.size > maximumImageBytes) {
      reportAction("data", "A foto deve ser JPG, PNG ou WebP e ter no máximo 2 MB.", true);
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    setPhoto(file);
    setRemovePhoto(false);
    setActionFeedback(null);
  }

  async function saveCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeCommissionRate(commission);
    if (typeof normalized !== "string") {
      reportAction("commission", normalized.error, true);
      return;
    }
    const result = await supabase.rpc("set_professional_commission_rate", {
      p_professional_id: professionalId,
      p_commission_rate_percent_text: normalized,
    });
    reportAction(
      "commission",
      result.error
        ? "Não foi possível atualizar a comissão."
        : "Comissão atualizada sem alterar lançamentos anteriores.",
      Boolean(result.error),
    );
  }

  function changeHour(weekday: number, update: Partial<Hours>) {
    setHours((current) =>
      current.map((day) =>
        day.weekday === weekday ? { ...day, ...update } : day,
      ),
    );
  }
  async function saveCustomSchedule() {
    if (saving) return;
    for (const day of hours) {
      if (day.is_closed) continue;
      const business = businessHours.find((row) => row.weekday === day.weekday);
      if (!business || business.is_closed) {
        reportAction("schedule", `${days[day.weekday]}: a barbearia está fechada. Desmarque esse dia para salvar a agenda personalizada.`, true);
        return;
      }
      if (!day.opens_at || !day.closes_at || day.opens_at.slice(0, 5) >= day.closes_at.slice(0, 5)
        || day.opens_at.slice(0, 5) < business.opens_at.slice(0, 5)
        || day.closes_at.slice(0, 5) > business.closes_at.slice(0, 5)) {
        reportAction("schedule", `${days[day.weekday]}: defina início e fim entre ${business.opens_at.slice(0, 5)} e ${business.closes_at.slice(0, 5)}, com o fim depois do início.`, true);
        return;
      }
    }
    setSaving(true);
    setActionFeedback(null);
    const rows = hours.map((day) => ({
      professional_id: professionalId,
      weekday: day.weekday,
      is_closed: day.is_closed,
      opens_at: day.is_closed ? null : day.opens_at,
      closes_at: day.is_closed ? null : day.closes_at,
    }));
    const saved = await supabase.rpc("save_professional_custom_schedule", {
      p_professional_id: professionalId,
      p_hours: rows,
    });
    setSaving(false);
    reportAction(
      "schedule",
      saved.error
        ? saved.error.code === "23514" || saved.error.code === "22023"
          ? "Confira os sete dias: os horários do profissional devem ficar dentro do funcionamento da barbearia. Nos dias em que ela fecha, desmarque o dia."
          : "Não foi possível salvar a agenda personalizada. Tente novamente."
        : "Agenda personalizada salva. O profissional está usando os horários definidos abaixo.",
      Boolean(saved.error),
    );
    if (!saved.error) await load();
  }
  async function inheritSchedule() {
    setActionFeedback(null);
    const result = await supabase.rpc("set_professional_schedule_mode", {
      p_professional_id: professionalId,
      p_schedule_mode: "barbershop",
    });
    reportAction(
      "schedule",
      result.error
        ? "Não foi possível usar a agenda da barbearia."
        : "O profissional está usando os mesmos horários de funcionamento da barbearia.",
      Boolean(result.error),
    );
    if (!result.error) {
      setEditingCustom(false);
      await load();
    }
  }

  async function addBreak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionFeedback(null);
    const form = new FormData(event.currentTarget);
    const result = await supabase
      .from("professional_breaks")
      .upsert(
        {
          professional_id: professionalId,
          weekday: Number(form.get("weekday")),
          starts_at: String(form.get("start")),
          ends_at: String(form.get("end")),
        },
        { onConflict: "professional_id,weekday" },
      );
    reportAction(
      "break",
      result.error
        ? "Não foi possível salvar a pausa."
        : "Pausa recorrente salva.",
      Boolean(result.error),
    );
    if (!result.error) await load();
  }
  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionFeedback(null);
    const form = new FormData(event.currentTarget);
    const startsAt = saoPauloDateTimeToIso(String(form.get("start")));
    const endsAt = saoPauloDateTimeToIso(String(form.get("end")));
    if (new Date(startsAt) >= new Date(endsAt)) {
      reportAction("block", "O fim do bloqueio deve ser posterior ao início.", true);
      return;
    }
    const result = await supabase
      .from("professional_time_blocks")
      .insert({
        professional_id: professionalId,
        starts_at: startsAt,
        ends_at: endsAt,
        reason: String(form.get("reason") || ""),
      });
    reportAction(
      "block",
      result.error
        ? "Não foi possível salvar o bloqueio."
        : "Bloqueio pontual salvo.",
      Boolean(result.error),
    );
    if (!result.error) event.currentTarget.reset();
  }

  async function createInvitation(email: string) {
    if (!shop) return;
    setActionFeedback(null);
    const result = await supabase.rpc("create_team_invitation", {
      p_barbershop_id: shop.id,
      p_email: email.trim(),
      p_role: "barber",
      p_professional_id: professionalId,
    });
    if (result.error || typeof result.data !== "string") {
      reportAction("invite", "Não foi possível criar o convite.", true);
      return;
    }
    const url = `${window.location.origin}/convite/equipe?token=${encodeURIComponent(result.data)}`;
    setInviteLink(url);
    setEditingInvite(false);
    reportAction(
      "invite",
      "Novo convite criado. Copie ou encaminhe o link abaixo. O e-mail de acesso permanece separado do contato.",
    );
    await load();
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createInvitation(inviteEmail);
  }

  function prepareInvitationChange(email = "") {
    setInviteEmail(email);
    setInviteLink("");
    setEditingInvite(true);
    setActionFeedback(null);
  }

  async function reissueInvitation() {
    if (!pendingInvite) return;
    await createInvitation(pendingInvite.email_normalized);
  }

  async function revokeInvitation() {
    if (!pendingInvite) return;
    setActionFeedback(null);
    const result = await supabase.rpc("revoke_team_invitation", {
      p_invitation_id: pendingInvite.id,
    });
    if (result.error) {
      reportAction("invite", "Não foi possível revogar o convite.", true);
      return;
    }
    setInviteLink("");
    setInviteEmail("");
    setEditingInvite(false);
    reportAction("invite", "Convite revogado. Você pode gerar outro quando precisar.");
    await load();
  }

  async function copyInvitationLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      reportAction("invite", "Link copiado. Agora você pode encaminhá-lo ao profissional.");
    } catch {
      reportAction("invite", "Não foi possível copiar automaticamente. Selecione o link e copie manualmente.", true);
    }
  }

  async function toggleAccess(status: "active" | "inactive") {
    setActionFeedback(null);
    const result = await supabase.rpc("set_professional_access_status", {
      p_professional_id: professionalId,
      p_status: status,
    });
    reportAction(
      "access",
      result.error
        ? "Não foi possível alterar o acesso."
        : status === "active"
          ? "Acesso reativado."
          : "Acesso inativado.",
      Boolean(result.error),
    );
    if (!result.error) await load();
  }
  async function toggleOperational() {
    if (!professional) return;
    const target = !professional.active;
    if (
      !target &&
      !window.confirm(
        `Inativar ${professional.name}? Novas reservas e o acesso serão bloqueados. Os ${futureCount} compromisso(s) futuro(s) serão preservados para revisão.`,
      )
    )
      return;
    setActionFeedback(null);
    const result = await supabase.rpc("set_professional_operational_status", {
      p_professional_id: professional.id,
      p_active: target,
    });
    reportAction(
      "operational",
      result.error
        ? "Não foi possível alterar a situação operacional."
        : target
          ? "Profissional reativado. O acesso continua inativo até ação separada."
          : "Profissional inativado. Compromissos existentes foram preservados.",
      Boolean(result.error),
    );
    if (!result.error) await load();
  }

  async function resolveReview() {
    setActionFeedback(null);
    const result = await supabase.rpc(
      "resolve_professional_deactivation_review",
      { p_professional_id: professionalId },
    );
    reportAction(
      "review",
      result.error
        ? futureCount > 0
          ? "Revise os compromissos futuros antes de encerrar a pendência."
          : "Não foi possível encerrar a revisão."
        : "Revisão de compromissos encerrada.",
      Boolean(result.error),
    );
    if (!result.error) await load();
  }

  if (!shop || !professional)
    return (
      <main className="product-shell management-team-loading">
        <p
          className={`product-message ${message ? "error" : ""}`}
          role="status"
        >
          {message || "Carregando ficha..."}
        </p>
      </main>
    );
  const access = professionalAccessState(
    professionalId,
    members,
    invitations,
    loadedAt,
  );
  const pendingInvite = invitations.find(
    (item) =>
      item.status === "pending" && Date.parse(item.expires_at) > loadedAt,
  );
  const safePhoto =
    professional.photo_url &&
    isSafePublicStorageImageUrl(
      professional.photo_url,
      "professional-images",
      professional.id,
    )
      ? professional.photo_url
      : null;

  return (
    <PanelShell
      role={shop.role}
      active="professionals"
      shopName={shop.name}
      barbershopId={shop.id}
    >
      <div className="product-content management-professional-detail">
        <Link
          className="management-back-link management-back-link-icon"
          href="/painel/profissionais"
          aria-label="Voltar"
        >
          ←
        </Link>
        <header className="management-professional-summary product-card">
          <div className="management-professional-photo-preview">
            {safePhoto ? (
              <Image src={safePhoto} alt="" fill sizes="112px" unoptimized />
            ) : (
              professionalInitials(professional.name)
            )}
          </div>
          <div>
            <p className="product-eyebrow">Ficha profissional</p>
            <h1>{professional.name}</h1>
            <p>
              {professional.active
                ? "Ativo para novas reservas"
                : "Inativo para novas reservas"}{" "}
              ·{" "}
              {professional.schedule_mode === "custom"
                ? "Agenda personalizada"
                : "Agenda da barbearia"}
            </p>
          </div>
        </header>
        {message && (
          <p
            className={`product-message ${message.startsWith("Não") ? "error" : "success"}`}
            role="status"
          >
            {message}
          </p>
        )}
        {review && (
          <aside className="management-professional-alert">
            <b>Revisão necessária</b>
            <p>
              {futureCount > 0
                ? `Este profissional ainda possui ${futureCount} compromisso(s) futuro(s) ativo(s).`
                : `Os ${review.open_appointment_count} compromisso(s) identificados na inativação já foram tratados.`}
            </p>
            {futureCount > 0 ? (
              <Link href={`/painel/agenda?professional=${professionalId}`}>
                Revisar na agenda
              </Link>
            ) : (
              <button
                className="product-button secondary"
                type="button"
                onClick={() => void resolveReview()}
              >
                Encerrar revisão
              </button>
            )}
            <ActionFeedback {...feedbackFor("review")} />
          </aside>
        )}

        <div className="management-professional-sections">
          <details
            className="product-card management-professional-section"
            open
          >
            <summary>
              <span>
                <b>Dados profissionais</b>
                <small>Contato e perfil público</small>
              </span>
              <span>＋</span>
            </summary>
            <form
              onSubmit={saveData}
              className="management-professional-fields"
            >
              <div className="management-professional-photo-editor">
                <div
                  className="management-professional-photo-preview"
                  style={
                    photoPreview
                      ? { backgroundImage: `url(${photoPreview})` }
                      : undefined
                  }
                >
                  {!photoPreview && !removePhoto && safePhoto ? (
                    <Image
                      src={safePhoto}
                      alt=""
                      fill
                      sizes="112px"
                      unoptimized
                    />
                  ) : !photoPreview && (removePhoto || !safePhoto) ? (
                    professionalInitials(name)
                  ) : null}
                </div>
                <div>
                  <label className="product-button secondary management-photo-picker">
                    Escolher nova foto
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        selectPhoto(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                  {(photo || safePhoto) && !removePhoto && (
                    <button
                      className="management-text-button"
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setRemovePhoto(Boolean(safePhoto));
                        if (photoInputRef.current)
                          photoInputRef.current.value = "";
                      }}
                    >
                      Remover foto
                    </button>
                  )}
                  <small>JPG, PNG ou WebP; até 2 MB.</small>
                </div>
              </div>
              <label className="product-field">
                <span>Nome</span>
                <input
                  className="product-input"
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="product-field">
                <span>Telefone</span>
                <input
                  className="product-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className="product-field">
                <span>E-mail de contato</span>
                <input
                  className="product-input"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <small>Independente do e-mail de acesso.</small>
              </label>
              <label className="product-field">
                <span>Instagram</span>
                <input
                  className="product-input"
                  type="url"
                  placeholder="https://instagram.com/perfil"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </label>
              <div className="management-action-area">
                <button className="product-button" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar dados"}
                </button>
                <ActionFeedback {...feedbackFor("data")} />
              </div>
            </form>
          </details>

          <details className="product-card management-professional-section">
            <summary>
              <span>
                <b>Comissão</b>
                <small>Percentual vigente: {commission}%</small>
              </span>
              <span>＋</span>
            </summary>
            <form onSubmit={saveCommission} className="management-inline-form">
              <label className="product-field">
                <span>Percentual</span>
                <input
                  className="product-input"
                  inputMode="decimal"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
              </label>
              <div className="management-action-area">
                <button className="product-button">Salvar comissão</button>
                <ActionFeedback {...feedbackFor("commission")} />
              </div>
            </form>
            <p className="management-section-note">
              A alteração vale para novas conclusões e não recalcula o
              histórico.
            </p>
          </details>

          <details className="product-card management-professional-section">
            <summary>
              <span>
                <b>Agenda e disponibilidade</b>
                <small>
                  {professional.schedule_mode === "custom"
                    ? "Horários personalizados"
                    : "Herda os horários da barbearia"}
                </small>
              </span>
              <span>＋</span>
            </summary>
            <div className="management-mode-actions">
              <button
                type="button"
                className={`product-button ${professional.schedule_mode === "barbershop" && !editingCustom ? "" : "secondary"}`}
                disabled={saving}
                onClick={() => void inheritSchedule()}
              >
                Agenda da barbearia
              </button>
              <button
                type="button"
                className={`product-button ${professional.schedule_mode === "custom" || editingCustom ? "" : "secondary"}`}
                disabled={saving}
                onClick={async () => {
                  setActionFeedback(null);
                  if (professional.schedule_mode !== "custom" && !editingCustom) {
                    const saved = await supabase.from("professional_saved_custom_hours")
                      .select("weekday,opens_at,closes_at,is_closed")
                      .eq("professional_id", professionalId);
                    if (saved.error) {
                      reportAction("schedule", "Não foi possível carregar os horários personalizados. Tente novamente.", true);
                      return;
                    }
                    if (saved.data?.length === 7) setHours(saved.data as Hours[]);
                  }
                  setEditingCustom(true);
                }}
              >
                Personalizada
              </button>
            </div>
            {!editingCustom && professional.schedule_mode !== "custom" && <ActionFeedback {...feedbackFor("schedule")} />}
            {(professional.schedule_mode === "custom" || editingCustom) && (
              <div className="management-week-list">
                <p className="management-section-note">Defina os horários dentro do funcionamento da barbearia. A agenda personalizada passa a valer quando você salvar.</p>
                {hours.map((day) => (
                  <div className="management-week-day" key={day.weekday}>
                    <label className="management-week-day-toggle">
                      <input
                        type="checkbox"
                        checked={!day.is_closed}
                        onChange={(e) =>
                          changeHour(day.weekday, {
                            is_closed: !e.target.checked,
                          })
                        }
                      />{" "}
                      {days[day.weekday]}
                    </label>
                    <small className="management-week-day-business-hours">
                      {businessHours.find((row) => row.weekday === day.weekday && !row.is_closed)
                        ? `Barbearia: ${businessHours.find((row) => row.weekday === day.weekday)?.opens_at?.slice(0, 5)}–${businessHours.find((row) => row.weekday === day.weekday)?.closes_at?.slice(0, 5)}`
                        : "Barbearia fechada"}
                    </small>
                    <input
                      className="product-input management-week-day-start"
                      type="time"
                      disabled={day.is_closed}
                      value={day.opens_at?.slice(0, 5) || ""}
                      onChange={(e) =>
                        changeHour(day.weekday, { opens_at: e.target.value })
                      }
                    />
                    <input
                      className="product-input management-week-day-end"
                      type="time"
                      disabled={day.is_closed}
                      value={day.closes_at?.slice(0, 5) || ""}
                      onChange={(e) =>
                        changeHour(day.weekday, { closes_at: e.target.value })
                      }
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="product-button"
                  disabled={saving}
                  onClick={() => void saveCustomSchedule()}
                >
                  Salvar agenda personalizada
                </button>
                <ActionFeedback {...feedbackFor("schedule")} />
              </div>
            )}
            <div className="management-availability-forms">
              <form onSubmit={addBreak}>
                <h3>Pausa recorrente</h3>
                <select className="product-select" name="weekday">
                  {days.map((day, index) => (
                    <option value={index} key={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  className="product-input"
                  name="start"
                  type="time"
                  required
                />
                <input
                  className="product-input"
                  name="end"
                  type="time"
                  required
                />
                <button className="product-button">
                  Salvar pausa
                </button>
                <ActionFeedback {...feedbackFor("break")} />
                <p>
                  {breaks.length
                    ? breaks
                        .map(
                          (item) =>
                            `${days[item.weekday]} ${item.starts_at.slice(0, 5)}–${item.ends_at.slice(0, 5)}`,
                        )
                        .join(" · ")
                    : "Nenhuma pausa cadastrada."}
                </p>
              </form>
              <form onSubmit={addBlock}>
                <h3>Ausência ou bloqueio</h3>
                <input
                  className="product-input"
                  name="start"
                  type="datetime-local"
                  required
                />
                <input
                  className="product-input"
                  name="end"
                  type="datetime-local"
                  required
                />
                <input
                  className="product-input"
                  name="reason"
                  placeholder="Motivo opcional"
                />
                <button className="product-button">
                  Bloquear período
                </button>
                <ActionFeedback {...feedbackFor("block")} />
              </form>
            </div>
          </details>

          <details className="product-card management-professional-section">
            <summary>
              <span>
                <b>Acesso ao sistema</b>
                <small>
                  {access === "active"
                    ? "Acesso ativo"
                    : access === "pending"
                      ? "Convite pendente"
                      : access === "inactive"
                        ? "Acesso inativo"
                        : "Sem acesso"}
                </small>
              </span>
              <span>＋</span>
            </summary>
            {(access === "none" || editingInvite) && (
              <form className="management-inline-form" onSubmit={invite}>
                <label className="product-field">
                  <span>E-mail de acesso</span>
                  <input
                    className="product-input"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <small>Pode ser diferente do e-mail de contato.</small>
                </label>
                <div className="management-action-area">
                  <button className="product-button">{access === "pending" ? "Gerar novo link" : "Criar convite"}</button>
                  <ActionFeedback {...feedbackFor("invite")} />
                </div>
              </form>
            )}
            {pendingInvite && (
              <div className="management-section-note">
                <p>
                  Convite pendente para {pendingInvite.email_normalized}.
                  Validade:{" "}
                  {new Date(pendingInvite.expires_at).toLocaleDateString("pt-BR")}
                  .
                </p>
                {!editingInvite && <div className="management-invite-result-actions">
                  <button className="product-button secondary" type="button" onClick={() => void reissueInvitation()}>Reenviar convite</button>
                  <button className="product-button secondary" type="button" onClick={() => prepareInvitationChange(pendingInvite.email_normalized)}>Alterar e-mail</button>
                  <button className="product-button danger" type="button" onClick={() => void revokeInvitation()}>Revogar convite</button>
                </div>}
              </div>
            )}
            {inviteLink && <div className="management-invite-result">
              <b>Link de convite individual:</b>
              <code className="management-invite-code">{inviteLink}</code>
              <div className="management-invite-result-actions">
                <button className="product-button secondary" type="button" onClick={() => void copyInvitationLink()}>Copiar link</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para acessar a equipe de ${shop.name}. Use este link para aceitar: ${inviteLink}`)}`} target="_blank" rel="noreferrer" className="management-team-whatsapp-action">Enviar pelo WhatsApp</a>
              </div>
            </div>}
            <ActionFeedback {...feedbackFor("invite")} />
            {access === "active" && (
              <button
                className="product-button danger"
                type="button"
                onClick={() => void toggleAccess("inactive")}
              >
                Inativar acesso
              </button>
            )}
            {access === "inactive" && professional.active && (
              <button
                className="product-button"
                type="button"
                onClick={() => void toggleAccess("active")}
              >
                Reativar acesso
              </button>
            )}
            <ActionFeedback {...feedbackFor("access")} />
          </details>

          <details className="product-card management-professional-section management-professional-danger">
            <summary>
              <span>
                <b>{professional.active ? "Inativação" : "Reativação"}</b>
                <small>
                  {professional.active
                    ? "Bloqueia novas reservas e acesso sem apagar histórico"
                    : "Reativa somente o cadastro operacional"}
                </small>
              </span>
              <span>＋</span>
            </summary>
            <p>
              {futureCount > 0
                ? `${futureCount} compromisso(s) futuro(s) serão preservado(s) para revisão.`
                : "Nenhum compromisso futuro ativo foi encontrado."}
            </p>
            <button
              className={`product-button ${professional.active ? "danger" : ""}`}
              type="button"
              onClick={() => void toggleOperational()}
            >
              {professional.active
                ? "Inativar profissional"
                : "Reativar profissional"}
            </button>
            <ActionFeedback {...feedbackFor("operational")} />
          </details>
        </div>
      </div>
    </PanelShell>
  );
}
