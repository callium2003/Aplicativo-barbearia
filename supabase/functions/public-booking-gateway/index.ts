import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-client-info, apikey, content-type" };
const limits = {
  invitation: { action: "invitation", seconds: 60, limit: 10 },
  booking_status: { action: "booking_status", seconds: 60, limit: 30 },
  availability: { action: "availability", seconds: 60, limit: 30 },
  monthly_availability: { action: "monthly_availability", seconds: 60, limit: 30 },
} as const;

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json" } }); }
async function hash(value: string) { const bytes = new TextEncoder().encode(value); const digest = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"); const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return response({ error: "configuration_error" }, 500);
  let payload: { action?: keyof typeof limits; args?: Record<string, unknown> };
  try { payload = await req.json(); } catch { return response({ error: "invalid_request" }, 400); }
  const limit = payload.action && limits[payload.action];
  if (!limit) return response({ error: "invalid_action" }, 400);
  const origin = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unavailable").split(",")[0].trim();
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: rate, error: rateError } = await admin.rpc("consume_public_request_rate_limit", { p_action: limit.action, p_origin_hash: await hash(origin), p_subject_hash: "", p_window_seconds: limit.seconds, p_limit: limit.limit }).single();
  if (rateError) return response({ error: "rate_limit_unavailable" }, 503);
  if (!rate?.allowed) return response({ error: "too_many_requests" }, 429);
  const args = payload.args || {};
  const rpc = payload.action === "invitation" ? "get_invitation_details" : payload.action === "booking_status" ? "get_public_booking_availability" : payload.action === "availability" ? "get_public_availability" : "get_public_monthly_availability";
  const { data, error } = await admin.rpc(rpc, args);
  if (error) return response({ error: "request_failed" }, 400);
  return response({ data });
});
