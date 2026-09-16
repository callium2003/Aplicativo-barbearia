"use client";

import { useEffect, useState } from "react";

import PanelShell from "../PanelShell";
import { getPanelContext } from "@/utils/panel-context";
import { supabase } from "@/utils/supabase";

type Role = "owner" | "manager" | "barber";
type Shop = { id: string; name: string };

function methodLabel(hasGoogleIdentity: boolean) {
  return hasGoogleIdentity ? "Google" : "E-mail com link seguro";
}

export default function AcessoESegurancaPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [email, setEmail] = useState("");
  const [hasGoogleIdentity, setHasGoogleIdentity] = useState(false);
  const [message, setMessage] = useState("Carregando acesso e segurança...");

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: userResult }, context] = await Promise.all([
        supabase.auth.getUser(),
        getPanelContext(supabase),
      ]);
      if (!active) return;
      if (!userResult.user) {
        window.location.replace("/entrar");
        return;
      }
      if (!context.role || !context.barbershopId) {
        window.location.replace("/cadastro-inicial");
        return;
      }

      const { data, error } = await supabase
        .from("barbershops")
        .select("id,name")
        .eq("id", context.barbershopId)
        .maybeSingle<Shop>();
      if (!active) return;
      if (error || !data) {
        setMessage("Não foi possível carregar seus dados de acesso.");
        return;
      }

      setRole(context.role);
      setShop(data);
      setEmail(userResult.user.email || "Não informado");
      setHasGoogleIdentity(Boolean(userResult.user.identities?.some((identity) => identity.provider === "google")));
      setMessage("");
    }

    void load();
    return () => { active = false; };
  }, []);

  if (!role || !shop) {
    return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;
  }

  return (
    <PanelShell role={role} active="account" shopName={shop.name} barbershopId={shop.id} mobileBackHref={role === "barber" ? "/painel/minha-conta" : "/painel/mais"} mobileBackLabel="Voltar">
      <div className="product-content management-account-page">
        <header className="product-page-head">
          <div>
            <p className="product-eyebrow">Conta pessoal</p>
            <h1 className="product-title">Acesso e segurança</h1>
            <p className="product-subtitle">Consulte como você entra na BarbeariaSP. Isso não altera os dados da barbearia.</p>
          </div>
        </header>

        <section className="configuration-card management-account-card" aria-labelledby="access-security-title">
          <header className="management-section-heading">
            <p>SEU ACESSO</p>
            <h2 id="access-security-title">Identidade de entrada</h2>
            <span>Esta informação pertence a você, não à empresa cadastrada.</span>
          </header>
          <dl className="management-account-data">
            <div><dt>Método de entrada</dt><dd>{methodLabel(hasGoogleIdentity)}</dd></div>
            <div><dt>E-mail associado</dt><dd>{email}</dd></div>
          </dl>
          {hasGoogleIdentity ? (
            <p className="product-message">Para alterar ou recuperar uma conta Google, use os recursos da própria conta Google.</p>
          ) : (
            <p className="product-message">O acesso por e-mail usa link seguro. A alteração do e-mail será incluída nesta área em uma etapa posterior, com confirmação protegida.</p>
          )}
        </section>

        <section className="configuration-card management-account-card" aria-labelledby="password-protection-title">
          <header className="management-section-heading">
            <p>PROTEÇÃO</p>
            <h2 id="password-protection-title">Sem senha armazenada</h2>
            <span>A BarbeariaSP não armazenamos senha, token, sessão ou código de recuperação.</span>
          </header>
          <p className="product-message">Os métodos de entrada são tratados pelo serviço de autenticação. Dados, agenda, equipe e assinatura continuam vinculados à sua barbearia.</p>
        </section>
      </div>
    </PanelShell>
  );
}
