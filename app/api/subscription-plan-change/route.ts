import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { subscriptionPlans } from "../../../utils/subscription-plans.ts";

export const dynamic = "force-dynamic";
const reply = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

function matchPlanFromAsaas(value: unknown, cycle: unknown) {
  if (typeof value !== "number" || typeof cycle !== "string") return null;
  const priceCents = Math.round(value * 100);
  const months = cycle === "YEARLY" ? 12 : cycle === "MONTHLY" ? 1 : null;
  if (!months) return null;
  return subscriptionPlans.find((p) => p.priceCents === priceCents && p.months === months) ?? null;
}

async function resolveOwnerSubscription(token: string) {
  const clients = await verifiedSandboxClients(token);
  if (!clients) return { errorResponse: reply({ error: "Entre novamente para continuar." }, 401) };

  const identity = await clients.userClient.auth.getUser();
  if (!identity.data.user) return { errorResponse: reply({ error: "Entre novamente para continuar." }, 401) };

  const shops = await clients.adminClient
    .from("barbershops")
    .select("id, name")
    .eq("owner_id", identity.data.user.id);
  if (shops.error) throw new Error("Owner lookup failed");
  if (!shops.data?.length) return { errorResponse: reply({ error: "Somente o proprietário pode alterar o plano." }, 403) };
  if (shops.data.length !== 1) return { errorResponse: reply({ error: "Selecione a barbearia antes de alterar o plano." }, 409) };

  const shop = shops.data[0];
  const [subRes, ordersRes] = await Promise.all([
    clients.adminClient
      .from("barbershop_subscriptions")
      .select("status, plan_code, current_period_ends_at")
      .eq("barbershop_id", shop.id)
      .maybeSingle(),
    clients.adminClient
      .from("subscription_orders")
      .select("id, billing_mode, provider_subscription_id, provider_account_id, status")
      .eq("barbershop_id", shop.id)
      .eq("provider_environment", "sandbox")
      .eq("status", "CONFIRMED")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (subRes.error || ordersRes.error) throw new Error("Subscription lookup failed");
  if (!subRes.data || subRes.data.status !== "active") {
    return { errorResponse: reply({ error: "A alteração de plano está disponível apenas para assinaturas ativas." }, 409) };
  }

  const linkedOrder = (ordersRes.data || []).find((o) => Boolean(o.provider_subscription_id));
  if (!linkedOrder || !linkedOrder.provider_subscription_id) {
    return { errorResponse: reply({ error: "Assinatura recorrente vinculada no Asaas não encontrada para alteração automática." }, 409) };
  }
  const billingConfig = resolveAsaasBillingConfig();
  if (!billingConfig.apiKey || linkedOrder.provider_account_id !== billingConfig.account) {
    throw new Error("Provider binding unavailable");
  }

  const asaasClient = createAsaasClient({ environment: billingConfig.environment, apiKey: billingConfig.apiKey });
  return { shop, subscription: subRes.data, providerSubscriptionId: linkedOrder.provider_subscription_id, asaasClient, adminClient: clients.adminClient };
}

export async function GET(request: Request) {
  if (!sandboxBillingEnabled()) return reply({ error: "Indisponível" }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) return reply({ error: "Entre novamente para continuar." }, 401);

  try {
    const resolved = await resolveOwnerSubscription(token);
    if ("errorResponse" in resolved) return resolved.errorResponse;

    const [asaasSub, scheduledRes] = await Promise.all([
      resolved.asaasClient.getSubscription(resolved.providerSubscriptionId),
      resolved.adminClient
        .from("subscription_scheduled_plan_changes")
        .select("plan_code, plan_name, months, price_cents, user_limit")
        .eq("barbershop_id", resolved.shop.id)
        .eq("provider_subscription_id", resolved.providerSubscriptionId)
        .eq("status", "SCHEDULED")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const scheduledFromAsaas = matchPlanFromAsaas(asaasSub?.value, asaasSub?.cycle);
    const scheduledPlanCode = scheduledRes?.data?.plan_code ?? scheduledFromAsaas?.code ?? resolved.subscription.plan_code;

    return reply({
      currentPlanCode: resolved.subscription.plan_code,
      currentPeriodEndsAt: resolved.subscription.current_period_ends_at,
      scheduledPlanCode,
      nextDueDate: asaasSub?.nextDueDate ?? null,
    });
  } catch {
    return reply({ error: "Não foi possível consultar a assinatura no Asaas." }, 502);
  }
}

export async function POST(request: Request) {
  if (!sandboxBillingEnabled()) return reply({ error: "Indisponível" }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) return reply({ error: "Entre novamente para continuar." }, 401);

  let body: { planCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Dados inválidos." }, 400);
  }

  const targetPlan = subscriptionPlans.find((p) => p.code === body?.planCode);
  if (!targetPlan) {
    return reply({ error: "Plano selecionado inválido." }, 400);
  }

  try {
    const resolved = await resolveOwnerSubscription(token);
    if ("errorResponse" in resolved) return resolved.errorResponse;

    const currentAsaasSub = await resolved.asaasClient.getSubscription(resolved.providerSubscriptionId);
    if (currentAsaasSub?.deleted || currentAsaasSub?.status === "INACTIVE") {
      return reply({ error: "A assinatura recorrente já foi cancelada no Asaas." }, 409);
    }

    const updated = await resolved.asaasClient.updateSubscription(resolved.providerSubscriptionId, {
      value: targetPlan.priceCents / 100,
      cycle: targetPlan.months === 12 ? "YEARLY" : "MONTHLY",
      description: `Assinatura BarbeariaSP - ${resolved.shop.name || "Barbearia"} (${targetPlan.name})`.slice(0, 250),
      updatePendingPayments: true,
    });

    // Persiste o contrato agendado com plano, duracao, preco e limite de usuarios
    const scheduledInsert = await resolved.adminClient
      .from("subscription_scheduled_plan_changes")
      .upsert(
        {
          barbershop_id: resolved.shop.id,
          provider_subscription_id: resolved.providerSubscriptionId,
          plan_code: targetPlan.code,
          plan_name: targetPlan.name,
          months: targetPlan.months,
          price_cents: targetPlan.priceCents,
          user_limit: targetPlan.userLimit,
          status: "SCHEDULED",
          applied_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "barbershop_id,provider_subscription_id" },
      );

    if (scheduledInsert.error) {
      console.error("Scheduled plan change persistence failed:", scheduledInsert.error);
      return reply(
        { error: "Não foi possível registrar o agendamento da alteração de plano no sistema local." },
        500,
      );
    }

    return reply({
      ok: true,
      currentPlanCode: resolved.subscription.plan_code,
      currentPeriodEndsAt: resolved.subscription.current_period_ends_at,
      scheduledPlanCode: targetPlan.code,
      nextDueDate: updated?.nextDueDate ?? currentAsaasSub?.nextDueDate ?? null,
    });
  } catch {
    return reply({ error: "Não foi possível atualizar o plano no Asaas. Sua assinatura atual permanece intacta." }, 502);
  }
}
