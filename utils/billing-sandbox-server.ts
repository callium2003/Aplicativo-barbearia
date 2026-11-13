import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "./supabase-config.ts";
import { requireSandboxDatabaseTarget } from './billing-sandbox-target.mjs';

export type AsaasEnvironment = "sandbox" | "production";

export type AsaasBillingConfig = {
  environment: AsaasEnvironment;
  apiKey: string | undefined;
  account: string | undefined;
  webhookToken: string | undefined;
  callbackOrigin: string | undefined;
  termsVersion: string | undefined;
};

export function productionBillingEnabled() {
  if (process.env.NODE_ENV === "production" && process.env.BILLING_SANDBOX_ENABLED === "true") {
    return false;
  }
  return (
    process.env.ASAAS_ENVIRONMENT === "production" &&
    Boolean(process.env.ASAAS_API_KEY) &&
    Boolean(process.env.ASAAS_ACCOUNT_ID)
  );
}

export function resolveAsaasBillingConfig(): AsaasBillingConfig {
  if (productionBillingEnabled()) {
    return {
      environment: "production",
      apiKey: process.env.ASAAS_API_KEY,
      account: process.env.ASAAS_ACCOUNT_ID,
      webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
      callbackOrigin: process.env.ASAAS_CALLBACK_ORIGIN || process.env.BILLING_SANDBOX_CALLBACK_ORIGIN,
      termsVersion: process.env.BILLING_TERMS_VERSION || process.env.BILLING_SANDBOX_TERMS_VERSION || "2026-11",
    };
  }
  return {
    environment: "sandbox",
    apiKey: process.env.ASAAS_SANDBOX_API_KEY,
    account: process.env.ASAAS_SANDBOX_ACCOUNT_ID,
    webhookToken: process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN,
    callbackOrigin: process.env.BILLING_SANDBOX_CALLBACK_ORIGIN,
    termsVersion: process.env.BILLING_SANDBOX_TERMS_VERSION,
  };
}

export function sandboxBillingEnabled() {
  return (process.env.NODE_ENV === "development" && process.env.BILLING_SANDBOX_ENABLED === "true") || productionBillingEnabled();
}

export async function verifiedSandboxClients(token: string) {
  const config = getPublicSupabaseConfig();
  requireSandboxDatabaseTarget(config.url, process.env.BILLING_SANDBOX_SHARED_TEST_ENABLED === 'true' || productionBillingEnabled());
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
