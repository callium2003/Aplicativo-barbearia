import test from "node:test";
import assert from "node:assert/strict";
import { buildQuarterlyCardCheckout, buildMonthlyRecurringCardCheckout } from "../utils/asaas-checkout.ts";
import { createSubscriptionOfferSnapshot } from "../utils/subscription-order-snapshot.ts";

const orderId = "10000000-0000-4000-8000-000000000001";
const callbackOrigin = "https://barbeariasp.example.test";

test("checkout uses the persisted server offer instead of the current catalog price", () => {
  const offer = { planCode: "simple-trimestral", planName: "Plano Simple (Trimestral)", months: 3, priceCents: 59900, maxInstallments: 1, userLimit: 3 };
  const checkout = buildQuarterlyCardCheckout({ orderId, offer, callbackOrigin });
  assert.equal(checkout.items[0].value, 599);
});

test("checkout rejects malformed snapshots before any provider request", () => {
  const valid = createSubscriptionOfferSnapshot("simple-trimestral");
  for (const change of [{ priceCents: 0 }, { priceCents: 1.5 }, { maxInstallments: 4 }, { months: 1 }, { planName: "" }, { userLimit: 0 }]) {
    assert.throws(() => buildQuarterlyCardCheckout({ orderId, offer: { ...valid, ...change }, callbackOrigin }), /Plano trimestral inválido/);
  }
});

test("quarterly card checkout creates a quarterly recurrence with single payment per cycle", () => {
  for (const [planCode, value] of [["simple-trimestral", 219.9], ["middle-trimestral", 279.9], ["master-trimestral", 359.9]]) {
    const payload = buildQuarterlyCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot(planCode), callbackOrigin, nextDueDate: "2026-12-08" });
    assert.deepEqual(payload.billingTypes, ["CREDIT_CARD"]);
    assert.deepEqual(payload.chargeTypes, ["RECURRENT"]);
    assert.equal(payload.installment, undefined);
    assert.deepEqual(payload.subscription, { cycle: "QUARTERLY", nextDueDate: "2026-12-08" });
    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0].quantity, 1);
    assert.equal(payload.items[0].value, value);
    assert.equal(payload.externalReference, orderId);
    assert.equal(payload.minutesToExpire, 60);
    assert.equal(payload.customerData, undefined);
  }
});

test("monthly checkout creates a card recurrence instead of a detached Pix payment", () => {
  const payload = buildMonthlyRecurringCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-mensal"), callbackOrigin, nextDueDate: "2026-12-08" });
  assert.deepEqual(payload.billingTypes, ["CREDIT_CARD"]);
  assert.deepEqual(payload.chargeTypes, ["RECURRENT"]);
  assert.equal(payload.installment, undefined);
  assert.deepEqual(payload.subscription, { cycle: "MONTHLY", nextDueDate: "2026-12-08" });
  assert.equal(payload.items[0].value, 79.9);
});

test("monthly checkout rejects annual, legacy and malformed offers", () => {
  for (const planCode of ["simple-trimestral", "mensal", "custom", "", null]) {
    assert.throws(() => buildMonthlyRecurringCardCheckout({ orderId, offer: { ...createSubscriptionOfferSnapshot("simple-mensal"), planCode }, callbackOrigin, nextDueDate: "2026-12-08" }), /Plano mensal inválido/);
  }
});

test("checkout callbacks return to the central as informational states for the exact order", () => {
  const { callback } = buildQuarterlyCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-trimestral"), callbackOrigin });
  for (const [key, state] of [["successUrl", "retorno"], ["cancelUrl", "cancelado"], ["expiredUrl", "expirado"]]) {
    const url = new URL(callback[key]);
    assert.equal(url.origin, callbackOrigin);
    assert.equal(url.pathname, "/painel/assinatura");
    assert.equal(url.searchParams.get("pedido"), orderId);
    assert.equal(url.searchParams.get("checkout"), state);
    assert.equal(url.searchParams.has("paid"), false);
  }
});

