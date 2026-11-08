type AnnualCheckoutInput = {
  orderId: string;
  /** Snapshot read by the authorized backend from the persisted order, never browser input. */
  offer: { planCode: string; planName: string; months: number; priceCents: number; maxInstallments: number; userLimit: number };
  /** Trusted server configuration, never derived from Host or a browser input. */
  callbackOrigin: string;
  /** Permitted only by the local Sandbox adapter; production must leave this false. */
  allowLocalCallback?: boolean;
};

/**
 * Builds an initial annual card purchase; does not submit it or grant access.
 * Before calling the provider, the authorized backend must persist this offer
 * snapshot and the unique order id. Renewals/discounts need their own contract.
 * Sources: EFS §§24.1/44.1 and Asaas "Checkout para Cartão de Crédito".
 */
export function buildAnnualCardCheckout({ orderId, offer: plan, callbackOrigin, allowLocalCallback = false }: AnnualCheckoutInput) {
  if (!plan || !["simple-anual", "middle-anual", "master-anual"].includes(plan.planCode)
    || typeof plan.planName !== "string" || !plan.planName.trim() || plan.planName.length > 120
    || plan.months !== 12 || !Number.isSafeInteger(plan.priceCents) || plan.priceCents < 1
    || !Number.isInteger(plan.maxInstallments) || plan.maxInstallments < 1 || plan.maxInstallments > 3
    || !Number.isInteger(plan.userLimit) || plan.userLimit < 1) throw new Error("Plano anual inválido");
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error("Pedido inválido");
  }
  let origin: URL;
  try { origin = new URL(callbackOrigin); } catch { throw new Error("Origem de retorno inválida"); }
  const localHttp = allowLocalCallback && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !localHttp) || origin.username || origin.password || origin.search || origin.hash
    || origin.pathname !== "/" || callbackOrigin !== origin.origin) {
    throw new Error("Origem de retorno inválida");
  }
  const callback = (state: string) => {
    const url = new URL("/painel/assinatura", origin);
    url.searchParams.set("pedido", orderId);
    url.searchParams.set("checkout", state);
    return url.href;
  };
  return {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    minutesToExpire: 60,
    externalReference: orderId,
    callback: { successUrl: callback("retorno"), cancelUrl: callback("cancelado"), expiredUrl: callback("expirado") },
    items: [{ name: plan.planName, description: "12 meses de acesso ao BarbeariaSP; renovação mediante nova autorização.", quantity: 1, value: plan.priceCents / 100 }],
    installment: { maxInstallmentCount: plan.maxInstallments },
  };
}
