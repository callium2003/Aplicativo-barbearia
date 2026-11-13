import { sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { createOrReuseSandboxPixSubscription } from "../../../utils/subscription-pix-subscription-create.ts";

export const dynamic = "force-dynamic";

const reply = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!sandboxBillingEnabled()) return reply({ error: "Indisponível" }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token || !/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    return reply({ error: "Requisição inválida" }, 400);
  }
  let body: { orderId?: unknown; taxDocument?: unknown; phone?: unknown; responsibleName?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Requisição inválida" }, 400);
  }
  const clients = await verifiedSandboxClients(token);
  if (!clients) return reply({ error: "Autenticação necessária" }, 401);
  const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
  const account = process.env.ASAAS_SANDBOX_ACCOUNT_ID;
  if (!apiKey || !account) return reply({ error: "Indisponível" }, 503);

  const customerOverrides: { taxDocument?: string; phone?: string; responsibleName?: string } = {};
  if (typeof body.taxDocument === "string") customerOverrides.taxDocument = body.taxDocument;
  if (typeof body.phone === "string") customerOverrides.phone = body.phone;
  if (typeof body.responsibleName === "string") customerOverrides.responsibleName = body.responsibleName;

  const result = await createOrReuseSandboxPixSubscription(String(body.orderId || ""), {
    ...clients,
    account,
    asaasClient: createAsaasClient({ environment: "sandbox", apiKey }),
    customerOverrides: Object.keys(customerOverrides).length > 0 ? customerOverrides : undefined,
  });

  if (result.status === "invalid") return reply({ error: "Pedido inválido" }, 400);
  if (result.status === "unauthenticated") return reply({ error: "Autenticação necessária" }, 401);
  if (result.status === "billing_profile_required") {
    return reply({ error: "Complete seu CPF/CNPJ e celular antes de gerar a assinatura via PIX." }, 422);
  }
  if (result.status === "review_required") {
    return reply({ error: "Não foi possível gerar a cobrança PIX no momento. Tente novamente." }, 409);
  }
  return reply({ subscriptionId: result.subscriptionId, invoiceUrl: result.invoiceUrl }, 200);
}
