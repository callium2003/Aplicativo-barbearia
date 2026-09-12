"use client";

import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import { useEffect, useState, type ReactNode } from "react";
import NotificationBell from "./NotificationBell";
import { managementLinks, managementMobileKeys } from "./navigation.mjs";

type Role = "owner" | "manager" | "barber";

type Props = {
  role: Role;
  active:
    | "home"
    | "clients"
    | "agenda"
    | "reports"
    | "settings"
    | "professionals"
    | "more"
    | "notifications"
    | "availability"
    | "profile"
    | "account";
  shopName?: string | null;
  barbershopId?: string | null;
  children: ReactNode;
  actions?: ReactNode;
  mobileBackHref?: string;
  mobileBackLabel?: string;
  mobileTitle?: string;
  hideMobileBack?: boolean;
};

const barberLinks = [
  ["agenda", "/painel/agenda", "Minha agenda", "▣"],
  ["availability", "/painel/minha-disponibilidade", "Disponibilidade", "◷"],
  ["notifications", "/painel/notificacoes", "Notificações", "●"],
  ["profile", "/painel/meu-perfil", "Meu perfil", "◉"],
  ["account", "/painel/minha-conta", "Minha conta", "◎"],
] as const;

const auxiliaryManagementTitles: Partial<Record<Props["active"], string>> = {
  reports: "Relatórios",
  settings: "Configurações",
  notifications: "Notificações",
};

type NavigationKey = Props["active"] | "barbershop";
type NavigationLink = {
  key: NavigationKey;
  href: string;
  label: string;
  icon: string;
};

function initials(name?: string | null) {
  const parts = (name || "Barbearia").trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "B"
  );
}

export default function PanelShell({
  role,
  active,
  shopName,
  barbershopId,
  children,
  actions,
  mobileBackHref = "/painel",
  mobileBackLabel = "Voltar para a gestão",
  mobileTitle,
  hideMobileBack = false,
}: Props) {
  const [accountName, setAccountName] = useState(shopName || "");
  const [barbershopSlug, setBarbershopSlug] = useState(() => {
    if (typeof window === "undefined" || !barbershopId) return "";
    return window.sessionStorage.getItem(`barbeariasp.public-slug.${barbershopId}`) || "";
  });

  useEffect(() => {
    if (!barbershopId) return;
    let activeRequest = true;
    const cacheKey = `barbeariasp.public-slug.${barbershopId}`;
    void supabase
      .from("barbershops")
      .select("slug")
      .eq("id", barbershopId)
      .maybeSingle<{ slug: string | null }>()
      .then(({ data }) => {
        const slug = data?.slug?.trim() || "";
        if (!activeRequest || !slug) return;
        window.sessionStorage.setItem(cacheKey, slug);
        setBarbershopSlug(slug);
      });

    return () => {
      activeRequest = false;
    };
  }, [barbershopId]);

  useEffect(() => {
    if (role !== "barber") {
      setAccountName(shopName || "");
      return;
    }
    let activeRequest = true;
    void getPanelContext(supabase).then(async (context) => {
      if (!context.professionalId) return;
      const { data } = await supabase.from("professionals").select("name").eq("id", context.professionalId).maybeSingle<{ name: string | null }>();
      if (activeRequest && data?.name?.trim()) setAccountName(data.name.trim());
    });
    return () => { activeRequest = false; };
  }, [role, shopName]);

  const links: NavigationLink[] = [
    ...(barbershopSlug && role !== "barber"
      ? [
          {
            key: "barbershop" as const,
            href: `/${barbershopSlug}`,
            label: "Barbearia",
            icon: "⌂",
          },
        ]
      : []),
    ...(role === "barber"
      ? barberLinks.map(([key, href, label, icon]) => ({ key, href, label, icon }))
      : managementLinks.map(({ key, href, label, icon }) => ({
          key: key as Props["active"],
          href,
          label,
          icon,
        }))),
  ];
  const mobileLinks = role === "barber"
    ? links
    : managementMobileKeys
        .map((key) => links.find((link) => link.key === key))
        .filter((link): link is NavigationLink => Boolean(link));
  const activeLabel = mobileTitle || links.find((link) => link.key === active)?.label || auxiliaryManagementTitles[active] || "Gestão";

  return (
    <main className={`product-shell product-shell-${active} product-shell-role-${role}`}>
      <header className="product-topbar">
        <Link className="product-mobile-back" href={mobileBackHref} aria-label={mobileBackLabel} data-hidden={hideMobileBack ? "true" : undefined} tabIndex={hideMobileBack ? -1 : undefined}>←</Link>
        <strong className="product-mobile-title">{activeLabel}</strong>
        <div className="product-brand-group">
          <Link className="product-brand" href="/painel">
            BARBEARIA<span>SP</span>
          </Link>
          <span className="product-context">
            {role === "barber" ? "ÁREA DO PROFISSIONAL" : "ÁREA DE GESTÃO"}
          </span>
        </div>
        <div className="product-header-actions" id="panel-header-actions">
          {actions}
          <NotificationBell
            settingsHref={
              role === "barber" ? undefined : "/painel/notificacoes#preferencias"
            }
          />
          <div className="product-avatar" aria-label={accountName || "Barbearia"}>
            {initials(accountName)}
          </div>
        </div>
      </header>
      <nav className="product-nav" aria-label="Navegação do painel">
        {links.map(({ key, href, label, icon }, index) => (
          <Link
            key={`${href}-${index}`}
            href={href}
            data-active={key === active ? "true" : "false"}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
      {children}
      <nav
        className="product-mobile-nav"
        aria-label="Navegação rápida do painel"
      >
        {mobileLinks.map(({ key, href, label, icon }, index) => (
          <Link
            key={`mobile-${href}-${index}`}
            href={href}
            data-active={key === active ? "true" : "false"}
          >
            <span aria-hidden="true">{icon}</span>
            <small>{label}</small>
          </Link>
        ))}
      </nav>
    </main>
  );
}
