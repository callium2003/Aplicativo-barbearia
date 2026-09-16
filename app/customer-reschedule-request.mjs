export function buildCustomerRescheduleRequest({ appointmentId, barbershopId, serviceIds, professionalId, startsAt, customerName, customerPhone }) {
  if (!appointmentId) throw new Error("Agendamento original obrigatório.");
  return { p_appointment_id: appointmentId, p_barbershop_id: barbershopId, p_service_ids: serviceIds, p_professional_id: professionalId, p_starts_at: startsAt, p_customer_name: customerName, p_customer_phone: customerPhone };
}
