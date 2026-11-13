import { safeSandboxCheckoutUrl, safeSandboxInvoiceUrl } from "./asaas-sandbox-url.ts";

export function extractErrorMessage(caught: unknown, fallback: string): string {
  if (caught && typeof caught === "object" && "message" in caught) {
    const msg = (caught as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0 && msg.length <= 240) {
      return msg.trim();
    }
  }
  return fallback;
}

type Input = {
  token: string;
  planCode: string;
  idempotencyKey: string;
  taxDocument?: string;
  phone?: string;
  responsibleName?: string;
};

async function apiError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    const message = typeof body?.error === "string" ? body.error.trim() : "";
    if (message && message.length <= 240 && !/[\r\n]/.test(message)) return message;
  } catch {
    // The server may have failed before returning its normal JSON envelope.
  }
  return fallback;
}

async function createOrder(input: Input, fetcher: typeof fetch) {
  const headers = { authorization: `Bearer ${input.token}`, "content-type": "application/json" };
  const order = await fetcher("/api/subscription-orders", { method: "POST", headers, cache: "no-store", body: JSON.stringify({ planCode: input.planCode, idempotencyKey: input.idempotencyKey, acceptedTerms: true }) });
  if (!order.ok) throw new Error(await apiError(order, "Não foi possível preparar o pedido."));
  const orderData = await order.json();
  if (typeof orderData?.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderData.orderId)) throw new Error("Resposta de pedido inválida.");
  return { headers, orderId: orderData.orderId };
}

export async function startSandboxSubscription(input: Input, fetcher: typeof fetch = fetch): Promise<string> {
  const { headers, orderId } = await createOrder(input, fetcher);
  const checkoutBody: Record<string, string> = { orderId };
  if (input.taxDocument) checkoutBody.taxDocument = input.taxDocument;
  if (input.phone) checkoutBody.phone = input.phone;
  if (input.responsibleName) checkoutBody.responsibleName = input.responsibleName;
  const checkout = await fetcher("/api/subscription-checkout", { method: "POST", headers, cache: "no-store", body: JSON.stringify(checkoutBody) });
  if (!checkout.ok) throw new Error(await apiError(checkout, "O checkout está indisponível ou aguardando conciliação."));
  const checkoutData = await checkout.json();
  return safeSandboxCheckoutUrl(checkoutData?.checkoutUrl, checkoutData?.checkoutId);
}

export async function startSandboxPixSubscription(input: Input, fetcher: typeof fetch = fetch): Promise<string> {
  const { headers, orderId } = await createOrder(input, fetcher);
  const pixBody: Record<string, string> = { orderId };
  if (input.taxDocument) pixBody.taxDocument = input.taxDocument;
  if (input.phone) pixBody.phone = input.phone;
  if (input.responsibleName) pixBody.responsibleName = input.responsibleName;
  const response = await fetcher("/api/subscription-pix", { method: "POST", headers, cache: "no-store", body: JSON.stringify(pixBody) });
  if (!response.ok) throw new Error(await apiError(response, "Não foi possível abrir o pagamento via PIX."));
  const data = await response.json();
  return safeSandboxInvoiceUrl(data?.invoiceUrl);
}

export async function startSandboxPixAutomatic(input: Input, fetcher: typeof fetch = fetch): Promise<{ authorizationId: string; paymentQr?: { payload?: string; encodedImage?: string } }> {
  const { headers, orderId } = await createOrder(input, fetcher);
  const response = await fetcher("/api/subscription-pix-automatic", { method: "POST", headers, cache: "no-store", body: JSON.stringify({ orderId }) });
  if (!response.ok) throw new Error(await apiError(response, "Não foi possível iniciar o Pix Automático."));
  const data = await response.json();
  if (typeof data?.authorizationId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(data.authorizationId)) throw new Error("Resposta de autorização inválida.");
  const qr = data.paymentQr;
  if (qr !== undefined && (!qr || typeof qr !== "object" || (typeof qr.payload !== "string" && typeof qr.encodedImage !== "string"))) throw new Error("QR de autorização inválido.");
  return { authorizationId: data.authorizationId, paymentQr: qr };
}
