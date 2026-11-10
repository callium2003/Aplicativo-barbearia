import { findSandboxCheckoutPayments } from './asaas-checkout-payment-lookup.mjs';
import { assessSandboxCheckoutPayments } from './asaas-checkout-reconciliation.mjs';

/** Server worker only. Browser callbacks and webhook status never become financial evidence. */
export async function reconcileSandboxOrder(order, { client, account, finish }) {
  if (!order || order.account !== account || typeof account !== 'string' || !account
    || typeof finish !== 'function') throw new Error('Invalid reconciliation account');
  const complete = (outcome, payments = [], subscriptionId = null) =>
    finish({ orderId: order.id, lease: order.lease, account, outcome, payments, ...(subscriptionId ? { subscriptionId } : {}) });
  const found = await findSandboxCheckoutPayments({ client, checkoutId: order.checkoutId });
  if (found.status !== 'complete') return complete('RETRY');
  if (!found.payments.length) return complete('RETRY');

  let candidatePayments = found.payments;
  if ([1, 12].includes(order.months ?? 12) && found.payments.length > 1) {
    // In Asaas, a recurring credit card checkout generates subsequent billing cycle invoices
    // under the same checkout session. Verify that all payments belong to the same subscription and checkout session,
    // and select the initial cycle payment for this order.
    const subId = found.payments[0]?.subscription;
    const isRecurring = typeof subId === 'string' && subId.length > 0
      && found.payments.every(p => p.subscription === subId && p.checkoutSession === order.checkoutId && !p.deleted);
    if (!isRecurring) return complete('REVIEW_REQUIRED');
    const sorted = [...found.payments].sort((a, b) =>
      (a.dueDate || '').localeCompare(b.dueDate || '') || (a.dateCreated || '').localeCompare(b.dateCreated || '')
    );
    candidatePayments = [sorted[0]];
  } else if (found.payments.length > order.maxInstallments) {
    return complete('REVIEW_REQUIRED');
  }

  let payments;
  try {
    payments = [];
    for (const listed of candidatePayments) {
      const current = await client.getPayment(listed.id);
      if (!current || current.id !== listed.id) return complete('REVIEW_REQUIRED');
      payments.push(current);
    }
  } catch { return complete('RETRY'); }
  const assessed = assessSandboxCheckoutPayments({ checkoutId: order.checkoutId, priceCents: order.priceCents,
    maxInstallments: order.maxInstallments, months: order.months ?? 12, payments, hasMore: false });
  if (assessed.status !== 'confirmed') {
    // Pending payments may settle later; reversals and inconsistent values need review.
    const pending = payments.every(p => p.checkoutSession === order.checkoutId
      && (order.months === 12 ? p.billingType === 'CREDIT_CARD' : ['CREDIT_CARD', 'PIX'].includes(p.billingType))
      && p.deleted !== true && (p.currency === undefined || p.currency === 'BRL')
      && ['CONFIRMED','RECEIVED','PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS'].includes(p.status)
      && typeof p.value === 'number' && p.value>0 && Number.isSafeInteger(Math.round(p.value*100))
      && Math.abs(p.value*100-Math.round(p.value*100))<0.000001)
      && new Set(payments.map(p=>p.id)).size===payments.length
      && payments.reduce((sum,p)=>sum+Math.round(p.value*100),0)<=order.priceCents;
    return complete(pending ? 'RETRY' : 'REVIEW_REQUIRED');
  }
  const subscriptionId = payments[0]?.subscription ?? null;
  return complete('CONFIRMED', payments.map(p => ({ id: p.id, checkoutId: p.checkoutSession,
    status: p.status, billingType: p.billingType, valueCents: Math.round(p.value * 100),
    installment: p.installment ?? null, installmentNumber: p.installmentNumber ?? null })), subscriptionId);
}
