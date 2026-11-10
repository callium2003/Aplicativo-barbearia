import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsaasClient } from '../utils/asaas-client.mjs';

test('cancels card and Pix recurrence through their distinct authenticated Sandbox resources', async () => {
  const calls = [];
  const client = createAsaasClient({ environment: 'sandbox', apiKey: 'synthetic', fetchImpl: async (url, options) => {
    calls.push({ url, method: options.method, token: options.headers.access_token });
    return Response.json({ id: url.endsWith('/sub_test') ? 'sub_test' : 'aut_test', deleted: true, status: 'CANCELLED' });
  }});
  assert.equal((await client.cancelSubscription('sub_test')).deleted, true);
  assert.equal((await client.cancelPixAutomaticAuthorization('aut_test')).status, 'CANCELLED');
  assert.deepEqual(calls, [
    { url: 'https://api-sandbox.asaas.com/v3/subscriptions/sub_test', method: 'DELETE', token: 'synthetic' },
    { url: 'https://api-sandbox.asaas.com/v3/pix/automatic/authorizations/aut_test', method: 'DELETE', token: 'synthetic' },
  ]);
});

test('uncertain cancellation is reported without automatic retry', async () => {
  let attempts = 0;
  const client = createAsaasClient({ environment: 'sandbox', apiKey: 'synthetic', fetchImpl: async () => { attempts++; throw new Error('network'); } });
  await assert.rejects(client.cancelSubscription('sub_test'), error => error.outcomeUnknown === true);
  assert.equal(attempts, 1);
});
