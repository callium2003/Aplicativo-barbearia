/** Revalidates the financial payment from Asaas; the webhook ID alone is never proof. */
export async function reconcilePixAutomaticPayment(order, { client, finish }) {
  if (!order || typeof order.paymentId !== "string" || typeof order.authorizationId !== "string" || typeof finish !== "function") throw new Error("Invalid Pix Automatic reconciliation");
  let payment;
  try { payment = await client.getPayment(order.paymentId); } catch { return finish({ outcome: "RETRY", payment: null }); }
  const authorizationId = payment?.pixAutomaticAuthorizationId ?? payment?.authorization?.id ?? "";
  const valid = payment && payment.id === order.paymentId && authorizationId === order.authorizationId
    && payment.billingType === "PIX" && ["CONFIRMED", "RECEIVED"].includes(payment.status)
    && typeof payment.value === "number" && Number.isSafeInteger(Math.round(payment.value * 100))
    && Math.round(payment.value * 100) === order.priceCents;
  if (!valid) return finish({ outcome: "REVIEW_REQUIRED", payment: null });
  return finish({ outcome: "CONFIRMED", payment: { id: payment.id, status: payment.status, valueCents: Math.round(payment.value * 100), authorizationId } });
}
