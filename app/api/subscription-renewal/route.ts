import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
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
    if (!identity.data.user) return reply({ error: "Entre novamente para continuar." }, 401);
    const user = identity.data.user;
    const shops = await clients.adminClient.from("barbershops").select("id, name").eq("owner_id", user.id);
    if (shops.error) throw new Error("Owner lookup failed");
    if (!shops.data?.length) return reply({ error: "Somente o proprietário pode gerenciar a renovação." }, 403);
    if (shops.data.length !== 1) return reply({ error: "Selecione a barbearia antes de gerenciar sua renovação." }, 409);
    // Never accept provider IDs, price or tenant authority from the browser.
    const orders = await clients.adminClient.from("subscription_orders")
      .select("id,months,billing_mode,provider_subscription_id,provider_pix_authorization_id,provider_account_id,status")
      .in("barbershop_id", shops.data.map(shop => shop.id)).eq("provider_environment", "sandbox")
      .order("created_at", { ascending: false }).limit(20);
    if (orders.error) throw new Error("Order lookup failed");
    const shop = shops.data[0];
    const subQuery = await clients.adminClient
      .from("barbershop_subscriptions")
      .select("id,status,plan_code,current_period_ends_at")
      .eq("barbershop_id", shop.id)
      .maybeSingle();
    const isCancelled = subQuery.data?.status === "cancelled";

    const linked = orders.data?.filter(order => (order.provider_subscription_id || order.provider_pix_authorization_id) && order.status === "CONFIRMED") ?? [];
    if (linked.length > 1) return reply({ error: "Há mais de uma recorrência vinculada. É necessário conferir os contratos antes de cancelar." }, 409);
    const order = linked[0];

    if (!order) {
      const confirmedOrder = orders.data?.find(o => o.status === "CONFIRMED");
      const kind = confirmedOrder?.months === 12 ? ("annual_purchase" as const) : ("unlinked" as const);
      if (!cancel || isCancelled) return reply({ kind, cancelled: Boolean(isCancelled) });

      if (confirmedOrder) {
        await clients.adminClient
          .from("subscription_orders")
          .update({ recurring_state: "CANCELED", updated_at: new Date().toISOString() })
          .eq("id", confirmedOrder.id);
      }

      await clients.adminClient
        .from("barbershop_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("barbershop_id", shop.id);

      try {
        const [subResult, regResult] = await Promise.all([
          clients.adminClient
            .from("barbershop_subscriptions")
            .select("plan_code,current_period_ends_at,status")
            .eq("barbershop_id", shop.id)
            .maybeSingle(),
          clients.adminClient
            .from("barbershop_registration_details")
            .select("contact_phone,responsible_name")
            .eq("barbershop_id", shop.id)
            .maybeSingle(),
        ]);

        const endsAt = subResult.data?.current_period_ends_at
          ? new Date(subResult.data.current_period_ends_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "período contratado";
        const phone = regResult.data?.contact_phone || "não informado";
        const ownerName = regResult.data?.responsible_name || user.email || "Proprietário";

        const subject = `[Alerta de Retenção] Cancelamento: ${shop.name || "Barbearia"}`;
        const description =
          `A barbearia "${shop.name || "Barbearia"}" solicitou o cancelamento da assinatura.\n\n` +
          `• Barbearia ID: ${shop.id}\n` +
          `• Responsável: ${ownerName}\n` +
          `• E-mail: ${user.email || "não informado"}\n` +
          `• Telefone/WhatsApp: ${phone}\n` +
          `• Plano: ${confirmedOrder?.months === 12 ? "Anual" : "Mensal / Avulso"}\n` +
          `• Acesso liberado até: ${endsAt}\n\n` +
          `Ação recomendada para a equipe BarbeariaSP: Realizar contato ativo com o cliente para entender a motivação do cancelamento, oferecer contraproposta ou desconto especial de retenção e reverter o cancelamento antes do encerramento da vigência.`;

        await clients.adminClient
          .from("platform_support_tickets")
          .insert({
            barbershop_id: shop.id,
            requester_id: user.id,
            subject,
            description,
            status: "OPEN",
            priority: "HIGH",
            category: "BILLING",
          });
      } catch {
        // Non-blocking
      }

      return reply({ kind, cancelled: true });
    }
    const billingConfig = resolveAsaasBillingConfig();
    if (!billingConfig.apiKey || order.provider_account_id !== billingConfig.account) throw new Error("Provider binding unavailable");
    const client = createAsaasClient({ environment: billingConfig.environment, apiKey: billingConfig.apiKey });
    const pix = order.billing_mode === "PIX_AUTOMATIC";
    const id = pix ? order.provider_pix_authorization_id : order.provider_subscription_id;
    if (!id) throw new Error("Missing recurrence binding");
    const current = pix ? await client.getPixAutomaticAuthorization(id) : await client.getSubscription(id);
    const cancelled = pix ? current.status === "CANCELLED" : current.deleted === true || current.status === "INACTIVE";
    if (!cancel || cancelled) return reply({ kind: pix ? "pix" : "card", cancelled });
    const result = pix ? await client.cancelPixAutomaticAuthorization(id) : await client.cancelSubscription(id);
    const confirmed = pix ? result.id === id && result.status === "CANCELLED" : result.id === id && result.deleted === true;
    if (!confirmed) return reply({ error: "O Asaas ainda não confirmou o cancelamento. Atualize a situação antes de tentar novamente." }, 409);

    await clients.adminClient
      .from("subscription_orders")
      .update({ recurring_state: "CANCELED", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    await clients.adminClient
      .from("barbershop_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("barbershop_id", shop.id);

    try {
      const [subResult, regResult] = await Promise.all([
        clients.adminClient
          .from("barbershop_subscriptions")
          .select("plan_code,current_period_ends_at,status")
          .eq("barbershop_id", shop.id)
          .maybeSingle(),
        clients.adminClient
          .from("barbershop_registration_details")
          .select("contact_phone,responsible_name")
          .eq("barbershop_id", shop.id)
          .maybeSingle(),
      ]);

      const endsAt = subResult.data?.current_period_ends_at
        ? new Date(subResult.data.current_period_ends_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
        : "período contratado";
      const phone = regResult.data?.contact_phone || "não informado";
      const ownerName = regResult.data?.responsible_name || user.email || "Proprietário";

      const subject = `[Alerta de Retenção] Cancelamento: ${shop.name || "Barbearia"}`;
      const description =
        `A barbearia "${shop.name || "Barbearia"}" solicitou o cancelamento da renovação automática no Asaas.\n\n` +
        `• Barbearia ID: ${shop.id}\n` +
        `• Responsável: ${ownerName}\n` +
        `• E-mail: ${user.email || "não informado"}\n` +
        `• Telefone/WhatsApp: ${phone}\n` +
        `• Plano: ${order.months === 12 ? "Anual" : "Mensal"}\n` +
        `• Acesso liberado até: ${endsAt}\n\n` +
        `Ação recomendada para a equipe BarbeariaSP: Realizar contato ativo com o cliente para entender a motivação do cancelamento, oferecer contraproposta ou desconto especial de retenção e reverter o cancelamento antes do encerramento da vigência.`;

      const ticket = await clients.adminClient
        .from("platform_support_tickets")
        .insert({
          barbershop_id: shop.id,
          created_by: user.id,
          created_by_role: "owner",
          category_id: "billing",
          subject,
          description,
          priority: "high",
          status: "open",
          faq_consulted: true,
        })
        .select("id")
        .maybeSingle();

      if (ticket.data?.id) {
        await clients.adminClient.from("platform_support_ticket_messages").insert({
          ticket_id: ticket.data.id,
          sender_user_id: user.id,
          sender_type: "tenant",
          message: "Cancelamento da renovação automática solicitado pelo proprietário. Chamado de retenção aberto automaticamente.",
        });
      }
    } catch {
      // Non-blocking: notification recording failure does not affect provider cancellation
    }

    // Paid periods remain untouched. The configured asaas-sandbox-webhook persists provider events.
    return reply({ kind: pix ? "pix" : "card", cancelled: true });
  } catch {
    return reply({ error: "Não foi possível confirmar a renovação no Asaas. A vigência paga foi preservada. Tente atualizar a situação." }, 502);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
