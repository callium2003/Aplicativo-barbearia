"use client";

import { createClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

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

type Props = {
  shopId: string;
  initialPreferences: Preference[];
};

const eventText: Record<EventType, { title: string; description: string }> = {
  new_appointment: {
    title: "Novo agendamento",
    description: "Quando um novo horário entra na agenda.",
  },
  appointment_confirmed: {
    title: "Confirmação",
    description: "Quando um atendimento é confirmado.",
  },
  appointment_cancelled: {
    title: "Cancelamento",
    description: "Quando um atendimento é cancelado.",
  },
  appointment_rescheduled: {
    title: "Reagendamento",
    description: "Quando data ou horário do atendimento muda.",
  },
  appointment_reminder_24h: {
    title: "Lembrete 24h",
    description: "Lembrete do atendimento do dia seguinte.",
  },
};

export default function NotificationPreferencesPanel({ shopId, initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  const emailEnabledCount = useMemo(
    () => preferences.filter((item) => item.email_enabled).length,
    [preferences],
  );

  async function save(item: Preference, patch: Partial<Preference>) {
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
    if (error) {
      setMessage(error.message || "Não foi possível salvar a preferência.");
      return;
    }

    setPreferences((current) =>
      current.map((value) => (value.event_type === item.event_type ? next : value)),
    );
    setMessage("Preferência salva.");
  }

  return (
    <section id="notificacoes" className="product-card pad product-section">
      <div className="product-section-head">
        <div>
          <p className="product-eyebrow">Comunicação</p>
          <h2>Preferências de notificações</h2>
          <p>Escolha, por evento, se você quer receber o aviso dentro do sistema e/ou por e-mail.</p>
        </div>
        <span className="notification-summary-chip">{emailEnabledCount} por e-mail</span>
      </div>

      {message && (
        <p
          className={`product-message ${message === "Preferência salva." ? "success" : "error"}`}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="notification-preference-list">
        {preferences.map((item) => (
          <div className="notification-preference-row" key={item.event_type}>
            <div>
              <strong>{eventText[item.event_type].title}</strong>
              <span>{eventText[item.event_type].description}</span>
            </div>
            <div className="notification-channel-options">
              <label>
                <input
                  type="checkbox"
                  checked={item.in_app_enabled}
                  disabled={saving === item.event_type}
                  onChange={(event) =>
                    void save(item, { in_app_enabled: event.target.checked })
                  }
                />{" "}
                Dentro do sistema
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.email_enabled}
                  disabled={saving === item.event_type}
                  onChange={(event) => void save(item, { email_enabled: event.target.checked })}
                />{" "}
                E-mail
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
