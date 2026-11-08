import test from "node:test";
import assert from "node:assert/strict";
import { createSubscriptionOfferSnapshot } from "../utils/subscription-order-snapshot.ts";

test("snapshot copies the current server catalog offer in integer cents", () => {
  const offer = createSubscriptionOfferSnapshot("simple-anual");
  assert.deepEqual(offer, { planCode: "simple-anual", planName: "Plano Simple (Anual)", months: 12, priceCents: 49900, maxInstallments: 3, userLimit: 3 });
  const second = createSubscriptionOfferSnapshot("simple-mensal");
  assert.equal(second.priceCents, 4990);
  assert.equal(second.months, 1);
});

test("snapshot rejects legacy, unknown and non-string plan codes", () => {
  for (const code of ["anual", "mensal", "unknown", "", null, { code: "simple-anual", priceCents: 1 }]) {
    assert.throws(() => createSubscriptionOfferSnapshot(code), /Plano inválido/);
  }
});
