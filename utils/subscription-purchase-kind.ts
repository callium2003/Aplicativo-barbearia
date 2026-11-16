type PurchaseOrder = {
  months?: number | null;
  billing_mode?: string | null;
  provider_subscription_id?: string | null;
  provider_pix_authorization_id?: string | null;
};

/** Classify persisted, authorized orders; never infer recurrence from duration alone. */
export function oneTimePurchaseKind(order?: PurchaseOrder | null): "quarterly_purchase" | "annual_purchase" | null {
  if (!order || order.billing_mode !== "ONE_TIME" || order.provider_subscription_id || order.provider_pix_authorization_id) return null;
  if (order.months === 3) return "quarterly_purchase";
  if (order.months === 12) return "annual_purchase";
  return null;
}

/** Canceled historical bindings must not shadow the current one-off purchase. */
export function activeRecurringOrders<T extends { status?: string; recurring_state?: string | null; provider_subscription_id?: string | null; provider_pix_authorization_id?: string | null }>(orders: T[]): T[] {
  return orders.filter(order => order.status === "CONFIRMED" && order.recurring_state !== "CANCELED" && Boolean(order.provider_subscription_id || order.provider_pix_authorization_id));
}
