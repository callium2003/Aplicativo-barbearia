import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return response(405, { code: "method_not_allowed" });
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    return response(401, { code: "authentication_required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceRoleKey) {
    return response(500, { code: "operation_unavailable" });
  }

  const authClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authenticated, error: authenticationError } = await authClient.auth.getUser(token);
  if (authenticationError || !authenticated.user) {
    return response(401, { code: "authentication_required" });
  }

  const customerClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: anonymization, error: anonymizationError } = await customerClient.rpc(
    "anonymize_my_customer_account",
  );
  if (anonymizationError) {
    return response(403, { code: "operation_not_allowed" });
  }

  const { error: deletionError } = await authClient.auth.admin.deleteUser(authenticated.user.id);
  if (deletionError) {
    return response(500, { code: "operation_failed" });
  }

  const result = Array.isArray(anonymization) ? anonymization[0] : anonymization;
  return response(200, { status: "completed", protocol: result?.public_protocol || null });
});
