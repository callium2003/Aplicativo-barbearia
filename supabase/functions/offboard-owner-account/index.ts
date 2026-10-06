import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const STORAGE_BATCH_SIZE = 100;

type Action = "status" | "start" | "confirm_export" | "finalize";
type StorageObject = { bucket_id: string; object_name: string };
type OffboardingState = { barbershop_id?: string; status: string; eligible_at: string | null };

function response(status: number, code: string, state?: OffboardingState | null) {
  return new Response(JSON.stringify({ code, ...(state === undefined ? {} : { state }) }), { status, headers: jsonHeaders });
}

function hasRecentAuthentication(token: string) {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as {
      iat?: number;
      amr?: Array<{ method?: string; timestamp?: number }>;
    };
    const cutoff = Math.floor(Date.now() / 1000) - 15 * 60;
    return Number.isInteger(payload.iat) && (payload.iat || 0) >= cutoff
      && payload.amr?.some((method) => method.method !== "token_refresh"
        && Number.isInteger(method.timestamp) && (method.timestamp || 0) >= cutoff) === true;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response(405, "method_not_allowed");
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return response(401, "authentication_required");

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceRoleKey) return response(500, "operation_unavailable");

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authenticated, error: authenticationError } = await admin.auth.getUser(token);
  if (authenticationError || !authenticated.user || authenticated.user.is_anonymous) {
    return response(401, "authentication_required");
  }
  const userId = authenticated.user.id;
  let action: Action;
  try {
    const body = await request.json();
    action = body?.action;
  } catch {
    return response(400, "invalid_request");
  }
  if (!["status", "start", "confirm_export", "finalize"].includes(action)) {
    return response(400, "invalid_request");
  }
  if (action !== "status" && !hasRecentAuthentication(token)) {
    return response(403, "recent_authentication_required");
  }

  if (action === "status") {
    const { data, error } = await admin.rpc("get_owner_offboarding_state", { p_user_id: userId });
    return error ? response(500, "operation_failed") : response(200, "ok", data as OffboardingState | null);
  }
  if (action === "start" || action === "confirm_export") {
    const rpc = action === "start" ? "begin_owner_offboarding" : "confirm_owner_offboarding_export";
    const { data, error } = await admin.rpc(rpc, { p_user_id: userId });
    return error ? response(403, "operation_not_allowed") : response(200, "ok", data as OffboardingState);
  }

  const { data: state, error: stateError } = await admin.rpc("get_owner_offboarding_state", { p_user_id: userId });
  const current = state as OffboardingState | null;
  if (stateError || !current || current.status === "deactivated") {
    return response(403, "export_confirmation_required");
  }
  if (!current.eligible_at || Date.parse(current.eligible_at) > Date.now()) {
    return response(403, "retention_period_active", current);
  }

  const { data: rawObjects, error: manifestError } = await admin.rpc("list_owner_offboarding_storage", { p_user_id: userId });
  if (manifestError || !Array.isArray(rawObjects)) return response(500, "operation_failed");
  const objectsByBucket = new Map<string, string[]>();
  for (const object of rawObjects as StorageObject[]) {
    if (typeof object.bucket_id !== "string" || !object.bucket_id
      || typeof object.object_name !== "string" || !object.object_name) {
      return response(500, "operation_failed");
    }
    const paths = objectsByBucket.get(object.bucket_id) || [];
    paths.push(object.object_name);
    objectsByBucket.set(object.bucket_id, paths);
  }
  for (const [bucket, paths] of objectsByBucket) {
    for (let index = 0; index < paths.length; index += STORAGE_BATCH_SIZE) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + STORAGE_BATCH_SIZE));
      if (error) return response(500, "operation_failed");
    }
  }

  const { data: finalized, error: finalizationError } = await admin.rpc("finalize_owner_offboarding", { p_user_id: userId });
  if (finalizationError || !(finalized as OffboardingState | null)?.barbershop_id) {
    return response(403, "operation_not_allowed");
  }

  const { data: customer, error: customerLookupError } = await admin.from("customers")
    .select("id").eq("auth_user_id", userId).maybeSingle();
  if (customerLookupError) return response(500, "operation_failed");
  if (customer) {
    const customerClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { error } = await customerClient.rpc("anonymize_my_customer_account");
    if (error) return response(500, "operation_failed");
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(userId);
  if (deletionError) return response(500, "operation_failed");
  return response(200, "completed");
});
