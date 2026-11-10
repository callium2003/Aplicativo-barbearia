import test from "node:test";
import assert from "node:assert/strict";
import { reconcilePixAutomaticPayment } from "../utils/subscription-pix-automatic-reconciliation.mjs";

const order = { paymentId: "pay_test", authorizationId: "aut_test", priceCents: 4990 };

test("confirms only an authoritative Pix Automatic payment matching its authorization and amount", async () => {
  let result;
  await reconcilePixAutomaticPayment(order, { client: { getPayment: async () => ({ id: "pay_test", status: "RECEIVED", billingType: "PIX", value: 49.9, pixAutomaticAuthorizationId: "aut_test" }) }, finish: async (input) => { result = input; return input.outcome; } });
  assert.deepEqual(result, { outcome: "CONFIRMED", payment: { id: "pay_test", status: "RECEIVED", valueCents: 4990, authorizationId: "aut_test" } });
});

test("does not grant on pending, wrong authorization, wrong value or lookup failure", async () => {
  for (const payment of [
    { id: "pay_test", status: "PENDING", billingType: "PIX", value: 49.9, pixAutomaticAuthorizationId: "aut_test" },
    { id: "pay_test", status: "RECEIVED", billingType: "PIX", value: 49.9, pixAutomaticAuthorizationId: "other" },
    { id: "pay_test", status: "RECEIVED", billingType: "PIX", value: 49.8, pixAutomaticAuthorizationId: "aut_test" },
  ]) {
    let result;
    await reconcilePixAutomaticPayment(order, { client: { getPayment: async () => payment }, finish: async (input) => { result = input; return input.outcome; } });
    assert.equal(result.outcome, "REVIEW_REQUIRED");
  }
  let result;
  await reconcilePixAutomaticPayment(order, { client: { getPayment: async () => { throw new Error("network"); } }, finish: async (input) => { result = input; return input.outcome; } });
  assert.equal(result.outcome, "RETRY");
});
