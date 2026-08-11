"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState, type ReactNode } from "react";
import NotificationBell from "./NotificationBell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

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
    | "notifications";
  shopName?: string | null;
  barbershopId?: string | null;
  children: ReactNode;
  actions?: ReactNode;
};

const managementLinks = [
  ["agenda", "/painel/agenda", "Agenda", "▣"],
  ["home", "/painel", "Gestão", "⌂"],
  ["clients", "/painel/clientes", "Clientes", "◉"],
  ["professionals", "/painel/profissionais", "Equipe", "♧"],
  ["reports", "/painel/relatorios", "Relatórios", "◫"],
  ["notifications", "/painel/notificacoes", "Notificações", "●"],
  ["settings", "/painel/configurar", "Configurações", "⚙"],
] as const;

const barberLinks = [
  ["home", "/painel", "Início", "⌂"],
  ["agenda", "/painel/agenda", "Minha agenda", "▣"],
  ["agenda", "/painel/agenda#disponibilidade", "Disponibilidade", "◷"],
  ["agenda", "/painel/agenda#meu-perfil", "Meu perfil", "◉"],
  ["notifications", "/painel/notificacoes", "Notificações", "●"],
] as const;

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
}: Props) {
  const [barbershopSlug, setBarbershopSlug] = useState("");

  useEffect(() => {
    if (!barbershopId) return;
    let activeRequest = true;
    const cacheKey = `barbeariasp.public-slug.${barbershopId}`;
    const cachedSlug = window.sessionStorage.getItem(cacheKey);
    if (cachedSlug) setBarbershopSlug(cachedSlug);

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

  const links: NavigationLink[] = [
    ...(barbershopSlug
      ? [
          {
            key: "barbershop" as const,
            href: `/${barbershopSlug}`,
            label: "Barbearia",
            icon: "⌂",
          },
        ]
      : []),
    ...(role === "barber" ? barberLinks : managementLinks).map(
      ([key, href, label, icon]) => ({ key, href, label, icon }),
    ),
  ];

  return (
    <main className="product-shell">
      <header className="product-topbar">
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
              role === "barber" ? undefined : "/painel/configurar#notificacoes"
            }
          />
          <div className="product-avatar" aria-label={shopName || "Barbearia"}>
            {initials(shopName)}
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
        {links.map(({ key, href, label, icon }, index) => (
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
