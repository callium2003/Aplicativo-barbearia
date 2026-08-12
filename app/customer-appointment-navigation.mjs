export function appointmentShop(relation) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation && typeof relation === "object" ? relation : null;
}

export function buildCustomerAppointmentTarget(shop, serviceIds = [], rebook = false) {
  if (!shop?.slug) return null;
  if (!rebook || !Array.isArray(serviceIds) || !serviceIds.length) return `/${shop.slug}`;
  const query = new URLSearchParams({ services: serviceIds.join(",") });
  return `/${shop.slug}?${query.toString()}`;
}
