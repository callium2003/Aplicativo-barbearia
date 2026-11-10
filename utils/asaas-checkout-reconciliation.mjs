/** Assessment only: never grants access or changes an order. Source must be an authenticated, complete provider response. */
export function assessSandboxCheckoutPayments({ checkoutId, priceCents, maxInstallments, months = 12, payments, hasMore }) {
  const review = { status: "review_required" };
  if (typeof checkoutId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(checkoutId)
    || !Number.isSafeInteger(priceCents) || priceCents <= 0 || !Number.isInteger(maxInstallments)
    || maxInstallments < 1 || maxInstallments > 3 || ![1, 12].includes(months) || hasMore !== false || !Array.isArray(payments)
    || payments.length < 1 || payments.length > maxInstallments) return review;
  let total = 0;
  const ids = new Set();
  const numbers = new Set();
  let installment;
  for (const payment of payments) {
    if (!payment || typeof payment.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(payment.id)
      || ids.has(payment.id) || payment.checkoutSession !== checkoutId
      || (months === 12 ? payment.billingType !== "CREDIT_CARD" : !["CREDIT_CARD", "PIX"].includes(payment.billingType))
      || payment.deleted === true || (payment.currency !== undefined && payment.currency !== 'BRL')
      || !["CONFIRMED", "RECEIVED"].includes(payment.status) || typeof payment.value !== "number"
      || !Number.isFinite(payment.value) || payment.value <= 0) return review;
    const cents = Math.round(payment.value * 100);
    if (!Number.isSafeInteger(cents) || Math.abs(payment.value * 100 - cents) > 0.000001) return review;
    total += cents;
    if (!Number.isSafeInteger(total)) return review;
    ids.add(payment.id);
    if (payments.length > 1) {
      if (typeof payment.installment !== "string" || !payment.installment || !Number.isInteger(payment.installmentNumber)
        || payment.installmentNumber < 1 || payment.installmentNumber > payments.length || numbers.has(payment.installmentNumber)) return review;
      if (installment !== undefined && installment !== payment.installment) return review;
      installment = payment.installment;
      numbers.add(payment.installmentNumber);
    }
  }
  return total === priceCents ? { status: "confirmed", paymentCount: payments.length } : review;
}
