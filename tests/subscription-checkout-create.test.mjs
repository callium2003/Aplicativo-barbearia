import test from "node:test";
import assert from "node:assert/strict";
import { createOrReuseSandboxCheckout } from "../utils/subscription-checkout-create.ts";

const orderId = "a3000000-0000-4000-8000-000000000001";
const userId = "a1000000-0000-4000-8000-000000000001";
const checkoutUrl = "https://sandbox.asaas.com/000/checkoutSession/show/checkout-1";
const offer = { planCode: "simple-anual", planName: "Simple", months: 12, priceCents: 59900, maxInstallments: 3, userLimit: 3 };
function deps(state = "CLAIMED", providerError = null) {
  const calls = [];
  return { calls, account: 'account-1', callbackOrigin: "https://test.example.com", userClient: { auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) } },
    adminClient: { rpc: async (name, args) => { calls.push({ name, args }); return { data: name === "claim_subscription_checkout" ? { state, offer, checkoutId: "checkout-1", checkoutUrl } : null, error: null }; } },
    asaasClient: { createCheckout: async (payload) => { calls.push({ name: "provider", payload }); if (providerError) throw providerError; return { id: "checkout-1", link: checkoutUrl }; } } };
}
test("refuses to contact Asaas when server account binding fails", async () => {
  const d = deps();
  d.account = 'account-1';
  const rpc = d.adminClient.rpc;
  d.adminClient.rpc = async (name, args) => name === 'bind_subscription_sandbox_account' ? { error: new Error('binding denied') } : rpc(name, args);
  await assert.rejects(createOrReuseSandboxCheckout(orderId, d));
  assert.equal(d.calls.filter(c => c.name === 'provider').length, 0);
});
test("claims and persists one hosted checkout using the immutable offer", async () => {
  const d = deps();
  assert.deepEqual(await createOrReuseSandboxCheckout(orderId, d), { status: "ready", checkoutId: "checkout-1", checkoutUrl });
  assert.equal(d.calls[2].payload.items[0].value, 599);
  assert.deepEqual(d.calls[3], { name: "finish_subscription_checkout", args: { p_order_id: orderId, p_state: "READY", p_checkout_id: "checkout-1", p_checkout_url: checkoutUrl } });
});
test("never repeats an in-flight or uncertain checkout", async () => {
  for (const [state, status] of [["IN_PROGRESS", "in_progress"], ["REVIEW_REQUIRED", "review_required"], ["READY", "ready"]]) {
    const d = deps(state);
    assert.equal((await createOrReuseSandboxCheckout(orderId, d)).status, status);
    assert.equal(d.calls.length, 2);
  }
});
test("records uncertain provider failures without retrying", async () => {
  const d = deps("CLAIMED", new Error("network"));
  await assert.rejects(createOrReuseSandboxCheckout(orderId, d));
  assert.equal(d.calls.filter(call => call.name === "provider").length, 1);
  assert.deepEqual(d.calls[3], { name: "finish_subscription_checkout", args: { p_order_id: orderId, p_state: "UNKNOWN", p_checkout_id: null, p_checkout_url: null } });
});
test("rejects provider links outside the sandbox or with a mismatched checkout id", async () => {
  for (const link of ["https://asaas.com/000/checkoutSession/show/checkout-1", "https://sandbox.asaas.com/000/checkoutSession/show/other", "https://sandbox.asaas.com.evil.test/000/checkoutSession/show/checkout-1"]) {
    const d = deps();
    d.asaasClient.createCheckout = async () => ({ id: "checkout-1", link });
    await assert.rejects(createOrReuseSandboxCheckout(orderId, d));
    assert.equal(d.calls.at(-1).args.p_state, "UNKNOWN");
  }
});
