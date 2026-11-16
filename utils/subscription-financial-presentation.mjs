/** @param {{orderStatus: string, amountCents: number, payments?: Array<{chargeback_status?: string|null, pending_refund_cents?: number, refunded_cents?: number}>}} input */
export function financialBillStatus({ orderStatus, amountCents, payments = [] }) {
  if (payments.some(p => ['REQUESTED', 'IN_DISPUTE', 'DISPUTE_LOST', 'DONE'].includes(p.chargeback_status))) return 'disputed';
  if (payments.some(p => Number(p.pending_refund_cents) > 0)) return 'refund_pending';
  const returned = payments.reduce((sum, p) => sum + Number(p.refunded_cents || 0), 0);
  if (returned > 0) return returned >= amountCents ? 'refunded' : 'partially_refunded';
  if (orderStatus === 'CONFIRMED') return 'paid';
  if (orderStatus === 'CANCELED') return 'cancelled';
  if (orderStatus === 'REVIEW_REQUIRED') return 'review';
  return 'pending';
}
