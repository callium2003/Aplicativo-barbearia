import { sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";

export const dynamic = "force-dynamic";
const reply = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  if (!sandboxBillingEnabled()) return reply({ error: "Indisponível" }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) return reply({ error: "Entre novamente para continuar." }, 401);

  try {
    const clients = await verifiedSandboxClients(token);
    if (!clients) return reply({ error: "Entre novamente para continuar." }, 401);

    const identity = await clients.userClient.auth.getUser();
    if (!identity.data.user) return reply({ error: "Entre novamente para continuar." }, 401);

    const url = new URL(request.url);
    const barbershopId = url.searchParams.get("barbershopId");

    const shopsQuery = clients.adminClient
      .from("barbershops")
      .select("id, name")
      .eq("owner_id", identity.data.user.id);
    if (barbershopId) {
      shopsQuery.eq("id", barbershopId);
    }
    const shops = await shopsQuery;
    if (shops.error) throw new Error("Owner lookup failed");
    if (!shops.data?.length) return reply({ error: "Somente o proprietário pode visualizar as cobranças." }, 403);

    const shopIds = shops.data.map((s) => s.id);

    const orders = await clients.adminClient
      .from("subscription_orders")
      .select("id, barbershop_id, plan_name, months, price_cents, status, created_at, provider_checkout_url")
      .in("barbershop_id", shopIds)
      .eq("provider_environment", "sandbox")
      .order("created_at", { ascending: false })
      .limit(50);

    if (orders.error) throw new Error("Order lookup failed");

    const bills = (orders.data || []).map((order) => {
      let status: "pending" | "paid" | "overdue" | "refunded" = "pending";
      if (order.status === "CONFIRMED") {
        status = "paid";
      } else if (order.status === "CANCELED") {
        status = "refunded";
      } else if (order.status === "REVIEW_REQUIRED") {
        status = "overdue";
      } else {
        status = "pending";
      }

      const cycleLabel = order.months === 12 ? " (Anual)" : " (Mensal)";
      return {
        id: order.id,
        label: `${order.plan_name}${cycleLabel}`,
        date: order.created_at,
        amountCents: order.price_cents,
        status,
        checkoutUrl: status === "pending" ? order.provider_checkout_url : null,
      };
    });

    return reply({ bills });
  } catch {
    return reply({ error: "Não foi possível carregar o histórico financeiro." }, 500);
  }
}
