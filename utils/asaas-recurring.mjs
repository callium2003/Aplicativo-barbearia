const MONTHLY_PLANS = new Set(["simple-mensal", "middle-mensal", "master-mensal"]);
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const CONTRACT_ID = /^[A-Za-z0-9_-]{1,35}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function id(value, label) {
  if (typeof value !== "string" || !ID.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function money(priceCents) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 1) throw new Error("Invalid price");
  return priceCents / 100;
}

function date(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) throw new Error("Invalid date");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return value;
}

function plan(planCode) {
  if (typeof planCode !== "string" || !MONTHLY_PLANS.has(planCode)) throw new Error("Invalid monthly plan");
  return planCode;
}

/** Provider payload for monthly card recurrence. It never contains card data. */
export function buildMonthlyCardSubscription({ customerId, planCode, priceCents, externalReference, nextDueDate }) {
  return {
    customer: id(customerId, "customer"), billingType: "CREDIT_CARD", value: money(priceCents),
    nextDueDate: date(nextDueDate), cycle: "MONTHLY", description: `BarbeariaSP ${plan(planCode)}`,
    externalReference: id(externalReference, "external reference"), pixAutomaticAuthorizationMode: "DISABLED",
  };
}

/** Provider payload for Pix Automatic Journey 3. Creation does not mean ACTIVE. */
export function buildMonthlyPixAutomaticAuthorization({ customerId, planCode, priceCents, contractId, startDate }) {
  if (typeof contractId !== "string" || !CONTRACT_ID.test(contractId)) throw new Error("Invalid contract");
  return {
    customerId: id(customerId, "customer"), frequency: "MONTHLY", contractId,
    startDate: date(startDate), value: money(priceCents), description: `BarbeariaSP ${plan(planCode)}`,
    paymentCreationMode: "SUBSCRIPTION", retryPolicy: "ALLOW_THREE_IN_SEVEN_DAYS",
    immediateQrCode: { expirationSeconds: 3600, originalValue: money(priceCents), description: "Assinatura BarbeariaSP" },
  };
}
