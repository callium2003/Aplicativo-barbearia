/** Bounded Sandbox-only lookup. A partial response is never evidence of absence or payment. */
export async function findSandboxCheckoutPayments({ client, checkoutId, pageSize = 100, maxPages = 20 }) {
  const review = { status: 'review_required' };
  if (!client || typeof client.listPaymentsPage !== 'function' || typeof checkoutId !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(checkoutId) || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) return review;
  const matches = [];
  const seen = new Set();
  try {
    for (let page = 0; page < maxPages; page++) {
      const result = await client.listPaymentsPage({ offset: page * pageSize, limit: pageSize });
      if (!result || !Array.isArray(result.data) || typeof result.hasMore !== 'boolean'
        || result.data.length > pageSize || (result.hasMore && result.data.length === 0)) return review;
      for (const payment of result.data) {
        if (!payment || typeof payment.id !== 'string' || !payment.id || seen.has(payment.id)) return review;
        seen.add(payment.id);
        if (payment.checkoutSession === checkoutId) matches.push(payment);
      }
      if (!result.hasMore) return { status: 'complete', payments: matches };
    }
  } catch { return review; }
  return review;
}
import { assessSandboxCheckoutPayments } from './asaas-checkout-reconciliation.mjs';


/** Assessment only: no subscription mutation or payment side effects. */
export async function assessSandboxCheckoutFromProvider({ client, checkoutId, priceCents, maxInstallments, pageSize, maxPages }) {
  const found = await findSandboxCheckoutPayments({ client, checkoutId, pageSize, maxPages });
  if (found.status !== 'complete') return { status: 'review_required' };
  return assessSandboxCheckoutPayments({ checkoutId, priceCents, maxInstallments, payments: found.payments, hasMore: false });
}
