import test from "node:test";
import assert from "node:assert/strict";
import { createPendingSubscriptionOrder } from "../utils/subscription-order-create.ts";

const key = "a4000000-0000-4000-8000-000000000001";
const shop = "a2000000-0000-4000-8000-000000000001";
const order = "a3000000-0000-4000-8000-000000000001";
const user = "a1000000-0000-4000-8000-000000000001";
const input = { planCode: "simple-anual", idempotencyKey: key, acceptedTerms: true };
function dependencies({ owner = true, session = true, failure = null } = {}) {
  const calls = [];
  const userClient = { auth: { getUser: async () => ({ data: { user: session ? { id: user } : null }, error: null }) },
    rpc: async () => ({ data: owner ? [{ id: shop }] : [], error: null }) };
  const adminClient = { rpc: async (name, payload) => { calls.push({ name, payload }); return { data: order, error: failure }; } };
  return { calls, userClient, adminClient, termsVersion: "sandbox-v1" };
}

test("creates a pending order using authenticated owner and server catalog", async () => {
  const deps = dependencies();
  assert.deepEqual(await createPendingSubscriptionOrder(input, deps), { status: "created", orderId: order });
  assert.equal(deps.calls[0].name, "create_subscription_order");
  assert.deepEqual(deps.calls[0].payload, { p_barbershop_id: shop, p_requester_id: user, p_idempotency_key: key,
    p_plan_code: "simple-anual", p_plan_name: "Plano Simple (Anual)", p_months: 12, p_price_cents: 49900,
    p_max_installments: 3, p_user_limit: 3, p_terms_version: "sandbox-v1" });
});

test("does not call privileged database for invalid, unauthenticated or non-owner requests", async () => {
  for (const [change, options, status] of [[{ acceptedTerms: false }, {}, "invalid"], [{ idempotencyKey: "bad" }, {}, "invalid"],
    [{ planCode: "anual" }, {}, "invalid"], [{ planCode: "simple-mensal" }, {}, "invalid"], [{}, { session: false }, "unauthenticated"], [{}, { owner: false }, "forbidden"]]) {
    const deps = dependencies(options);
    assert.equal((await createPendingSubscriptionOrder({ ...input, ...change }, deps)).status, status);
    assert.equal(deps.calls.length, 0);
  }
});

test("does not trust client supplied price or tenant and does not swallow database errors", async () => {
  const deps = dependencies();
  await createPendingSubscriptionOrder({ ...input, priceCents: 1, barbershopId: "other" }, deps);
  assert.equal(deps.calls[0].payload.p_price_cents, 49900);
  assert.equal(deps.calls[0].payload.p_barbershop_id, shop);
  await assert.rejects(createPendingSubscriptionOrder(input, dependencies({ failure: new Error("failed") })), /failed/);
});
