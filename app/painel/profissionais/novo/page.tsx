"use client";

import { getPanelContext } from "@/utils/panel-context";
import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import PanelShell from "../../PanelShell";
import ActionFeedback from "../../ActionFeedback";
import { professionalCreatePayload, professionalInitials } from "../presentation.mjs";

type Shop = { id: string; name: string; role: "owner" | "manager" };

const allowedImages = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumImageBytes = 2 * 1024 * 1024;

export default function NovoProfissional() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const context = await getPanelContext(supabase);
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (context.role === "barber") return window.location.replace("/painel/agenda");
      if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }
      const result = await supabase.from("barbershops").select("id,name").eq("id", context.barbershopId).maybeSingle<{ id: string; name: string }>();
      if (!active) return;
      if (result.error || !result.data) { setMessage("Não foi possível abrir o cadastro."); return; }
      setShop({ ...result.data, role: context.role as "owner" | "manager" });
    }
    void load();
    return () => { active = false; };
  }, []);

  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : "", [photo]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  function selectPhoto(file: File | null) {
    if (!file) { setPhoto(null); return; }
    if (!allowedImages.has(file.type) || file.size > maximumImageBytes) {
      setMessage("A foto deve ser JPG, PNG ou WebP e ter no máximo 2 MB.");
      return;
    }
    setPhoto(file);
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop || saving) return;

    let payload;
    try {
      payload = professionalCreatePayload({ barbershopId: shop.id, name, phone, contactEmail });
    } catch (error) {
      setMessage(error instanceof Error ? String(error).replace(/^Error:\s*/, "") : "Revise os dados informados.");
      return;
    }

    setSaving(true);
    setMessage("");
    const created = await supabase.rpc("create_professional_v2", payload);
    const professionalId = typeof created.data === "string" ? created.data : null;
    if (created.error || !professionalId) {
      setSaving(false);
      setMessage("Não foi possível salvar o profissional. Verifique os dados e tente novamente.");
      return;
    }

    let photoFailed = false;
    if (photo) {
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${professionalId}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await supabase.storage.from("professional-images").upload(objectPath, photo, { contentType: photo.type, upsert: false });
      if (uploaded.error) {
        photoFailed = true;
      } else {
        const { data: publicImage } = supabase.storage.from("professional-images").getPublicUrl(objectPath);
        const updated = await supabase.rpc("update_professional_v2", {
          p_professional_id: professionalId,
          p_name: payload.p_name,
          p_phone: payload.p_phone,
          p_contact_email: payload.p_contact_email,
          p_instagram_url: null,
          p_photo_url: publicImage.publicUrl,
        });
        photoFailed = Boolean(updated.error);
        if (photoFailed) await supabase.storage.from("professional-images").remove([objectPath]);
      }
    }

    router.push(`/painel/profissionais/${professionalId}${photoFailed ? "?notice=photo-upload-failed" : "?notice=created"}`);
  }

  if (!shop) {
    return <main className="product-shell management-team-loading"><p className={`product-message ${message ? "error" : ""}`} role="status">{message || "Carregando cadastro..."}</p></main>;
  }

  return (
    <PanelShell
      role={shop.role}
      active="professionals"
      shopName={shop.name}
      barbershopId={shop.id}
      mobileBackHref="/painel/profissionais"
      mobileBackLabel="Voltar"
      mobileTitle="Novo profissional"
    >
      <div className="product-content management-professional-form-page">
        <Link className="management-back-link management-back-link-icon" href="/painel/profissionais" aria-label="Voltar">←</Link>
        <header className="product-page-head">
          <div>
            <p className="product-eyebrow">Equipe</p>
            <h1 className="product-title">Novo profissional</h1>
            <p className="product-subtitle">Crie primeiro o cadastro operacional. O acesso ao painel será concedido depois, por convite.</p>
          </div>
        </header>

        <form className="management-professional-create-v2" onSubmit={save} noValidate>
          <section className="product-card management-professional-identity-card">
            <div className="management-professional-photo-preview" style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : undefined} aria-hidden="true">
              {!photoPreview && professionalInitials(name)}
            </div>
            <div>
              <h2>Foto do profissional</h2>
              <p>Opcional. Use uma imagem quadrada, nítida e com até 2 MB.</p>
              <label className="product-button secondary management-photo-picker">
                Escolher foto
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(event.target.files?.[0] || null)} />
              </label>
              {photo && <button className="management-text-button" type="button" onClick={() => setPhoto(null)}>Remover foto escolhida</button>}
            </div>
          </section>

          <section className="product-card pad management-professional-data-card">
            <div className="product-section-head"><div><h2>Dados profissionais</h2><p>Esses dados pertencem ao perfil profissional e não definem a conta de acesso.</p></div></div>
            <div className="management-professional-fields">
              <label className="product-field"><span>Nome *</span><input className="product-input" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="product-field"><span>Telefone</span><input className="product-input" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-0000" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              <label className="product-field"><span>E-mail de contato</span><input className="product-input" type="email" autoComplete="email" placeholder="contato@exemplo.com" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /><small>Não será usado como e-mail de login automaticamente.</small></label>
            </div>
          </section>

          <aside className="management-professional-inherited-note">
            <span aria-hidden="true">◷</span>
            <div><b>Agenda da barbearia</b><p>O profissional começa ativo e herda os horários da barbearia. Você poderá personalizar dias, pausas e ausências na ficha.</p></div>
          </aside>

          <div className="management-professional-form-actions">
            <button className="product-button management-professional-submit" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar profissional"}</button>
            <Link className="product-button secondary management-professional-cancel" href="/painel/profissionais">Cancelar</Link>
            <div className="management-professional-form-feedback">
              <ActionFeedback message={message} tone="error" />
            </div>
          </div>
        </form>
      </div>
    </PanelShell>
  );
}
