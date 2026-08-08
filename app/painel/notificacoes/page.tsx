"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";
import PanelShell from "../PanelShell";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

type Role = "owner" | "manager" | "barber";
type EventType = "new_appointment" | "appointment_confirmed" | "appointment_cancelled" | "appointment_rescheduled" | "appointment_reminder_24h";
type Preference = { event_type: EventType; in_app_enabled: boolean; email_enabled: boolean };
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

const eventText: Record<EventType, { title: string; description: string }> = {
  new_appointment: { title: "Novo agendamento", description: "Quando um novo horário entra na agenda." },
  appointment_confirmed: { title: "Confirmação", description: "Quando um atendimento é confirmado." },
  appointment_cancelled: { title: "Cancelamento", description: "Quando um atendimento é cancelado." },
  appointment_rescheduled: { title: "Reagendamento", description: "Quando data ou horário do atendimento muda." },
  appointment_reminder_24h: { title: "Lembrete 24h", description: "Lembrete do atendimento do dia seguinte." },
};

const statusText: Record<Delivery["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  sent: "Enviado",
  failed: "Falhou",
};

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default function NotificacoesPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const context = await getPanelContext(supabase);
      if (!context.userId) { window.location.replace("/entrar"); return; }
      if (!context.role || !context.barbershopId) { window.location.replace("/painel/inicio"); return; }
      const [{ data: shop }, prefResult] = await Promise.all([
        supabase.from("barbershops").select("name").eq("id", context.barbershopId).maybeSingle<{ name: string }>(),
        supabase.rpc("get_my_notification_preferences", { p_barbershop_id: context.barbershopId }),
      ]);
      if (!active) return;
      setRole(context.role as Role);
      setShopId(context.barbershopId);
      setShopName(shop?.name || "Barbearia");
      setPreferences((prefResult.data || []) as Preference[]);

      if (context.role === "owner" || context.role === "manager") {
        const monitorResult = await supabase.rpc("get_notification_delivery_monitor", { p_barbershop_id: context.barbershopId, p_limit: 60 });
        if (active) setDeliveries((monitorResult.data || []) as Delivery[]);
      }
      if (prefResult.error) setMessage(prefResult.error.message || "Não foi possível carregar as preferências.");
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const emailEnabledCount = useMemo(() => preferences.filter((item) => item.email_enabled).length, [preferences]);

  async function save(item: Preference, patch: Partial<Preference>) {
    if (!shopId) return;
    const next = { ...item, ...patch };
    setSaving(item.event_type);
    setMessage("");
    const { error } = await supabase.rpc("save_my_notification_preference", {
      p_barbershop_id: shopId,
      p_event_type: item.event_type,
      p_in_app_enabled: next.in_app_enabled,
      p_email_enabled: next.email_enabled,
    });
    setSaving("");
    if (error) { setMessage(error.message || "Não foi possível salvar."); return; }
    setPreferences((current) => current.map((value) => value.event_type === item.event_type ? next : value));
    setMessage("Preferência salva.");
  }

  if (loading || !role) return <main className="product-shell"><div className="product-content"><p>Carregando notificações...</p></div></main>;

  return <PanelShell role={role} active="notifications" shopName={shopName}>
    <div className="product-content">
      <div className="product-page-head">
        <div>
          <p className="product-eyebrow">Comunicação operacional</p>
          <h1 className="product-title">Notificações</h1>
          <p className="product-subtitle">Escolha como você quer ser avisado sobre mudanças da agenda. Notificações internas são gratuitas; e-mail entra na fila de entrega do BarbeariaSP.</p>
        </div>
      </div>

      {message && <p className="notification-page-message" role="status">{message}</p>}

      <section className="product-card pad notification-preferences-card">
        <div className="product-section-head">
          <div><h2>Minhas preferências</h2><p>Estas opções valem somente para sua conta nesta barbearia.</p></div>
          <span className="notification-summary-chip">{emailEnabledCount} por e-mail</span>
        </div>
        <div className="notification-preference-list">
          {preferences.map((item) => <div className="notification-preference-row" key={item.event_type}>
            <div><strong>{eventText[item.event_type].title}</strong><span>{eventText[item.event_type].description}</span></div>
            <div className="notification-channel-options">
              <label><input type="checkbox" checked={item.in_app_enabled} disabled={saving === item.event_type} onChange={(event) => void save(item, { in_app_enabled: event.target.checked })} /> Dentro do sistema</label>
              <label><input type="checkbox" checked={item.email_enabled} disabled={saving === item.event_type} onChange={(event) => void save(item, { email_enabled: event.target.checked })} /> E-mail</label>
            </div>
          </div>)}
        </div>
      </section>

      {(role === "owner" || role === "manager") && <section className="product-card pad product-section">
        <div className="product-section-head"><div><h2>Monitor de entregas</h2><p>Últimos e-mails preparados pelo sistema. O envio real depende do worker de entrega estar configurado no ambiente publicado.</p></div></div>
        <div className="notification-delivery-table-wrap">
          <table className="notification-delivery-table">
            <thead><tr><th>Evento</th><th>Destino</th><th>Status</th><th>Tentativas</th><th>Criado</th><th>Enviado</th></tr></thead>
            <tbody>
              {deliveries.map((item) => <tr key={item.id}>
                <td>{eventText[item.kind]?.title || item.kind}</td>
                <td>{item.recipient_email}</td>
                <td><span className={`notification-delivery-status ${item.status}`}>{statusText[item.status]}</span>{item.last_error && <small title={item.last_error}>Ver erro</small>}</td>
                <td>{item.attempts}</td>
                <td>{fmt(item.created_at)}</td>
                <td>{fmt(item.sent_at)}</td>
              </tr>)}
              {!deliveries.length && <tr><td colSpan={6}>Nenhum e-mail foi enfileirado ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      <section className="product-card pad product-section notification-future-card">
        <p className="product-eyebrow">Preparado para depois</p>
        <h2>Push e WhatsApp automático</h2>
        <p>O motor usa eventos e canais separados. Quando decidirmos ativar push ou WhatsApp Business, eles entram como novos entregadores sem reescrever a agenda.</p>
      </section>
    </div>
  </PanelShell>;
}
