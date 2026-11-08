import test from "node:test";
import assert from "node:assert/strict";
import { assessSandboxCheckoutPayments } from "../utils/asaas-checkout-reconciliation.mjs";

const checkoutId = "checkout-test-1";
const payments = [1, 2].map((n) => ({ id: `pay_${n}`, checkoutSession: checkoutId, status: "CONFIRMED", billingType: "CREDIT_CARD", value: 249.5, installment: "installment-1", installmentNumber: n }));
test("recognizes two distinct confirmed installments totaling the persisted order", () => {
  assert.deepEqual(assessSandboxCheckoutPayments({ checkoutId, priceCents: 49900, maxInstallments: 3, payments, hasMore: false }), { status: "confirmed", paymentCount: 2 });
});
test("never confirms incomplete, duplicated, foreign or changed financial results", () => {
  const cases = [
    { payments: [], hasMore: false },
    { payments, hasMore: true },
    { payments: [payments[0], payments[0]], hasMore: false },
    { payments: [payments[0], { ...payments[1], checkoutSession: "other" }], hasMore: false },
    { payments: [payments[0], { ...payments[1], status: "REFUNDED" }], hasMore: false },
    { payments: [payments[0], { ...payments[1], value: 1 }], hasMore: false },
    { payments: [payments[0], { ...payments[1], installmentNumber: 1 }], hasMore: false },
    { payments: [payments[0], { ...payments[1], installment: "other" }], hasMore: false },
    { payments: [payments[0], { ...payments[1], currency: "USD" }], hasMore: false },
    { payments: [payments[0], { ...payments[1], deleted: true }], hasMore: false },
  ];
  for (const c of cases) assert.notEqual(assessSandboxCheckoutPayments({ checkoutId, priceCents: 49900, maxInstallments: 3, ...c }).status, "confirmed");
});
