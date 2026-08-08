"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import NotificationBell from "./NotificationBell";

type Role = "owner" | "manager" | "barber";

type Props = {
  role: Role;
  active: "home" | "clients" | "agenda" | "reports" | "settings" | "professionals" | "notifications";
  shopName?: string | null;
  children: ReactNode;
  actions?: ReactNode;
};

const managementLinks = [
  ["home", "/painel", "Início"],
  ["agenda", "/painel/agenda", "Agenda"],
  ["clients", "/painel/clientes", "Clientes"],
  ["professionals", "/painel/profissionais", "Equipe"],
  ["reports", "/painel/relatorios", "Relatórios"],
  ["notifications", "/painel/notificacoes", "Notificações"],
  ["settings", "/painel/configurar", "Configurações"],
] as const;

const barberLinks = [
  ["home", "/painel", "Início"],
  ["agenda", "/painel/agenda", "Minha agenda"],
  ["agenda", "/painel/agenda#disponibilidade", "Disponibilidade"],
  ["notifications", "/painel/notificacoes", "Notificações"],
] as const;

function initials(name?: string | null) {
  const parts = (name || "Barbearia").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("") || "B";
}

export default function PanelShell({ role, active, shopName, children, actions }: Props) {
  const links = role === "barber" ? barberLinks : managementLinks;

  return (
    <main className="product-shell">
      <header className="product-topbar">
        <Link className="product-brand" href="/painel">BARBEARIA<span>SP</span></Link>
        <div className="product-header-actions">
          {actions}
          <NotificationBell settingsHref={role === "barber" ? undefined : "/painel/configurar#notificacoes"} />
          <div className="product-avatar" aria-label={shopName || "Barbearia"}>{initials(shopName)}</div>
        </div>
      </header>
      <nav className="product-nav" aria-label="Navegação do painel">
        {links.map(([key, href, label], index) => (
          <Link key={`${href}-${index}`} href={href} data-active={key === active ? "true" : "false"}>{label}</Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
