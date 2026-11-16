import test from "node:test";
import assert from "node:assert/strict";
import { createSubscriptionOfferSnapshot } from "../utils/subscription-order-snapshot.ts";

test("snapshot copies the current server catalog offer in integer cents", () => {
  const offer = createSubscriptionOfferSnapshot("simple-trimestral");
  assert.deepEqual(offer, { planCode: "simple-trimestral", planName: "Plano Simple (Trimestral)", months: 3, priceCents: 21990, maxInstallments: 1, userLimit: 3 });
  const second = createSubscriptionOfferSnapshot("simple-mensal");
  assert.equal(second.priceCents, 7990);
  assert.equal(second.months, 1);
});

test("snapshot rejects legacy, unknown and non-string plan codes", () => {
  for (const code of ["anual", "mensal", "unknown", "", null, { code: "simple-trimestral", priceCents: 1 }]) {
    assert.throws(() => createSubscriptionOfferSnapshot(code), /Plano inválido/);
  }
});
