import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "./supabase-config.ts";
import { requireSandboxDatabaseTarget } from './billing-sandbox-target.mjs';

export function sandboxBillingEnabled() {
  return process.env.NODE_ENV === "development" && process.env.BILLING_SANDBOX_ENABLED === "true";
}

export async function verifiedSandboxClients(token: string) {
  const config = getPublicSupabaseConfig();
  requireSandboxDatabaseTarget(config.url, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing sandbox configuration");
  const authenticated = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const verified = await authenticated.auth.getUser(token);
  if (verified.error || !verified.data.user) return null;
  const userClient = {
    auth: { getUser: async () => ({ data: { user: verified.data.user }, error: null }) },
    rpc: authenticated.rpc.bind(authenticated),
  } as unknown as SupabaseClient;
  const adminClient = createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { userClient, adminClient };
}
