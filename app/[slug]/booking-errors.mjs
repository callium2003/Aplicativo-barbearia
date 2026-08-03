function normalizedError(error) {
  return `${error?.code || ""} ${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
}

export function bookingErrorMessage(error) {
  const detail = normalizedError(error);

  if (error?.code === "PGRST202" || error?.code === "42883" || detail.includes("book_customer_appointment") && detail.includes("not find")) {
    return "O agendamento está temporariamente indisponível por uma configuração do ambiente. Tente novamente mais tarde.";
  }
  if (error?.code === "42501" || detail.includes("permission denied") || detail.includes("not authorized")) {
    return "Não foi possível confirmar porque sua sessão não tem permissão. Entre novamente e tente de novo.";
  }
  if (["42P01", "42703", "PGRST204"].includes(error?.code) || detail.includes("schema cache")) {
    return "O agendamento está temporariamente indisponível por uma configuração do ambiente. Tente novamente mais tarde.";
  }
  if (["23P01", "23505"].includes(error?.code) || detail.includes("appointments_no_overlapping_slots") || detail.includes("exclusion_violation") || detail.includes("overlap") || detail.includes("horário escolhido") && /(reservado|ocupado|indisponível)/.test(detail)) {
    return "Esse horário acabou de ser reservado ou não está mais disponível. Escolha outro horário.";
  }
  return "Não foi possível confirmar o agendamento agora. Tente novamente.";
}
