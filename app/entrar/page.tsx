"use client";

import { supabase } from "@/utils/supabase";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signInWithGoogle = async () => {
    setMessage(""); setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/painel` } });
      if (error) setMessage(`Não foi possível iniciar o acesso com Google: ${"Falha técnica"}`);
    } catch (error) {
      setMessage(`Não foi possível iniciar o acesso com Google: ${error instanceof Error ? "Falha técnica" : "erro desconhecido"}`);
    } finally { setIsSubmitting(false); }
  };

  const sendEmailLink = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/painel` } });
      setMessage(error ? `Não foi possível enviar o e-mail: ${"Falha técnica"}` : "Enviamos um link de acesso para seu e-mail.");
    } catch (error) {
      setMessage(`Não foi possível enviar o e-mail: ${error instanceof Error ? "Falha técnica" : "erro desconhecido"}`);
    } finally { setIsSubmitting(false); }
  };

  return (
    <main className="customer-shell management-login">
      <header className="management-login-hero">
        <Image src="/marketing-barbershop-hero.png" alt="Interior de uma barbearia BarbeariaSP" fill priority sizes="100vw" />
        <div className="management-login-hero-shade" />
        <div className="management-login-hero-nav">
          <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
          <Link className="management-back-link" href="/">← Voltar para o início</Link>
        </div>
        <div className="management-login-hero-copy">
          <span>Área de gestão</span>
          <strong>Sua barbearia organizada, onde você estiver.</strong>
        </div>
      </header>

      <div className="customer-content management-login-content" style={{ maxWidth: 760 }}>
        <div className="customer-page-head">
          <div>
            <p className="customer-eyebrow">Acessar gestão</p>
            <h1 className="customer-title">Acesse sua gestão</h1>
            <p className="customer-subtitle">Agenda, clientes, equipe e configurações em um só lugar.</p>
          </div>
        </div>

        <section className="customer-card pad management-login-card">
          <div className="product-section-head">
            <div>
              <h2>Entre com segurança</h2>
              <p>Use Google ou receba um link seguro por e-mail. Primeiro acesso? Entre para criar sua barbearia.</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
            <button className="customer-button" style={{ width: "100%" }} onClick={() => void signInWithGoogle()} disabled={isSubmitting}>Continuar com Google</button>
            <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#999" }}><span style={{ height: 1, background: "#e5e5e1", flex: 1 }} />ou<span style={{ height: 1, background: "#e5e5e1", flex: 1 }} /></div>
            <form onSubmit={sendEmailLink} style={{ display: "grid", gap: 10 }}><div className="customer-field"><label>E-mail</label><input className="customer-input" required type="email" disabled={isSubmitting} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></div><button className="customer-button secondary" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Receber link de acesso"}</button></form>
          </div>
          {message && <p role="status" className={`customer-message ${message.startsWith("Enviamos") ? "success" : "error"}`}>{message}</p>}
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid #ecebe6" }}><p style={{ margin: "0 0 10px", fontSize: 13, color: "#777" }}>Quer agendar um serviço ou ver suas reservas?</p><Link className="customer-button secondary" style={{ width: "100%" }} href="/cliente/entrar">Ir para a Área do Cliente</Link></div>
        </section>
      </div>
    </main>
  );
}
