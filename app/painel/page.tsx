"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
type Shop = { id: string; name: string; slug: string; initial_registration_completed?: boolean; role: "owner" | "manager" | "barber" };

const panelLinks = [
  { href: "/painel/configurar", title: "Dados cadastrais", description: "Atualize contatos, foto, endereço, serviços e profissionais." },
  { href: "/painel/agenda", title: "Agenda", description: "Acompanhe os agendamentos recebidos pelo seu link público." },
  { href: "/painel/clientes", title: "Clientes", description: "Consulte o histórico e os dados dos seus clientes." },
  { href: "/painel/relatorios", title: "Relatórios", description: "Veja os indicadores da sua barbearia." },
];

export default function Painel() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("Verificando seu acesso...");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPanel() {
      try {
        if (new URLSearchParams(window.location.hash.slice(1)).has("error")) {
          window.location.replace("/entrar");
          return;
        }
        const context = await getPanelContext(supabase);
        if (!active) return;
        if (!context.userId) { window.location.replace("/entrar"); return; }
        if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }

        if (context.role === "owner" && !context.initialRegistrationCompleted) {
          window.location.replace("/cadastro-inicial");
          return;
        }

        const { data: shopData, error: shopError } = await supabase
          .from("barbershops")
          .select("id,name,slug,initial_registration_completed")
          .eq("id", context.barbershopId)
          .maybeSingle<Omit<Shop, "role">>();
        if (!active) return;
        if (shopError || !shopData) { setMessage("Não foi possível carregar sua barbearia."); return; }

        setShop({ ...shopData, role: context.role });
        setMessage("");
      } catch {
        if (active) window.location.replace("/entrar");
      }
    }
    void loadPanel();
    return () => { active = false; };
  }, []);

  async function copyPublicLink() {
    if (!shop?.slug) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${shop.slug}`);
      setCopyMessage("Link copiado com sucesso");
    } catch {
      setCopyMessage("Não foi possível copiar o link. Tente novamente.");
    }
  }

  if (!shop) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f2ed", fontFamily: "Arial, sans-serif", color: "#1b1714" }}><p>{message}</p></main>;
  }

  const visibleLinks = shop.role === "barber"
    ? [{ href: "/painel/agenda", title: "Minha agenda", description: "Consulte seus atendimentos e compromissos nesta barbearia." }]
    : panelLinks;

  return <main style={{ minHeight: "100vh", background: "#f6f2ed", color: "#1b1714", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#171310", color: "white", padding: "19px 8vw" }}>
      <Link href="/painel" style={{ color: "white", fontWeight: 900, textDecoration: "none", letterSpacing: 1 }}>BARBEARIA<span style={{ color: "#e4773a" }}>SP</span></Link>
    </header>
    <nav style={{ background: "#2a211c", padding: "12px 8vw", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
      {visibleLinks.map((link) => <Link key={link.href} href={link.href} style={{ color: "#d7ccc0", textDecoration: "none" }}>{link.title}</Link>)}
    </nav>
    <section style={{ maxWidth: 1040, margin: "0 auto", padding: "clamp(28px,6vw,64px) 24px" }}>
      <p style={{ color: "#d7612c", fontWeight: 800, fontSize: 12, letterSpacing: 1.4, margin: 0 }}>PAINEL DA BARBEARIA</p>
      <h1 style={{ font: "bold clamp(36px,6vw,58px)/.96 Georgia,serif", margin: "10px 0 14px" }}>Olá, {shop.name}.</h1>
      <p style={{ color: "#6d6257", lineHeight: 1.6, maxWidth: 640, marginBottom: 30 }}>
        {shop.role === "barber" ? "Acompanhe seus atendimentos." : "Escolha uma área para administrar sua barbearia."}
      </p>
      {shop.role !== "barber" && <section style={{ background: "#fff8f3", border: "1px solid #ead8ca", borderRadius: 12, padding: 20, marginBottom: 22 }}>
        <h2 style={{ font: "bold 22px Georgia,serif", margin: "0 0 10px" }}>Página pública da barbearia</h2>
        {shop.slug ? <>
          <code style={{ display: "block", overflowWrap: "anywhere", color: "#7b3519", marginBottom: 14 }}>{window.location.origin}/{shop.slug}</code>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a href={`${window.location.origin}/${shop.slug}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#d7612c", color: "white", borderRadius: 7, padding: "10px 13px", textDecoration: "none", fontWeight: 800 }}>Ver página pública</a>
            <button type="button" onClick={() => void copyPublicLink()} style={{ border: "1px solid #b98669", background: "white", color: "#6b3018", borderRadius: 7, padding: "10px 13px", fontWeight: 800, cursor: "pointer" }}>Copiar link</button>
          </div>
          {copyMessage && <p role="status" style={{ margin: "12px 0 0", color: copyMessage === "Link copiado com sucesso" ? "#176b3a" : "#b3261e" }}>{copyMessage}</p>}
        </> : <>
          <p style={{ color: "#6d6257", margin: "0 0 12px" }}>Conclua o cadastro da barbearia para gerar o link público</p>
          <Link href="/painel/configurar" style={{ color: "#a84b24", fontWeight: 800 }}>Ir para configurações</Link>
        </>}
      </section>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        {visibleLinks.map((link) => <Link key={link.href} href={link.href} style={{ background: "white", border: "1px solid #e8e0d8", borderRadius: 12, padding: 20, color: "#1b1714", textDecoration: "none", minHeight: 130 }}><b style={{ display: "block", fontSize: 18, marginBottom: 8 }}>{link.title}</b><span style={{ color: "#6d6257", lineHeight: 1.5, fontSize: 14 }}>{link.description}</span></Link>)}
      </div>
    </section>
  </main>;
}
