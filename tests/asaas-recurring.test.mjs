import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyCardSubscription, buildMonthlyPixAutomaticAuthorization } from "../utils/asaas-recurring.mjs";

test("builds a monthly credit-card subscription without Pix Automatic", () => {
  const payload = buildMonthlyCardSubscription({ customerId: "cus_123", planCode: "simple-mensal", priceCents: 4990, externalReference: "order_1", nextDueDate: "2026-12-08" });
  assert.deepEqual(payload, { customer: "cus_123", billingType: "CREDIT_CARD", value: 49.9, nextDueDate: "2026-12-08", cycle: "MONTHLY", description: "BarbeariaSP simple-mensal", externalReference: "order_1", pixAutomaticAuthorizationMode: "DISABLED" });
});

test("builds a monthly Pix Automatic authorization in subscription mode", () => {
  const payload = buildMonthlyPixAutomaticAuthorization({ customerId: "cus_123", planCode: "simple-mensal", priceCents: 4990, contractId: "order_1", startDate: "2026-12-08" });
  assert.equal(payload.customerId, "cus_123");
  assert.equal(payload.frequency, "MONTHLY");
  assert.equal(payload.paymentCreationMode, "SUBSCRIPTION");
  assert.equal(payload.value, 49.9);
  assert.equal(payload.retryPolicy, "ALLOW_THREE_IN_SEVEN_DAYS");
  assert.deepEqual(payload.immediateQrCode, { expirationSeconds: 3600, originalValue: 49.9, description: "Assinatura BarbeariaSP" });
});

test("rejects annual, legacy and unsafe recurring inputs", () => {
  assert.throws(() => buildMonthlyCardSubscription({ customerId: "cus_123", planCode: "master-anual", priceCents: 119900, externalReference: "order_1", nextDueDate: "2026-12-08" }));
  assert.throws(() => buildMonthlyPixAutomaticAuthorization({ customerId: "cus_123", planCode: "simple-mensal", priceCents: 4990, contractId: "order_1", startDate: "2026-02-31" }));
});
