import test from "node:test";
import assert from "node:assert/strict";
import { resolveSubscriptionOrderOwner } from "../utils/subscription-order-owner.mjs";

const shopId = "d5b55581-91b4-49fd-86d0-cf315040b129";
function client(user, shop, userError = null, shopError = null) {
  const calls = [];
  return { calls, auth: { getUser: async () => ({ data: { user }, error: userError }) },
    rpc: async (name) => { calls.push(name); return { data: shop, error: shopError }; } };
}

test("resolves only the authenticated user's own barbershop through the existing RPC", async () => {
  const api = client({ id: "user" }, [{ id: shopId }]);
  assert.deepEqual(await resolveSubscriptionOrderOwner(api), { status: "ready", barbershopId: shopId });
  assert.deepEqual(api.calls, ["my_owned_barbershop"]);
});

test("rejects missing sessions and authenticated users without an owned barbershop", async () => {
  const anonymous = client(null, []);
  assert.deepEqual(await resolveSubscriptionOrderOwner(anonymous), { status: "unauthenticated" });
  assert.deepEqual(anonymous.calls, []);
  assert.deepEqual(await resolveSubscriptionOrderOwner(client({ id: "user" }, [])), { status: "forbidden" });
  const missing = client(null, [], Object.assign(new Error("session missing"), { name: "AuthSessionMissingError" }));
  assert.deepEqual(await resolveSubscriptionOrderOwner(missing), { status: "unauthenticated" });
  assert.deepEqual(missing.calls, []);
});

test("fails closed on auth/RPC errors and malformed or ambiguous ownership", async () => {
  await assert.rejects(resolveSubscriptionOrderOwner(client(null, [], new Error("auth"))), /auth/);
  await assert.rejects(resolveSubscriptionOrderOwner(client({ id: "user" }, null, null, new Error("rpc"))), /rpc/);
  for (const rows of [null, {}, [{ id: "bad" }], [{ id: shopId }, { id: shopId }]]) {
    await assert.rejects(resolveSubscriptionOrderOwner(client({ id: "user" }, rows)), /Resposta de propriedade inválida/);
  }
});
