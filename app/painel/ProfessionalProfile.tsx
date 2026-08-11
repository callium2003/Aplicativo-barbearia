"use client";

import { createClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useRef, useState } from "react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
const limit = 2 * 1024 * 1024;
type Profile = { id: string; name: string; phone: string | null; instagram_url: string | null; photo_url: string | null };

export default function ProfessionalProfile({ professionalId }: { professionalId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("Carregando seus dados...");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void supabase.from("professionals").select("id,name,phone,instagram_url,photo_url").eq("id", professionalId).maybeSingle<Profile>()
      .then(({ data, error }) => { setProfile(data || null); setMessage(error || !data ? "Não foi possível carregar seus dados." : ""); });
  }, [professionalId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile || saving) return;
    setSaving(true); setMessage("");
    let photoUrl = profile.photo_url;
    let uploadedPath = "";
    try {
      if (photo) {
        if (!accepted.has(photo.type) || photo.size > limit) throw new Error("A foto deve ser JPG, PNG ou WebP e ter no máximo 2 MB.");
        const extension = photo.name.split(".").pop()?.toLowerCase() || "webp";
        uploadedPath = `${professionalId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("professional-images").upload(uploadedPath, photo, { contentType: photo.type, upsert: false });
        if (error) throw error;
        photoUrl = supabase.storage.from("professional-images").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const { error } = await supabase.rpc("update_my_professional_profile", { p_name: profile.name, p_phone: profile.phone || "", p_instagram_url: profile.instagram_url || "", p_photo_url: photoUrl });
      if (error) throw error;
      if (photo && profile.photo_url) {
        const old = profile.photo_url.split("/professional-images/")[1];
        if (old) await supabase.storage.from("professional-images").remove([decodeURIComponent(old)]);
      }
      setProfile({ ...profile, photo_url: photoUrl }); setPhoto(null); if (inputRef.current) inputRef.current.value = "";
      setMessage("Seus dados foram salvos.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("professional-images").remove([uploadedPath]);
      setMessage(error instanceof Error ? `Não foi possível salvar: ${error.message}` : "Não foi possível salvar seus dados.");
    } finally { setSaving(false); }
  }

  if (!profile) return <div className="product-card product-empty">{message}</div>;
  return <section className="product-card pad" id="meu-perfil"><div className="product-section-head"><div><p className="product-eyebrow">Meu perfil público</p><h2>Meus dados</h2><p>Esta foto e o Instagram podem aparecer para o cliente escolher com quem deseja agendar.</p></div></div>
    <form onSubmit={save} style={{ display: "grid", gap: 13, marginTop: 18, maxWidth: 620 }}>
      <div className="product-field"><label>Nome profissional</label><input required minLength={2} className="product-input" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></div>
      <div className="product-field"><label>Telefone</label><input className="product-input" autoComplete="tel" value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></div>
      <div className="product-field"><label>Instagram (opcional)</label><input className="product-input" type="url" placeholder="https://instagram.com/seuusuario" value={profile.instagram_url || ""} onChange={(event) => setProfile({ ...profile, instagram_url: event.target.value })} /></div>
      <div className="product-field"><label>Foto pública (JPG, PNG ou WebP; até 2 MB)</label><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />{profile.photo_url && <img src={profile.photo_url} alt="Sua foto profissional" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: "50%", marginTop: 10 }} />}</div>
      <button className="product-button" disabled={saving}>{saving ? "Salvando..." : "Salvar meus dados"}</button>
      {message && <p className={`product-message ${message.startsWith("Não foi") ? "error" : "success"}`} role="status">{message}</p>}
    </form>
  </section>;
}
