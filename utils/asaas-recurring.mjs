const MONTHLY_PLANS = new Set(["simple-mensal", "middle-mensal", "master-mensal"]);
const ALL_PLANS = new Set(["simple-mensal", "middle-mensal", "master-mensal", "simple-anual", "middle-anual", "master-anual"]);
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
export function buildMonthlyCardSubscription({ customerId, planCode, priceCents, externalReference, nextDueDate, shopName }) {
  const desc = shopName ? `Assinatura BarbeariaSP - ${shopName} (${plan(planCode)})`.slice(0, 250) : `BarbeariaSP ${plan(planCode)}`;
  return {
    customer: id(customerId, "customer"), billingType: "CREDIT_CARD", value: money(priceCents),
    nextDueDate: date(nextDueDate), cycle: "MONTHLY", description: desc,
    externalReference: id(externalReference, "external reference"), pixAutomaticAuthorizationMode: "DISABLED",
  };
}

/** Provider payload for recurring PIX subscription (MONTHLY or YEARLY). */
export function buildRecurringPixSubscription({ customerId, planCode, months, priceCents, externalReference, nextDueDate, shopName, planName }) {
  if (typeof planCode !== "string" || !ALL_PLANS.has(planCode)) throw new Error("Invalid plan");
  if (![1, 12].includes(months)) throw new Error("Invalid cycle months");
  const cycle = months === 12 ? "YEARLY" : "MONTHLY";
  const label = typeof planName === "string" && planName.trim() ? planName.trim() : planCode;
  const desc = shopName
    ? `Assinatura BarbeariaSP - ${shopName} (${label})`.slice(0, 250)
    : `Assinatura BarbeariaSP (${label})`;
  return {
    customer: id(customerId, "customer"),
    billingType: "PIX",
    value: money(priceCents),
    nextDueDate: date(nextDueDate),
    cycle,
    description: desc,
    externalReference: id(externalReference, "external reference"),
    pixAutomaticAuthorizationMode: "DISABLED",
  };
}

/** Provider payload for Pix Automatic Journey 3. Creation does not mean ACTIVE. */
export function buildMonthlyPixAutomaticAuthorization({ customerId, planCode, priceCents, contractId, startDate, shopName }) {
  if (typeof contractId !== "string" || !CONTRACT_ID.test(contractId)) throw new Error("Invalid contract");
  const desc = shopName ? `Assinatura BarbeariaSP - ${shopName} (${plan(planCode)})`.slice(0, 250) : `BarbeariaSP ${plan(planCode)}`;
  return {
    customerId: id(customerId, "customer"), frequency: "MONTHLY", contractId,
    startDate: date(startDate), value: money(priceCents), description: desc,
    paymentCreationMode: "SUBSCRIPTION", retryPolicy: "ALLOW_THREE_IN_SEVEN_DAYS",
    immediateQrCode: { expirationSeconds: 3600, originalValue: money(priceCents), description: shopName ? `Assinatura BarbeariaSP - ${shopName}`.slice(0, 100) : "Assinatura BarbeariaSP" },
  };
}
