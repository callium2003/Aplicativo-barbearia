"use client";

import { getPublicSupabaseConfig } from "@/utils/supabase-config";
import { supabase } from "@/utils/supabase";
import { type FormEvent, useEffect, useRef, useState } from "react";

export default function PlatformLoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectStarted = useRef(false);
  const isLocalSupabase = /(?:localhost|127\.0\.0\.1)/i.test(getPublicSupabaseConfig().url);

  useEffect(() => {
    let active = true;
    const continueToPlatform = () => {
      if (!active || redirectStarted.current) return;
      redirectStarted.current = true;
      window.location.replace("/plataforma");
    };
    void supabase.auth.getUser().then(({ data }) => { if (data.user) continueToPlatform(); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (session?.user) continueToPlatform(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function continueWithGoogle() {
    setMessage(""); setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/plataforma/entrar` } });
      if (error) setMessage(isLocalSupabase ? "O Google não está habilitado neste ambiente local. Use o link de acesso por e-mail." : "Não foi possível iniciar o acesso. Tente o link de acesso por e-mail.");
    } catch {
      setMessage("Não foi possível iniciar o acesso. Tente novamente.");
    } finally { setIsSubmitting(false); }
  }

  async function sendAccessLink(event: FormEvent) {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/plataforma/entrar` } });
      setMessage(error ? "Não foi possível enviar o link de acesso." : "Enviamos um link de acesso para seu e-mail.");
    } catch {
      setMessage("Não foi possível enviar o link de acesso.");
    } finally { setIsSubmitting(false); }
  }

  return <main className="platform-login"><section className="platform-login-card">
    <p className="platform-eyebrow">CullenTech</p><h1>Administração da plataforma</h1>
    <p>Use uma identidade autorizada pela CullenTech. Esta área não substitui a gestão da sua barbearia.</p>
    <button type="button" className="platform-primary" disabled={isSubmitting} onClick={() => void continueWithGoogle()}>Continuar com Google</button>
    <div className="platform-divider">ou</div>
    <form onSubmit={sendAccessLink}><label htmlFor="platform-email">E-mail corporativo</label><input id="platform-email" required type="email" disabled={isSubmitting} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@cullentech.com" /><button className="platform-secondary" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Receber link de acesso"}</button></form>
    {message && <p className="platform-message" role="status">{message}</p>}
  </section></main>;
}
