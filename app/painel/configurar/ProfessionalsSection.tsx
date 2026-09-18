import type { Dispatch, FormEventHandler, SetStateAction } from "react";

import { button, days, input, type Hours, type Item, type Shop } from "./settings-shared";

type ProfessionalBreaks = Record<number, { starts_at: string; ends_at: string }>;

type ProfessionalsSectionProps = {
  shop: Shop;
  addProfessional: FormEventHandler<HTMLFormElement>;
  professionalName: string;
  setProfessionalName: Dispatch<SetStateAction<string>>;
  professionalPhone: string;
  setProfessionalPhone: Dispatch<SetStateAction<string>>;
  professionals: Item[];
  editingProfessionalName: Item | null;
  saveProfessionalNameEdit: FormEventHandler<HTMLFormElement>;
  editName: string;
  setEditName: Dispatch<SetStateAction<string>>;
  saving: boolean;
  setEditingProfessionalName: Dispatch<SetStateAction<Item | null>>;
  editingProfessionalCommission: Item | null;
  saveProfessionalCommissionEdit: FormEventHandler<HTMLFormElement>;
  editCommissionRate: string;
  setEditCommissionRate: Dispatch<SetStateAction<string>>;
  savingCommission: boolean;
  setEditingProfessionalCommission: Dispatch<SetStateAction<Item | null>>;
  beginProfessionalNameEdit: (item: Item) => void;
  beginProfessionalCommissionEdit: (item: Item) => void;
  beginProfessionalSchedule: (item: Item) => Promise<void>;
  focusInvitationForm: (professionalId: string) => void;
  toggle: (table: "services" | "professionals", item: Item) => Promise<void>;
  editingProfessionalSchedule: Item | null;
  saveProfessionalSchedule: FormEventHandler<HTMLFormElement>;
  professionalSchedule: Hours[];
  selectedProfessionalWeekday: number;
  setSelectedProfessionalWeekday: Dispatch<SetStateAction<number>>;
  changeProfessionalHour: (weekday: number, update: Partial<Hours>) => void;
  professionalBreaks: ProfessionalBreaks;
  setProfessionalBreaks: Dispatch<SetStateAction<ProfessionalBreaks>>;
  setEditingProfessionalSchedule: Dispatch<SetStateAction<Item | null>>;
};

