"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

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
type Delivery = {
  id: string;
  appointment_id: string | null;
  kind: EventType;
  recipient_email: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  next_attempt_at: string;
};
type ViewKey = "all" | "unread";

const eventText: Record<EventType, string> = {
  new_appointment: "Novo agendamento",
  appointment_confirmed: "Confirmação",
  appointment_cancelled: "Cancelamento",
  appointment_rescheduled: "Reagendamento",
  appointment_reminder_24h: "Lembrete 24h",
};

const statusText: Record<Delivery["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  sent: "Enviado",
  failed: "Falhou",
};

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
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [view, setView] = useState<ViewKey>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id,title,body,event_type,read_at,created_at")
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

      const { data: shop } = await supabase
        .from("barbershops")
        .select("name")
        .eq("id", context.barbershopId)
        .maybeSingle<{ name: string }>();

      if (!active) return;
      setRole(context.role as Role);
      setUserId(context.userId);
      setShopName(shop?.name || "Barbearia");
      await loadNotifications();

      if (context.role === "owner" || context.role === "manager") {
        const monitorResult = await supabase.rpc("get_notification_delivery_monitor", {
          p_barbershop_id: context.barbershopId,
          p_limit: 60,
        });
        if (active) setDeliveries((monitorResult.data || []) as Delivery[]);
      }

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
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read_at: now } : item)),
    );
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("id", id);
    if (error) {
      setMessage("Não foi possível marcar a notificação como lida.");
      await loadNotifications();
    }
  }

  async function markAllRead() {
    const unreadIds = unread.map((item) => item.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at || now })),
    );
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .in("id", unreadIds);
    if (error) {
      setMessage("Não foi possível marcar todas como lidas.");
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
    <PanelShell role={role} active="notifications" shopName={shopName}>
      <div className="product-content">
        <div className="product-page-head">
          <div>
            <p className="product-eyebrow">Central</p>
            <h1 className="product-title">Notificações</h1>
            <p className="product-subtitle">
              Consulte o histórico de avisos operacionais e acompanhe o que ainda não foi lido.
              Preferências de canais ficam em Configurações.
            </p>
          </div>
          {unread.length > 0 && (
            <button className="product-button secondary" type="button" onClick={() => void markAllRead()}>
              Marcar todas como lidas
            </button>
          )}
        </div>

        {message && <p className="product-message error" role="status">{message}</p>}

        <div className="product-chip-row" style={{ marginBottom: 14 }}>
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
            data-active={view === "unread" ? "true" : "false"}
            type="button"
            onClick={() => setView("unread")}
          >
            Não lidas ({unread.length})
          </button>
        </div>

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

        {(role === "owner" || role === "manager") && (
          <section className="product-card pad product-section">
            <div className="product-section-head">
              <div>
                <h2>Histórico de e-mails</h2>
                <p>Últimos e-mails preparados pelo sistema e situação da entrega.</p>
              </div>
            </div>
            <div className="notification-delivery-table-wrap">
              <table className="notification-delivery-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Destino</th>
                    <th>Status</th>
                    <th>Tentativas</th>
                    <th>Criado</th>
                    <th>Enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((item) => (
                    <tr key={item.id}>
                      <td>{eventText[item.kind] || item.kind}</td>
                      <td>{item.recipient_email}</td>
                      <td>
                        <span className={`notification-delivery-status ${item.status}`}>
                          {statusText[item.status]}
                        </span>
                        {item.last_error && <small title={item.last_error}>Ver erro</small>}
                      </td>
                      <td>{item.attempts}</td>
                      <td>{fmt(item.created_at)}</td>
                      <td>{fmt(item.sent_at)}</td>
                    </tr>
                  ))}
                  {!deliveries.length && (
                    <tr><td colSpan={6}>Nenhum e-mail foi enfileirado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PanelShell>
  );
}
