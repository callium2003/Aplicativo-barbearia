import test from "node:test";
import assert from "node:assert/strict";
import { handleSandboxCheckout } from "../utils/subscription-checkout-handler.mjs";

function req(body = { orderId: "order-1" }, token = "Bearer token-test") {
  return new Request("https://example.test/api/subscription-checkout", { method: "POST", headers: { authorization: token, "content-type": "application/json" }, body: JSON.stringify(body) });
}
test("checkout is inaccessible unless explicitly enabled and authenticated", async () => {
  let calls = 0;
  const create = async () => { calls++; return { status: "ready", checkoutId: "checkout-1" }; };
  assert.equal((await handleSandboxCheckout(req(), { enabled: false, create })).status, 404);
  assert.equal((await handleSandboxCheckout(req({}, ""), { enabled: true, create })).status, 401);
  assert.equal(calls, 0);
});
test("checkout only passes the authenticated token and order id to the server", async () => {
  let args;
  const result = await handleSandboxCheckout(req({ orderId: "order-1", priceCents: 1 }), { enabled: true, create: async (...values) => { args = values; return { status: "ready", checkoutId: "checkout-1", checkoutUrl: "https://sandbox.asaas.com/000/checkoutSession/show/checkout-1" }; } });
  assert.equal(result.status, 200);
  assert.deepEqual(args, ["token-test", "order-1"]);
  assert.deepEqual(await result.json(), { checkoutId: "checkout-1", checkoutUrl: "https://sandbox.asaas.com/000/checkoutSession/show/checkout-1" });
  assert.equal(result.headers.get("cache-control"), "no-store");
});
test("pending and uncertain attempts never report payment success", async () => {
  for (const status of ["in_progress", "review_required"]) {
    const result = await handleSandboxCheckout(req(), { enabled: true, create: async () => ({ status }) });
    assert.equal(result.status, 409);
    assert.notEqual((await result.json()).status, "paid");
  }
});
test("rejects oversized payloads and hides backend errors", async () => {
  assert.equal((await handleSandboxCheckout(req({ orderId: "x".repeat(5000) }), { enabled: true, create: async () => ({}) })).status, 413);
  const result = await handleSandboxCheckout(req(), { enabled: true, create: async () => { throw new Error("private-data"); } });
  assert.equal(result.status, 500);
  assert.equal((await result.text()).includes("private-data"), false);
});
