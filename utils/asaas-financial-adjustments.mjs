// Read-only provider reconciliation. Never issues refunds or changes paid access.
const reference = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier = /^[A-Za-z0-9_-]{1,128}$/;
const enumValue = /^[A-Z][A-Z0-9_]{0,99}$/;
export const FINANCIAL_EVENTS = Object.freeze([
  'PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_REFUND_DENIED',
  'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
]);
export function isFinancialAdjustment(event, payment) {
  return FINANCIAL_EVENTS.includes(event) || (event.startsWith('PAYMENT_') && (
    ['REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE',
      'AWAITING_CHARGEBACK_REVERSAL'].includes(payment?.status)
    || Boolean(payment?.chargeback) || (Array.isArray(payment?.refunds) && payment.refunds.length > 0)));
}
function cents(value) {
  const result = Math.round(value * 100);
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(result)
    || Math.abs(value * 100 - result) > 0.000001) throw new Error('Invalid financial amount');
  return result;
}
function providerCode(value) {
  if (typeof value !== 'string' || !enumValue.test(value)) throw new Error('Invalid provider state');
  return value;
}
const optionalId = value => typeof value === 'string' && identifier.test(value) ? value : null;

export function normalizeFinancialPayment(payment) {
  if (!payment || !optionalId(payment.id) || (payment.currency !== undefined && payment.currency !== 'BRL')) {
    throw new Error('Invalid financial payment');
  }
  const amountCents = cents(payment.value);
  const paymentStatus = providerCode(payment.status);
  if (payment.refunds !== undefined && (!Array.isArray(payment.refunds) || payment.refunds.length > 1000)) {
    throw new Error('Invalid refunds');
  }
  let refundedCents = 0;
  let pendingRefundCents = 0;
  let reviewRequired = false;
  const refunds = (payment.refunds ?? []).map(refund => {
    const status = providerCode(refund?.status);
    const valueCents = cents(refund?.value);
    if (status === 'DONE') refundedCents += valueCents;
    else if (status === 'PENDING') pendingRefundCents += valueCents;
    else if (status !== 'CANCELLED') reviewRequired = true;
    return { status, valueCents };
  });
  if (!Number.isSafeInteger(refundedCents + pendingRefundCents) || refundedCents + pendingRefundCents > amountCents) {
    throw new Error('Refund exceeds payment');
  }
  const chargebackStatus = payment.chargeback ? providerCode(payment.chargeback.status) : null;
  const chargebackReason = payment.chargeback?.reason ? providerCode(payment.chargeback.reason) : null;
  if (chargebackStatus && !['REQUESTED', 'IN_DISPUTE', 'DISPUTE_LOST', 'REVERSED', 'DONE'].includes(chargebackStatus)) {
    reviewRequired = true;
  }
  // Some providers omit the refunds array in notifications. This function consumes
  // the authenticated GET response; an absent amount never proves a full refund.
  if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(paymentStatus) && refundedCents === 0) reviewRequired = true;
  return { paymentId: payment.id, paymentStatus, amountCents, refundedCents, pendingRefundCents, refunds,
    chargebackStatus, chargebackReason, reviewRequired,
    externalReference: reference.test(payment.externalReference ?? '') ? payment.externalReference : null,
    subscriptionId: optionalId(payment.subscription), checkoutId: optionalId(payment.checkoutSession) };
}

export async function reconcileAsaasFinancialEvent(fields, { environment, account, admin, client }) {
  const saved = await admin.rpc('persist_asaas_financial_event', {
    ...fields, p_environment: environment, p_account: account,
  });
  if (saved.error || !saved.data || typeof saved.data !== 'object') throw new Error('Financial persistence failed');
  if (saved.data.state === 'IGNORED') return false;
  if (['PROCESSED', 'REVIEW_REQUIRED'].includes(saved.data.state)) return true;
  if (!saved.data.version) throw new Error('Invalid financial claim');
  // Failure here intentionally propagates: inbox is durable and Asaas retries.
  const payment = await client.getPayment(fields.p_payment_id);
  let snapshot;
  try {
    if (payment?.id !== fields.p_payment_id) throw new Error('Payment mismatch');
    snapshot = normalizeFinancialPayment(payment);
  } catch {
    const failed = await admin.rpc('finish_asaas_financial_event', {
      p_environment: environment, p_account: account, p_event_id: fields.p_event_id,
      p_version: saved.data.version, p_snapshot: null,
    });
    if (failed.error || failed.data !== true) throw new Error('Financial review persistence failed');
    return true;
  }
  const done = await admin.rpc('finish_asaas_financial_event', {
    p_environment: environment, p_account: account, p_event_id: fields.p_event_id,
    p_version: saved.data.version, p_snapshot: snapshot,
  });
  if (done.error || done.data !== true) throw new Error('Financial reconciliation failed');
  return true;
}
