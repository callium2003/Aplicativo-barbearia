import type { SupabaseClient } from "@supabase/supabase-js";
import { createSubscriptionOfferSnapshot } from "./subscription-order-snapshot.ts";
import { resolveSubscriptionOrderOwner } from "./subscription-order-owner.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Input = { planCode?: unknown; idempotencyKey?: unknown; acceptedTerms?: unknown };
type Dependencies = { userClient: SupabaseClient; adminClient: SupabaseClient; termsVersion: string };

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
  const { data, error } = await deps.adminClient.rpc("create_subscription_order", {
    p_barbershop_id: owner.barbershopId, p_requester_id: identity.data.user.id, p_idempotency_key: input.idempotencyKey,
    p_plan_code: offer.planCode, p_plan_name: offer.planName, p_months: offer.months, p_price_cents: offer.priceCents,
    p_max_installments: offer.maxInstallments, p_user_limit: offer.userLimit, p_terms_version: deps.termsVersion,
  });
  if (error?.code === "23505") return { status: "pending" as const };
  if (error?.code === "55000") return { status: "review" as const };
  if (error) throw error;
  if (typeof data !== "string" || !UUID.test(data)) throw new Error("Invalid order response");
  return { status: "created" as const, orderId: data };
}
