import assert from 'node:assert/strict';
import test from 'node:test';
import {
  productionBillingEnabled,
  resolveAsaasBillingConfig,
  sandboxBillingEnabled,
} from '../utils/billing-sandbox-server.ts';
import { safeSandboxCheckoutUrl, safeSandboxInvoiceUrl } from '../utils/asaas-sandbox-url.ts';
import { createOrReuseSandboxCheckout } from '../utils/subscription-checkout-create.ts';
import { createOrReuseSandboxPixSubscription } from '../utils/subscription-pix-subscription-create.ts';
import { findSandboxCheckoutPayments } from '../utils/asaas-checkout-payment-lookup.mjs';

const ENV_KEYS = [
  'NODE_ENV',
  'BILLING_SANDBOX_ENABLED',
  'BILLING_SANDBOX_CALLBACK_ORIGIN',
  'BILLING_SANDBOX_TERMS_VERSION',
  'BILLING_TERMS_VERSION',
  'ASAAS_ENVIRONMENT',
  'ASAAS_API_KEY',
  'ASAAS_ACCOUNT_ID',
  'ASAAS_WEBHOOK_TOKEN',
  'ASAAS_CALLBACK_ORIGIN',
  'ASAAS_SANDBOX_API_KEY',
  'ASAAS_SANDBOX_ACCOUNT_ID',
  'ASAAS_SANDBOX_WEBHOOK_TOKEN',
];

function withEnv(overrides, fn) {
  const prev = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const k of ENV_KEYS) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    });
}

test('resolveAsaasBillingConfig uses production when ASAAS_ENVIRONMENT=production and keys are set', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      BILLING_SANDBOX_ENABLED: undefined,
      ASAAS_ENVIRONMENT: 'production',
      ASAAS_API_KEY: 'prod_key_dummy',
      ASAAS_ACCOUNT_ID: 'acc_prod_123',
      ASAAS_WEBHOOK_TOKEN: 'wh_prod_123',
      ASAAS_CALLBACK_ORIGIN: 'https://barbeariasp.cullentech.com.br',
      BILLING_TERMS_VERSION: '2026-11',
      ASAAS_SANDBOX_API_KEY: 'sbx_key_dummy',
      ASAAS_SANDBOX_ACCOUNT_ID: 'acc_sbx_123',
    },
    () => {
      assert.equal(productionBillingEnabled(), true);
      assert.equal(sandboxBillingEnabled(), true);
      assert.deepEqual(resolveAsaasBillingConfig(), {
        environment: 'production',
        apiKey: 'prod_key_dummy',
        account: 'acc_prod_123',
        webhookToken: 'wh_prod_123',
        callbackOrigin: 'https://barbeariasp.cullentech.com.br',
        termsVersion: '2026-11',
      });
    },
  );
});

test('resolveAsaasBillingConfig keeps production disabled when BILLING_SANDBOX_ENABLED=true in NODE_ENV=production', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      BILLING_SANDBOX_ENABLED: 'true',
      ASAAS_ENVIRONMENT: 'production',
      ASAAS_API_KEY: 'prod_key_dummy',
      ASAAS_ACCOUNT_ID: 'acc_prod_123',
      ASAAS_SANDBOX_API_KEY: 'sbx_key_dummy',
      ASAAS_SANDBOX_ACCOUNT_ID: 'acc_sbx_123',
      ASAAS_SANDBOX_WEBHOOK_TOKEN: 'wh_sbx_123',
      BILLING_SANDBOX_CALLBACK_ORIGIN: 'http://localhost:3000',
      BILLING_SANDBOX_TERMS_VERSION: '2026-10',
    },
    () => {
      assert.equal(productionBillingEnabled(), false);
      assert.equal(sandboxBillingEnabled(), false);
      assert.equal(resolveAsaasBillingConfig().environment, 'sandbox');
      assert.equal(resolveAsaasBillingConfig().apiKey, 'sbx_key_dummy');
    },
  );
});

test('safeSandboxCheckoutUrl and safeSandboxInvoiceUrl accept www.asaas.com production URLs and reject unknown hosts', () => {
  assert.equal(
    safeSandboxCheckoutUrl('https://www.asaas.com/checkoutSession/show?id=chk_prod_1', 'chk_prod_1'),
    'https://www.asaas.com/checkoutSession/show?id=chk_prod_1',
  );
  assert.equal(
    safeSandboxCheckoutUrl('https://www.asaas.com/000/checkoutSession/show/chk_prod_1', 'chk_prod_1'),
    'https://www.asaas.com/000/checkoutSession/show/chk_prod_1',
  );
  assert.equal(
    safeSandboxInvoiceUrl('https://www.asaas.com/i/pay_prod_1'),
    'https://www.asaas.com/i/pay_prod_1',
  );
  assert.throws(() => safeSandboxInvoiceUrl('https://evil.example/i/pay_prod_1'));
});

