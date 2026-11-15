import test from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionPlans, getPlan } from '../utils/subscription-plans.ts';
import { createSubscriptionOfferSnapshot } from '../utils/subscription-order-snapshot.ts';
import { buildRecurringPixSubscription } from '../utils/asaas-recurring.mjs';
import { assessSandboxCheckoutPayments } from '../utils/asaas-checkout-reconciliation.mjs';
import { monthlyDueDate } from '../utils/subscription-due-date.ts';

test('approved monthly and quarterly catalog has exact prices and team limits', () => {
  assert.deepEqual(subscriptionPlans.map(({ code, months, priceCents, userLimit }) => [code, months, priceCents, userLimit]), [
    ['simple-mensal', 1, 7990, 3], ['middle-mensal', 1, 9990, 5], ['master-mensal', 1, 12990, 7],
    ['simple-trimestral', 3, 21990, 3], ['middle-trimestral', 3, 27990, 5], ['master-trimestral', 3, 35990, 7],
  ]);
  for (const code of ['simple-anual', 'middle-anual', 'master-anual', 'anual', 'trimestral']) {
    assert.throws(() => createSubscriptionOfferSnapshot(code), /Plano inválido/);
  }
});

test('quarterly PIX payload uses full cycle price and rejects mismatched cycles', () => {
  const input = { customerId: 'cus_test', planCode: 'simple-trimestral', months: 3, priceCents: 21990,
    externalReference: 'order_test', nextDueDate: '2026-11-30' };
  const payload = buildRecurringPixSubscription(input);
  assert.equal(payload.cycle, 'QUARTERLY');
  assert.equal(payload.value, 219.9);
  assert.throws(() => buildRecurringPixSubscription({ ...input, months: 1 }));
  assert.throws(() => buildRecurringPixSubscription({ ...input, planCode: 'simple-anual', months: 12 }));
});

test('quarterly reconciliation requires exact paid amount and an accepted payment method', () => {
  const input = { checkoutId: 'checkout_test', months: 3, priceCents: 21990, maxInstallments: 1, hasMore: false };
  const payment = { id: 'pay_test', checkoutSession: 'checkout_test', status: 'CONFIRMED', billingType: 'CREDIT_CARD', value: 219.9 };
  assert.equal(assessSandboxCheckoutPayments({ ...input, payments: [payment] }).status, 'confirmed');
  for (const change of [{ value: 79.9 }, { status: 'PENDING' }, { billingType: 'BOLETO' }]) {
    assert.notEqual(assessSandboxCheckoutPayments({ ...input, payments: [{ ...payment, ...change }] }).status, 'confirmed');
  }
});

test('three calendar months preserve month-end and cross the year correctly', () => {
  assert.equal(monthlyDueDate('2026-11-30', 3), '2027-02-28');
  assert.equal(monthlyDueDate('2027-11-30', 3), '2028-02-29');
  assert.equal(monthlyDueDate('2026-08-31', 3), '2026-11-30');
});


test('historical annual labels remain readable without making them purchasable', () => {
  for (const code of ['simple-anual', 'middle-anual', 'master-anual']) {
    assert.equal(getPlan(code)?.months, 12);
    assert.throws(() => createSubscriptionOfferSnapshot(code), /Plano inválido/);
  }
});
