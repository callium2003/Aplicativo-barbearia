"use client";

import { supabase } from "@/utils/supabase";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { isSafePublicStorageImageUrl } from "@/utils/storage-image-url";
import { validateProfessionalProfile } from "@/utils/professional-profile-validation";

const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
const limit = 2 * 1024 * 1024;
type Profile = { id: string; name: string; phone: string | null; instagram_url: string | null; photo_url: string | null };

export default function ProfessionalProfile({ professionalId }: { professionalId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("Carregando seus dados...");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void supabase.rpc("get_my_professional_profile").maybeSingle<Profile>()
      .then(({ data, error }) => { setProfile(data || null); setMessage(error || !data ? "Não foi possível carregar seus dados." : ""); });
  }, [professionalId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile || saving) return;
    const validationError = validateProfessionalProfile({ name: profile.name, phone: profile.phone || "", instagramUrl: profile.instagram_url || "" });
    if (validationError) { setMessage(validationError); return; }
    setSaving(true); setMessage("");
    let photoUrl = profile.photo_url;
    let uploadedPath = "";
    try {
      if (photo) {
        if (!accepted.has(photo.type) || photo.size > limit) throw new Error("A foto deve ser JPG, PNG ou WebP e ter no máximo 2 MB.");
        const extension = photo.name.split(".").pop()?.toLowerCase() || "webp";
        uploadedPath = `${profile.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("professional-images").upload(uploadedPath, photo, { contentType: photo.type, upsert: false });
        if (error) throw error;
        photoUrl = supabase.storage.from("professional-images").getPublicUrl(uploadedPath).data.publicUrl;
      }
      if (photoUrl && !isSafePublicStorageImageUrl(photoUrl, "professional-images", profile.id)) throw new Error("invalid_profile_image_url");
      const { error } = await supabase.rpc("update_my_professional_profile", { p_name: profile.name.trim(), p_phone: (profile.phone || "").replace(/\D/g, ""), p_instagram_url: profile.instagram_url?.trim() || "", p_photo_url: photoUrl });
      if (error) throw error;
      if (photo && profile.photo_url) {
        const old = profile.photo_url.split("/professional-images/")[1];
        if (old) await supabase.storage.from("professional-images").remove([decodeURIComponent(old)]);
      }
      setProfile({ ...profile, photo_url: photoUrl }); setPhoto(null); setPreviewUrl(""); setEditing(false); if (inputRef.current) inputRef.current.value = "";
      setMessage("Seus dados foram salvos.");
    } catch {
      if (uploadedPath) await supabase.storage.from("professional-images").remove([uploadedPath]);
      setMessage("Não foi possível salvar seus dados. (código: operation_failed)");
    } finally { setSaving(false); }
  }

  function choosePhoto(file: File | null) {
    setPhoto(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  if (!profile) return <div className="product-card product-empty">{message}</div>;
  const displayedPhoto = previewUrl || profile.photo_url || "";
  return <section className="product-card pad" id="meu-perfil"><div className="product-section-head professional-profile-heading"><div><p className="product-eyebrow">Meu perfil público</p><h2>Meus dados</h2><p>Esta foto e o Instagram podem aparecer para o cliente escolher com quem deseja agendar.</p></div><button className="product-button secondary" type="button" onClick={() => setEditing((current) => !current)}>{editing ? "Cancelar edição" : "Editar dados"}</button></div>
    <form onSubmit={save} style={{ display: "grid", gap: 13, marginTop: 18, maxWidth: 620 }}>
      <div className="product-field"><label>Nome profissional</label><input required minLength={2} disabled={!editing} className="product-input" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></div>
      <div className="product-field"><label>Telefone</label><input disabled={!editing} className="product-input" autoComplete="tel" value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></div>
      <div className="product-field"><label>Instagram (opcional)</label><input disabled={!editing} className="product-input" type="url" placeholder="https://instagram.com/seuusuario" value={profile.instagram_url || ""} onChange={(event) => setProfile({ ...profile, instagram_url: event.target.value })} /></div>
      <div className="product-field professional-photo-field"><label>Foto pública</label><p>JPG, PNG ou WebP, até 2 MB.</p><div className="professional-photo-control">{displayedPhoto ? <Image src={displayedPhoto} alt="Prévia da sua foto profissional" width={96} height={96} unoptimized style={{ width: 96, height: 96, objectFit: "cover", borderRadius: "50%" }} /> : <span className="professional-photo-placeholder" aria-label="Nenhuma foto carregada">Foto</span>}{editing && <label className="product-button secondary" htmlFor="professional-photo">Escolher foto<input id="professional-photo" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0] || null)} /></label>}</div></div>
      {editing && <button className="product-button" disabled={saving}>{saving ? "Salvando..." : "Salvar dados"}</button>}
      {message && <p className={`product-message ${message.startsWith("Não foi") ? "error" : "success"}`} role="status">{message}</p>}
    </form>
  </section>;
}
