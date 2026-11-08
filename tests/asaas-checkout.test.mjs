import test from "node:test";
import assert from "node:assert/strict";
import { buildAnnualCardCheckout } from "../utils/asaas-checkout.ts";

const orderId = "10000000-0000-4000-8000-000000000001";
const callbackOrigin = "https://barbeariasp.example.test";

test("annual card checkout charges the full approved price with at most three installments and no recurrence", () => {
  for (const [planCode, value] of [["simple-anual", 499], ["middle-anual", 799], ["master-anual", 1199]]) {
    const payload = buildAnnualCardCheckout({ orderId, planCode, callbackOrigin });
    assert.deepEqual(payload.billingTypes, ["CREDIT_CARD"]);
    assert.deepEqual(payload.chargeTypes, ["DETACHED", "INSTALLMENT"]);
    assert.deepEqual(payload.installment, { maxInstallmentCount: 3 });
    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0].quantity, 1);
    assert.equal(payload.items[0].value, value);
    assert.equal(payload.subscription, undefined);
    assert.equal(payload.externalReference, orderId);
    assert.equal(payload.minutesToExpire, 60);
    assert.equal(payload.customerData, undefined);
  }
});

test("checkout callbacks return to the central as informational states for the exact order", () => {
  const { callback } = buildAnnualCardCheckout({ orderId, planCode: "simple-anual", callbackOrigin });
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
    assert.throws(() => buildAnnualCardCheckout({ orderId, planCode, callbackOrigin }), /Plano anual inválido/);
  }
});

test("checkout rejects unsafe callback origins and malformed order identifiers", () => {
  for (const invalid of ["http://example.test", "https://user:pass@example.test", "https://example.test/path", "https://example.test?x=1", "https://example.test#x", "javascript:alert(1)"]) {
    assert.throws(() => buildAnnualCardCheckout({ orderId, planCode: "simple-anual", callbackOrigin: invalid }), /Origem de retorno inválida/);
  }
  for (const invalid of ["", "order?paid=true", "../tenant", null]) {
    assert.throws(() => buildAnnualCardCheckout({ orderId: invalid, planCode: "simple-anual", callbackOrigin }), /Pedido inválido/);
  }
});
