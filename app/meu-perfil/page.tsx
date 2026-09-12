"use client";

import { customerSupabase as supabase } from "@/utils/supabase";
import { CustomerBottomNavigation } from "@/app/customer-bottom-navigation";
import Image from "next/image";
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

type PreferenceSaveChange =
  | { scope: "platform"; kind: "platform"; platformMarketing: boolean }
  | { scope: string; kind: "barbershop"; barbershopId: string; barbershopMarketing: boolean };

type CustomerBarbershop = {
  name: string;
  slug: string;
};

type ProfileFieldErrors = Partial<Record<"name" | "phone", string>>;

function reconcileSavedPreferences(
  savedPreferences: MarketingPreferences | null,
  successfulChanges: PreferenceSaveChange[],
) {
  if (!savedPreferences) return savedPreferences;

  const savedPlatform = successfulChanges.find((change) => change.kind === "platform");
  const savedBarbershopIds = new Set(
    successfulChanges
      .filter((change): change is Extract<PreferenceSaveChange, { kind: "barbershop" }> => change.kind === "barbershop")
      .map((change) => change.barbershopId),
  );

  return {
    ...savedPreferences,
    platform_marketing: savedPlatform ? savedPlatform.platformMarketing : savedPreferences.platform_marketing,
    barbershops: savedPreferences.barbershops.map((barbershop) => {
      const savedBarbershop = successfulChanges.find(
        (change): change is Extract<PreferenceSaveChange, { kind: "barbershop" }> =>
          change.kind === "barbershop" && change.barbershopId === barbershop.barbershop_id,
      );
      return savedBarbershopIds.has(barbershop.barbershop_id) && savedBarbershop
        ? { ...barbershop, barbershop_marketing: savedBarbershop.barbershopMarketing }
        : barbershop;
    }),
  };
}

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [preferences, setPreferences] = useState<MarketingPreferences | null>(null);
  const [savedPreferences, setSavedPreferences] = useState<MarketingPreferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [failedPreferenceScopes, setFailedPreferenceScopes] = useState<string[]>([]);
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
        const nextPreferences = preferenceData as MarketingPreferences;
        setPreferences(nextPreferences);
        setSavedPreferences(nextPreferences);
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
    setFieldErrors({});

    if (name.trim().length < 2) {
      setFieldErrors({ name: "Informe seu nome completo." });
      setMessage("Informe seu nome completo.");
      return;
    }
    if (digits.length < 10 || digits.length > 13) {
      setFieldErrors({ phone: "Informe um celular ou WhatsApp válido, com DDD." });
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
    if (saved) {
      const savedProfile = saved as CustomerProfile;
      setProfile(savedProfile);
      setName(savedProfile.name);
      setPhone(savedProfile.phone);
    }
    setEditingProfile(false);
    setMessage("Dados atualizados com sucesso.");
  }

  function updatePlatformMarketing(platformMarketing: boolean) {
    setFailedPreferenceScopes((current) => current.filter((scope) => scope !== "platform"));
    setPreferences((current) =>
      current ? { ...current, platform_marketing: platformMarketing } : current,
    );
  }

  function updateBarbershopMarketing(barbershopId: string, barbershopMarketing: boolean) {
    const scope = `barbershop:${barbershopId}`;
    setFailedPreferenceScopes((current) => current.filter((currentScope) => currentScope !== scope));
    setPreferences((current) =>
      current
        ? {
            ...current,
            barbershops: current.barbershops.map((barbershop) =>
              barbershop.barbershop_id === barbershopId
                ? { ...barbershop, barbershop_marketing: barbershopMarketing }
                : barbershop,
            ),
          }
        : current,
    );
  }

  async function saveMarketingPreferences() {
    if (!preferences || !savedPreferences) return;

    const changes: PreferenceSaveChange[] = [
      ...(preferences.platform_marketing !== savedPreferences.platform_marketing
        ? [{ scope: "platform" as const, kind: "platform" as const, platformMarketing: preferences.platform_marketing }]
        : []),
      ...preferences.barbershops.flatMap((barbershop) => {
        const savedBarbershop = savedPreferences.barbershops.find(
          (item) => item.barbershop_id === barbershop.barbershop_id,
        );
        if (!savedBarbershop || savedBarbershop.barbershop_marketing === barbershop.barbershop_marketing) {
          return [];
        }
        return [
          {
            scope: `barbershop:${barbershop.barbershop_id}`,
            kind: "barbershop" as const,
            barbershopId: barbershop.barbershop_id,
            barbershopMarketing: barbershop.barbershop_marketing,
          },
        ];
      }),
    ];

    if (!changes.length) return;

    setSavingPreferences(true);
    setFailedPreferenceScopes([]);
    setMessage("");
    const results = await Promise.all(
      changes.map(async (change) => {
        const { error } = await supabase.rpc(
          "save_my_customer_marketing_preferences",
          change.kind === "platform"
            ? {
                p_barbershop_id: null,
                p_barbershop_marketing: false,
                p_platform_marketing: change.platformMarketing,
                p_save_barbershop: false,
                p_save_platform: true,
              }
            : {
                p_barbershop_id: change.barbershopId,
                p_barbershop_marketing: change.barbershopMarketing,
                p_platform_marketing: false,
                p_save_barbershop: true,
                p_save_platform: false,
              },
        );
        return { change, error };
      }),
    );
    setSavingPreferences(false);

    const successfulChanges = results.filter((result) => !result.error).map((result) => result.change);
    const failedChanges = results.filter((result) => result.error).map((result) => result.change);
    setSavedPreferences((current) => reconcileSavedPreferences(current, successfulChanges));
    setFailedPreferenceScopes(failedChanges.map((change) => change.scope));

    if (failedChanges.length && successfulChanges.length) {
      setMessage("Algumas preferências foram salvas, mas outras não puderam ser atualizadas.");
      return;
    }
    if (failedChanges.length) {
      setMessage("Não foi possível salvar suas preferências. (código: operation_failed)");
      return;
    }

    setMessage("Preferências de comunicação atualizadas com sucesso.");
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

  const profileChanged = name.trim() !== profile.name || phone.trim() !== profile.phone;
  const preferencesChanged = Boolean(preferences && savedPreferences && JSON.stringify(preferences) !== JSON.stringify(savedPreferences));

  return (
    <main className="customer-shell customer-profile-shell">
      <div className="customer-editorial-cover customer-profile-cover">
        <Image
          src="/barbeariasp-institutional-hero.png"
          alt="Barbearia"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1180px"
        />
        <div className="customer-editorial-cover-shade" />
      </div>

      <header className="customer-topbar customer-profile-topbar">
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

      <div className="customer-content customer-profile-content">
        <div className="customer-page-head customer-profile-heading">
          <div>
            <p className="customer-eyebrow">ÁREA DO CLIENTE</p>
            <h1 className="customer-title">Meus dados</h1>
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

        <section className="customer-profile-data-card" aria-label="Dados do perfil">
          <form className="customer-profile-form" onSubmit={saveProfile} noValidate>
            <div className="customer-field customer-profile-field">
              <label htmlFor="customer-profile-name">Nome completo</label>
              <input
                id="customer-profile-name"
                className="customer-input customer-profile-input"
                value={name}
                disabled={!editingProfile}
                onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); }}
                autoComplete="name"
                minLength={2}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "customer-profile-name-error" : undefined}
                required
              />
              {fieldErrors.name && <small id="customer-profile-name-error" className="customer-profile-field-error" role="alert">{fieldErrors.name}</small>}
            </div>
            <div className="customer-field customer-profile-field">
              <label htmlFor="customer-profile-email">E-mail de acesso</label>
              <input
                id="customer-profile-email"
                className="customer-input customer-profile-input"
                value={profile.email || ""}
                autoComplete="email"
                aria-describedby="customer-profile-email-note"
                disabled
              />
              <small id="customer-profile-email-note">Este é o e-mail usado para entrar na sua conta.</small>
            </div>
            <div className="customer-field customer-profile-field">
              <label htmlFor="customer-profile-phone">Celular / WhatsApp</label>
              <input
                id="customer-profile-phone"
                className="customer-input customer-profile-input"
                value={phone}
                disabled={!editingProfile}
                onChange={(event) => { setPhone(event.target.value); setFieldErrors((current) => ({ ...current, phone: undefined })); }}
                inputMode="tel"
                autoComplete="tel"
                minLength={10}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "customer-profile-phone-error" : "customer-profile-phone-note"}
                required
              />
              {fieldErrors.phone ? <small id="customer-profile-phone-error" className="customer-profile-field-error" role="alert">{fieldErrors.phone}</small> : <small id="customer-profile-phone-note">Obrigatório, com DDD. Usado somente para assuntos do seu agendamento.</small>}
            </div>
            <div className="customer-profile-actions">
              <button
                className="customer-button secondary"
                type="button"
                onClick={() => {
                  setEditingProfile(true);
                  setMessage("");
                }}
                disabled={editingProfile}
              >
                Editar dados
              </button>
              {editingProfile && (
                <button className="customer-button customer-profile-save" type="submit" disabled={saving || !profileChanged}>
                  {saving ? "Salvando..." : "Salvar dados"}
                </button>
              )}
              <Link className="customer-button secondary customer-profile-back" href="/meus-agendamentos">
                Voltar para agenda
              </Link>
            </div>
            {barbershops.length > 0 && (
              <section className="customer-profile-shops" aria-labelledby="customer-profile-shops-title">
                <h2 id="customer-profile-shops-title" className="customer-profile-section-title">Minhas barbearias</h2>
                <div className="customer-profile-shop-list">
                  {barbershops.map((barbershop) => (
                    <Link className="customer-profile-shop-link" href={`/${barbershop.slug}`} key={barbershop.slug}>
                      <span>{barbershop.name}</span>
                      <small>Barbearia relacionada</small>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </form>
        </section>

        {preferences && (
          <section id="preferencias" className="customer-preferences-card" aria-labelledby="customer-preferences-title">
            <div className="product-section-head">
              <div>
                <p className="customer-eyebrow">COMUNICAÇÕES OPCIONAIS</p>
                <h2 id="customer-preferences-title">Preferências de comunicação</h2>
                <p>
                  Seu cadastro e seus agendamentos não dependem destas escolhas. Confirmações,
                  cancelamentos e lembretes continuam sendo enviados.
                </p>
              </div>
            </div>

            <div className="customer-preferences-list">
              <label className="customer-preference-row">
                <span className="customer-preference-copy">
                  <strong>Novidades da BarbeariaSP</strong>
                  <small>Benefícios e novidades da plataforma.</small>
                  {failedPreferenceScopes.includes("platform") && (
                    <small className="customer-preference-error" role="alert">Não foi possível salvar esta escolha. Tente novamente.</small>
                  )}
                </span>
                <input
                  className="customer-preference-switch"
                  type="checkbox"
                  checked={preferences.platform_marketing}
                  disabled={savingPreferences}
                  onChange={(event) => updatePlatformMarketing(event.target.checked)}
                  aria-label="Receber novidades e benefícios da BarbeariaSP"
                />
              </label>

              {preferences.barbershops.map((barbershop) => (
                <label className="customer-preference-row" key={barbershop.barbershop_id}>
                  <span className="customer-preference-copy">
                    <strong>{barbershop.barbershop_name}</strong>
                    <small>Promoções e novidades desta barbearia.</small>
                    {failedPreferenceScopes.includes(`barbershop:${barbershop.barbershop_id}`) && (
                      <small className="customer-preference-error" role="alert">Não foi possível salvar esta escolha. Tente novamente.</small>
                    )}
                  </span>
                  <input
                    className="customer-preference-switch"
                    type="checkbox"
                    checked={barbershop.barbershop_marketing}
                    disabled={savingPreferences}
                    onChange={(event) => updateBarbershopMarketing(barbershop.barbershop_id, event.target.checked)}
                    aria-label={`Receber promoções e novidades de ${barbershop.barbershop_name}`}
                  />
                </label>
              ))}
            </div>

            <div className="customer-preferences-actions">
              <p className="customer-preferences-hint">
                {preferencesChanged ? "Você tem alterações ainda não salvas." : "Suas preferências estão atualizadas."}
              </p>
              <button
                className="customer-button customer-preferences-save"
                type="button"
                disabled={savingPreferences || !preferencesChanged}
                onClick={() => void saveMarketingPreferences()}
              >
                {savingPreferences ? "Salvando preferências..." : "Salvar preferências"}
              </button>
            </div>
          </section>
        )}

        <section className="customer-card pad" style={{ marginTop: 18 }}>
          <div className="product-section-head">
            <div>
              <h2>Privacidade e meus dados</h2>
              <p>Consulte e baixe uma cópia dos seus dados ou encerre sua conta.</p>
            </div>
          </div>
          <Link className="customer-button secondary" href="/meu-perfil/privacidade">
            Abrir área de privacidade
          </Link>
        </section>

      </div>

      <CustomerBottomNavigation active="perfil" />
    </main>
  );
}
