"use client";

import { supabase } from "@/utils/supabase";
import { useState } from "react";
import ActionFeedback from "../ActionFeedback";

type EventType =
  | "new_appointment"
  | "appointment_cancelled"
  | "appointment_rescheduled";

type Preference = {
  event_type: string;
  in_app_enabled: boolean;
};

type SupportedPreference = Preference & {
  event_type: EventType;
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
  appointment_cancelled: {
    title: "Cancelamento",
    description: "Quando um atendimento é cancelado.",
  },
  appointment_rescheduled: {
    title: "Reagendamento",
    description: "Quando data ou horário do atendimento muda.",
  },
};

const supportedEventTypes = new Set<EventType>([
  "new_appointment",
  "appointment_cancelled",
  "appointment_rescheduled",
]);

function isSupportedPreference(preference: Preference): preference is SupportedPreference {
  return supportedEventTypes.has(preference.event_type as EventType);
}

export default function NotificationPreferencesPanel({ shopId, initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState("");
  const [feedback, setFeedback] = useState<{ eventType: EventType; message: string; tone: "success" | "error" } | null>(null);

  async function save(item: SupportedPreference, inAppEnabled: boolean) {
    const next = { ...item, in_app_enabled: inAppEnabled };
    setSaving(item.event_type);
    setFeedback(null);

    const { error } = await supabase.rpc("save_my_notification_preference", {
      p_barbershop_id: shopId,
      p_event_type: item.event_type,
      p_in_app_enabled: next.in_app_enabled,
      p_email_enabled: false,
    });

    setSaving("");
    if (error) {
      setFeedback({ eventType: item.event_type, message: "Não foi possível salvar a preferência. Tente novamente.", tone: "error" });
      return;
    }

    setPreferences((current) =>
      current.map((value) => (value.event_type === item.event_type ? next : value)),
    );
    setFeedback({ eventType: item.event_type, message: "Preferência salva.", tone: "success" });
  }

  return (
    <section id="notificacoes" className="product-card pad product-section">
      <div className="product-section-head">
        <div>
          <p className="product-eyebrow">Comunicação</p>
          <h2>Preferências de notificações</h2>
          <p>Escolha quais avisos operacionais você quer receber dentro do sistema.</p>
        </div>
        <span className="notification-summary-chip">3 eventos configuráveis</span>
      </div>

      <div className="notification-preference-list">
        {preferences.filter(isSupportedPreference).map((item) => (
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
                    void save(item, event.target.checked)
                  }
                />{" "}
                Dentro do sistema
              </label>
            </div>
            {feedback?.eventType === item.event_type && <ActionFeedback message={feedback.message} tone={feedback.tone} />}
          </div>
        ))}
      </div>
    </section>
  );
}
