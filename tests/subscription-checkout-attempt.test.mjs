import assert from "node:assert/strict";
import test from "node:test";
import { checkoutAttemptForMethod } from "../app/painel/assinatura/contratar/checkout-attempt.ts";

test("retries of the same payment method keep the order identity", () => {
  const attempt = checkoutAttemptForMethod(null, "card");
  assert.match(attempt.idempotencyKey, /^[0-9a-f-]{36}$/);
  assert.equal(attempt.method, "card");
  assert.strictEqual(checkoutAttemptForMethod(attempt, "card"), attempt);
});

test("switching card to Pix and back creates new order identities for safe replacement", () => {
  const card = checkoutAttemptForMethod(null, "card");
  const pix = checkoutAttemptForMethod(card, "pix");
  const nextCard = checkoutAttemptForMethod(pix, "card");
  assert.equal(pix.method, "pix");
  assert.equal(nextCard.method, "card");
  assert.notEqual(pix.idempotencyKey, card.idempotencyKey);
  assert.notEqual(nextCard.idempotencyKey, card.idempotencyKey);
  assert.notEqual(nextCard.idempotencyKey, pix.idempotencyKey);
});
