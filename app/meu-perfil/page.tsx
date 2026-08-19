"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type CustomerProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
};

type MarketingBarbershop = {
  barbershop_id: string;
  barbershop_name: string;
  barbershop_marketing: boolean;
};

type MarketingPreferences = {
  platform_marketing: boolean;
  barbershops: MarketingBarbershop[];
};

type CustomerBarbershop = {
  name: string;
  slug: string;
};

function initials(name?: string | null) {
  return (name || "Cliente")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function MeuPerfilPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Carregando seu perfil...");
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<MarketingPreferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState<string | null>(null);
  const [barbershops, setBarbershops] = useState<CustomerBarbershop[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace("/cliente/entrar?returnTo=%2Fmeu-perfil");
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("id,name,email,phone")
        .eq("auth_user_id", user.id)
        .maybeSingle<CustomerProfile>();

      if (!active) return;
      if (error || !data) {
        setMessage("Não foi possível carregar seus dados. Entre novamente para continuar.");
        return;
      }

      setProfile(data);
      setName(data.name);
      setPhone(data.phone);
      const [{ data: preferenceData }, { data: shopData }] = await Promise.all([
        supabase.rpc(
        "get_my_customer_marketing_preferences",
        ),
        supabase
          .from("barbershop_customers")
          .select("barbershops(name,slug)")
          .eq("customer_id", data.id),
      ]);
      if (active && preferenceData) {
        setPreferences(preferenceData as MarketingPreferences);
      }
      if (active) {
        setBarbershops(
          ((shopData || []) as Array<{ barbershops: CustomerBarbershop | CustomerBarbershop[] | null }>)
            .flatMap((item) => Array.isArray(item.barbershops) ? item.barbershops : item.barbershops ? [item.barbershops] : []),
        );
      }
      setMessage("");
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");

    if (name.trim().length < 2) {
      setMessage("Informe seu nome completo.");
      return;
    }
    if (digits.length < 10 || digits.length > 13) {
      setMessage("Informe um celular ou WhatsApp válido, com DDD.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.rpc("save_my_customer_profile", {
      p_name: name.trim(),
      p_phone: phone.trim(),
    });
    setSaving(false);

    if (error) {
      setMessage("Não foi possível atualizar seus dados. (código: operation_failed)");
      return;
    }

    const saved = Array.isArray(data) ? data[0] : data;
    if (saved) setProfile(saved as CustomerProfile);
    setMessage("Dados atualizados com sucesso.");
  }

  async function saveMarketingPreferences(
    barbershopId: string | null,
    barbershopMarketing: boolean,
    platformMarketing: boolean,
    saveBarbershop: boolean,
    savePlatform: boolean,
  ) {
    const key = barbershopId || "platform";
    setSavingPreferences(key);
    const { error } = await supabase.rpc(
      "save_my_customer_marketing_preferences",
      {
        p_barbershop_id: barbershopId,
        p_barbershop_marketing: barbershopMarketing,
        p_platform_marketing: platformMarketing,
        p_save_barbershop: saveBarbershop,
        p_save_platform: savePlatform,
      },
    );
    setSavingPreferences(null);
    if (error) {
      setMessage("Não foi possível salvar suas preferências. (código: operation_failed)");
      return;
    }
    const { data } = await supabase.rpc("get_my_customer_marketing_preferences");
    if (data) setPreferences(data as MarketingPreferences);
    setMessage("Prefer\u00eancias de comunica\u00e7\u00e3o atualizadas com sucesso.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  if (!profile) {
    return (
      <main className="customer-shell" style={{ display: "grid", placeItems: "center" }}>
        <p className="customer-message">{message}</p>
      </main>
    );
  }

  return (
    <main className="customer-shell">
      <header className="customer-topbar">
        <Link className="customer-brand" href="/">
          BARBEARIA<span>SP</span>
        </Link>
        <div className="customer-header-actions">
          <Link className="customer-button secondary" href="/meus-agendamentos">
            Minha agenda
          </Link>
          <button className="customer-button secondary" type="button" onClick={() => void signOut()}>
            Sair
          </button>
          <div className="customer-avatar" aria-label={profile.name}>
            {initials(profile.name)}
          </div>
        </div>
      </header>

      <div className="customer-content" style={{ maxWidth: 760 }}>
        <div className="customer-page-head">
          <div>
            <p className="customer-eyebrow">Área do cliente</p>
            <h1 className="customer-title">Meu perfil</h1>
            <p className="customer-subtitle">
              Mantenha seus dados corretos para confirmar e acompanhar seus agendamentos.
            </p>
          </div>
        </div>

        {message && (
          <p
            className={`customer-message ${message.includes("sucesso") ? "success" : "error"}`}
            role="status"
          >
            {message}
          </p>
        )}

        <section className="customer-card pad">
          <div className="product-section-head">
            <div>
              <h2>Seus dados</h2>
              <p>O celular/WhatsApp é obrigatório para contato sobre o atendimento.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} style={{ display: "grid", gap: 16, marginTop: 22 }}>
            <div className="customer-field">
              <label htmlFor="customer-profile-name">Nome completo</label>
              <input
                id="customer-profile-name"
                className="customer-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                minLength={2}
                required
              />
            </div>
            <div className="customer-field">
              <label htmlFor="customer-profile-email">E-mail de acesso</label>
              <input
                id="customer-profile-email"
                className="customer-input"
                value={profile.email || ""}
                autoComplete="email"
                disabled
              />
              <small>Este é o e-mail usado para entrar na sua conta.</small>
            </div>
            <div className="customer-field">
              <label htmlFor="customer-profile-phone">Celular / WhatsApp</label>
              <input
                id="customer-profile-phone"
                className="customer-input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                minLength={10}
                required
              />
              <small>Obrigatório, com DDD. Usado somente para assuntos do seu agendamento.</small>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="customer-button" disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <Link className="customer-button secondary" href="/meus-agendamentos">
                Voltar para agenda
              </Link>
            </div>
          </form>
        </section>

        {preferences && (
          <section className="customer-card pad" style={{ marginTop: 18 }}>
            <div className="product-section-head">
              <div>
                <h2>{"Prefer\u00eancias de comunica\u00e7\u00e3o"}</h2>
                <p>
                  Seu cadastro e seus agendamentos não dependem destas escolhas. Confirmações,
                  cancelamentos e lembretes continuam sendo enviados.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
              <label className="customer-consent-row">
                <input
                  type="checkbox"
                  checked={preferences.platform_marketing}
                  disabled={savingPreferences !== null}
                  onChange={(event) =>
                    void saveMarketingPreferences(
                      null,
                      false,
                      event.target.checked,
                      false,
                      true,
                    )
                  }
                />
                <span>
                  Aceito receber novidades e benefícios do aplicativo BarbeariaSP.
                </span>
              </label>

              {preferences.barbershops.map((barbershop) => (
                <label className="customer-consent-row" key={barbershop.barbershop_id}>
                  <input
                    type="checkbox"
                    checked={barbershop.barbershop_marketing}
                    disabled={savingPreferences !== null}
                    onChange={(event) =>
                      void saveMarketingPreferences(
                        barbershop.barbershop_id,
                        event.target.checked,
                        false,
                        true,
                        false,
                      )
                    }
                  />
                  <span>
                  Aceito receber promoções e novidades da barbearia{" "}
                    {barbershop.barbershop_name}.
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {barbershops.length > 0 && (
          <section className="customer-card pad customer-barbershops-card">
            <div className="product-section-head">
              <div>
                <h2>Minhas barbearias</h2>
                <p>Barbearias onde seu cadastro de cliente está vinculado.</p>
              </div>
            </div>
            <div className="customer-barbershops-list">
              {barbershops.map((barbershop) => (
                <Link
                  className="customer-barbershop-link"
                  href={`/${barbershop.slug}`}
                  key={barbershop.slug}
                >
                  <span>{barbershop.name}</span>
                  <small>Ver página pública</small>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
