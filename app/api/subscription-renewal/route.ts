import { sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";

export const dynamic = "force-dynamic";
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function handle(request: Request, cancel: boolean) {
  if (!sandboxBillingEnabled()) return reply({ error: "Indisponível" }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) return reply({ error: "Entre novamente para continuar." }, 401);
  try {
    const clients = await verifiedSandboxClients(token);
    if (!clients) return reply({ error: "Entre novamente para continuar." }, 401);
    const identity = await clients.userClient.auth.getUser();
    const shops = await clients.adminClient.from("barbershops").select("id").eq("owner_id", identity.data.user!.id);
    if (shops.error) throw new Error("Owner lookup failed");
    if (!shops.data?.length) return reply({ error: "Somente o proprietário pode gerenciar a renovação." }, 403);
    if (shops.data.length !== 1) return reply({ error: "Selecione a barbearia antes de gerenciar sua renovação." }, 409);
    // Never accept provider IDs, price or tenant authority from the browser.
    const orders = await clients.adminClient.from("subscription_orders")
      .select("id,months,billing_mode,provider_subscription_id,provider_pix_authorization_id,provider_account_id")
      .in("barbershop_id", shops.data.map(shop => shop.id)).eq("provider_environment", "sandbox")
      .order("created_at", { ascending: false }).limit(20);
    if (orders.error) throw new Error("Order lookup failed");
    const linked = orders.data?.filter(order => order.provider_subscription_id || order.provider_pix_authorization_id) ?? [];
    if (linked.length > 1) return reply({ error: "Há mais de uma recorrência vinculada. É necessário conferir os contratos antes de cancelar." }, 409);
    const order = linked[0];
    if (!order) {
      if (cancel) return reply({ error: "Nenhuma renovação automática foi localizada no provedor. A contratação precisa ser conferida antes do cancelamento." }, 409);
      return reply({ kind: orders.data?.[0]?.months === 12 ? "annual_purchase" : "unlinked" });
    }
    if (!process.env.ASAAS_SANDBOX_API_KEY || order.provider_account_id !== process.env.ASAAS_SANDBOX_ACCOUNT_ID) throw new Error("Provider binding unavailable");
    const client = createAsaasClient({ environment: "sandbox", apiKey: process.env.ASAAS_SANDBOX_API_KEY });
    const pix = order.billing_mode === "PIX_AUTOMATIC";
    const id = pix ? order.provider_pix_authorization_id : order.provider_subscription_id;
    if (!id) throw new Error("Missing recurrence binding");
    const current = pix ? await client.getPixAutomaticAuthorization(id) : await client.getSubscription(id);
    const cancelled = pix ? current.status === "CANCELLED" : current.deleted === true || current.status === "INACTIVE";
    if (!cancel || cancelled) return reply({ kind: pix ? "pix" : "card", cancelled });
    const result = pix ? await client.cancelPixAutomaticAuthorization(id) : await client.cancelSubscription(id);
    const confirmed = pix ? result.id === id && result.status === "CANCELLED" : result.id === id && result.deleted === true;
    if (!confirmed) return reply({ error: "O Asaas ainda não confirmou o cancelamento. Atualize a situação antes de tentar novamente." }, 409);
    // Paid periods remain untouched. The configured asaas-sandbox-webhook persists provider events.
    return reply({ kind: pix ? "pix" : "card", cancelled: true });
  } catch {
    return reply({ error: "Não foi possível confirmar a renovação no Asaas. A vigência paga foi preservada. Tente atualizar a situação." }, 502);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
