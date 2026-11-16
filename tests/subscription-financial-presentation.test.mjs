import test from 'node:test';
import assert from 'node:assert/strict';

test('cancellation and review are never presented as proof of refund or overdue payment', async () => {
  const { financialBillStatus } = await import('../utils/subscription-financial-presentation.mjs');
  assert.equal(financialBillStatus({ orderStatus: 'CANCELED', amountCents: 21990, payments: [] }), 'cancelled');
  assert.equal(financialBillStatus({ orderStatus: 'REVIEW_REQUIRED', amountCents: 21990, payments: [] }), 'review');
});
test('one fully refunded installment is only a partial refund of the quarterly purchase', async () => {
  const { financialBillStatus } = await import('../utils/subscription-financial-presentation.mjs');
  const payments = [{ refunded_cents: 10995, pending_refund_cents: 0 }];
  assert.equal(financialBillStatus({ orderStatus: 'CONFIRMED', amountCents: 21990, payments }), 'partially_refunded');
  assert.equal(financialBillStatus({ orderStatus: 'CONFIRMED', amountCents: 21990, payments: [...payments, ...payments] }), 'refunded');
});
test('pending refunds and active disputes retain their own financial state', async () => {
  const { financialBillStatus } = await import('../utils/subscription-financial-presentation.mjs');
  assert.equal(financialBillStatus({ orderStatus: 'CONFIRMED', amountCents: 7990,
    payments: [{ refunded_cents: 0, pending_refund_cents: 100 }] }), 'refund_pending');
  assert.equal(financialBillStatus({ orderStatus: 'CONFIRMED', amountCents: 7990,
    payments: [{ chargeback_status: 'IN_DISPUTE' }] }), 'disputed');
  assert.equal(financialBillStatus({ orderStatus: 'CONFIRMED', amountCents: 7990,
    payments: [{ chargeback_status: 'REVERSED' }] }), 'paid');
});
