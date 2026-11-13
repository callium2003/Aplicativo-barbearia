import test from "node:test";
import assert from "node:assert/strict";
import { createOrReuseSandboxCheckout, resolveCheckoutCustomerData } from "../utils/subscription-checkout-create.ts";

const orderId = "a3000000-0000-4000-8000-000000000001";
const userId = "a1000000-0000-4000-8000-000000000001";
const checkoutUrl = "https://sandbox.asaas.com/000/checkoutSession/show/checkout-1";
const offer = { planCode: "simple-anual", planName: "Simple", months: 12, priceCents: 59900, maxInstallments: 3, userLimit: 3 };
function deps(state = "CLAIMED", providerError = null) {
  const calls = [];
  return { calls, account: 'account-1', callbackOrigin: "https://test.example.com", userClient: { auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) } },
    adminClient: { rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "claim_subscription_checkout") return { data: { state, offer, checkoutId: "checkout-1", checkoutUrl }, error: null };
      if (name === "claim_subscription_recurring_operation") return { data: { state: "CLAIMED" }, error: null };
      return { data: null, error: null };
    } },
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
  assert.equal(d.calls.find(call => call.name === "provider").payload.items[0].value, 599);
  assert.deepEqual(d.calls.at(-1), { name: "finish_subscription_checkout", args: { p_order_id: orderId, p_state: "READY", p_checkout_id: "checkout-1", p_checkout_url: checkoutUrl } });
});
test("claims a monthly card recurrence before contacting the hosted checkout", async () => {
  const d = deps();
  d.adminClient.rpc = async (name, args) => {
    d.calls.push({ name, args });
    if (name === "claim_subscription_checkout") return { data: { state: "CLAIMED", offer: { ...offer, planCode: "simple-mensal", months: 1, priceCents: 4990, maxInstallments: 1 }, checkoutId: "checkout-1", checkoutUrl }, error: null };
    if (name === "claim_subscription_recurring_operation") return { data: { state: "CLAIMED" }, error: null };
    return { data: null, error: null };
  };
  await createOrReuseSandboxCheckout(orderId, d);
  assert.equal(d.calls.findIndex((call) => call.name === "claim_subscription_recurring_operation") < d.calls.findIndex((call) => call.name === "provider"), true);
  assert.deepEqual(d.calls.find((call) => call.name === "provider").payload.chargeTypes, ["RECURRENT"]);
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
  assert.deepEqual(d.calls.at(-1), { name: "finish_subscription_checkout", args: { p_order_id: orderId, p_state: "UNKNOWN", p_checkout_id: null, p_checkout_url: null } });
});
test("rejects provider links outside the sandbox or with a mismatched checkout id", async () => {
  for (const link of ["https://asaas.com/000/checkoutSession/show/checkout-1", "https://sandbox.asaas.com/000/checkoutSession/show/other", "https://sandbox.asaas.com.evil.test/000/checkoutSession/show/checkout-1"]) {
    const d = deps();
    d.asaasClient.createCheckout = async () => ({ id: "checkout-1", link });
    await assert.rejects(createOrReuseSandboxCheckout(orderId, d));
    assert.equal(d.calls.at(-1).args.p_state, "UNKNOWN");
  }
});

test("resolveCheckoutCustomerData validates complete registration details", () => {
  const user = { email: "owner@example.test" };
  const registration = {
    responsible_name: "Thomaz Damasceno",
    responsible_phone: "(11) 93145-3535",
    tax_document: "14.379.410/870",
    postal_code: "03273-400",
    address_number: "1470",
    neighborhood: "Vila Prudente",
  };
  const shop = {
    name: "Damasceno Barber",
    address: "Rua Solidonio Leite, 1470 - Vila Prudente",
    phone: "(11) 93145-3535",
  };

  const resolved = resolveCheckoutCustomerData(user, registration, shop);
  assert.deepEqual(resolved, {
    name: "Damasceno Barber - Thomaz Damasceno",
    company: "Damasceno Barber",
    email: "owner@example.test",
    cpfCnpj: "14379410870",
    phone: "11931453535",
    mobilePhone: "11931453535",
    postalCode: "03273400",
    address: "Rua Solidonio Leite",
    addressNumber: "1470",
    province: "Vila Prudente",
  });
});

test("resolveCheckoutCustomerData returns partial data for profile without CPF or address", () => {
  const user = { email: "barbaeriasp@gmail.com" };
  const shop = { name: "CorteAqui" };

  const resolved = resolveCheckoutCustomerData(user, null, shop);
  assert.deepEqual(resolved, {
    name: "CorteAqui",
    company: "CorteAqui",
    email: "barbaeriasp@gmail.com",
  });
  assert.equal(resolved.cpfCnpj, undefined);
  assert.equal(resolved.address, undefined);
  assert.equal(resolved.phone, undefined);
});

test("resolveCheckoutCustomerData returns partial data with responsible, shop, phone and CPF without address", () => {
  const user = { email: "owner@example.test" };
  const registration = {
    responsible_name: "Thomaz Damasceno",
    responsible_phone: "(11) 93145-3535",
    tax_document: "14.379.410/870",
  };
  const shop = {
    name: "Damasceno Barber",
  };

  const resolved = resolveCheckoutCustomerData(user, registration, shop);
  assert.deepEqual(resolved, {
    name: "Damasceno Barber - Thomaz Damasceno",
    company: "Damasceno Barber",
    email: "owner@example.test",
    cpfCnpj: "14379410870",
    phone: "11931453535",
    mobilePhone: "11931453535",
  });
  assert.equal(resolved.postalCode, undefined);
  assert.equal(resolved.address, undefined);
  assert.equal(resolved.addressNumber, undefined);
  assert.equal(resolved.province, undefined);
});

test("resolveCheckoutCustomerData returns undefined for empty or invalid profile", () => {
  assert.equal(resolveCheckoutCustomerData(null, null, null), undefined);
  assert.equal(resolveCheckoutCustomerData({ email: "invalid" }, null, null), undefined);
  assert.equal(resolveCheckoutCustomerData({ email: "" }, { tax_document: "123" }, { name: "A" }), undefined);
  assert.equal(resolveCheckoutCustomerData({ email: "not-an-email" }, { address_number: "123", neighborhood: "Centro" }, null), undefined);
});

test("injects complete registration details into provider checkout payload", async () => {
  const d = deps();
  d.adminClient.from = (table) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          if (table === "subscription_orders") return { data: { barbershop_id: "shop-1" }, error: null };
          if (table === "barbershop_registration_details") {
            return {
              data: {
                responsible_name: "Thomaz Damasceno",
                responsible_phone: "11931453535",
                tax_document: "14379410870",
                postal_code: "03273400",
                address_number: "1470",
                neighborhood: "Vila Prudente",
              },
              error: null,
            };
          }
          if (table === "barbershops") {
            return {
              data: {
                name: "Damasceno Barber",
                address: "Rua Solidonio Leite, 1470",
                phone: "11931453535",
                notification_email: "damasceno@example.test",
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      }),
    }),
  });

  await createOrReuseSandboxCheckout(orderId, d);
  const providerCall = d.calls.find((call) => call.name === "provider");
  assert.ok(providerCall);
  assert.deepEqual(providerCall.payload.customerData, {
    name: "Damasceno Barber - Thomaz Damasceno",
    company: "Damasceno Barber",
    email: "damasceno@example.test",
    cpfCnpj: "14379410870",
    phone: "11931453535",
    mobilePhone: "11931453535",
    postalCode: "03273400",
    address: "Rua Solidonio Leite",
    addressNumber: "1470",
    province: "Vila Prudente",
  });
});
