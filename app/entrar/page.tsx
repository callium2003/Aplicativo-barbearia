"use client";

import { createClient } from "@supabase/supabase-js";
import { FormEvent, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/painel" } });
    if (error) setMessage("Não foi possível iniciar o acesso com Google. Tente novamente.");
  };
  const sendEmailLink = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/painel" } });
    setMessage(error ? "Não foi possível enviar o e-mail agora." : "Enviamos um link de acesso para seu e-mail.");
  };
  return <main style={{ minHeight: "100vh", background: "#f6f2ed", fontFamily: "Arial, sans-serif", display: "grid", placeItems: "center", padding: 24 }}><section style={{ background: "white", maxWidth: 430, width: "100%", padding: 32, borderRadius: 12, boxShadow: "0 10px 30px #291b1020" }}><a href="/" style={{ color: "#1b1714", fontWeight: 800, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></a><h1 style={{ font: "bold 42px/.95 Georgia,serif" }}>Acesse sua barbearia.</h1><p style={{ color: "#6d6257", lineHeight: 1.6 }}>Use Google ou receba um link seguro no seu e-mail.</p><button onClick={signInWithGoogle} style={{ width: "100%", padding: 14, background: "white", border: "1px solid #d9d0c8", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}>Continuar com Google</button><div style={{ display: "flex", gap: 10, alignItems: "center", margin: "22px 0", color: "#978b80" }}><span style={{ height: 1, background: "#ddd", flex: 1 }} />ou<span style={{ height: 1, background: "#ddd", flex: 1 }} /></div><form onSubmit={sendEmailLink}><label>E-mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" style={{ width: "100%", boxSizing: "border-box", marginTop: 7, padding: 13, border: "1px solid #d9d0c8", borderRadius: 5 }} /></label><button style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 5, background: "#e4773a", color: "white", fontWeight: 800, cursor: "pointer" }}>Receber link de acesso</button></form>{message && <p style={{ marginTop: 16, color: "#6d6257" }}>{message}</p>}</section></main>;
}
