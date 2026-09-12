"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";

type Role = "owner" | "manager" | "barber";
type Shop = { id: string; name: string; slug: string };
type Registration = {
  responsible_name: string;
  responsible_phone: string;
  tax_document: string | null;
  postal_code: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
};
type ProfessionalSummary = { id: string; service_price_snapshot: number | null };

export default function MinhaConta() {
  const [role, setRole] = useState<Role | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [email, setEmail] = useState("");
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
      const [{ data: shopData, error: shopError }, registrationResult, professionalResult] = await Promise.all([
        supabase.from("barbershops").select("id,name,slug").eq("id", context.barbershopId).maybeSingle<Shop>(),
        context.role === "owner"
          ? supabase.from("barbershop_registration_details").select("responsible_name,responsible_phone,tax_document,postal_code,address_number,neighborhood,city,state").eq("barbershop_id", context.barbershopId).maybeSingle<Registration>()
          : Promise.resolve({ data: null, error: null }),
        context.role === "barber" && context.professionalId
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
      setRegistration(registrationResult.data);
      setEmail(user.user.email || "Não informado");
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
          <p className="product-eyebrow">Minha conta</p>
          <h1 className="product-title">Dados da conta</h1>
          <p className="product-subtitle">Consulte sua identidade de acesso e o vínculo atual com a barbearia.</p>
        </div>
      </div>
      <section className="configuration-card management-account-card" aria-labelledby="account-title">
        <header className="management-section-heading">
          <p>MINHA CONTA</p>
          <h2 id="account-title">Acesso ao BarbeariaSP</h2>
          <span>Informações da sessão e do vínculo usado nesta barbearia.</span>
        </header>
        <dl className="management-account-data">
          <div><dt>Barbearia</dt><dd>{shop.name}</dd></div>
          <div><dt>E-mail de acesso</dt><dd>{email}</dd></div>
          <div><dt>Papel</dt><dd>{role === "owner" ? "Proprietário" : role === "manager" ? "Gestor" : "Profissional"}</dd></div>
          <div><dt>Endereço público</dt><dd>/{shop.slug}</dd></div>
        </dl>
      </section>
      {role === "barber" && (
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
      )}
      {role === "owner" && registration && (
        <section className="configuration-card management-account-card" aria-labelledby="registration-title">
          <header className="management-section-heading">
            <p>DADOS CADASTRAIS</p>
            <h2 id="registration-title">Responsável pela operação</h2>
            <span>Dados usados para a relação comercial da conta.</span>
          </header>
          <dl className="management-account-data">
            <div><dt>Nome</dt><dd>{registration.responsible_name}</dd></div>
            <div><dt>Telefone</dt><dd>{registration.responsible_phone}</dd></div>
            <div><dt>CPF ou CNPJ</dt><dd>{registration.tax_document || "Não informado"}</dd></div>
            <div><dt>Localização</dt><dd>{registration.city} - {registration.state}</dd></div>
          </dl>
        </section>
      )}
    </div>
    </PanelShell>
  );
}
