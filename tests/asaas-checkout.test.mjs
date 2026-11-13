import test from "node:test";
import assert from "node:assert/strict";
import { buildAnnualCardCheckout, buildMonthlyRecurringCardCheckout } from "../utils/asaas-checkout.ts";
import { createSubscriptionOfferSnapshot } from "../utils/subscription-order-snapshot.ts";

const orderId = "10000000-0000-4000-8000-000000000001";
const callbackOrigin = "https://barbeariasp.example.test";

test("checkout uses the persisted server offer instead of the current catalog price", () => {
  const offer = { planCode: "simple-anual", planName: "Plano Simple (Anual)", months: 12, priceCents: 59900, maxInstallments: 3, userLimit: 3 };
  const checkout = buildAnnualCardCheckout({ orderId, offer, callbackOrigin });
  assert.equal(checkout.items[0].value, 599);
});

test("checkout rejects malformed snapshots before any provider request", () => {
  const valid = createSubscriptionOfferSnapshot("simple-anual");
  for (const change of [{ priceCents: 0 }, { priceCents: 1.5 }, { maxInstallments: 4 }, { months: 1 }, { planName: "" }, { userLimit: 0 }]) {
    assert.throws(() => buildAnnualCardCheckout({ orderId, offer: { ...valid, ...change }, callbackOrigin }), /Plano anual inválido/);
  }
});

test("annual card checkout creates a yearly recurrence with single payment per cycle", () => {
  for (const [planCode, value] of [["simple-anual", 499], ["middle-anual", 799], ["master-anual", 1199]]) {
    const payload = buildAnnualCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot(planCode), callbackOrigin, nextDueDate: "2026-12-08" });
    assert.deepEqual(payload.billingTypes, ["CREDIT_CARD"]);
    assert.deepEqual(payload.chargeTypes, ["RECURRENT"]);
    assert.equal(payload.installment, undefined);
    assert.deepEqual(payload.subscription, { cycle: "YEARLY", nextDueDate: "2026-12-08" });
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
  assert.equal(payload.items[0].value, 49.9);
});

test("monthly checkout rejects annual, legacy and malformed offers", () => {
  for (const planCode of ["simple-anual", "mensal", "custom", "", null]) {
    assert.throws(() => buildMonthlyRecurringCardCheckout({ orderId, offer: { ...createSubscriptionOfferSnapshot("simple-mensal"), planCode }, callbackOrigin, nextDueDate: "2026-12-08" }), /Plano mensal inválido/);
  }
});

test("checkout callbacks return to the central as informational states for the exact order", () => {
  const { callback } = buildAnnualCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-anual"), callbackOrigin });
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
    assert.throws(() => buildAnnualCardCheckout({ orderId, offer: { ...createSubscriptionOfferSnapshot("simple-anual"), planCode }, callbackOrigin }), /Plano anual inválido/);
  }
});

test("checkout rejects unsafe callback origins and malformed order identifiers", () => {
  for (const invalid of ["http://example.test", "https://user:pass@example.test", "https://example.test/path", "https://example.test?x=1", "https://example.test#x", "javascript:alert(1)"]) {
    assert.throws(() => buildAnnualCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-anual"), callbackOrigin: invalid }), /Origem de retorno inválida/);
  }
  for (const invalid of ["", "order?paid=true", "../tenant", null]) {
    assert.throws(() => buildAnnualCardCheckout({ orderId: invalid, offer: createSubscriptionOfferSnapshot("simple-anual"), callbackOrigin }), /Pedido inválido/);
  }
});

test("local HTTP callbacks require an explicit sandbox-only option", () => {
  const offer = createSubscriptionOfferSnapshot("simple-anual");
  assert.throws(() => buildAnnualCardCheckout({ orderId, offer, callbackOrigin: "http://127.0.0.1:3000" }), /Origem de retorno inválida/);
  const checkout = buildAnnualCardCheckout({ orderId, offer, callbackOrigin: "http://127.0.0.1:3000", allowLocalCallback: true });
  assert.equal(new URL(checkout.callback.successUrl).origin, "http://127.0.0.1:3000");
  assert.throws(() => buildAnnualCardCheckout({ orderId, offer, callbackOrigin: "http://example.test", allowLocalCallback: true }), /Origem de retorno inválida/);
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
  const annual = buildAnnualCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-anual"), callbackOrigin, customerData });
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
  const annual = buildAnnualCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-anual"), callbackOrigin, customerData });
  assert.deepEqual(annual.customerData, customerData);

  const monthly = buildMonthlyRecurringCardCheckout({ orderId, offer: createSubscriptionOfferSnapshot("simple-mensal"), callbackOrigin, nextDueDate: "2026-12-08", customerData });
  assert.deepEqual(monthly.customerData, customerData);
});

test("truncates item name to at most 30 characters when shopName is appended", () => {
  const annual = buildAnnualCardCheckout({
    orderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    shopName: "Mint Barbearia",
  });
  assert.equal(annual.items[0].name.length <= 30, true);
  assert.equal(annual.items[0].name, "Plano Simple (Anual) - Mint Ba");

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
