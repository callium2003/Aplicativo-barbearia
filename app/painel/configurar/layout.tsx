"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import NotificationBell from "../NotificationBell";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import styles from "./settings-modern.module.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

type Role = "owner" | "manager";
type EventType =
  | "new_appointment"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "appointment_reminder_24h";
type Preference = {
  event_type: EventType;
  in_app_enabled: boolean;
  email_enabled: boolean;
};
type Props = { children: ReactNode };

const links = [
  ["/painel", "Início"],
  ["/painel/agenda", "Agenda"],
  ["/painel/clientes", "Clientes"],
  ["/painel/profissionais", "Equipe"],
  ["/painel/relatorios", "Relatórios"],
  ["/painel/notificacoes", "Notificações"],
  ["/painel/configurar", "Configurações"],
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("") || "B";
}

export default function ConfigurarLayout({ children }: Props) {
  const [role, setRole] = useState<Role | null>(null);
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const context = await getPanelContext(supabase);
      if (!context.userId) {
        window.location.replace("/entrar");
        return;
      }
      if (context.role === "barber") {
        window.location.replace("/painel/agenda");
        return;
      }
      if (!context.role || !context.barbershopId) {
        window.location.replace("/cadastro-inicial");
        return;
      }

      const [{ data: shop }, prefResult] = await Promise.all([
        supabase
          .from("barbershops")
          .select("name")
          .eq("id", context.barbershopId)
          .maybeSingle<{ name: string }>(),
        supabase.rpc("get_my_notification_preferences", {
          p_barbershop_id: context.barbershopId,
        }),
      ]);

      if (!active) return;
      setRole(context.role as Role);
      setShopId(context.barbershopId);
      setShopName(shop?.name || "Barbearia");
      setPreferences((prefResult.data || []) as Preference[]);
      setReady(true);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (!ready || !role || !shopId) {
    return (
      <div className="product-shell">
        <div className="product-content">
          <p className="product-message">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-shell">
      <header className="product-topbar">
        <Link className="product-brand" href="/painel">BARBEARIA<span>SP</span></Link>
        <div className="product-header-actions">
          <NotificationBell settingsHref="/painel/configurar#notificacoes" />
          <div className="product-avatar" aria-label={shopName}>{initials(shopName)}</div>
        </div>
      </header>

      <nav className="product-nav" aria-label="Navegação do painel">
        {links.map(([href, label]) => (
          <Link key={href} href={href} data-active={href === "/painel/configurar" ? "true" : "false"}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="product-content">
        <div className="product-page-head">
          <div>
            <p className="product-eyebrow">Administração</p>
            <h1 className="product-title">Configurações</h1>
            <p className="product-subtitle">
              Organize os dados da barbearia, horários, serviços, profissionais, acessos e comunicação.
            </p>
          </div>
        </div>

        <div className={styles.legacyContent}>{children}</div>

        <div id="notificacoes" className={styles.notificationSection}>
          <NotificationPreferencesPanel shopId={shopId} initialPreferences={preferences} />
        </div>
      </div>
    </div>
  );
}
