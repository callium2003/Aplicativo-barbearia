"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useState } from "react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signInWithGoogle = async () => {
    setMessage(""); setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/painel` } });
      if (error) setMessage(`Não foi possível iniciar o acesso com Google: ${error.message}`);
    } catch (error) {
      setMessage(`Não foi possível iniciar o acesso com Google: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally { setIsSubmitting(false); }
  };

  const sendEmailLink = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/painel` } });
      setMessage(error ? `Não foi possível enviar o e-mail: ${error.message}` : "Enviamos um link de acesso para seu e-mail.");
    } catch (error) {
      setMessage(`Não foi possível enviar o e-mail: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally { setIsSubmitting(false); }
  };

  return <main className="customer-auth-wrap">
    <section className="customer-auth-visual">
      <div className="customer-auth-copy"><p>GESTÃO DA BARBEARIA</p><h1>Sua operação, com mais controle.</h1><p>Agenda, clientes, equipe, comissões e relatórios em uma experiência simples para o dia a dia.</p></div>
    </section>
    <section className="customer-auth-panel">
      <div className="customer-auth-card">
        <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
        <h2>Acessar gestão</h2>
        <p>Para proprietários, gerentes e barbeiros convidados. Use Google ou um link seguro por e-mail.</p>
        <button className="customer-button" style={{ width: "100%" }} onClick={() => void signInWithGoogle()} disabled={isSubmitting}>Continuar com Google</button>
        <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "22px 0", color: "#999" }}><span style={{ height: 1, background: "#e5e5e1", flex: 1 }} />ou<span style={{ height: 1, background: "#e5e5e1", flex: 1 }} /></div>
        <form onSubmit={sendEmailLink} style={{ display: "grid", gap: 10 }}><div className="customer-field"><label>E-mail</label><input className="customer-input" required type="email" disabled={isSubmitting} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></div><button className="customer-button secondary" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Receber link de acesso"}</button></form>
        {message && <p role="status" className={`customer-message ${message.startsWith("Enviamos") ? "success" : "error"}`}>{message}</p>}
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid #ecebe6" }}><p style={{ margin: "0 0 10px", fontSize: 13, color: "#777" }}>Quer agendar um serviço ou ver suas reservas?</p><Link className="customer-button secondary" style={{ width: "100%" }} href="/cliente/entrar">Ir para a Área do Cliente</Link></div>
      </div>
    </section>
  </main>;
}
