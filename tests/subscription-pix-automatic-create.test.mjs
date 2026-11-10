import test from "node:test";
import assert from "node:assert/strict";
import { createPixAutomaticSubscription } from "../utils/subscription-pix-automatic-create.mjs";

const orderId = "10000000-0000-4000-8000-000000000001";

function dependencies({ claimState = "CLAIMED", taxDocument = "52998224725" } = {}) {
  const calls = [];
  const adminClient = {
    rpc: async (name, fields) => {
      calls.push({ name, fields });
      if (name === "claim_subscription_recurring_operation") return { data: claimState === "CLAIMED" ? { state: "CLAIMED", orderId, barbershopId: "20000000-0000-4000-8000-000000000001", planCode: "simple-mensal", priceCents: 4990, contractId: "10000000000040008000000000000001" } : { state: claimState, authorizationId: "aut_existing" }, error: null };
      if (name === "release_unstarted_pix_automatic_operation") return { data: true, error: null };
      return { data: null, error: null };
    },
    from: (table) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => table === "barbershop_registration_details"
      ? { data: { responsible_name: "Responsável Teste", responsible_phone: "11999999999", tax_document: taxDocument }, error: null }
      : { data: { name: "Barbearia Teste" }, error: null } }) }) }),
  };
  return {
    calls,
    userClient: { auth: { getUser: async () => ({ data: { user: { id: "30000000-0000-4000-8000-000000000001", email: "owner@example.test" } }, error: null }) } },
    adminClient,
    asaasClient: {
      createCustomer: async (payload) => { calls.push({ name: "customer", payload }); return { id: "cus_test" }; },
      createPixAutomaticAuthorization: async (payload) => { calls.push({ name: "authorization", payload }); return { id: "aut_test", payload: "pix-payload", encodedImage: "aGVsbG8=" }; },
    },
  };
}

test("creates one Pix Automatic authorization only after the durable claim", async () => {
  const deps = dependencies();
  const result = await createPixAutomaticSubscription(orderId, deps);
  assert.deepEqual(result, { status: "ready", authorizationId: "aut_test", paymentQr: { payload: "pix-payload", encodedImage: "aGVsbG8=" } });
  assert.equal(deps.calls[0].name, "claim_subscription_recurring_operation");
  assert.equal(deps.calls[1].name, "customer");
  assert.equal(deps.calls[2].name, "authorization");
  assert.equal(deps.calls[2].payload.paymentCreationMode, "SUBSCRIPTION");
  assert.equal(deps.calls.at(-1).name, "finish_subscription_recurring_operation");
});

test("never creates a provider object when the durable operation is already in review", async () => {
  const deps = dependencies({ claimState: "UNKNOWN" });
  assert.deepEqual(await createPixAutomaticSubscription(orderId, deps), { status: "review_required" });
  assert.equal(deps.calls.some((call) => call.name === "customer" || call.name === "authorization"), false);
});

test("requires a complete billing profile before any provider write", async () => {
  const deps = dependencies({ taxDocument: null });
  assert.deepEqual(await createPixAutomaticSubscription(orderId, deps), { status: "billing_profile_required" });
  assert.equal(deps.calls.some((call) => call.name === "customer" || call.name === "authorization"), false);
  assert.equal(deps.calls.at(-1).name, "release_unstarted_pix_automatic_operation");
});
