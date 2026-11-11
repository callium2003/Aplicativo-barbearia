export type AsaasCustomerData = {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
};

type AnnualCheckoutInput = {
  orderId: string;
  /** Snapshot read by the authorized backend from the persisted order, never browser input. */
  offer: { planCode: string; planName: string; months: number; priceCents: number; maxInstallments: number; userLimit: number };
  /** Trusted server configuration, never derived from Host or a browser input. */
  callbackOrigin: string;
  /** Permitted only by the local Sandbox adapter; production must leave this false. */
  allowLocalCallback?: boolean;
  nextDueDate?: string;
  /** Pre-filled customer registration details when available in the platform database. */
  customerData?: AsaasCustomerData;
  shopName?: string;
};

type MonthlyCheckoutInput = {
  orderId: string;
  offer: { planCode: string; planName: string; months: number; priceCents: number; maxInstallments: number; userLimit: number };
  callbackOrigin: string;
  allowLocalCallback?: boolean;
  nextDueDate?: string;
  customerData?: AsaasCustomerData;
  shopName?: string;
};

function buildCallback(origin: URL, orderId: string) {
  const callback = (state: string) => {
    const url = new URL("/painel/assinatura", origin);
    url.searchParams.set("pedido", orderId);
    url.searchParams.set("checkout", state);
    return url.href;
  };
  return { successUrl: callback("retorno"), cancelUrl: callback("cancelado"), expiredUrl: callback("expirado") };
}

function validateCallbackOrigin(callbackOrigin: string, allowLocalCallback: boolean) {
  let origin: URL;
  try { origin = new URL(callbackOrigin); } catch { throw new Error("Origem de retorno inválida"); }
  const localHttp = allowLocalCallback && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !localHttp) || origin.username || origin.password || origin.search || origin.hash
    || origin.pathname !== "/" || callbackOrigin !== origin.origin) throw new Error("Origem de retorno inválida");
  return origin;
}

/**
 * Builds an annual recurring card checkout; creates the yearly recurrence after payment.
 * Before calling the provider, the authorized backend must persist this offer
 * snapshot and the unique order id.
 * Sources: EFS §§24.1/44.1 and Asaas "Checkout para Assinaturas".
 */
export function buildAnnualCardCheckout({ orderId, offer: plan, callbackOrigin, allowLocalCallback = false, nextDueDate, customerData, shopName }: AnnualCheckoutInput) {
  if (!plan || !["simple-anual", "middle-anual", "master-anual"].includes(plan.planCode)
    || typeof plan.planName !== "string" || !plan.planName.trim() || plan.planName.length > 120
    || plan.months !== 12 || !Number.isSafeInteger(plan.priceCents) || plan.priceCents < 1
    || !Number.isInteger(plan.maxInstallments) || plan.maxInstallments < 1 || plan.maxInstallments > 3
    || !Number.isInteger(plan.userLimit) || plan.userLimit < 1) throw new Error("Plano anual inválido");
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error("Pedido inválido");
  }
  const dueDate = nextDueDate || new Date().toISOString().slice(0, 10);
  if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`))) {
    throw new Error("Vencimento inválido");
  }
  const origin = validateCallbackOrigin(callbackOrigin, allowLocalCallback);
  const itemName = shopName ? `${plan.planName} - ${shopName}`.slice(0, 100) : plan.planName;
  const itemDescription = shopName
    ? `Assinatura BarbeariaSP - ${shopName} (${plan.planName})`.slice(0, 250)
    : "12 meses de acesso ao BarbeariaSP; renovação automática a cada ano até o cancelamento do cliente.";
  return {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 60,
    externalReference: orderId,
    callback: buildCallback(origin, orderId),
    items: [{ name: itemName, description: itemDescription, quantity: 1, value: plan.priceCents / 100 }],
    subscription: { cycle: "YEARLY", nextDueDate: dueDate },
    ...(customerData ? { customerData } : {}),
  };
}

/** Builds a hosted monthly credit-card checkout that creates the recurrence after payment. */
export function buildMonthlyRecurringCardCheckout({ orderId, offer: plan, callbackOrigin, allowLocalCallback = false, nextDueDate, customerData, shopName }: MonthlyCheckoutInput) {
  if (!plan || !["simple-mensal", "middle-mensal", "master-mensal"].includes(plan.planCode)
    || typeof plan.planName !== "string" || !plan.planName.trim() || plan.planName.length > 120
    || plan.months !== 1 || !Number.isSafeInteger(plan.priceCents) || plan.priceCents < 1
    || plan.maxInstallments !== 1 || !Number.isInteger(plan.userLimit) || plan.userLimit < 1) throw new Error("Plano mensal inválido");
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) throw new Error("Pedido inválido");
  if (typeof nextDueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate) || Number.isNaN(Date.parse(`${nextDueDate}T00:00:00Z`))) throw new Error("Vencimento inválido");
  const origin = validateCallbackOrigin(callbackOrigin, allowLocalCallback);
  const itemName = shopName ? `${plan.planName} - ${shopName}`.slice(0, 100) : plan.planName;
  const itemDescription = shopName
    ? `Assinatura BarbeariaSP - ${shopName} (${plan.planName})`.slice(0, 250)
    : "1 mês de acesso ao BarbeariaSP; renovação automática ao final de cada período até o cancelamento do cliente.";
  return {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 60,
    externalReference: orderId,
    callback: buildCallback(origin, orderId),
    items: [{ name: itemName, description: itemDescription, quantity: 1, value: plan.priceCents / 100 }],
    subscription: { cycle: "MONTHLY", nextDueDate },
    ...(customerData ? { customerData } : {}),
  };
}
