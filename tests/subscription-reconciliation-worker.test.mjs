import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSandboxOrder } from '../utils/subscription-reconciliation-worker.mjs';

const order = { id: 'order-1', checkoutId: 'checkout-1', account: 'account-1', priceCents: 49900, maxInstallments: 3, lease: 'lease-1' };
const payment = { id: 'pay-1', checkoutSession: 'checkout-1', billingType: 'CREDIT_CARD', status: 'CONFIRMED', value: 499 };
function setup(payments = [payment]) {
  const saved = [];
  return { saved, client: { listPaymentsPage: async () => ({ data: payments, hasMore: false }), getPayment: async id => payments.find(p => p.id === id) },
    account: 'account-1', finish: async result => { saved.push(result); return result.outcome; } };
}
test('reconciles provider payment and sends only minimized financial evidence to the transaction', async () => {
  const deps = setup([{ ...payment, customer: 'private', creditCard: { number: 'never persist' } }]);
  assert.equal(await reconcileSandboxOrder(order, deps), 'CONFIRMED');
  assert.deepEqual(deps.saved[0], { orderId: 'order-1', lease: 'lease-1', account: 'account-1', outcome: 'CONFIRMED', payments: [{ id: 'pay-1', checkoutId: 'checkout-1', status: 'CONFIRMED', billingType: 'CREDIT_CARD', valueCents: 49900, installment: null, installmentNumber: null }] });
});
test('unpaid, partial, foreign, refunded and malformed evidence cannot grant a period', async () => {
  for (const payments of [[], [{ ...payment, value: 1 }], [{ ...payment, status: 'REFUNDED' }], [{ ...payment, checkoutSession: 'other' }], [payment, payment]]) {
    const deps = setup(payments);
    assert.notEqual(await reconcileSandboxOrder(order, deps), 'CONFIRMED');
    assert.notEqual(deps.saved[0].outcome, 'CONFIRMED');
  }
});
test('account mismatch cannot query provider or finish another account order', async () => {
  const deps = setup();
  deps.account = 'other';
  await assert.rejects(reconcileSandboxOrder(order, deps));
  assert.equal(deps.saved.length, 0);
});
test('network failure schedules safe retry without financial evidence', async () => {
  const deps = setup();
  deps.client.listPaymentsPage = async () => { throw new Error('secret external response'); };
  assert.equal(await reconcileSandboxOrder(order, deps), 'RETRY');
  assert.deepEqual(deps.saved[0].payments, []);
});
test('rechecks matched payments to reject changes during paginated listing', async () => {
  const deps = setup();
  deps.client.getPayment = async () => ({ ...payment, status: 'CHARGEBACK_REQUESTED' });
  assert.equal(await reconcileSandboxOrder(order, deps), 'REVIEW_REQUIRED');
});
test('partial confirmed installments keep reconciling while awaiting remaining installments', async () => {
 const deps=setup([{...payment,value:249.5,installment:'inst-1',installmentNumber:1}]);
 assert.equal(await reconcileSandboxOrder(order,deps),'RETRY');
});
