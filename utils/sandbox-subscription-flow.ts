import { safeSandboxCheckoutUrl } from "./asaas-sandbox-url.ts";

type Input = { token: string; planCode: string; idempotencyKey: string };

export async function startSandboxSubscription(input: Input, fetcher: typeof fetch = fetch): Promise<string> {
  const headers = { authorization: `Bearer ${input.token}`, "content-type": "application/json" };
  const order = await fetcher("/api/subscription-orders", { method: "POST", headers, cache: "no-store", body: JSON.stringify({ planCode: input.planCode, idempotencyKey: input.idempotencyKey, acceptedTerms: true }) });
  if (!order.ok) throw new Error("Não foi possível preparar o pedido de teste.");
  const orderData = await order.json();
  if (typeof orderData?.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderData.orderId)) throw new Error("Resposta de pedido inválida.");
  const checkout = await fetcher("/api/subscription-checkout", { method: "POST", headers, cache: "no-store", body: JSON.stringify({ orderId: orderData.orderId }) });
  if (!checkout.ok) throw new Error("O checkout de teste está indisponível ou aguardando conciliação.");
  const checkoutData = await checkout.json();
  return safeSandboxCheckoutUrl(checkoutData?.checkoutUrl, checkoutData?.checkoutId);
}
