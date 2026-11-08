import { findSandboxCheckoutPayments } from './asaas-checkout-payment-lookup.mjs';
import { assessSandboxCheckoutPayments } from './asaas-checkout-reconciliation.mjs';

/** Server worker only. Browser callbacks and webhook status never become financial evidence. */
export async function reconcileSandboxOrder(order, { client, account, finish }) {
  if (!order || order.account !== account || typeof account !== 'string' || !account
    || typeof finish !== 'function') throw new Error('Invalid reconciliation account');
  const complete = (outcome, payments = []) => finish({ orderId: order.id, lease: order.lease, account, outcome, payments });
  const found = await findSandboxCheckoutPayments({ client, checkoutId: order.checkoutId });
  if (found.status !== 'complete') return complete('RETRY');
  if (!found.payments.length) return complete('RETRY');
  if (found.payments.length > order.maxInstallments) return complete('REVIEW_REQUIRED');
  let payments;
  try {
    payments = [];
    for (const listed of found.payments) {
      const current = await client.getPayment(listed.id);
      if (!current || current.id !== listed.id) return complete('REVIEW_REQUIRED');
      payments.push(current);
    }
  } catch { return complete('RETRY'); }
  const assessed = assessSandboxCheckoutPayments({ checkoutId: order.checkoutId, priceCents: order.priceCents,
    maxInstallments: order.maxInstallments, payments, hasMore: false });
  if (assessed.status !== 'confirmed') {
    // Pending payments may settle later; reversals and inconsistent values need review.
    const pending = payments.every(p => p.checkoutSession === order.checkoutId && p.billingType === 'CREDIT_CARD'
      && p.deleted !== true && (p.currency === undefined || p.currency === 'BRL')
      && ['CONFIRMED','RECEIVED','PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS'].includes(p.status)
      && typeof p.value === 'number' && p.value>0 && Number.isSafeInteger(Math.round(p.value*100))
      && Math.abs(p.value*100-Math.round(p.value*100))<0.000001)
      && new Set(payments.map(p=>p.id)).size===payments.length
      && payments.reduce((sum,p)=>sum+Math.round(p.value*100),0)<=order.priceCents;
    return complete(pending ? 'RETRY' : 'REVIEW_REQUIRED');
  }
  return complete('CONFIRMED', payments.map(p => ({ id: p.id, checkoutId: p.checkoutSession,
    status: p.status, billingType: p.billingType, valueCents: Math.round(p.value * 100),
    installment: p.installment ?? null, installmentNumber: p.installmentNumber ?? null })));
}
