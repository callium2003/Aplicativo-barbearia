import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSubscriptionContractSnapshot } from '../utils/subscription-contract-snapshot.ts';

test('preserves annual historical terms and old monthly prices instead of current sales prices', () => {
  for (const [code, months, price, limit] of [['master-anual', 12, 119900, 7], ['simple-mensal', 1, 4990, 3]]) {
    assert.deepEqual(resolveSubscriptionContractSnapshot(code, { plan_code: code, months, price_cents: price, user_limit: limit }),
      { code, months, priceCents: price, userLimit: limit });
  }
});
test('an applied change supplies immediately preceding terms for subsequent changes', () => {
  const order = { plan_code: 'simple-mensal', months: 1, price_cents: 7990, user_limit: 3 };
  const applied = { plan_code: 'middle-trimestral', months: 3, price_cents: 27990, user_limit: 5 };
  assert.deepEqual(resolveSubscriptionContractSnapshot('middle-trimestral', order, applied),
    { code: 'middle-trimestral', months: 3, priceCents: 27990, userLimit: 5 });
  assert.equal(resolveSubscriptionContractSnapshot('unknown', order), null);
  assert.equal(resolveSubscriptionContractSnapshot('simple-mensal', { ...order, months: 2 }), null);
});


test('replacing a pending change keeps the immediately previous contract snapshot', () => {
  const order = { plan_code: 'simple-mensal', months: 1, price_cents: 4990, user_limit: 3 };
  const scheduled = { plan_code: 'master-trimestral', months: 3, price_cents: 35990, user_limit: 7,
    status: 'SCHEDULED', previous_plan_code: 'middle-trimestral', previous_months: 3,
    previous_price_cents: 27990, previous_user_limit: 5 };
  assert.deepEqual(resolveSubscriptionContractSnapshot('middle-trimestral', order, scheduled),
    { code: 'middle-trimestral', months: 3, priceCents: 27990, userLimit: 5 });
});
