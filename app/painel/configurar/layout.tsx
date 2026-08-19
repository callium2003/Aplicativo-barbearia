"use client";

import { supabase } from "@/utils/supabase";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import orderStyles from "./settings-order.module.css";
import styles from "./settings-modern.module.css";

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

  useEffect(() => {
    if (!ready || !window.location.hash) return;
    const targetId = window.location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready]);

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
    <PanelShell role={role} active="settings" shopName={shopName} barbershopId={shopId}>
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

        <div className={`${styles.legacyContent} ${orderStyles.orderedContent}`}>{children}</div>

        <div id="notificacoes" className={orderStyles.notificationSection}>
          <NotificationPreferencesPanel shopId={shopId} initialPreferences={preferences} />
        </div>
      </div>
    </PanelShell>
  );
}
