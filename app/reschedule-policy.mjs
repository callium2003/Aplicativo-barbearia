/**
 * @file app/reschedule-policy.mjs
 * Regras e políticas de elegibilidade para cancelamento e reagendamento pelo cliente (EFS §12.4 / BLD-02).
 *
 * Em conformidade com a EFS Seção 12.4:
 * - Antecedência mínima para reagendamento online: 2 horas.
 * - Reservas com menos de 2 horas ou já iniciadas: orientar contato direto com a barbearia pelo WhatsApp.
 */

export const RESCHEDULE_MINIMUM_HOURS = 2;

/**
 * Avalia se um agendamento é elegível para reagendamento online pelo cliente.
 *
 * @param {string | Date} startsAt Data e hora de início do agendamento
 * @param {number} [minimumHours=2] Horas mínimas de antecedência exigidas
 * @param {Date} [now=new Date()] Data/hora de referência para o cálculo
 * @returns {{ eligible: boolean, hoursUntil: number, reason: string | null, message: string | null }}
 */
export function evaluateRescheduleEligibility(startsAt, minimumHours = RESCHEDULE_MINIMUM_HOURS, now = new Date()) {
  const appointmentTime = new Date(startsAt).getTime();
  const currentTime = new Date(now).getTime();

  if (isNaN(appointmentTime)) {
    return {
      eligible: false,
      hoursUntil: 0,
      reason: "invalid_date",
      message: "Data do agendamento inválida.",
    };
  }

  const diffMs = appointmentTime - currentTime;
  const hoursUntil = diffMs / (1000 * 60 * 60);

  if (diffMs <= 0) {
    return {
      eligible: false,
      hoursUntil,
      reason: "already_started",
      message: "Este horário já foi iniciado ou ultrapassado.",
    };
  }

  if (hoursUntil < minimumHours) {
    return {
      eligible: false,
      hoursUntil,
      reason: "insufficient_advance_notice",
      message: `Para reagendamentos com menos de ${minimumHours} horas de antecedência, entre em contato diretamente com a barbearia pelo WhatsApp.`,
    };
  }

  return {
    eligible: true,
    hoursUntil,
    reason: null,
    message: null,
  };
}
