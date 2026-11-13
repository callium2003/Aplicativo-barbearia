import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAnnualCardCheckout, buildMonthlyRecurringCardCheckout, type AsaasCustomerData } from "./asaas-checkout.ts";
import { safeSandboxCheckoutUrl } from "./asaas-sandbox-url.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKOUT_ID = /^[a-zA-Z0-9_-]{1,128}$/;

function cleanDigits(val: unknown): string {
  return typeof val === "string" || typeof val === "number" ? String(val).replace(/\D/g, "") : "";
}

export function resolveCheckoutCustomerData(
  user: { email?: string | null } | null | undefined,
  registration: Record<string, unknown> | null | undefined,
  shop: Record<string, unknown> | null | undefined
): AsaasCustomerData | undefined {
  const responsibleName = String(
    registration?.responsible_name ||
    (user as { user_metadata?: { full_name?: string; name?: string } })?.user_metadata?.full_name ||
    (user as { user_metadata?: { full_name?: string; name?: string } })?.user_metadata?.name ||
    ""
  ).trim();
  const shopName = String(shop?.name || "").trim();
  let name = "";
  if (shopName && responsibleName) {
    name = `${shopName} - ${responsibleName}`;
  } else {
    name = shopName || responsibleName || "";
  }
  const email = String(user?.email || shop?.notification_email || "").trim();
  const cpfCnpj = cleanDigits(registration?.tax_document);
  const phone = cleanDigits(registration?.responsible_phone || shop?.phone || shop?.whatsapp);
  const postalCode = cleanDigits(registration?.postal_code);
  const addressNumber = String(registration?.address_number || "").trim();
  const province = String(registration?.neighborhood || "").trim();
  let address = String(shop?.address || "").trim();
  if (address.includes(",")) {
    address = address.split(",")[0].trim();
  }

  const data: AsaasCustomerData = {};

  if (name.length >= 2) {
    data.name = name.slice(0, 120);
  }
  if (shopName.length >= 2) {
    data.company = shopName.slice(0, 120);
  }
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    data.email = email.slice(0, 120);
  }
  if (/^(\d{11}|\d{14})$/.test(cpfCnpj)) {
    data.cpfCnpj = cpfCnpj;
  }
  if (/^\d{10,11}$/.test(phone)) {
    data.phone = phone;
    data.mobilePhone = phone;
  }
  if (/^\d{8}$/.test(postalCode)) {
    data.postalCode = postalCode;
  }
  if (address.length >= 2) {
    data.address = address.slice(0, 120);
  }
  if (addressNumber) {
    data.addressNumber = addressNumber.slice(0, 20);
  }
  if (province) {
    data.province = province.slice(0, 80);
  }

  const hasIdentifier = Boolean(data.name || data.email || data.phone || data.cpfCnpj);
  if (!hasIdentifier) {
    return undefined;
  }

  return data;
}
type Dependencies = {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  callbackOrigin: string;
  account: string;
  asaasClient: { createCheckout: (payload: ReturnType<typeof buildAnnualCardCheckout> | ReturnType<typeof buildMonthlyRecurringCardCheckout>) => Promise<{ id: string; link?: string }> };
  customerOverrides?: { taxDocument?: string; phone?: string; responsibleName?: string };
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
  if ([1, 12].includes(claim.data.offer.months)) {
    const recurring = await deps.adminClient.rpc('claim_subscription_recurring_operation', { p_order_id: orderId, p_requester_id: identity.data.user.id, p_billing_mode: 'CARD_RECURRING' });
    if (recurring.error || !['CLAIMED', 'REQUESTING', 'READY', 'ACTIVE'].includes(recurring.data?.state)) throw new Error('Recurring operation unavailable');
    if (['UNKNOWN', 'REVIEW_REQUIRED'].includes(recurring.data?.state)) return { status: 'review_required' as const };
  }
  let customerData: AsaasCustomerData | undefined;
  let shopName: string | undefined;
  if (typeof deps.adminClient?.from === "function") {
    try {
      const orderRecord = await deps.adminClient.from("subscription_orders").select("barbershop_id").eq("id", orderId).maybeSingle();
      const barbershopId = orderRecord?.data?.barbershop_id;
      if (barbershopId) {
        const cleanOverrideDoc = cleanDigits(deps.customerOverrides?.taxDocument);
        const cleanOverridePhone = String(deps.customerOverrides?.phone || "").trim();
        const cleanOverrideName = String(deps.customerOverrides?.responsibleName || "").trim();
        if (cleanOverrideDoc || cleanOverridePhone || cleanOverrideName) {
          const updateFields: Record<string, string> = {};
          if (/^(\d{11}|\d{14})$/.test(cleanOverrideDoc)) updateFields.tax_document = cleanOverrideDoc;
          if (cleanOverridePhone.replace(/\D/g, "").length >= 10) updateFields.responsible_phone = cleanOverridePhone;
          if (cleanOverrideName.length >= 2) updateFields.responsible_name = cleanOverrideName;
          if (Object.keys(updateFields).length > 0) {
            await deps.adminClient.from("barbershop_registration_details").update(updateFields).eq("barbershop_id", barbershopId);
          }
        }
        const [regRes, shopRes] = await Promise.all([
          deps.adminClient.from("barbershop_registration_details").select("responsible_name,responsible_phone,tax_document,address_number,postal_code,neighborhood").eq("barbershop_id", barbershopId).maybeSingle(),
          deps.adminClient.from("barbershops").select("name,address,phone,whatsapp,notification_email").eq("id", barbershopId).maybeSingle(),
        ]);
        const mergedReg = {
          ...(regRes?.data ?? {}),
          ...(cleanOverrideDoc ? { tax_document: cleanOverrideDoc } : {}),
          ...(cleanOverridePhone ? { responsible_phone: cleanOverridePhone } : {}),
          ...(cleanOverrideName ? { responsible_name: cleanOverrideName } : {}),
        };
        shopName = shopRes?.data?.name;
        customerData = resolveCheckoutCustomerData(identity.data.user, mergedReg, shopRes?.data ?? null);
      }
    } catch {
      // Non-blocking: missing profile lookup falls back to undefined so provider prompts in checkout
    }
  }
  let checkoutId: string;
  let checkoutUrl: string;
  try {
    const nextDueDate = new Date().toISOString().slice(0, 10);
    const payload = claim.data.offer.months === 1
      ? buildMonthlyRecurringCardCheckout({ orderId, offer: claim.data.offer, callbackOrigin: deps.callbackOrigin, allowLocalCallback: true, nextDueDate, customerData, shopName })
      : buildAnnualCardCheckout({ orderId, offer: claim.data.offer, callbackOrigin: deps.callbackOrigin, allowLocalCallback: true, nextDueDate, customerData, shopName });
    const response = await deps.asaasClient.createCheckout(payload);
    if (typeof response.id !== "string" || !CHECKOUT_ID.test(response.id)) throw new Error("Invalid provider response");
    checkoutId = response.id;
    const rawLink = response.link ?? `https://sandbox.asaas.com/checkoutSession/show?id=${checkoutId}`;
    checkoutUrl = safeSandboxCheckoutUrl(rawLink, checkoutId);
  } catch (err: unknown) {
    console.error("createCheckout error:", err);
    const knownRejection = Boolean(err && typeof err === "object" && "outcomeUnknown" in err && (err as { outcomeUnknown?: boolean }).outcomeUnknown === false);
    if (knownRejection && deps.adminClient.from) {
      try { await deps.adminClient.from("subscription_orders").update({ status: "CANCELED", recurring_state: "CANCELED" }).eq("id", orderId); } catch { /* ignore */ }
    } else {
      // Even an apparent transport failure may have created the checkout remotely.
      // If the update itself fails, REQUESTING remains and also blocks retries.
      try { await deps.adminClient.rpc("finish_subscription_checkout", { p_order_id: orderId, p_state: "UNKNOWN", p_checkout_id: null, p_checkout_url: null }); } catch { /* preserve safe in-flight state */ }
    }
    throw new Error("Checkout outcome requires reconciliation");
  }
  const finish = await deps.adminClient.rpc("finish_subscription_checkout", { p_order_id: orderId, p_state: "READY", p_checkout_id: checkoutId, p_checkout_url: checkoutUrl });
  if (finish.error) throw new Error("Checkout outcome requires reconciliation");
  return { status: "ready" as const, checkoutId, checkoutUrl };
}
