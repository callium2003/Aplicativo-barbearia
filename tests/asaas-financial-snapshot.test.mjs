import test from 'node:test';
import assert from 'node:assert/strict';

async function normalize(payment) {
  const { normalizeFinancialPayment } = await import('../utils/asaas-financial-adjustments.mjs');
  return normalizeFinancialPayment(payment);
}
const payment = { id: 'pay_test', value: 109.95, status: 'CONFIRMED', currency: 'BRL',
  externalReference: 'a1000000-0000-4000-8000-000000000001', checkoutSession: 'checkout_test' };

test('financial snapshot sums all completed refunds once and keeps pending/cancelled separate', async () => {
  const raw = { ...payment, customer: 'private-customer', creditCard: { number: 'private-card' }, refunds: [
    { status: 'DONE', value: 20, description: 'private reason' },
    { status: 'DONE', value: 10.05 }, { status: 'PENDING', value: 5 }, { status: 'CANCELLED', value: 50 },
  ] };
  const first = await normalize(raw);
  assert.equal(first.amountCents, 10995);
  assert.equal(first.refundedCents, 3005);
  assert.equal(first.pendingRefundCents, 500);
  assert.equal(first.refunds.length, 4);
  assert.deepEqual(await normalize(raw), first);
  assert.doesNotMatch(JSON.stringify(first), /private|creditCard|customer|description/);
});

test('preserves provider chargeback enums including future statuses and flags review', async () => {
  const snapshot = await normalize({ ...payment, chargeback: { status: 'IN_DISPUTE', reason: 'COMMERCIAL_DISAGREEMENT' } });
  assert.equal(snapshot.chargebackStatus, 'IN_DISPUTE');
  assert.equal(snapshot.chargebackReason, 'COMMERCIAL_DISAGREEMENT');
  assert.equal(snapshot.reviewRequired, false);
  const future = await normalize({ ...payment, chargeback: { status: 'FUTURE_STATE', reason: 'FUTURE_REASON' } });
  assert.equal(future.chargebackStatus, 'FUTURE_STATE');
  assert.equal(future.reviewRequired, true);
});

test('rejects foreign currency, invalid cents and refunds exceeding the exact installment amount', async () => {
  for (const raw of [{ ...payment, currency: 'USD' }, { ...payment, value: 1.001 },
    { ...payment, refunds: [{ status: 'DONE', value: 110 }] },
    { ...payment, refunds: [{ status: 'DONE', value: 100 }, { status: 'PENDING', value: 10 }] },
    { ...payment, refunds: [{ status: 'DONE', value: -1 }] }]) {
    await assert.rejects(() => normalize(raw));
  }
});

test('future refund status is retained for review and never counted as refunded', async () => {
  const snapshot = await normalize({ ...payment, refunds: [{ status: 'FUTURE_STATE', value: 10 }] });
  assert.equal(snapshot.refundedCents, 0);
  assert.equal(snapshot.reviewRequired, true);
  assert.equal(snapshot.refunds[0].status, 'FUTURE_STATE');
});

test('unknown payment references do not become arbitrary order identifiers', async () => {
  const snapshot = await normalize({ ...payment, externalReference: 'customer supplied text' });
  assert.equal(snapshot.externalReference, null);
});

test('provider failure keeps the inbox durable and a retry completes the same event', async () => {
  const { reconcileAsaasFinancialEvent } = await import('../utils/asaas-financial-adjustments.mjs');
  let durable = false;
  let completed = false;
  const fields = { p_payment_id: payment.id, p_event_id: 'evt_retry' };
  const admin = { rpc: async name => {
    if (name === 'persist_asaas_financial_event') { durable = true; return { data: { state: 'PENDING', version: 1 } }; }
    completed = true; return { data: true };
  } };
  await assert.rejects(() => reconcileAsaasFinancialEvent(fields, { environment: 'sandbox', account: 'fixture', admin,
    client: { getPayment: async () => { assert.equal(durable, true); throw new Error('network unavailable'); } } }));
  assert.equal(completed, false);
  await reconcileAsaasFinancialEvent(fields, { environment: 'sandbox', account: 'fixture', admin,
    client: { getPayment: async () => ({ ...payment, refunds: [{ status: 'DONE', value: 10 }] }) } });
  assert.equal(completed, true);
});
