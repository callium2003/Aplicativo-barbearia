"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Subscription = { status: "trialing" | "active" | "past_due" | "cancelled"; trial_ends_at: string | null };

function daysRemaining(value: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
}

export default function Assinatura() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [message, setMessage] = useState("Carregando sua assinatura...");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/entrar"); return; }
      const { data: shop } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle();
      if (!shop) { window.location.replace("/painel/inicio"); return; }
      const { data, error } = await supabase.from("barbershop_subscriptions").select("status,trial_ends_at").eq("barbershop_id", shop.id).maybeSingle();
      setSubscription(data as Subscription | null);
      setMessage(error || !data ? "Não foi possível localizar sua assinatura." : "");
    }
    void load();
  }, []);

  const remaining = daysRemaining(subscription?.trial_ends_at || null);
  const trialActive = subscription?.status === "trialing" && remaining > 0;

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial,sans-serif", padding: 24 }}><section style={{ maxWidth: 650, margin: "60px auto", background: "white", borderRadius: 14, padding: "clamp(25px,5vw,48px)", boxShadow: "0 10px 30px #291b1020" }}><a href="/" style={{ color: "#1b1714", fontWeight: 900, textDecoration: "none" }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></a><p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.4, marginTop: 34 }}>SUA ASSINATURA</p>{trialActive ? <><h1 style={{ font: "bold clamp(34px,6vw,52px)/.95 Georgia,serif", margin: "0 0 16px" }}>Seu teste gratuito está ativo.</h1><p style={{ color: "#6d6257", lineHeight: 1.6 }}>Você tem <b>{remaining} {remaining === 1 ? "dia" : "dias"}</b> para testar todas as funções da sua barbearia.</p><a href="/painel/configurar" style={{ display: "inline-block", marginTop: 16, padding: "13px 16px", borderRadius: 7, background: "#e4773a", color: "white", textDecoration: "none", fontWeight: 800 }}>Continuar configurando</a></> : <><h1 style={{ font: "bold clamp(34px,6vw,52px)/.95 Georgia,serif", margin: "0 0 16px" }}>Seu período de teste terminou.</h1><p style={{ color: "#6d6257", lineHeight: 1.6 }}>Para voltar a usar configurações, agenda, clientes e relatórios, escolha um plano. A cobrança pelo Asaas será conectada na próxima etapa.</p><button disabled style={{ marginTop: 16, padding: "13px 16px", border: 0, borderRadius: 7, background: "#ded5cc", color: "#6d6257", fontWeight: 800 }}>Escolher plano em breve</button></>}{message && <p role="status" style={{ color: "#8c3430", marginTop: 20 }}>{message}</p>}</section></main>;
}
