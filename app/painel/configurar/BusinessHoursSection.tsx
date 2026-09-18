import type { FormEventHandler } from "react";

import ActionFeedback from "../ActionFeedback";
import { button, days, input, type Hours } from "./settings-shared";

type BusinessHoursSectionProps = {
  hours: Hours[];
  changeHour: (weekday: number, update: Partial<Hours>) => void;
  saveHours: FormEventHandler<HTMLFormElement>;
  saving: boolean;
  actionMessage: string;
};

export default function BusinessHoursSection({
  hours,
  changeHour,
  saveHours,
  saving,
  actionMessage,
}: BusinessHoursSectionProps) {
  return (
    <form className="configuration-card management-business-hours" id="agenda-horarios" onSubmit={saveHours}>
      <header className="management-section-heading">
        <p>DISPONIBILIDADE</p>
        <h2>Agenda da barbearia</h2>
        <span>Defina os dias e horários gerais em que a barbearia aceita reservas.</span>
      </header>
      <div className="management-business-hours-list">
        {hours.map((day) => (
          <div
            className="configuration-hours-row"
            key={day.weekday}
          >
            <div className="management-hours-day"><b>{days[day.weekday]}</b><small>{day.is_closed ? "Fechado" : `${day.opens_at}–${day.closes_at}`}</small></div>
            <input
              required={!day.is_closed}
              disabled={day.is_closed}
              aria-label={`Abertura ${days[day.weekday]}`}
              type="time"
              style={input}
              value={day.opens_at || ""}
              onChange={(event) =>
                changeHour(day.weekday, { opens_at: event.target.value })
              }
            />
            <input
              required={!day.is_closed}
              disabled={day.is_closed}
              aria-label={`Fechamento ${days[day.weekday]}`}
              type="time"
              style={input}
              value={day.closes_at || ""}
              onChange={(event) =>
                changeHour(day.weekday, { closes_at: event.target.value })
              }
            />
            <label className="management-availability-toggle">
              <input
                type="checkbox"
                checked={!day.is_closed}
                onChange={(event) =>
                  changeHour(day.weekday, {
                    is_closed: !event.target.checked,
                  })
                }
              />{" "}
              <span>{day.is_closed ? "Abrir neste dia" : "Agenda aberta"}</span>
            </label>
          </div>
        ))}
      </div>
      <p className="management-information-note">Cada dia é independente. Você pode abrir a agenda aos domingos e definir um horário específico quando necessário.</p>
      <button className="management-primary-action" disabled={saving} style={{ ...button, marginTop: 16 }}>
        {saving ? "Salvando..." : "Salvar horários"}
      </button>
      <ActionFeedback message={actionMessage} tone={actionMessage.startsWith("Não foi") || actionMessage.startsWith("Revise") ? "error" : "success"} />
    </form>
  );
}
