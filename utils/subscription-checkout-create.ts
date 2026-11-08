import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAnnualCardCheckout } from "./asaas-checkout.ts";
import { safeSandboxCheckoutUrl } from "./asaas-sandbox-url.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKOUT_ID = /^[a-zA-Z0-9_-]{1,128}$/;
type Dependencies = {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  callbackOrigin: string;
  account: string;
  asaasClient: { createCheckout: (payload: ReturnType<typeof buildAnnualCardCheckout>) => Promise<{ id: string; link?: string }> };
};

/** The caller must provide an Asaas Sandbox-only client and trusted server configuration. */
export async function createOrReuseSandboxCheckout(orderId: string, deps: Dependencies) {
  if (typeof orderId !== "string" || !UUID.test(orderId)) return { status: "invalid" as const };
  const identity = await deps.userClient.auth.getUser();
  if (identity.error?.name === "AuthSessionMissingError") return { status: "unauthenticated" as const };
  if (identity.error) throw identity.error;
  if (!identity.data.user) return { status: "unauthenticated" as const };
  if (typeof deps.account !== 'string' || !CHECKOUT_ID.test(deps.account)) throw new Error('Missing sandbox account');
  const binding = await deps.adminClient.rpc('bind_subscription_sandbox_account', { p_order_id: orderId, p_requester_id: identity.data.user.id, p_account: deps.account });
  if (binding.error) throw new Error('Sandbox account binding failed');
  const claim = await deps.adminClient.rpc("claim_subscription_checkout", { p_order_id: orderId, p_requester_id: identity.data.user.id });
  if (claim.error) throw claim.error;
  const state = claim.data?.state;
  if (state === "IN_PROGRESS") return { status: "in_progress" as const };
  if (state === "REVIEW_REQUIRED") return { status: "review_required" as const };
  if (state === "READY" && typeof claim.data.checkoutId === "string" && CHECKOUT_ID.test(claim.data.checkoutId)) {
    return { status: "ready" as const, checkoutId: claim.data.checkoutId as string, checkoutUrl: safeSandboxCheckoutUrl(claim.data.checkoutUrl, claim.data.checkoutId) };
  }
  if (state !== "CLAIMED") throw new Error("Invalid checkout claim");
  let checkoutId: string;
  let checkoutUrl: string;
  try {
    const payload = buildAnnualCardCheckout({ orderId, offer: claim.data.offer, callbackOrigin: deps.callbackOrigin, allowLocalCallback: true });
    const response = await deps.asaasClient.createCheckout(payload);
    if (typeof response.id !== "string" || !CHECKOUT_ID.test(response.id)) throw new Error("Invalid provider response");
    checkoutId = response.id;
    checkoutUrl = safeSandboxCheckoutUrl(response.link, checkoutId);
  } catch {
    // Even an apparent transport failure may have created the checkout remotely.
    // If the update itself fails, REQUESTING remains and also blocks retries.
    try { await deps.adminClient.rpc("finish_subscription_checkout", { p_order_id: orderId, p_state: "UNKNOWN", p_checkout_id: null, p_checkout_url: null }); } catch { /* preserve safe in-flight state */ }
    throw new Error("Checkout outcome requires reconciliation");
  }
  const finish = await deps.adminClient.rpc("finish_subscription_checkout", { p_order_id: orderId, p_state: "READY", p_checkout_id: checkoutId, p_checkout_url: checkoutUrl });
  if (finish.error) throw new Error("Checkout outcome requires reconciliation");
  return { status: "ready" as const, checkoutId, checkoutUrl };
}
