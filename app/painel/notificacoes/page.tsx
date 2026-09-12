"use client";

import { supabase } from "@/utils/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import ActionFeedback from "../ActionFeedback";
import PanelShell from "../PanelShell";
import NotificationPreferencesPanel from "../configurar/NotificationPreferencesPanel";

type Role = "owner" | "manager" | "barber";
type EventType =
  | "new_appointment"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "appointment_reminder_24h";
type NotificationRow = {
  id: string;
  title: string;
  body: string;
  event_type: EventType | string;
  read_at: string | null;
  created_at: string;
};
type Preference = {
  event_type: EventType;
  in_app_enabled: boolean;
  email_enabled: boolean;
};
type ViewKey = "all" | "unread" | "preferences";

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function NotificacoesPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopId, setShopId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [view, setView] = useState<ViewKey>("unread");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const notificationRetentionStart = useRef<string | null>(null);

  const loadNotifications = useCallback(async () => {
    notificationRetentionStart.current ??= new Date(
      new Date().getTime() - 45 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id,title,body,event_type,read_at,created_at")
      .gte("created_at", notificationRetentionStart.current)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage("Não foi possível carregar o histórico de notificações.");
      return;
    }
    setNotifications((data || []) as NotificationRow[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const context = await getPanelContext(supabase);
      if (!context.userId) {
        window.location.replace("/entrar");
        return;
      }
      if (!context.role || !context.barbershopId) {
        window.location.replace("/painel/inicio");
        return;
      }

      const [{ data: shop }, preferenceResult] = await Promise.all([
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
      setUserId(context.userId);
      setShopId(context.barbershopId);
      setShopName(shop?.name || "Barbearia");
      setPreferences((preferenceResult.data || []) as Preference[]);
      await loadNotifications();

      if (active) setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notification-center:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          void loadNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, userId]);

  const unread = useMemo(
    () => notifications.filter((item) => !item.read_at),
    [notifications],
  );
  const visible = view === "unread" ? unread : notifications;

  async function markRead(id: string) {
    setActionMessage("");
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read_at: now } : item)),
    );
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("id", id);
    if (error) {
      setActionMessage("Não foi possível marcar a notificação como lida.");
      await loadNotifications();
    }
  }

  async function markAllRead() {
    const unreadIds = unread.map((item) => item.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    setActionMessage("");
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at || now })),
    );
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .in("id", unreadIds);
    if (error) {
      setActionMessage("Não foi possível marcar todas como lidas.");
      await loadNotifications();
    }
  }

  if (loading || !role) {
    return (
      <main className="product-shell">
        <div className="product-content">
          <p className="product-message">Carregando notificações...</p>
        </div>
      </main>
    );
  }

  return (
    <PanelShell
      role={role}
      active="notifications"
      shopName={shopName}
      barbershopId={shopId}
      mobileBackHref={role === "barber" ? "/painel/agenda" : "/painel/mais"}
      mobileBackLabel={role === "barber" ? "Voltar para Minha agenda" : "Voltar para Mais"}
      mobileTitle="Notificações"
      hideMobileBack={role === "barber"}
    >
      <div className="product-content">
        <div className="product-page-head">
          <div>
            <p className="product-eyebrow">Central</p>
            <h1 className="product-title">Notificações</h1>
            <p className="product-subtitle">
              Consulte os avisos operacionais, acompanhe o que ainda não foi lido e ajuste seus canais de comunicação.
            </p>
          </div>
          {unread.length > 0 && <div className="management-action-area"><button className="product-button secondary" type="button" onClick={() => void markAllRead()}>Marcar todas como lidas</button><ActionFeedback message={actionMessage} tone="error" /></div>}
        </div>

        {message && <p className="product-message error" role="status">{message}</p>}

        <div className="product-chip-row management-notification-tabs" style={{ marginBottom: 14 }}>
          <button
            className="product-chip"
            data-active={view === "unread" ? "true" : "false"}
            type="button"
            onClick={() => setView("unread")}
          >
            Não lidas ({unread.length})
          </button>
          <button
            className="product-chip"
            data-active={view === "all" ? "true" : "false"}
            type="button"
            onClick={() => setView("all")}
          >
            Histórico ({notifications.length})
          </button>
          <button
            className="product-chip"
            data-active={view === "preferences" ? "true" : "false"}
            type="button"
            onClick={() => setView("preferences")}
          >
            Preferências
          </button>
        </div>

        {view === "preferences" ? (
          <NotificationPreferencesPanel shopId={shopId} initialPreferences={preferences} />
        ) : (
        <section className="product-card">
          <div className="product-list">
            {visible.map((item) => (
              <div className="product-row" key={item.id}>
                <div className="product-row-main">
                  <div className="product-row-title">
                    {item.title}
                    {!item.read_at && (
                      <span className="product-status confirmed" style={{ marginLeft: 10 }}>Nova</span>
                    )}
                  </div>
                  <div className="product-row-meta">
                    {item.body}<br />
                    {fmt(item.created_at)}
                  </div>
                </div>
                <div className="product-row-actions">
                  {item.read_at ? (
                    <span className="product-status completed">Lida</span>
                  ) : (
                    <button
                      className="product-button secondary"
                      type="button"
                      onClick={() => void markRead(item.id)}
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!visible.length && (
              <div className="product-empty">
                {view === "unread"
                  ? "Você não tem notificações não lidas."
                  : "Nenhuma notificação registrada ainda."}
              </div>
            )}
          </div>
        </section>
        )}

      </div>
    </PanelShell>
  );
}
