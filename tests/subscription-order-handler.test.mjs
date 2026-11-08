import test from "node:test";
import assert from "node:assert/strict";
import { handleSubscriptionOrder } from "../utils/subscription-order-handler.mjs";

const payload = { planCode: "simple-anual", idempotencyKey: "a4000000-0000-4000-8000-000000000001", acceptedTerms: true };
function request(body = payload, auth = "Bearer token-test") {
  return new Request("https://example.test/api/subscription-orders", { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify(body) });
}
test("disabled sandbox does not process requests", async () => {
  let called = false;
  const result = await handleSubscriptionOrder(request(), { enabled: false, create: () => { called = true; } });
  assert.equal(result.status, 404);
  assert.equal(called, false);
});
test("requires bearer authentication and limits request body", async () => {
  const deps = { enabled: true, create: async () => ({ status: "created", orderId: "test" }) };
  assert.equal((await handleSubscriptionOrder(request(payload, ""), deps)).status, 401);
  assert.equal((await handleSubscriptionOrder(request({ text: "x".repeat(10000) }), deps)).status, 413);
});
test("passes only a token and order inputs and returns a sanitized response", async () => {
  let received;
  const result = await handleSubscriptionOrder(request({ ...payload, priceCents: 1, barbershopId: "other" }), { enabled: true,
    create: async (token, input) => { received = { token, input }; return { status: "created", orderId: "order" }; } });
  assert.equal(result.status, 201);
  assert.deepEqual(received, { token: "token-test", input: payload });
  assert.deepEqual(await result.json(), { orderId: "order" });
  assert.equal(result.headers.get("cache-control"), "no-store");
});
test("does not expose provider or database failures", async () => {
  const result = await handleSubscriptionOrder(request(), { enabled: true, create: async () => { throw new Error("sensitive detail"); } });
  assert.equal(result.status, 500);
  assert.equal((await result.text()).includes("sensitive detail"), false);
});
