import test from 'node:test';
import assert from 'node:assert/strict';
import { findSandboxCheckoutPayments, assessSandboxCheckoutFromProvider } from '../utils/asaas-checkout-payment-lookup.mjs';

const checkoutId = 'checkout-1';
const one = { id: 'pay-1', checkoutSession: checkoutId, status: 'CONFIRMED' };
const two = { id: 'pay-2', checkoutSession: checkoutId, status: 'CONFIRMED' };

test('recovers checkout payments when provider filter incorrectly returns an empty list', async () => {
  const calls = [];
  const client = { listPaymentsPage: async ({ offset, limit }) => { calls.push({ offset, limit }); return offset === 0 ? { data: [one, { id: 'other', checkoutSession: 'other' }], hasMore: true } : { data: [two], hasMore: false }; } };
  assert.deepEqual(await findSandboxCheckoutPayments({ client, checkoutId, pageSize: 2, maxPages: 2 }), { status: 'complete', payments: [one, two] });
  assert.deepEqual(calls, [{ offset: 0, limit: 2 }, { offset: 2, limit: 2 }]);
});

test('never labels a truncated, malformed, repeated or failing scan complete', async () => {
  const options = { checkoutId, pageSize: 1, maxPages: 2 };
  for (const listPaymentsPage of [
    async () => ({ data: [one], hasMore: true }),
    async () => ({ data: [], hasMore: true }),
    async () => ({ data: null, hasMore: false }),
    async () => { throw new Error('failure'); },
  ]) {
    const result = await findSandboxCheckoutPayments({ ...options, client: { listPaymentsPage } });
    assert.equal(result.status, 'review_required');
    assert.equal('payments' in result, false);
  }
});

test('rejects invalid scope or limits before network access', async () => {
  let calls = 0;
  const client = { listPaymentsPage: async () => { calls++; return { data: [], hasMore: false }; } };
  for (const input of [{ checkoutId: '../other' }, { checkoutId, pageSize: 101 }, { checkoutId, maxPages: 0 }]) {
    assert.equal((await findSandboxCheckoutPayments({ client, ...input })).status, 'review_required');
  }
  assert.equal(calls, 0);
});

test('assesses only payments found in a complete scan and leaves partial scans for review', async () => {
  const paid = [{ id: 'pay-1', checkoutSession: checkoutId, status: 'CONFIRMED', billingType: 'CREDIT_CARD', value: 499 }];
  const client = { listPaymentsPage: async () => ({ data: paid, hasMore: false }) };
  assert.deepEqual(await assessSandboxCheckoutFromProvider({ client, checkoutId, priceCents: 49900, maxInstallments: 3 }), { status: 'confirmed', paymentCount: 1 });
  const incomplete = { listPaymentsPage: async () => ({ data: paid, hasMore: true }) };
  assert.deepEqual(await assessSandboxCheckoutFromProvider({ client: incomplete, checkoutId, priceCents: 49900, maxInstallments: 3, pageSize: 1, maxPages: 1 }), { status: 'review_required' });
});
