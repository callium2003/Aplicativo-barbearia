import type { SupabaseClient } from "@supabase/supabase-js";
import { createSubscriptionOfferSnapshot } from "./subscription-order-snapshot.ts";
import { resolveSubscriptionOrderOwner } from "./subscription-order-owner.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Input = { planCode?: unknown; idempotencyKey?: unknown; acceptedTerms?: unknown };
type Dependencies = {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  termsVersion: string;
  billingEnvironment?: "sandbox" | "production";
  billingAccount?: string;
  asaasClient?: {
    cancelSubscription: (id: string) => Promise<unknown>;
    cancelPixAutomaticAuthorization: (id: string) => Promise<unknown>;
    listPayments: (params: { externalReference?: string; offset?: number; limit?: number }) => Promise<{ data?: Array<{ id?: string; status?: string; deleted?: boolean }> }>;
    listCheckoutPayments: (params: { checkoutId: string; offset?: number; limit?: number }) => Promise<{ data?: Array<{ id?: string; status?: string; deleted?: boolean }> }>;
  };
};

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
        const isForeignEnv = Boolean(oldOrder.provider_environment && deps.billingEnvironment && oldOrder.provider_environment !== deps.billingEnvironment);
        const isForeignAccount = Boolean(oldOrder.provider_account_id && deps.billingAccount && oldOrder.provider_account_id !== deps.billingAccount);
        const isForeignBinding = isForeignEnv || isForeignAccount;

        const hasSub = Boolean(oldOrder.provider_subscription_id);
        const hasPixAuth = Boolean(oldOrder.provider_pix_authorization_id);
        const hasCheckout = Boolean(oldOrder.provider_checkout_id) || oldOrder.checkout_state === "READY";

        if (!isForeignBinding && (hasSub || hasPixAuth || hasCheckout)) {
          if (!deps.asaasClient) {
            // Cannot verify or cancel provider operation without provider client; keep pending guard intact.
            return { status: "pending" as const };
          }

          try {
            if (hasSub && oldOrder.provider_subscription_id) {
              const payments = await deps.asaasClient.listPayments({ externalReference: oldOrder.id, offset: 0, limit: 10 });
              const hasPaid = payments?.data?.some((p) =>
                !p.deleted && ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(String(p.status || ""))
              );
              if (hasPaid) {
                return { status: "pending" as const };
              }
              await deps.asaasClient.cancelSubscription(oldOrder.provider_subscription_id);
            } else if (hasPixAuth && oldOrder.provider_pix_authorization_id) {
              await deps.asaasClient.cancelPixAutomaticAuthorization(oldOrder.provider_pix_authorization_id);
            } else if (hasCheckout && oldOrder.provider_checkout_id) {
              const payments = await deps.asaasClient.listCheckoutPayments({ checkoutId: oldOrder.provider_checkout_id, offset: 0, limit: 10 });
              const hasPaid = payments?.data?.some((p) =>
                !p.deleted && ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(String(p.status || ""))
              );
              if (hasPaid) {
                return { status: "pending" as const };
              }
            }
          } catch {
            // Provider communication failure: preserve pending guard to avoid duplicate billing.
            return { status: "pending" as const };
          }
        }

        const cancelRes = await deps.adminClient
          .from("subscription_orders")
          .update({ status: "CANCELED", recurring_state: "CANCELED", updated_at: new Date().toISOString() })
          .eq("id", oldOrder.id)
          .eq("status", "PENDING_PAYMENT");

        if (cancelRes.error) {
          return { status: "pending" as const };
        }
      }
    } catch {
      // If error querying or processing, preserve pending order guard
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