export default function ProfessionalsSection({
  shop,
  addProfessional,
  professionalName,
  setProfessionalName,
  professionalPhone,
  setProfessionalPhone,
  professionals,
  editingProfessionalName,
  saveProfessionalNameEdit,
  editName,
  setEditName,
  saving,
  setEditingProfessionalName,
  editingProfessionalCommission,
  saveProfessionalCommissionEdit,
  editCommissionRate,
  setEditCommissionRate,
  savingCommission,
  setEditingProfessionalCommission,
  beginProfessionalNameEdit,
  beginProfessionalCommissionEdit,
  beginProfessionalSchedule,
  focusInvitationForm,
  toggle,
  editingProfessionalSchedule,
  saveProfessionalSchedule,
  professionalSchedule,
  selectedProfessionalWeekday,
  setSelectedProfessionalWeekday,
  changeProfessionalHour,
  professionalBreaks,
  setProfessionalBreaks,
  setEditingProfessionalSchedule,
}: ProfessionalsSectionProps) {
  return (
    <article className="configuration-card management-professionals" id="profissionais">
      <header className="management-section-heading">
        <p>EQUIPE</p>
        <h2>Profissionais</h2>
        <span>Cadastre quem atende e configure cada agenda individual.</span>
      </header>
      {shop.role === "owner" && (
        <form
          className="management-professional-create"
          onSubmit={addProfessional}
        >
          <p>NOVO PROFISSIONAL</p>
          <h3>Adicione um profissional</h3>
          <span>Ele poderá organizar a própria agenda depois.</span>
          <label>
            Nome completo
            <input
              required
              style={input}
              value={professionalName}
              placeholder="Ex.: Matheus Costa"
              onChange={(event) => setProfessionalName(event.target.value)}
            />
          </label>
          <label>
            Telefone / WhatsApp
            <input
              type="tel"
              inputMode="tel"
              style={input}
              value={professionalPhone}
              placeholder="(11) 99999-9999"
              onChange={(event) => setProfessionalPhone(event.target.value)}
            />
          </label>
          <button className="management-primary-action" style={button}>Salvar profissional</button>
        </form>
      )}
      {professionals.map((item) => (
        <div
          className="management-professional-card"
          key={item.id}
        >
          {editingProfessionalName?.id === item.id && shop.role === "owner" ? (
            <form className="management-professional-edit-form" onSubmit={saveProfessionalNameEdit}>
              <div className="management-professional-edit-note">
                <b>Editando nome de {item.name}</b>
                <br />
                <small>Esta alteração aparece na agenda e na página pública da barbearia.</small>
              </div>
              <label>Nome do profissional<input required style={input} value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
              <div className="management-professional-edit-actions">
                <button disabled={saving} style={button}>{saving ? "Salvando..." : "Salvar Nome"}</button>
                <button className="management-professional-secondary-action" type="button" disabled={saving} onClick={() => setEditingProfessionalName(null)}>Cancelar</button>
              </div>
            </form>
          ) : editingProfessionalCommission?.id === item.id ? (
            <form className="management-professional-edit-form" onSubmit={saveProfessionalCommissionEdit}>
              <div className="management-professional-edit-note">
                <b>Comissão de {item.name}</b>
                <br />
                <small>Defina a porcentagem que será usada nos próximos atendimentos concluídos.</small>
              </div>
              <label>Comissão (%)<input type="text" required style={input} value={editCommissionRate} onChange={(event) => setEditCommissionRate(event.target.value)} /></label>
              <div className="management-professional-edit-actions">
                <button disabled={savingCommission} style={button}>{savingCommission ? "Salvando..." : "Salvar Comissão"}</button>
                <button className="management-professional-secondary-action" type="button" disabled={savingCommission} onClick={() => setEditingProfessionalCommission(null)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <span>
                <b>{item.name}</b>
                <br />
                <small style={{ color: "#4b3e35" }}>
                  Comissão: <b>{Number(item.commission_rate_percent || 0).toFixed(2).replace(".", ",")}%</b> · {item.active ? "Ativo para agenda" : "Inativo"}
                </small>
                {!item.scheduleConfigured && (
                  <>
                    <br />
                    <small
                      style={{
                        display: "inline-block",
                        marginTop: 5,
                        color: "#9a3a13",
                        fontWeight: 800,
                      }}
                    >
                      Agenda nao configurada - indisponivel para
                      agendamento
                    </small>
                  </>
                )}
              </span>
              <div className="management-professional-actions">
                {shop.role === "owner" && (
                  <button className="management-professional-secondary-action" onClick={() => beginProfessionalNameEdit(item)}>Editar nome</button>
                )}
                <button className="management-professional-secondary-action" onClick={() => beginProfessionalCommissionEdit(item)}>Editar comissão</button>
                {(shop.role === "owner" || shop.role === "manager") && (
                  <button className="management-professional-secondary-action" onClick={() => void beginProfessionalSchedule(item)}>
                    {item.scheduleConfigured ? "Editar agenda" : "Configurar agenda"}
                  </button>
                )}
                {item.active && shop.role === "owner" && (
                  <button className="management-professional-secondary-action" onClick={() => focusInvitationForm(item.id)}>
                    Conceder acesso ao painel
                  </button>
                )}
                {shop.role === "owner" && (
                  <button className={item.active ? "management-professional-danger-action" : "management-primary-action"} onClick={() => void toggle("professionals", item)}>
                    {item.active ? "Inativar" : "Ativar"}
                  </button>
                )}
              </div>
              {editingProfessionalSchedule?.id === item.id && (
                <form
                  className="management-professional-schedule"
                  onSubmit={saveProfessionalSchedule}
                >
                  <header className="management-section-heading">
                    <p>AGENDA DO PROFISSIONAL</p>
                    <h3>Horários de trabalho</h3>
                    <span className="management-professional-chip">{item.name}</span>
                  </header>
                  <p className="management-professional-schedule-help">
                    Defina o horário de cada dia. A pausa é semanal: ela
                    se repete somente no dia da linha correspondente e
                    bloqueia novos agendamentos nesse intervalo.
                  </p>
                  <div className="management-professional-day-tabs" role="tablist" aria-label="Escolher dia da agenda">
                    {professionalSchedule.map((day) => (
                      <button
                        key={day.weekday}
                        type="button"
                        role="tab"
                        aria-selected={selectedProfessionalWeekday === day.weekday}
                        onClick={() => setSelectedProfessionalWeekday(day.weekday)}
                      >
                        {days[day.weekday].slice(0, 3)}
                        <small>{day.is_closed ? "Fechado" : "Aberto"}</small>
                      </button>
                    ))}
                  </div>
                  <div className="management-professional-day-editor">
                    {professionalSchedule.filter((day) => day.weekday === selectedProfessionalWeekday).map((day) => (
                      <div
                        className="management-professional-day-row"
                        key={day.weekday}
                      >
                        <div className="management-professional-day-title"><b>{days[day.weekday]}</b><span>{day.is_closed ? "Sem atendimento" : "Atendimento ativo"}</span></div>
                        <label className="management-availability-toggle management-professional-open-toggle">
                          <input
                            name={`closed-${day.weekday}`}
                            type="checkbox"
                            checked={!day.is_closed}
                            onChange={(event) =>
                              changeProfessionalHour(day.weekday, {
                                is_closed: !event.target.checked,
                              })
                            }
                          />
                          <span>Atende neste dia</span>
                        </label>
                        <div className="management-professional-time-grid">
                          <label>Entrada<input required={!day.is_closed} name={`opens-${day.weekday}`} disabled={day.is_closed} aria-label={`Inicio ${days[day.weekday]}`} type="time" style={input} value={day.opens_at || ""} onChange={(event) => changeProfessionalHour(day.weekday, { opens_at: event.target.value })} /></label>
                          <label>Saída<input required={!day.is_closed} name={`closes-${day.weekday}`} disabled={day.is_closed} aria-label={`Fim ${days[day.weekday]}`} type="time" style={input} value={day.closes_at || ""} onChange={(event) => changeProfessionalHour(day.weekday, { closes_at: event.target.value })} /></label>
                        </div>
                        <div className="management-professional-break-grid">
                          <div><b>Intervalo</b><small>Opcional e específico deste dia</small></div>
                          <label>Início<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.starts_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: event.target.value, ends_at: current[day.weekday]?.ends_at || "" } }))} /></label>
                          <label>Fim<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.ends_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: current[day.weekday]?.starts_at || "", ends_at: event.target.value } }))} /></label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="management-schedule-actions">
                    <button className="management-primary-action" disabled={saving} style={button}>
                      {saving ? "Salvando..." : "Salvar horários"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProfessionalSchedule(null)
                      }
                      className="management-professional-secondary-action"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      ))}
    </article>
  );
}
