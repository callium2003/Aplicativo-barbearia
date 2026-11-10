import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const reply = (data, status) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const code = /^[A-Z][A-Z0-9_]{0,99}$/;
const id = /^[A-Za-z0-9_-]{1,128}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalId(value) { return typeof value === "string" && id.test(value) ? value : ""; }

function recurringEvent(body) {
  const subscriptionId = optionalId(body.subscription?.id ?? body.payment?.subscription);
  const authorizationId = optionalId(body.authorization?.id ?? body.paymentInstruction?.authorization?.id ?? body.payment?.pixAutomaticAuthorizationId);
  const paymentId = optionalId(body.payment?.id ?? body.paymentInstruction?.paymentId);
  const externalReference = body.subscription?.externalReference ?? body.payment?.externalReference;
  const resourceStatus = typeof (body.authorization?.status ?? body.subscription?.status ?? body.payment?.status ?? body.paymentInstruction?.status) === "string"
    ? body.authorization?.status ?? body.subscription?.status ?? body.payment?.status ?? body.paymentInstruction?.status : "";
  return subscriptionId || authorizationId || paymentId ? { subscriptionId, authorizationId, paymentId, externalReference: typeof externalReference === "string" && uuid.test(externalReference) ? externalReference : null, resourceStatus } : null;
}

export async function handleAsaasSandboxWebhook(request, { enabled, token, account, persist, persistRecurring, bootstrap = undefined }) {
  if (!enabled) return reply({ error: "Indisponível" }, 404);
  if (typeof token !== "string" || token.length < 32 || token.length > 255 || /\s/.test(token) || (!(typeof account === "string" && id.test(account)) && typeof bootstrap !== "function")) return reply({ error: "Indisponível" }, 503);
  const received = request.headers.get("asaas-access-token") || "";
  const expectedBytes = Buffer.from(token);
  const actualBytes = Buffer.from(received);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return reply({ error: "Não autorizado" }, 401);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "Formato inválido" }, 400);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Formato inválido" }, 400);
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); return reply({ error: "Requisição muito grande" }, 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: "Formato inválido" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Formato inválido" }, 400);
    if (!account && typeof bootstrap === 'function') {
      if (typeof body.account?.id !== 'string' || !id.test(body.account.id)) return reply({ error: 'Evento inválido' }, 400);
      await bootstrap(body.account.id);
      return reply({ error: 'Configuração pendente' }, 503);
    }
    if (body.account?.id !== account) return reply({ error: "Conta inválida" }, 403);
    if (typeof body.id !== "string" || body.id.length < 1 || body.id.length > 256 || /\s/.test(body.id)
      || typeof body.event !== "string" || !code.test(body.event)) return reply({ error: "Evento inválido" }, 400);
    if (typeof body.checkout?.id === "string" && id.test(body.checkout.id) && typeof body.checkout?.status === "string" && code.test(body.checkout.status)) {
      await persist({ p_account: account, p_event_id: body.id, p_event_type: body.event, p_checkout_id: body.checkout.id, p_checkout_status: body.checkout.status });
    } else {
      const recurring = recurringEvent(body);
      if (!recurring || typeof persistRecurring !== "function") return reply({ error: "Evento inválido" }, 400);
      await persistRecurring({ p_account: account, p_event_id: body.id, p_event_type: body.event,
        p_subscription_id: recurring.subscriptionId, p_pix_authorization_id: recurring.authorizationId,
        p_payment_id: recurring.paymentId, p_external_reference: recurring.externalReference, p_resource_status: recurring.resourceStatus });
    }
    return reply({ received: true }, 200);
  } catch {
    return reply({ error: "Não foi possível registrar o evento" }, 500);
  }
}
