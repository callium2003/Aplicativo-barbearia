import { subscriptionPlans } from "./subscription-plans.ts";

type AnnualCheckoutInput = {
  orderId: string;
  planCode: string;
  /** Trusted server configuration, never derived from Host or a browser input. */
  callbackOrigin: string;
};

/**
 * Builds an initial annual card purchase; does not submit it or grant access.
 * Before calling the provider, the authorized backend must persist this offer
 * snapshot and the unique order id. Renewals/discounts need their own contract.
 * Sources: EFS §§24.1/44.1 and Asaas "Checkout para Cartão de Crédito".
 */
export function buildAnnualCardCheckout({ orderId, planCode, callbackOrigin }: AnnualCheckoutInput) {
  const plan = subscriptionPlans.find((item) => item.code === planCode && item.months === 12);
  if (!plan) throw new Error("Plano anual inválido");
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error("Pedido inválido");
  }
  let origin: URL;
  try { origin = new URL(callbackOrigin); } catch { throw new Error("Origem de retorno inválida"); }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash
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
    items: [{ name: plan.name, description: "12 meses de acesso ao BarbeariaSP; renovação mediante nova autorização.", quantity: 1, value: plan.priceCents / 100 }],
    installment: { maxInstallmentCount: plan.maxInstallments },
  };
}
