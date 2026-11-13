import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { selectBoundaryPaymentIds, subscriptionPlans } from "../../../utils/subscription-plans.ts";

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
  try {
    await clients.adminClient.rpc("sync_barbershop_active_subscription_plan", { p_barbershop_id: shop.id });
  } catch {
    // Sincronização não-bloqueante
  }
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
      .in("status", ["CONFIRMED", "REVIEW_REQUIRED"])
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
  return {
    shop,
    subscription: subRes.data,
    providerSubscriptionId: linkedOrder.provider_subscription_id,
    linkedOrderId: linkedOrder.id,
    linkedOrderStatus: linkedOrder.status,
    asaasClient,
    adminClient: clients.adminClient,
  };
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
        .select("plan_code, plan_name, months, price_cents, user_limit, status")
        .eq("barbershop_id", resolved.shop.id)
        .eq("provider_subscription_id", resolved.providerSubscriptionId)
        .in("status", ["SCHEDULED", "APPLIED"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const scheduledFromAsaas = matchPlanFromAsaas(asaasSub?.value, asaasSub?.cycle);
    const scheduledPlanCode = scheduledRes?.data?.plan_code ?? scheduledFromAsaas?.code ?? resolved.subscription.plan_code;

    // Preserva contratos já aplicados para não recriá-los indevidamente como pendentes.
    // Auto-recuperação: se houver plano agendado no Asaas não refletido localmente nem aplicado, restaura o agendamento
    const hasAppliedMatchingAsaas = scheduledRes?.data?.status === "APPLIED" && scheduledRes.data.plan_code === scheduledFromAsaas?.code;
    const shouldRecover = Boolean(scheduledFromAsaas && !hasAppliedMatchingAsaas && (!scheduledRes?.data || scheduledRes.data.plan_code !== scheduledFromAsaas.code));

    if (shouldRecover && scheduledFromAsaas) {
      try {
        const currentEffectivePlan = subscriptionPlans.find((p) => p.code === resolved.subscription.plan_code);
        const upsertRes = await resolved.adminClient
          .from("subscription_scheduled_plan_changes")
          .upsert(
            {
              barbershop_id: resolved.shop.id,
              provider_subscription_id: resolved.providerSubscriptionId,
              plan_code: scheduledFromAsaas.code,
              plan_name: scheduledFromAsaas.name,
              months: scheduledFromAsaas.months,
              price_cents: scheduledFromAsaas.priceCents,
              user_limit: scheduledFromAsaas.userLimit,
              previous_plan_code: currentEffectivePlan?.code || resolved.subscription.plan_code,
              previous_months: currentEffectivePlan?.months || 1,
              previous_user_limit: currentEffectivePlan?.userLimit || 3,
              previous_price_cents: currentEffectivePlan?.priceCents || 4990,
              effective_after: resolved.subscription.current_period_ends_at || new Date().toISOString(),
              expected_price_cents: scheduledFromAsaas.priceCents,
              expected_cycle: scheduledFromAsaas.months === 12 ? "YEARLY" : "MONTHLY",
              status: "SCHEDULED",
              applied_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "barbershop_id,provider_subscription_id" },
          );

        if (!upsertRes.error && resolved.linkedOrderStatus === "REVIEW_REQUIRED") {
          await resolved.adminClient
            .from("subscription_orders")
            .update({
              status: "CONFIRMED",
              reconciliation_state: "CONFIRMED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", resolved.linkedOrderId);
        }
      } catch {
        // Auto-recuperação não-bloqueante
      }
    }

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

    const currentEffectivePlan = subscriptionPlans.find((p) => p.code === resolved.subscription.plan_code);

    // Detecta os pagamentos existentes antes da alteração para isolar pagamentos tardios da vigência agendada.
    // Exclui apenas faturas pendentes identificadas de forma segura como atualizadas para o novo plano.
    let boundaryPaymentIds: string[] = [];
    try {
      const existingPayments = await resolved.asaasClient.listPayments({
        externalReference: resolved.linkedOrderId,
        offset: 0,
        limit: 100,
      });
      boundaryPaymentIds = selectBoundaryPaymentIds(
        existingPayments?.data,
        targetPlan.priceCents,
        currentEffectivePlan?.priceCents ?? null,
        typeof updated?.nextDueDate === "string" ? updated.nextDueDate : null,
      );
    } catch {
      // Isolamento não-bloqueante de pagamentos de fronteira
    }

    const effectiveFromCycle = updated?.nextDueDate
      ? String(updated.nextDueDate).slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const effectiveAfter = resolved.subscription.current_period_ends_at || new Date().toISOString();

    // Persiste o contrato agendado com ciclo de efetivação, plano, duração, preço esperado, limite de usuários
    // e snapshot dos termos imediatamente precedentes para preservar contratos anteriores (A -> B -> C)
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
          previous_plan_code: currentEffectivePlan?.code || resolved.subscription.plan_code,
          previous_months: currentEffectivePlan?.months || 1,
          previous_user_limit: currentEffectivePlan?.userLimit || 3,
          previous_price_cents: currentEffectivePlan?.priceCents || 4990,
          boundary_payment_id: boundaryPaymentIds[0] || null,
          boundary_payment_ids: boundaryPaymentIds,
          effective_from_cycle: effectiveFromCycle,
          effective_after: effectiveAfter,
          expected_price_cents: targetPlan.priceCents,
          expected_cycle: targetPlan.months === 12 ? "YEARLY" : "MONTHLY",
          status: "SCHEDULED",
          applied_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "barbershop_id,provider_subscription_id" },
      );

    if (scheduledInsert.error) {
      console.error("Scheduled plan change persistence failed:", scheduledInsert.error);
      try {
        await resolved.adminClient
          .from("subscription_orders")
          .update({
            reconciliation_state: "REVIEW_REQUIRED",
            status: "REVIEW_REQUIRED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", resolved.linkedOrderId);
      } catch {
        // Preserva o erro principal
      }
      return reply(
        { error: "Plano atualizado no Asaas, mas houve falha ao registrar o agendamento local. O pedido foi encaminhado para conciliação preventiva." },
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
