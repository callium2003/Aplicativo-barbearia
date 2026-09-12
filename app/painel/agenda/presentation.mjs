export function summarizeDailyAppointments(daily) {
  return {
    total: daily.length,
    scheduled: daily.filter((appointment) => appointment.status === "scheduled").length,
    completed: daily.filter((appointment) => appointment.status === "completed").length,
    noShow: daily.filter((appointment) => appointment.status === "no_show").length,
  };
}

export function readAgendaProfessionalFilter(search) {
  const professionalId = new URLSearchParams(search).get("professional");
  return professionalId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(professionalId)
    ? professionalId
    : null;
}

export function appointmentStatusErrorMessage(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "PGRST202" || message.includes("could not find the function")) {
    return "A atualização de status ainda não está disponível neste ambiente.";
  }
  if (code === "42501" || message.includes("access denied") || message.includes("permission denied")) {
    return "Você não tem permissão para atualizar este agendamento.";
  }
  if (message.includes("authentication required")) {
    return "Sua sessão precisa ser renovada. Entre novamente para atualizar o agendamento.";
  }
  if (message.includes("status transition not allowed") || message.includes("appointment not found")) {
    return "Este agendamento mudou e não pode mais receber essa ação. Atualize a agenda e tente novamente.";
  }
  return "Não foi possível atualizar este agendamento. Tente novamente.";
}
