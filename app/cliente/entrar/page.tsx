"use client";

import { createClient, type User } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

type CustomerProfile = { id: string; name: string; email: string | null; phone: string; phone_normalized: string };

function safeReturnTo() {
  if (typeof window === "undefined") return "/meus-agendamentos";
  const requested = new URLSearchParams(window.location.search).get("returnTo") || "/meus-agendamentos";
  return requested.startsWith("/") && !requested.startsWith("//") ? requested : "/meus-agendamentos";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export default function ClienteEntrar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const returnTo = useMemo(() => safeReturnTo(), []);

  useEffect(() => {
    let active = true;

    async function resolve(currentUser: User | null) {
      if (!active) return;
      setUser(currentUser);
      setEmail(currentUser?.email || "");
      if (!currentUser) { setProfile(null); setLoading(false); return; }

      const { data } = await supabase
        .from("customers")
        .select("id,name,email,phone,phone_normalized")
        .eq("auth_user_id", currentUser.id)
        .maybeSingle<CustomerProfile>();
      if (!active) return;

      if (data) {
        setProfile(data);
        setName(data.name);
        setPhone(data.phone);
        window.location.replace(returnTo);
        return;
      }

      const suggested = String(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "").trim();
      if (suggested) setName(suggested);
      setLoading(false);
    }

    void supabase.auth.getUser().then(({ data }) => resolve(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void resolve(session?.user || null); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [returnTo]);

  async function continueGoogle() {
    setSending(true); setMessage("");
    const redirectTo = `${window.location.origin}/cliente/entrar?returnTo=${encodeURIComponent(returnTo)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) { setSending(false); setMessage("Não foi possível abrir o acesso com Google."); }
  }

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSending(true); setMessage("");
    const redirectTo = `${window.location.origin}/cliente/entrar?returnTo=${encodeURIComponent(returnTo)}`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    setSending(false);
    setMessage(error ? "Não foi possível enviar o link. Confira o e-mail informado." : "Enviamos um link seguro. Abra o e-mail para continuar.");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const digits = normalizePhone(phone);
    if (name.trim().length < 2) { setMessage("Informe seu nome completo."); return; }
    if (digits.length < 10 || digits.length > 13) { setMessage("Informe um celular/WhatsApp válido com DDD."); return; }
    setSaving(true); setMessage("");
    const { data, error } = await supabase.rpc("save_my_customer_profile", { p_name: name.trim(), p_phone: phone.trim() });
    setSaving(false);
    if (error) { setMessage(error.message || "Não foi possível salvar seu cadastro."); return; }
    const saved = Array.isArray(data) ? data[0] : data;
    if (saved) setProfile(saved as CustomerProfile);
    window.location.replace(returnTo);
  }

  if (loading || profile) {
    return <main className="customer-shell" style={{ display: "grid", placeItems: "center" }}><p className="customer-message">Preparando sua área...</p></main>;
  }

  return <main className="customer-auth-wrap">
    <section className="customer-auth-visual">
      <div className="customer-auth-copy">
        <p>ÁREA DO CLIENTE</p>
        <h1>Seu próximo corte, sem complicação.</h1>
        <p>Entre uma vez, acompanhe suas reservas, reagende quando precisar e mantenha seu WhatsApp atualizado para a barbearia falar com você sobre o atendimento.</p>
      </div>
    </section>
    <section className="customer-auth-panel">
      <div className="customer-auth-card">
        <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
        {!user ? <>
          <h2>Entrar ou criar conta</h2>
          <p>Não precisa criar senha. Use Google ou receba um link seguro no seu e-mail.</p>
          <button className="customer-button" style={{ width: "100%" }} type="button" disabled={sending} onClick={() => void continueGoogle()}>Continuar com Google</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0", color: "#999" }}><span style={{ height: 1, background: "#e5e5e1", flex: 1 }} />ou<span style={{ height: 1, background: "#e5e5e1", flex: 1 }} /></div>
          <form onSubmit={sendMagicLink} className="customer-field">
            <label>E-mail</label>
            <input className="customer-input" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" disabled={sending} />
            <button className="customer-button secondary" style={{ width: "100%", marginTop: 6 }} disabled={sending}>{sending ? "Enviando..." : "Receber link de acesso"}</button>
          </form>
        </> : <>
          <h2>Complete seu cadastro</h2>
          <p>O WhatsApp é obrigatório para assuntos do seu agendamento. Autorizações de marketing continuam separadas e opcionais.</p>
          <form onSubmit={saveProfile} style={{ display: "grid", gap: 16 }}>
            <div className="customer-field"><label>Nome completo</label><input className="customer-input" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></div>
            <div className="customer-field"><label>E-mail</label><input className="customer-input" value={user.email || ""} disabled /></div>
            <div className="customer-field"><label>Celular / WhatsApp</label><input className="customer-input" required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" /></div>
            <button className="customer-button" disabled={saving}>{saving ? "Salvando..." : "Salvar e continuar"}</button>
          </form>
        </>}
        {message && <p role="status" className={`customer-message ${message.startsWith("Enviamos") ? "success" : "error"}`}>{message}</p>}
        <p style={{ margin: "20px 0 0", fontSize: 12, color: "#777", lineHeight: 1.5 }}>Seu número é usado para contato relacionado ao atendimento. Mensagens promocionais dependem de consentimento específico.</p>
      </div>
    </section>
  </main>;
}
