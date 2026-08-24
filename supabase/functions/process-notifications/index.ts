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

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyCronRequest(req: Request, cronSecret: string) {
  const timestamp = req.headers.get("x-cron-timestamp") || "";
  const nonce = req.headers.get("x-cron-nonce") || "";
  const signature = req.headers.get("x-cron-signature") || "";

  if (!/^\d{10}$/.test(timestamp)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)
      || !/^[0-9a-f]{64}$/.test(signature)) {
    return false;
  }

  const requestTime = Number(timestamp);
  if (!Number.isSafeInteger(requestTime) || Math.abs(Math.floor(Date.now() / 1000) - requestTime) > 300) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(cronSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = `${timestamp}.${nonce}.POST./functions/v1/process-notifications`;
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(signed)));
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected, signature);
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
  if (!cronSecret || !await verifyCronRequest(req, cronSecret)) {
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
