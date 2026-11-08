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
