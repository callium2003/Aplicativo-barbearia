import type { SupabaseClient } from "@supabase/supabase-js";
import { createSubscriptionOfferSnapshot } from "./subscription-order-snapshot.ts";
import { resolveSubscriptionOrderOwner } from "./subscription-order-owner.mjs";
import { createAsaasClient } from "./asaas-client.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Input = { planCode?: unknown; idempotencyKey?: unknown; acceptedTerms?: unknown };
type AsaasOrderClient = {
  cancelSubscription: (id: string) => Promise<unknown>;
  cancelPixAutomaticAuthorization: (id: string) => Promise<unknown>;
  cancelCheckout?: (id: string) => Promise<unknown>;
  cancelPayment?: (id: string) => Promise<unknown>;
  listPayments: (params: { externalReference?: string; offset?: number; limit?: number }) => Promise<{ data?: Array<{ id?: string; status?: string; deleted?: boolean }> }>;
  listCheckoutPayments: (params: { checkoutId: string; offset?: number; limit?: number }) => Promise<{ data?: Array<{ id?: string; status?: string; deleted?: boolean }> }>;
};

type Dependencies = {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  termsVersion: string;
  billingEnvironment?: "sandbox" | "production";
  billingAccount?: string;
  asaasClient?: AsaasOrderClient;
  resolveAsaasClient?: (params: { environment: "sandbox" | "production"; accountId?: string }) => Promise<AsaasOrderClient | null | undefined> | AsaasOrderClient | null | undefined;
};

async function resolveClientForOrder(
  order: { provider_environment?: string | null; provider_account_id?: string | null },
  deps: Dependencies
) {
  const env = (order.provider_environment === "production" ? "production" : "sandbox") as "sandbox" | "production";
  const account = order.provider_account_id || undefined;

  if (typeof deps.resolveAsaasClient === "function") {
    try {
      const client = await deps.resolveAsaasClient({ environment: env, accountId: account });
      if (client) return client;
    } catch {
      return null;
    }
  }

  const isSameEnv = !deps.billingEnvironment || deps.billingEnvironment === env;
  const isSameAccount = !deps.billingAccount || !account || deps.billingAccount === account;
  if (isSameEnv && isSameAccount && deps.asaasClient) {
    return deps.asaasClient;
  }

  if (env === "production") {
    const apiKey = process.env.ASAAS_API_KEY;
    const configuredAccount = process.env.ASAAS_ACCOUNT_ID;
    if (apiKey && (!account || !configuredAccount || account === configuredAccount)) {
      return createAsaasClient({ environment: "production", apiKey });
    }
  } else {
    const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
    const configuredAccount = process.env.ASAAS_SANDBOX_ACCOUNT_ID;
    if (apiKey && (!account || !configuredAccount || account === configuredAccount)) {
      return createAsaasClient({ environment: "sandbox", apiKey });
    }
  }

  return null;
}

