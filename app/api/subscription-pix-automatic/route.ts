import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { createPixAutomaticSubscription } from "../../../utils/subscription-pix-automatic-create.mjs";

export const dynamic = "force-dynamic";

const reply = (body: Record<string, unknown>, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!sandboxBillingEnabled()) return reply({ error: "Indisponível" }, 404);
  const billingConfig = resolveAsaasBillingConfig();
  if (billingConfig.environment === "production") {
    return reply({ error: "Pix Automático disponível apenas em ambiente de testes." }, 404);
  }
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token || !/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "Requisição inválida" }, 400);
  let body: { orderId?: unknown };
  try { body = await request.json(); } catch { return reply({ error: "Requisição inválida" }, 400); }
  const clients = await verifiedSandboxClients(token);
  if (!clients) return reply({ error: "Autenticação necessária" }, 401);
  const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
  if (!apiKey) return reply({ error: "Indisponível" }, 503);
  const result = await createPixAutomaticSubscription(body.orderId, { ...clients, asaasClient: createAsaasClient({ environment: "sandbox", apiKey }) });
  if (result.status === "invalid") return reply({ error: "Pedido inválido" }, 400);
  if (result.status === "unauthenticated") return reply({ error: "Autenticação necessária" }, 401);
  if (result.status === "billing_profile_required") return reply({ error: "Complete os dados de cobrança da barbearia antes de contratar." }, 422);
  if (result.status === "review_required") return reply({ error: "A autorização está em revisão. Não tente criar outra." }, 409);
  return reply({ authorizationId: result.authorizationId, paymentQr: result.paymentQr }, 200);
}
