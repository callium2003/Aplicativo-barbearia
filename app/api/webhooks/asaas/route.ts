import { createClient } from "@supabase/supabase-js";
import { productionBillingEnabled, resolveAsaasBillingConfig, sandboxBillingEnabled } from "../../../../utils/billing-sandbox-server.ts";
import { getPublicSupabaseConfig } from "../../../../utils/supabase-config.ts";
import { handleAsaasSandboxWebhook } from "../../../../utils/asaas-webhook-handler.mjs";
import { requireSandboxDatabaseTarget } from '../../../../utils/billing-sandbox-target.mjs';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const billingConfig = resolveAsaasBillingConfig();
  return handleAsaasSandboxWebhook(request, {
    enabled: sandboxBillingEnabled(),
    token: billingConfig.webhookToken,
    account: billingConfig.account,
    persist: async (fields: Record<string, string>) => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) throw new Error("Missing sandbox configuration");
      const config = getPublicSupabaseConfig();
      requireSandboxDatabaseTarget(config.url, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true' || productionBillingEnabled());
      const admin = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await admin.rpc("persist_asaas_checkout_event", {
        ...fields,
        p_environment: billingConfig.environment,
      });
      if (result.error) throw new Error("Event persistence failed");
      if (typeof result.data !== "boolean") throw new Error("Invalid event response");
      return result.data;
    },
    persistRecurring: async (fields: Record<string, unknown>) => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) throw new Error("Missing sandbox configuration");
      const config = getPublicSupabaseConfig();
      requireSandboxDatabaseTarget(config.url, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true' || productionBillingEnabled());
      const admin = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const rpcPayload: Record<string, unknown> = {
        p_account: fields.p_account,
        p_event_id: fields.p_event_id,
        p_event_type: fields.p_event_type,
        p_subscription_id: fields.p_subscription_id,
        p_pix_authorization_id: fields.p_pix_authorization_id,
        p_payment_id: fields.p_payment_id,
        p_external_reference: fields.p_external_reference,
        p_resource_status: fields.p_resource_status,
        p_value_cents: fields.p_value_cents ?? null,
        p_cycle: fields.p_cycle ?? null,
      };
      const result = await admin.rpc("persist_asaas_recurring_subscription_event", rpcPayload);
      if (result.error || typeof result.data !== "boolean") throw new Error("Recurring event persistence failed");
      return result.data;
    },
  });
}
