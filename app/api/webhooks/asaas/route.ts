import { createClient } from "@supabase/supabase-js";
import { sandboxBillingEnabled } from "../../../../utils/billing-sandbox-server.ts";
import { getPublicSupabaseConfig } from "../../../../utils/supabase-config.ts";
import { handleAsaasSandboxWebhook } from "../../../../utils/asaas-webhook-handler.mjs";
import { requireSandboxDatabaseTarget } from '../../../../utils/billing-sandbox-target.mjs';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAsaasSandboxWebhook(request, {
    enabled: sandboxBillingEnabled(),
    token: process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN,
    account: process.env.ASAAS_SANDBOX_ACCOUNT_ID,
    persist: async (fields: Record<string, string>) => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) throw new Error("Missing sandbox configuration");
      const config = getPublicSupabaseConfig();
      requireSandboxDatabaseTarget(config.url, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true');
      const admin = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await admin.rpc("persist_asaas_checkout_event", fields);
      if (result.error) throw new Error("Event persistence failed");
      if (typeof result.data !== "boolean") throw new Error("Invalid event response");
      return result.data;
    },
    persistRecurring: async (fields: Record<string, string>) => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) throw new Error("Missing sandbox configuration");
      const config = getPublicSupabaseConfig();
      requireSandboxDatabaseTarget(config.url, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true');
      const admin = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await admin.rpc("persist_asaas_recurring_subscription_event", fields);
      if (result.error || typeof result.data !== "boolean") throw new Error("Recurring event persistence failed");
      return result.data;
    },
  });
}
