import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { reconcileSandboxOrder } from "../../../utils/subscription-reconciliation-worker.mjs";

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

    const pendingCheck = await clients.adminClient
      .from("subscription_orders")
      .select("id, barbershop_id, plan_code, months, user_limit, reconciliation_locked_until, checkout_state, provider_subscription_id, price_cents, provider_account_id")
      .in("barbershop_id", shopIds)
      .eq("provider_environment", "sandbox")
      .eq("status", "PENDING_PAYMENT")
      .limit(10);

    const billingConfig = resolveAsaasBillingConfig();
    const account = billingConfig.account;
    const apiKey = billingConfig.apiKey;
    const pendingInvoiceUrls = new Map<string, string>();
    if (
      pendingCheck.data?.length &&
      account &&
      /^[A-Za-z0-9_-]{1,128}$/.test(account) &&
      apiKey
    ) {
      try {
        const asaasClient = createAsaasClient({ environment: billingConfig.environment, apiKey });
        const subPendingOrders = pendingCheck.data.filter(
          (o) => o.checkout_state !== "READY" && Boolean(o.provider_subscription_id) && (!o.provider_account_id || o.provider_account_id === account),
        );
        for (const subOrder of subPendingOrders) {
          try {
            const listed = await asaasClient.listPayments({ externalReference: subOrder.id, offset: 0, limit: 10 });
            const paymentsList = Array.isArray(listed?.data) ? listed.data : [];
            const rawInvoice = paymentsList.find(
              (p: { invoiceUrl?: unknown }) =>
                typeof p?.invoiceUrl === "string" &&
                (p.invoiceUrl.startsWith("https://sandbox.asaas.com/") ||
                  p.invoiceUrl.startsWith("https://www.asaas.com/") ||
                  p.invoiceUrl.startsWith("https://asaas.com/")),
            )?.invoiceUrl;
            const firstInvoice =
              typeof rawInvoice === "string" &&
              billingConfig.environment === "production" &&
              rawInvoice.startsWith("https://asaas.com/")
                ? rawInvoice.replace("https://asaas.com/", "https://www.asaas.com/")
                : rawInvoice;
            if (firstInvoice) pendingInvoiceUrls.set(subOrder.id, firstInvoice);
            const paidPayment = paymentsList.find(
              (p: { id?: unknown; status?: unknown; value?: unknown; deleted?: unknown }) =>
                typeof p?.id === "string" &&
                !p.deleted &&
                ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(String(p.status || "")) &&
                typeof p.value === "number" &&
                Math.round(p.value * 100) === subOrder.price_cents,
            );
            if (paidPayment?.id) {
              const eventType = paidPayment.status === "CONFIRMED" ? "PAYMENT_CONFIRMED" : "PAYMENT_RECEIVED";
              await clients.adminClient.rpc("persist_asaas_recurring_subscription_event", {
                p_account: account,
                p_event_id: `evt_pix_sub_${subOrder.provider_subscription_id}_${paidPayment.id}_${paidPayment.status}`,
                p_event_type: eventType,
                p_subscription_id: subOrder.provider_subscription_id,
                p_pix_authorization_id: null,
                p_payment_id: paidPayment.id,
                p_external_reference: subOrder.id,
                p_resource_status: paidPayment.status === "CONFIRMED" ? "CONFIRMED" : "RECEIVED",
              });
            }
          } catch {
            // Non-blocking per subscription order
          }
        }

        const unlockedIds = pendingCheck.data
          .filter((o) => o.checkout_state === "READY" && (!o.reconciliation_locked_until || new Date(o.reconciliation_locked_until).getTime() <= Date.now()))
          .map((o) => o.id);
        if (unlockedIds.length > 0) {
          await clients.adminClient
            .from("subscription_orders")
            .update({ reconciliation_next_at: new Date(0).toISOString() })
            .in("id", unlockedIds);
        }
        const finish = async ({
          orderId,
          lease,
          account: acc,
          outcome,
          payments,
          subscriptionId,
        }: {
          orderId: string;
          lease: string;
          account: string;
          outcome: string;
          payments: unknown[];
          subscriptionId?: string | null;
        }) => {
          const result = await clients.adminClient.rpc("finish_subscription_reconciliation", {
            p_order_id: orderId,
            p_token: lease,
            p_account: acc,
            p_outcome: outcome,
            p_payments: payments,
          });
          if (result.error || !["CONFIRMED", "RETRY", "REVIEW_REQUIRED"].includes(result.data)) {
            throw new Error("Reconciliation transaction failed");
          }
          if (outcome === "CONFIRMED" && subscriptionId) {
            try {
              const firstPayment = (payments[0] as { id?: string } | undefined)?.id || null;
              await clients.adminClient.rpc("persist_asaas_recurring_subscription_event", {
                p_account: acc,
                p_event_id: `evt_sub_${subscriptionId}_${firstPayment || "init"}`,
                p_event_type: "SUBSCRIPTION_CREATED",
                p_subscription_id: subscriptionId,
                p_pix_authorization_id: null,
                p_payment_id: firstPayment,
                p_external_reference: orderId,
                p_resource_status: "ACTIVE",
              });
            } catch {
              // Secondary to confirmed financial transaction
            }
          }
          return result.data;
        };
        for (let count = 0; count < 5; count++) {
          const claimed = await clients.adminClient.rpc("claim_subscription_reconciliation", { p_account: account });
          if (claimed.error || claimed.data === null) break;
          if (claimed.data.months === undefined) {
            const { data: orderRow } = await clients.adminClient
              .from("subscription_orders")
              .select("months,billing_mode")
              .eq("id", claimed.data.id)
              .single();
            if (orderRow) {
              claimed.data.months = orderRow.months;
              claimed.data.billingMode = orderRow.billing_mode;
            }
          }
          await reconcileSandboxOrder(claimed.data, { client: asaasClient, account, finish });
        }
      } catch {
        // Non-blocking: still return current persisted bills if live reconciliation fails
      }
    }

    const orders = await clients.adminClient
      .from("subscription_orders")
      .select("id, barbershop_id, plan_name, months, price_cents, status, created_at, provider_checkout_url, provider_account_id")
      .in("barbershop_id", shopIds)
      .eq("provider_environment", "sandbox")
      .order("created_at", { ascending: false })
      .limit(50);

    if (orders.error) throw new Error("Order lookup failed");

    const periodsQuery = await clients.adminClient
      .from("subscription_paid_periods")
      .select("id, order_id, barbershop_id, plan_code, starts_at, ends_at, confirmed_at, provider_payment_id")
      .in("barbershop_id", shopIds)
      .eq("provider_environment", "sandbox")
      .order("confirmed_at", { ascending: false });

    const periodsByOrder = new Map<string, Array<{ id: string; confirmed_at: string; provider_payment_id: string | null }>>();
    for (const p of (periodsQuery.data || [])) {
      if (p.order_id) {
        const list = periodsByOrder.get(p.order_id) || [];
        list.push(p);
        periodsByOrder.set(p.order_id, list);
      }
    }

    const bills: Array<{
      id: string;
      label: string;
      date: string;
      amountCents: number;
      status: "pending" | "paid" | "overdue" | "refunded";
      checkoutUrl: string | null;
    }> = [];

    for (const order of (orders.data || [])) {
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
      const billLabel = order.plan_name.endsWith(cycleLabel) ? order.plan_name : `${order.plan_name}${cycleLabel}`;
      let checkoutUrl: string | null = null;
      if (status === "pending") {
        const rawPendingUrl = order.provider_checkout_url || pendingInvoiceUrls.get(order.id) || null;
        const isCurrentConfigAccount = !order.provider_account_id || order.provider_account_id === billingConfig.account;
        checkoutUrl =
          typeof rawPendingUrl === "string" &&
          billingConfig.environment === "production" &&
          isCurrentConfigAccount &&
          rawPendingUrl.startsWith("https://sandbox.asaas.com/")
            ? rawPendingUrl.replace("https://sandbox.asaas.com/", "https://www.asaas.com/")
            : rawPendingUrl;
      }
      bills.push({
        id: order.id,
        label: billLabel,
        date: order.created_at,
        amountCents: order.price_cents,
        status,
        checkoutUrl,
      });

      // Subsequent recurring cycles beyond the first one
      const orderPeriods = periodsByOrder.get(order.id) || [];
      if (orderPeriods.length > 1) {
        const renewalPeriods = orderPeriods.slice(0, orderPeriods.length - 1);
        for (const ren of renewalPeriods) {
          bills.push({
            id: ren.id,
            label: `${billLabel} - Renovação`,
            date: ren.confirmed_at,
            amountCents: order.price_cents,
            status: "paid",
            checkoutUrl: null,
          });
        }
      }
    }

    bills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return reply({ bills });
  } catch {
    return reply({ error: "Não foi possível carregar o histórico financeiro." }, 500);
  }
}
