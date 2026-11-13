import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRecurringPixSubscription } from "./asaas-recurring.mjs";
import { safeSandboxInvoiceUrl } from "./asaas-sandbox-url.ts";
import { resolveCheckoutCustomerData } from "./subscription-checkout-create.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[a-zA-Z0-9_-]{1,128}$/;

type Dependencies = {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  account: string;
  asaasClient: {
    createCustomer: (payload: Record<string, unknown>) => Promise<{ id: string }>;
    createSubscription: (payload: ReturnType<typeof buildRecurringPixSubscription>) => Promise<{ id: string }>;
    listPayments: (filters: { externalReference: string; offset?: number; limit?: number }) => Promise<{ data?: Array<{ id?: string; invoiceUrl?: string; status?: string }> }>;
  };
  customerOverrides?: { taxDocument?: string; phone?: string; responsibleName?: string };
};

export async function createOrReuseSandboxPixSubscription(orderId: string, deps: Dependencies) {
  if (typeof orderId !== "string" || !UUID.test(orderId)) return { status: "invalid" as const };
  const identity = await deps.userClient.auth.getUser();
  if (identity.error?.name === "AuthSessionMissingError") return { status: "unauthenticated" as const };
  if (identity.error) throw identity.error;
  if (!identity.data.user) return { status: "unauthenticated" as const };
  if (typeof deps.account !== "string" || !ID.test(deps.account)) throw new Error("Missing sandbox account");

  const binding = await deps.adminClient.rpc("bind_subscription_sandbox_account", {
    p_order_id: orderId,
    p_requester_id: identity.data.user.id,
    p_account: deps.account,
  });
  if (binding.error) throw new Error("Sandbox account binding failed");

  const claim = await deps.adminClient.rpc("claim_subscription_recurring_operation", {
    p_order_id: orderId,
    p_requester_id: identity.data.user.id,
    p_billing_mode: "CARD_RECURRING",
  });
  if (claim.error) throw claim.error;

  const state = claim.data?.state;
  if (state === "READY" || state === "ACTIVE") {
    const existingSubId = claim.data?.subscriptionId as string | undefined;
    const payments = await deps.asaasClient.listPayments({ externalReference: orderId, offset: 0, limit: 10 });
    const firstInvoice = payments?.data?.find((p) => typeof p?.invoiceUrl === "string")?.invoiceUrl;
    if (existingSubId && firstInvoice) {
      return {
        status: "ready" as const,
        subscriptionId: existingSubId,
        invoiceUrl: safeSandboxInvoiceUrl(firstInvoice),
      };
    }
    return { status: "review_required" as const };
  }
  if (state !== "CLAIMED") return { status: "review_required" as const };

  const barbershopId = claim.data?.barbershopId as string | undefined;
  if (!barbershopId) return { status: "review_required" as const };

  const cleanOverrideDoc = String(deps.customerOverrides?.taxDocument || "").replace(/\D/g, "");
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

  const [orderRes, regRes, shopRes] = await Promise.all([
    deps.adminClient.from("subscription_orders").select("months,plan_code,plan_name,price_cents").eq("id", orderId).maybeSingle(),
    deps.adminClient.from("barbershop_registration_details").select("responsible_name,responsible_phone,tax_document,address_number,postal_code,neighborhood").eq("barbershop_id", barbershopId).maybeSingle(),
    deps.adminClient.from("barbershops").select("name,address,phone,whatsapp,notification_email").eq("id", barbershopId).maybeSingle(),
  ]);

  const mergedReg = {
    ...(regRes?.data ?? {}),
    ...(cleanOverrideDoc ? { tax_document: cleanOverrideDoc } : {}),
    ...(cleanOverridePhone ? { responsible_phone: cleanOverridePhone } : {}),
    ...(cleanOverrideName ? { responsible_name: cleanOverrideName } : {}),
  };

  const customerData = resolveCheckoutCustomerData(identity.data.user, mergedReg, shopRes?.data ?? null);
  if (!customerData?.cpfCnpj || !customerData?.name || !customerData?.email) {
    await deps.adminClient.from("subscription_orders").update({ status: "CANCELED", recurring_state: "CANCELED" }).eq("id", orderId);
    return { status: "billing_profile_required" as const };
  }

  let customerId: string;
  let subscriptionId: string;
  let invoiceUrl: string;
  try {
    const createdCustomer = await deps.asaasClient.createCustomer({
      ...customerData,
      externalReference: orderId,
    });
    if (typeof createdCustomer?.id !== "string" || !ID.test(createdCustomer.id)) {
      throw new Error("Invalid provider customer");
    }
    customerId = createdCustomer.id;

    const months = orderRes.data?.months === 12 ? 12 : 1;
    const nextDueDate = new Date().toISOString().slice(0, 10);
    const subPayload = buildRecurringPixSubscription({
      customerId,
      planCode: claim.data.planCode as string,
      planName: claim.data.planName as string,
      months,
      priceCents: claim.data.priceCents as number,
      externalReference: orderId,
      nextDueDate,
      shopName: shopRes?.data?.name,
    });

    const createdSub = await deps.asaasClient.createSubscription(subPayload);
    if (typeof createdSub?.id !== "string" || !ID.test(createdSub.id)) {
      throw new Error("Invalid provider subscription");
    }
    subscriptionId = createdSub.id;

    const payments = await deps.asaasClient.listPayments({ externalReference: orderId, offset: 0, limit: 10 });
    const rawInvoice = payments?.data?.find((p) => typeof p?.invoiceUrl === "string")?.invoiceUrl;
    if (!rawInvoice) {
      throw new Error("Missing provider invoice URL");
    }
    invoiceUrl = safeSandboxInvoiceUrl(rawInvoice);
  } catch (err: unknown) {
    console.error("createPixSubscription error:", err);
    const knownRejection = Boolean(err && typeof err === "object" && "outcomeUnknown" in err && (err as { outcomeUnknown?: boolean }).outcomeUnknown === false);
    if (knownRejection) {
      try { await deps.adminClient.from("subscription_orders").update({ status: "CANCELED", recurring_state: "CANCELED" }).eq("id", orderId); } catch { /* ignore */ }
    }
    return { status: "review_required" as const };
  }

  const finish = await deps.adminClient.rpc("finish_subscription_recurring_operation", {
    p_order_id: orderId,
    p_customer_id: customerId,
    p_subscription_id: subscriptionId,
    p_authorization_id: null,
  });
  if (finish.error) return { status: "review_required" as const };

  return {
    status: "ready" as const,
    subscriptionId,
    invoiceUrl,
  };
}
