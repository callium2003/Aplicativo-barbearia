"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";

type Role = "owner" | "manager" | "barber";
type Shop = { id: string; name: string; slug: string };
type ProfessionalSummary = { id: string; service_price_snapshot: number | null };

export default function MinhaConta() {
  const [role, setRole] = useState<Role | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [professionalSummary, setProfessionalSummary] = useState({ completed: 0, total: 0 });
  const [message, setMessage] = useState("Carregando dados da conta...");

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: user }, context] = await Promise.all([
        supabase.auth.getUser(),
        getPanelContext(supabase),
      ]);
      if (!active) return;
      if (!user.user) {
        window.location.replace("/entrar");
        return;
      }
      if (!context.role || !context.barbershopId) {
        window.location.replace("/cadastro-inicial");
        return;
      }
      if (context.role !== "barber") {
        window.location.replace("/painel/acesso-e-seguranca");
        return;
      }
      const [{ data: shopData, error: shopError }, professionalResult] = await Promise.all([
        supabase.from("barbershops").select("id,name,slug").eq("id", context.barbershopId).maybeSingle<Shop>(),
        context.professionalId
          ? supabase.from("appointments").select("id,service_price_snapshot").eq("professional_id", context.professionalId).eq("status", "completed")
          : Promise.resolve({ data: [] as ProfessionalSummary[], error: null }),
      ]);
      if (!active) return;
      if (shopError || !shopData) {
        setMessage("Não foi possível carregar os dados da conta.");
        return;
      }
      setRole(context.role);
      setShop(shopData);
      const completed = (professionalResult.data || []) as ProfessionalSummary[];
      setProfessionalSummary({ completed: completed.length, total: completed.reduce((sum, item) => sum + Number(item.service_price_snapshot || 0), 0) });
      setMessage("");
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (!shop || !role) {
    return <main className="product-shell" style={{ display: "grid", placeItems: "center" }}><p className="product-message">{message}</p></main>;
  }

  return (
    <PanelShell role={role} active="account" shopName={shop.name} barbershopId={shop.id} hideMobileBack={role === "barber"}>
    <div className="product-content management-account-page">
      <div className="product-page-head">
        <div>
          <p className="product-eyebrow">Minha atividade</p>
          <h1 className="product-title">Minha conta</h1>
          <p className="product-subtitle">Consulte seus atendimentos realizados e o vínculo profissional atual.</p>
        </div>
      </div>
      <section className="configuration-card management-account-card" aria-labelledby="account-title">
        <header className="management-section-heading"><p>ACESSO</p><h2 id="account-title">Acesso e segurança</h2><span>Seu método de entrada é pessoal e não altera os dados da barbearia.</span></header>
        <dl className="management-account-data">
          <div><dt>Barbearia</dt><dd>{shop.name}</dd></div>
          <div><dt>Papel</dt><dd>Profissional</dd></div>
        </dl>
        <Link className="product-button secondary" href="/painel/acesso-e-seguranca">Ver acesso e segurança</Link>
      </section>
        <section className="configuration-card management-account-card" aria-labelledby="professional-summary-title">
          <header className="management-section-heading">
            <p>MINHA ATIVIDADE</p>
            <h2 id="professional-summary-title">Atendimentos realizados</h2>
            <span>Resumo dos seus próprios atendimentos concluídos nesta barbearia.</span>
          </header>
          <dl className="management-account-data">
            <div><dt>Atendimentos concluídos</dt><dd>{professionalSummary.completed}</dd></div>
            <div><dt>Valor dos serviços concluídos</dt><dd>{professionalSummary.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
          </dl>
        </section>
    </div>
    </PanelShell>
  );
}
