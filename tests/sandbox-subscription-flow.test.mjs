import test from "node:test";
import assert from "node:assert/strict";
import { startSandboxSubscription } from "../utils/sandbox-subscription-flow.ts";

const order = "a3000000-0000-4000-8000-000000000001";
const key = "a4000000-0000-4000-8000-000000000001";
const link = "https://sandbox.asaas.com/000/checkoutSession/show/checkout-1";
test("creates an order then returns only a validated sandbox checkout URL", async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push({ url, options }); return Response.json(calls.length === 1 ? { orderId: order } : { checkoutId: "checkout-1", checkoutUrl: link }); };
  assert.equal(await startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, fetcher), link);
  assert.deepEqual(calls.map(call => call.url), ["/api/subscription-orders", "/api/subscription-checkout"]);
  assert.equal(calls[0].options.headers.authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(calls[0].options.body), { planCode: "simple-anual", idempotencyKey: key, acceptedTerms: true });
  assert.deepEqual(JSON.parse(calls[1].options.body), { orderId: order });
});
test("does not return non-sandbox or mismatched checkout links", async () => {
  let calls = 0;
  const fetcher = async () => Response.json(++calls === 1 ? { orderId: order } : { checkoutId: "checkout-1", checkoutUrl: "https://asaas.com/checkoutSession/show/checkout-1" });
  await assert.rejects(startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, fetcher));
});
test("stops after a failed request without creating another checkout", async () => {
  let calls = 0;
  await assert.rejects(startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, async () => { calls++; return Response.json({}, { status: 409 }); }));
  assert.equal(calls, 1);
});