test('createOrReuseSandboxCheckout normalizes production URL for return and keeps sandbox prefix for DB persistence', async () => {
  const orderId = '11111111-1111-4111-8111-111111111111';
  const finishCalls = [];
  let seenCallbackSuccessUrl = '';
  const fakeUserClient = {
    auth: { getUser: async () => ({ data: { user: { id: 'usr_1', email: 'owner@test.com' } } }) },
  };
  const fakeAdminClient = {
    rpc: async (fn, params) => {
      if (fn === 'bind_subscription_sandbox_account') return { error: null };
      if (fn === 'claim_subscription_checkout') {
        return {
          error: null,
          data: {
            state: 'CLAIMED',
            offer: { planCode: 'simple-mensal', planName: 'Plano Simple', months: 1, priceCents: 4990, maxInstallments: 1, userLimit: 3 },
          },
        };
      }
      if (fn === 'claim_subscription_recurring_operation') {
        return { error: null, data: { state: 'CLAIMED' } };
      }
      if (fn === 'finish_subscription_checkout') {
        finishCalls.push(params);
        return { error: null };
      }
      throw new Error(`Unexpected admin RPC: ${fn}`);
    },
  };

  const created = await createOrReuseSandboxCheckout(orderId, {
    userClient: fakeUserClient,
    adminClient: fakeAdminClient,
    callbackOrigin: 'https://barbeariasp.cullentech.com.br',
    account: 'acc_prod_123',
    environment: 'production',
    asaasClient: {
      createCheckout: async (payload) => {
        seenCallbackSuccessUrl = payload.callback.successUrl;
        return { id: 'chk_prod_99', link: 'https://asaas.com/checkoutSession/show?id=chk_prod_99' };
      },
    },
  });

  assert.equal(seenCallbackSuccessUrl.startsWith('https://barbeariasp.cullentech.com.br/'), true);
  assert.equal(created.checkoutUrl, 'https://www.asaas.com/checkoutSession/show?id=chk_prod_99');
  assert.equal(finishCalls[0].p_checkout_url, 'https://sandbox.asaas.com/checkoutSession/show?id=chk_prod_99');

  const reused = await createOrReuseSandboxCheckout(orderId, {
    userClient: fakeUserClient,
    adminClient: {
      rpc: async (fn) => {
        if (fn === 'bind_subscription_sandbox_account') return { error: null };
        if (fn === 'claim_subscription_checkout') {
          return {
            error: null,
            data: {
              state: 'READY',
              checkoutId: 'chk_prod_99',
              checkoutUrl: 'https://sandbox.asaas.com/checkoutSession/show?id=chk_prod_99',
            },
          };
        }
        throw new Error(`Unexpected admin RPC: ${fn}`);
      },
    },
    callbackOrigin: 'https://barbeariasp.cullentech.com.br',
    account: 'acc_prod_123',
    environment: 'production',
    asaasClient: { createCheckout: async () => { throw new Error('Should not call createCheckout'); } },
  });
  assert.equal(reused.checkoutUrl, 'https://www.asaas.com/checkoutSession/show?id=chk_prod_99');
});

test('createOrReuseSandboxPixSubscription normalizes bare https://asaas.com invoiceUrl in production', async () => {
  const orderId = '22222222-2222-4222-8222-222222222222';
  const result = await createOrReuseSandboxPixSubscription(orderId, {
    account: 'acc_prod_123',
    environment: 'production',
    userClient: {
      auth: { getUser: async () => ({ data: { user: { id: 'usr_1', email: 'owner@test.com' } } }) },
    },
    adminClient: {
      rpc: async (fn) => {
        if (fn === 'claim_subscription_recurring_operation') {
          return {
            error: null,
            data: {
              state: 'CLAIMED',
              barbershopId: 'shop_1',
              planCode: 'simple-mensal',
              planName: 'Plano Simple',
              priceCents: 4990,
            },
          };
        }
        return { error: null };
      },
      from: (table) => {
        if (table === 'subscription_orders') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { months: 1, plan_code: 'simple-mensal', plan_name: 'Plano Simple', price_cents: 4990 } }) }) }),
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        if (table === 'barbershop_registration_details') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { tax_document: '14379410870', responsible_phone: '11999999999', responsible_name: 'Owner Test' } }) }) }),
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: 'Barbearia Prod' } }) }) }),
        };
      },
    },
    asaasClient: {
      createCustomer: async () => ({ id: 'cus_prod_1' }),
      createSubscription: async () => ({ id: 'sub_prod_1' }),
      listPayments: async () => ({ data: [{ id: 'pay_prod_1', invoiceUrl: 'https://asaas.com/i/pay_prod_1' }] }),
    },
  });

  assert.deepEqual(result, {
    status: 'ready',
    subscriptionId: 'sub_prod_1',
    invoiceUrl: 'https://www.asaas.com/i/pay_prod_1',
  });
});

test('findSandboxCheckoutPayments falls back to listCheckoutPayments when listPaymentsPage rejects in production', async () => {
  const result = await findSandboxCheckoutPayments({
    checkoutId: 'chk_prod_1',
    client: {
      listPaymentsPage: async () => {
        throw new Error('Invalid Asaas input');
      },
      listCheckoutPayments: async ({ checkoutId }) => ({
        hasMore: false,
        data: [{ id: 'pay_1', checkoutSession: checkoutId, status: 'CONFIRMED', value: 39.9 }],
      }),
    },
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.payments.length, 1);
  assert.equal(result.payments[0].id, 'pay_1');
});
