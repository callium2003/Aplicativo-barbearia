/**
 * @file app/customer-appointment-navigation.mjs
 * Módulo isomórfico compartilhado de resolução e navegação de agendamentos do cliente.
 * Desenvolvido em ESM nativo (.mjs) para execução direta pelo Node.js test runner
 * e importação no Next.js (App Router) sem gerar rotas adicionais.
 */

export function appointmentShop(relation) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation && typeof relation === "object" ? relation : null;
}

export function buildCustomerAppointmentTarget(shop, serviceIds = [], rebook = false, rescheduleAppointmentId = /** @type {string | null} */ (null)) {
  if (!shop?.slug) return null;
  if (!rebook || !Array.isArray(serviceIds) || !serviceIds.length) return `/${shop.slug}`;
  const params = { services: serviceIds.join(",") };
  if (rescheduleAppointmentId) {
    params.reschedule = String(rescheduleAppointmentId);
  }
  const query = new URLSearchParams(params);
  return `/${shop.slug}?${query.toString()}`;
}
