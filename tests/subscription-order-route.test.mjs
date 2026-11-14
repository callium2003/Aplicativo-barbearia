import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/subscription-orders/route.ts";
import { POST as createCheckout } from "../app/api/subscription-checkout/route.ts";
import { POST as asaasWebhook } from "../app/api/webhooks/asaas/route.ts";

test("financial test entry point remains disabled in production even if the flag is set", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "production";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    const response = await POST(new Request("https://example.test/api/subscription-orders", { method: "POST" }));
    assert.equal(response.status, 404);
    assert.equal((await createCheckout(new Request("https://example.test/api/subscription-checkout", { method: "POST" }))).status, 404);
    assert.equal((await asaasWebhook(new Request("https://example.test/api/webhooks/asaas", { method: "POST" }))).status, 404);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});

test("asaas webhook transmits production environment to persist_asaas_checkout_event", async () => {
  const keys = [
    "NODE_ENV",
    "BILLING_SANDBOX_ENABLED",
    "ASAAS_ENVIRONMENT",
    "ASAAS_API_KEY",
    "ASAAS_ACCOUNT_ID",
    "ASAAS_WEBHOOK_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const originalFetch = globalThis.fetch;
  const capturedCalls = [];
  const token = "whsec_prod_token_1234567890abcdef1234567890";

  try {
    process.env.NODE_ENV = "production";
    delete process.env.BILLING_SANDBOX_ENABLED;
    process.env.ASAAS_ENVIRONMENT = "production";
    process.env.ASAAS_API_KEY = "$aact_prod_dummy_key";
    process.env.ASAAS_ACCOUNT_ID = "acc_prod_123";
    process.env.ASAAS_WEBHOOK_TOKEN = token;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_dummy_service_role_key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://irszgnkzqseljowckrgz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dummy_key";

    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      capturedCalls.push({ url, body });
      return new Response(JSON.stringify(true), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const req = new Request("https://example.test/api/webhooks/asaas", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": token,
      },
      body: JSON.stringify({
        id: "evt_prod_checkout_1",
        event: "CHECKOUT_PAID",
        account: { id: "acc_prod_123" },
        checkout: { id: "chk_prod_1", status: "PAID" },
      }),
    });

    const response = await asaasWebhook(req);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].url, /\/rest\/v1\/rpc\/persist_asaas_checkout_event$/);
    assert.equal(capturedCalls[0].body.p_environment, "production");
    assert.equal(capturedCalls[0].body.p_account, "acc_prod_123");
    assert.equal(capturedCalls[0].body.p_event_id, "evt_prod_checkout_1");
    assert.equal(capturedCalls[0].body.p_checkout_id, "chk_prod_1");
  } finally {
    globalThis.fetch = originalFetch;
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
