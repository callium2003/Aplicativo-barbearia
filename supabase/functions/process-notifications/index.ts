import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.97.0";

const FROM_EMAIL = "notificacoes@barbeariasp.cullentech.com.br";

type NotificationOutboxItem = {
  id: string;
  recipient_email: string;
  payload: {
    title?: string;
    body?: string;
  } | null;
};

function getServiceRoleKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || null;
  } catch {
    return null;
  }
}

const WORKER_PATH = "/functions/v1/process-notifications";
const REQUEST_MAX_AGE_SECONDS = 300;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;

function signatureMessage(timestamp: string, nonce: string) {
  return `${timestamp}.${nonce}.POST.${WORKER_PATH}`;
}

function constantTimeEqual(left: string, right: string) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function createSignature(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(resendApiKey: string, item: NotificationOutboxItem) {
  const payload = item.payload || {};
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [item.recipient_email],
      subject: payload.title || "Atualização do seu agendamento",
      text: payload.body || "Há uma atualização no seu agendamento no BarbeariaSP.",
    }),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ ok: false, error: "Supabase server credentials unavailable" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: secretRows, error: secretError } = await supabase.rpc("get_notification_worker_secrets");
  if (secretError || !secretRows?.length) {
    console.error("worker secrets unavailable", { code: "operation_failed" });
    return Response.json({ ok: false, error: "Worker configuration unavailable" }, { status: 500 });
  }

  const { resend_api_key: resendApiKey, cron_secret: cronSecret } = secretRows[0];
  const timestamp = req.headers.get("x-cron-timestamp")?.trim() || "";
  const nonce = req.headers.get("x-cron-nonce")?.trim() || "";
  const providedSignature = req.headers.get("x-cron-signature")?.trim().toLowerCase() || "";
  const issuedAt = Number(timestamp);
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (
    !cronSecret ||
    !/^\d{10}$/.test(timestamp) ||
    !Number.isSafeInteger(issuedAt) ||
    Math.abs(nowInSeconds - issuedAt) >= REQUEST_MAX_AGE_SECONDS ||
    !UUID_PATTERN.test(nonce) ||
    !SIGNATURE_PATTERN.test(providedSignature)
  ) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const expectedSignature = await createSignature(cronSecret, signatureMessage(timestamp, nonce));
  if (!constantTimeEqual(providedSignature, expectedSignature)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: claimedRequest, error: claimRequestError } = await supabase.rpc("claim_notification_worker_request", {
    p_nonce: nonce,
    p_issued_at: issuedAt,
  });
  if (claimRequestError || !claimedRequest) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!resendApiKey) {
    return Response.json({ ok: false, error: "Resend key unavailable" }, { status: 500 });
  }

  const { error: reminderError } = await supabase.rpc("enqueue_due_appointment_reminders", { p_limit: 300 });
  if (reminderError) {
    console.error("reminder enqueue failed", { code: "operation_failed" });
  }

  const { data: claimed, error: claimError } = await supabase.rpc("claim_notification_outbox", { p_limit: 60 });
  if (claimError) {
    console.error("claim failed", { code: "operation_failed" });
    return Response.json({ ok: false, error: "Notification queue unavailable" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const item of claimed || []) {
    try {
      await sendEmail(resendApiKey, item);
      const { error: completeError } = await supabase.rpc("complete_notification_outbox", {
        p_id: item.id,
        p_success: true,
        p_error: null,
      });
      if (completeError) throw completeError;
      sent += 1;
    } catch {
      failed += 1;
      const { error: completeError } = await supabase.rpc("complete_notification_outbox", {
        p_id: item.id,
        p_success: false,
        p_error: "delivery_failed",
      });
      if (completeError) {
        console.error("failed to record delivery failure", { code: "operation_failed" });
      }
      console.error("delivery failed", { code: "delivery_failed" });
    }
  }

  const result = {
    ok: true,
    claimed: (claimed || []).length,
    sent,
    failed,
    reminder_enqueue_error: reminderError ? "operation_failed" : null,
  };
  console.log(JSON.stringify(result));
  return Response.json(result);
});
