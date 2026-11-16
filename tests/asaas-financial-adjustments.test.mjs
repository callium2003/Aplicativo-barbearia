import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAsaasSandboxWebhook } from '../utils/asaas-webhook-handler.mjs';

const token = 'financial-webhook-fixture-token-32-characters';
const account = 'account_fixture';
function request(event, payment = {}) {
  return new Request('https://example.test/api/webhooks/asaas', { method: 'POST', headers: {
    'content-type': 'application/json', 'asaas-access-token': token,
  }, body: JSON.stringify({ id: 'evt_financial', account: { id: account }, event,
    payment: { id: 'pay_fixture', status: 'REFUNDED', ...payment } }) });
}

test('refunds are persisted separately and never run subscription cancellation or access grants', async () => {
  let recorded;
  const response = await handleAsaasSandboxWebhook(request('PAYMENT_REFUNDED'), {
    enabled: true, token, account,
    persist: async () => assert.fail('checkout must remain unchanged'),
    persistRecurring: async () => assert.fail('refund must not change the contract'),
    persistFinancial: async fields => { recorded = fields; return true; },
  });
  assert.equal(response.status, 200);
  assert.equal(recorded.p_payment_id, 'pay_fixture');
  assert.equal(recorded.p_event_type, 'PAYMENT_REFUNDED');
  assert.equal(recorded.p_recovery_only, false);
});

test('a recovered tracked payment bypasses recurring grants before any contract processing', async () => {
  let recorded;
  const response = await handleAsaasSandboxWebhook(request('PAYMENT_CONFIRMED', { status: 'CONFIRMED' }), {
    enabled: true, token, account,
    persistRecurring: async () => assert.fail('recovery must not run subscription grants'),
    persistFinancial: async fields => { recorded = fields; return true; },
  });
  assert.equal(response.status, 200);
  assert.equal(recorded.p_recovery_only, true);
});

test('an ordinary untracked monthly payment keeps the existing recurring flow', async () => {
  let granted = 0;
  const response = await handleAsaasSandboxWebhook(request('PAYMENT_RECEIVED', { status: 'RECEIVED' }), {
    enabled: true, token, account,
    persistRecurring: async () => { granted++; return true; },
    persistFinancial: async () => false,
  });
  assert.equal(response.status, 200);
  assert.equal(granted, 1);
});

test('a durable financial persistence failure is not acknowledged as success', async () => {
  const response = await handleAsaasSandboxWebhook(request('PAYMENT_CHARGEBACK_DISPUTE'), {
    enabled: true, token, account, persistRecurring: async () => assert.fail('legacy path'),
    persistFinancial: async () => { throw new Error('provider timeout after inbox commit'); },
  });
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /timeout|inbox|provider/);
});

test('financial events cannot fall back to legacy handling when the financial adapter is absent', async () => {
  const response = await handleAsaasSandboxWebhook(request('PAYMENT_PARTIALLY_REFUNDED'), {
    enabled: true, token, account, persistRecurring: async () => assert.fail('legacy path'),
  });
  assert.equal(response.status, 503);
});