/** The clients and terms version are trusted server configuration, never browser inputs. */
export async function createPendingSubscriptionOrder(input: Input, deps: Dependencies) {
  if (!input || input.acceptedTerms !== true || typeof input.idempotencyKey !== "string" || !UUID.test(input.idempotencyKey)) return { status: "invalid" as const };
  let offer;
  try { offer = createSubscriptionOfferSnapshot(input.planCode); } catch { return { status: "invalid" as const }; }
  // Monthly offers are accepted here for the recurring card/Pix Automatic rollout;
  // the provider-specific recurring authorization is still kept behind its own server flow.
  if (typeof deps.termsVersion !== "string" || !deps.termsVersion.trim() || deps.termsVersion.length > 120) throw new Error("Invalid terms configuration");
  const identity = await deps.userClient.auth.getUser();
  if (identity.error?.name === "AuthSessionMissingError") return { status: "unauthenticated" as const };
  if (identity.error) throw identity.error;
  if (!identity.data.user) return { status: "unauthenticated" as const };
  const owner = await resolveSubscriptionOrderOwner(deps.userClient);
  if (owner.status !== "ready") return { status: owner.status };

  if (typeof deps.adminClient.from === "function") {
    try {
      const existing = await deps.adminClient
        .from("subscription_orders")
        .select("id, idempotency_key, checkout_state, provider_checkout_id, provider_subscription_id, provider_pix_authorization_id, provider_environment, provider_account_id, billing_mode, status")
        .eq("barbershop_id", owner.barbershopId)
        .eq("status", "PENDING_PAYMENT");

      const ordersToSupersede = (existing.data || []).filter(
        (o: { idempotency_key?: string }) => o.idempotency_key !== input.idempotencyKey
      );

      for (const oldOrder of ordersToSupersede) {
        const hasSub = Boolean(oldOrder.provider_subscription_id);
        const hasPixAuth = Boolean(oldOrder.provider_pix_authorization_id);
        const hasCheckout = Boolean(oldOrder.provider_checkout_id) || oldOrder.checkout_state === "READY";

        if (hasSub || hasPixAuth || hasCheckout) {
          const client = await resolveClientForOrder(oldOrder, deps);
          if (!client) {
            // Credenciais indisponíveis para o ambiente/conta original do pedido:
            // Mantém o pedido rastreável e bloqueia a substituição até conciliação ou encerramento comprovado.
            await deps.adminClient
              .from("subscription_orders")
              .update({
                status: "REVIEW_REQUIRED",
                reconciliation_state: "REVIEW_REQUIRED",
                updated_at: new Date().toISOString(),
              })
              .eq("id", oldOrder.id)
              .eq("status", "PENDING_PAYMENT");
            return { status: "review" as const };
          }

          try {
            if (hasSub && oldOrder.provider_subscription_id) {
              const payments = await client.listPayments({ externalReference: oldOrder.id, offset: 0, limit: 10 });
              const hasPaid = payments?.data?.some((p: { status?: string; deleted?: boolean }) =>
                !p.deleted && ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(String(p.status || ""))
              );
              if (hasPaid) {
                await deps.adminClient
                  .from("subscription_orders")
                  .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
                  .eq("id", oldOrder.id);
                return { status: "review" as const };
              }
              const cancelRes = await client.cancelSubscription(oldOrder.provider_subscription_id);
              if (!cancelRes || (typeof cancelRes === "object" && "deleted" in cancelRes && cancelRes.deleted === false)) {
                await deps.adminClient
                  .from("subscription_orders")
                  .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
                  .eq("id", oldOrder.id);
                return { status: "review" as const };
              }
            } else if (hasPixAuth && oldOrder.provider_pix_authorization_id) {
              const cancelRes = await client.cancelPixAutomaticAuthorization(oldOrder.provider_pix_authorization_id);
              if (!cancelRes) {
                await deps.adminClient
                  .from("subscription_orders")
                  .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
                  .eq("id", oldOrder.id);
                return { status: "review" as const };
              }
            } else if (hasCheckout && oldOrder.provider_checkout_id) {
              const payments = await client.listCheckoutPayments({ checkoutId: oldOrder.provider_checkout_id, offset: 0, limit: 20 });
              const hasPaid = payments?.data?.some((p: { status?: string; deleted?: boolean }) =>
                !p.deleted && ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(String(p.status || ""))
              );
              if (hasPaid) {
                await deps.adminClient
                  .from("subscription_orders")
                  .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
                  .eq("id", oldOrder.id);
                return { status: "review" as const };
              }

              // Cancela cobranças pendentes avulsas do checkout antes de encerrá-lo
              if (typeof client.cancelPayment === "function" && Array.isArray(payments?.data)) {
                for (const p of payments.data) {
                  if (p?.id && !p.deleted && ["PENDING", "OVERDUE"].includes(String(p.status || ""))) {
                    try {
                      await client.cancelPayment(p.id);
                    } catch {
                      // Falha não-bloqueante por pagamento individual se cancelCheckout subsequente for confirmado
                    }
                  }
                }
              }

              if (typeof client.cancelCheckout !== "function") {
                await deps.adminClient
                  .from("subscription_orders")
                  .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
                  .eq("id", oldOrder.id);
                return { status: "review" as const };
              }

              const cancelRes = await client.cancelCheckout(oldOrder.provider_checkout_id);
              const confirmed = Boolean(
                cancelRes &&
                typeof cancelRes === "object" &&
                ("id" in cancelRes || cancelRes.status === "CANCELED" || cancelRes.deleted === true)
              );
              if (!confirmed) {
                await deps.adminClient
                  .from("subscription_orders")
                  .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
                  .eq("id", oldOrder.id);
                return { status: "review" as const };
              }
            }
          } catch {
            // Falha de comunicação, timeout ou incerteza no provedor: bloqueia substituição e encaminha para conciliação
            await deps.adminClient
              .from("subscription_orders")
              .update({ status: "REVIEW_REQUIRED", reconciliation_state: "REVIEW_REQUIRED", updated_at: new Date().toISOString() })
              .eq("id", oldOrder.id)
              .eq("status", "PENDING_PAYMENT");
            return { status: "review" as const };
          }
        }

        // CAS atômico para tratar duas abas / requisições concorrentes
        const updateBuilder = deps.adminClient
          .from("subscription_orders")
          .update({ status: "CANCELED", recurring_state: "CANCELED", updated_at: new Date().toISOString() })
          .eq("id", oldOrder.id)
          .eq("status", "PENDING_PAYMENT");

        type Selectable = { select?: (columns: string) => Promise<{ data?: unknown; error?: unknown }> };
        const cancelRes = typeof (updateBuilder as unknown as Selectable).select === "function"
          ? await (updateBuilder as unknown as Required<Selectable>).select("id")
          : await updateBuilder;

        if (cancelRes?.error || (Array.isArray(cancelRes?.data) && cancelRes.data.length === 0)) {
          return { status: "pending" as const };
        }
      }
    } catch {
      // Se houver falha de infraestrutura, preserva o bloqueio preventivo
      return { status: "pending" as const };
    }
  }
  const { data, error } = await deps.adminClient.rpc("create_subscription_order", {
    p_barbershop_id: owner.barbershopId, p_requester_id: identity.data.user.id, p_idempotency_key: input.idempotencyKey,
    p_plan_code: offer.planCode, p_plan_name: offer.planName, p_months: offer.months, p_price_cents: offer.priceCents,
    p_max_installments: offer.maxInstallments, p_user_limit: offer.userLimit, p_terms_version: deps.termsVersion,
  });
  if (error?.code === "23505") return { status: "pending" as const };
  if (error?.code === "55000") {
    if (typeof error?.message === "string" && error.message.toLowerCase().includes("active subscription")) {
      return { status: "already_active" as const };
    }
    return { status: "review" as const };
  }
  if (error) throw error;
  if (typeof data !== "string" || !UUID.test(data)) throw new Error("Invalid order response");
  return { status: "created" as const, orderId: data };
}