test("new annual checkout rejects legacy, monthly and unknown codes", () => {
  for (const planCode of ["anual", "mensal", "simple-mensal", "custom", "", null]) {
    assert.throws(() => buildQuarterlyCardCheckout({ orderId, offer: { ...createSubscriptionOfferSnapshot("simple-trimestral"), planCode }, callbackOrigin }), /Plano trimestral inválido/);
  }
});

test("checkout rejects unsafe callback origins and malformed order identifiers", () => {
  for (const invalid of ["http://example.test", "https://user:pass@example.test", "https://example.test/path", "https://example.test?x=1", "https://example.test#x", "javascript:alert(1)"]) {
    assert.throws(() => buildQuarterlyCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-trimestral"), callbackOrigin: invalid }), /Origem de retorno inválida/);
  }
  for (const invalid of ["", "order?paid=true", "../tenant", null]) {
    assert.throws(() => buildQuarterlyCardCheckout({ orderId: invalid, offer: createSubscriptionOfferSnapshot("simple-trimestral"), callbackOrigin }), /Pedido inválido/);
  }
});

test("local HTTP callbacks require an explicit sandbox-only option", () => {
  const offer = createSubscriptionOfferSnapshot("simple-trimestral");
  assert.throws(() => buildQuarterlyCardCheckout({ orderId, offer, callbackOrigin: "http://127.0.0.1:3000" }), /Origem de retorno inválida/);
  const checkout = buildQuarterlyCardCheckout({ orderId, offer, callbackOrigin: "http://127.0.0.1:3000", allowLocalCallback: true });
  assert.equal(new URL(checkout.callback.successUrl).origin, "http://127.0.0.1:3000");
  assert.throws(() => buildQuarterlyCardCheckout({ orderId, offer, callbackOrigin: "http://example.test", allowLocalCallback: true }), /Origem de retorno inválida/);
});

test("includes customerData in checkout payload when provided", () => {
  const customerData = {
    name: "Thomaz Damasceno",
    email: "thomaz@example.test",
    cpfCnpj: "14379410870",
    phone: "11931453535",
    mobilePhone: "11931453535",
    postalCode: "03273400",
    address: "Rua Solidonio Leite",
    addressNumber: "1470",
    province: "Vila Prudente",
  };
  const annual = buildQuarterlyCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-trimestral"), callbackOrigin, customerData });
  assert.deepEqual(annual.customerData, customerData);

  const monthly = buildMonthlyRecurringCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-mensal"), callbackOrigin, nextDueDate: "2026-12-08", customerData });
  assert.deepEqual(monthly.customerData, customerData);
});

test("includes partial customerData with company and without cpfCnpj", () => {
  const customerData = {
    name: "CorteAqui",
    company: "CorteAqui",
    email: "barbaeriasp@gmail.com",
  };
  const annual = buildQuarterlyCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-trimestral"), callbackOrigin, customerData });
  assert.deepEqual(annual.customerData, customerData);

  const monthly = buildMonthlyRecurringCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-mensal"), callbackOrigin, nextDueDate: "2026-12-08", customerData });
  assert.deepEqual(monthly.customerData, customerData);
});

test("truncates item name to at most 30 characters when shopName is appended", () => {
  const annual = buildQuarterlyCardCheckout({
    orderId,
    offer: createSubscriptionOfferSnapshot("simple-trimestral"),
    callbackOrigin,
    shopName: "Mint Barbearia",
  });
  assert.equal(annual.items[0].name.length <= 30, true);
  assert.equal(annual.items[0].name, "Plano Simple (Trimestral) - Mi");

  const monthly = buildMonthlyRecurringCardCheckout({
    orderId,
    offer: createSubscriptionOfferSnapshot("simple-mensal"),
    callbackOrigin,
    nextDueDate: "2026-12-08",
    shopName: "Mint Barbearia",
  });
  assert.equal(monthly.items[0].name.length <= 30, true);
  assert.equal(monthly.items[0].name, "Plano Simple - Mint Barbearia");
});
