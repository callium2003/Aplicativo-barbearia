const actionableAppointmentStatuses = new Set(["scheduled"]);

export function selectUpcomingManagementAppointments(appointments, nowIso, limit = 4) {
  const now = new Date(nowIso).getTime();

  return appointments
    .filter((appointment) => (
      actionableAppointmentStatuses.has(appointment.status)
      && new Date(appointment.starts_at).getTime() >= now
    ))
    .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())
    .slice(0, limit);
}

export function buildManagementHomeAlerts({
  activeServiceCount,
  activeProfessionalCount,
  hasOpenBusinessHours,
  professionalsWithoutSchedule,
  inactiveProfessionalCommitments,
}) {
  const alerts = [];

  if (activeServiceCount === 0) {
    alerts.push({
      kind: "service",
      href: "/painel/servicos",
      title: "Cadastre ao menos um serviço ativo.",
      description: "Os serviços definem o que os clientes podem agendar.",
    });
  }

  if (activeProfessionalCount === 0) {
    alerts.push({
      kind: "professional",
      href: "/painel/profissionais",
      title: "Cadastre ao menos um profissional ativo.",
      description: "Associe quem atende antes de abrir horários para reserva.",
    });
  }

  if (!hasOpenBusinessHours) {
    alerts.push({
      kind: "business-hours",
      href: "/painel/horarios",
      title: "Defina os horários de funcionamento da barbearia.",
      description: "A agenda precisa de pelo menos um dia aberto para receber reservas.",
    });
  }

  if (professionalsWithoutSchedule.length > 0) {
    alerts.push({
      kind: "professional-schedule",
      href: "/painel/profissionais",
      title: professionalsWithoutSchedule.length === 1
        ? "Configure a agenda do profissional ativo."
        : `Configure a agenda de ${professionalsWithoutSchedule.length} profissionais ativos.`,
      description: "Cada profissional precisa de uma agenda disponível para receber novos horários.",
    });
  }

  for (const commitment of inactiveProfessionalCommitments) {
    alerts.push({
      kind: "inactive-professional",
      href: `/painel/agenda?professional=${encodeURIComponent(commitment.professionalId)}`,
      title: `${commitment.professionalName} está inativo e tem ${commitment.appointmentCount} ${commitment.appointmentCount === 1 ? "agendamento futuro" : "agendamentos futuros"}.`,
      description: "Revise os atendimentos que ainda precisam de definição.",
    });
  }

  return alerts;
}
