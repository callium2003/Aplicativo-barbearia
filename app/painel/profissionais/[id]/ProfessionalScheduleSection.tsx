import type { Dispatch, SetStateAction } from "react";

import ActionFeedback from "../../ActionFeedback";
import type { Break, FeedbackValue, FormSubmit, Hours, Professional } from "./professional-detail-shared";
import { days } from "./professional-detail-shared";

type Props = {
  professional: Professional;
  editingCustom: boolean;
  setEditingCustom: Dispatch<SetStateAction<boolean>>;
  hours: Hours[];
  businessHours: Hours[];
  breaks: Break[];
  saving: boolean;
  inheritSchedule: () => Promise<void>;
  saveCustomSchedule: () => Promise<void>;
  changeHour: (weekday: number, update: Partial<Hours>) => void;
  addBreak: FormSubmit;
  addBlock: FormSubmit;
  loadCustomHours: () => Promise<boolean>;
  feedback: FeedbackValue;
  breakFeedback: FeedbackValue;
  blockFeedback: FeedbackValue;
};

export default function ProfessionalScheduleSection({
  professional,
  editingCustom,
  setEditingCustom,
  hours,
  businessHours,
  breaks,
  saving,
  inheritSchedule,
  saveCustomSchedule,
  changeHour,
  addBreak,
  addBlock,
  loadCustomHours,
  feedback,
  breakFeedback,
  blockFeedback,
}: Props) {
  return (
    <details className="product-card management-professional-section">
      <summary>
        <span>
          <b>Agenda e disponibilidade</b>
          <small>{professional.schedule_mode === "custom" ? "Horários personalizados" : "Herda os horários da barbearia"}</small>
        </span>
        <span>＋</span>
      </summary>
      <div className="management-mode-actions">
        <button type="button" className={`product-button ${professional.schedule_mode === "barbershop" && !editingCustom ? "" : "secondary"}`} disabled={saving} onClick={() => void inheritSchedule()}>Agenda da barbearia</button>
        <button
          type="button"
          className={`product-button ${professional.schedule_mode === "custom" || editingCustom ? "" : "secondary"}`}
          disabled={saving}
          onClick={async () => {
            if (professional.schedule_mode !== "custom" && !editingCustom) {
              const loaded = await loadCustomHours();
              if (!loaded) return;
            }
            setEditingCustom(true);
          }}
        >
          Personalizada
        </button>
      </div>
      {!editingCustom && professional.schedule_mode !== "custom" && <ActionFeedback {...feedback} />}
      {(professional.schedule_mode === "custom" || editingCustom) && (
        <div className="management-week-list">
          <p className="management-section-note">Defina os horários dentro do funcionamento da barbearia. A agenda personalizada passa a valer quando você salvar.</p>
          {hours.map((day) => (
            <div className="management-week-day" key={day.weekday}>
              <label className="management-week-day-toggle">
                <input type="checkbox" checked={!day.is_closed} onChange={(e) => changeHour(day.weekday, { is_closed: !e.target.checked })} />{" "}
                {days[day.weekday]}
              </label>
              <small className="management-week-day-business-hours">
                {businessHours.find((row) => row.weekday === day.weekday && !row.is_closed)
                  ? `Barbearia: ${businessHours.find((row) => row.weekday === day.weekday)?.opens_at?.slice(0, 5)}–${businessHours.find((row) => row.weekday === day.weekday)?.closes_at?.slice(0, 5)}`
                  : "Barbearia fechada"}
              </small>
              <input className="product-input management-week-day-start" type="time" disabled={day.is_closed} value={day.opens_at?.slice(0, 5) || ""} onChange={(e) => changeHour(day.weekday, { opens_at: e.target.value })} />
              <input className="product-input management-week-day-end" type="time" disabled={day.is_closed} value={day.closes_at?.slice(0, 5) || ""} onChange={(e) => changeHour(day.weekday, { closes_at: e.target.value })} />
            </div>
          ))}
          <button type="button" className="product-button" disabled={saving} onClick={() => void saveCustomSchedule()}>Salvar agenda personalizada</button>
          <ActionFeedback {...feedback} />
        </div>
      )}
      <div className="management-availability-forms">
        <form onSubmit={addBreak}>
          <h3>Pausa recorrente</h3>
          <select className="product-select" name="weekday">
            {days.map((day, index) => <option value={index} key={day}>{day}</option>)}
          </select>
          <input className="product-input" name="start" type="time" required />
          <input className="product-input" name="end" type="time" required />
          <button className="product-button">Salvar pausa</button>
          <ActionFeedback {...breakFeedback} />
          <p>{breaks.length ? breaks.map((item) => `${days[item.weekday]} ${item.starts_at.slice(0, 5)}–${item.ends_at.slice(0, 5)}`).join(" · ") : "Nenhuma pausa cadastrada."}</p>
        </form>
        <form onSubmit={addBlock}>
          <h3>Ausência ou bloqueio</h3>
          <input className="product-input" name="start" type="datetime-local" required />
          <input className="product-input" name="end" type="datetime-local" required />
          <input className="product-input" name="reason" placeholder="Motivo opcional" />
          <button className="product-button">Bloquear período</button>
          <ActionFeedback {...blockFeedback} />
        </form>
      </div>
    </details>
  );
}
