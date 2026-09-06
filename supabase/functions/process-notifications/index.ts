import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.3";

const FROM_EMAIL = "notificacoes@barbeariasp.cullentech.com.br";

type NotificationOutboxItem = {
  id: string;
  recipient_email: string;
  payload: {
    title?: string;
    body?: string;
  } | null;
};

type WorkerSecrets = {
  resend_api_key: string | null;
};

type RpcError = { code: "db_query_failed" };
type RpcResult<T> = { data: T | null; error: RpcError | null };

function createDatabaseClient(connectionString: string) {
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  return {
    async rpc(name: string, args: Record<string, unknown> = {}): Promise<RpcResult<unknown>> {
      try {
        if (name === "get_notification_worker_secrets") {
          const rows = await sql<WorkerSecrets[]>`
            select * from public.get_notification_worker_secrets()
          `;
          return { data: rows, error: null };
        }
        if (name === "claim_notification_worker_request") {
          const rows = await sql<Array<{ value: boolean }>>`
            select public.claim_notification_worker_request(
              ${String(args.p_nonce)}::uuid,
              ${Number(args.p_issued_at)}
            ) as value
          `;
          return { data: rows[0]?.value ?? false, error: null };
        }
        if (name === "enqueue_due_appointment_reminders") {
          const rows = await sql<Array<{ value: number }>>`
            select public.enqueue_due_appointment_reminders(${Number(args.p_limit)}) as value
          `;
          return { data: rows[0]?.value ?? null, error: null };
        }
        if (name === "claim_notification_outbox") {
          const rows = await sql<NotificationOutboxItem[]>`
            select * from public.claim_notification_outbox(${Number(args.p_limit)})
          `;
          return { data: rows, error: null };
        }
        if (name === "complete_notification_outbox") {
          const rows = await sql<Array<{ value: boolean }>>`
            select public.complete_notification_outbox(
              ${String(args.p_id)}::uuid,
              ${Boolean(args.p_success)},
              ${args.p_error == null ? null : String(args.p_error)}
            ) as value
          `;
          return { data: rows[0]?.value ?? null, error: null };
        }
        return { data: null, error: { code: "db_query_failed" } };
      } catch {
        return { data: null, error: { code: "db_query_failed" } };
      }
    },
  };
}

const cronSecret = Deno.env.get("BARBEARIASP_NOTIFICATION_CRON_SECRET");
let database: ReturnType<typeof createDatabaseClient> | null | undefined;

function getDatabase() {
  if (database !== undefined) return database;
  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  database = databaseUrl ? createDatabaseClient(databaseUrl) : null;
  return database;
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

  const database = getDatabase();
  if (!database) {
    return Response.json({ ok: false, error: "Supabase database credentials unavailable" }, { status: 500 });
  }

  const { data: rawSecretRows, error: secretError } = await database.rpc("get_notification_worker_secrets");
  const secretRows = rawSecretRows as WorkerSecrets[] | null;
  if (secretError || !secretRows?.length) {
    console.error("worker secrets unavailable", { code: "operation_failed" });
    return Response.json({ ok: false, error: "Worker configuration unavailable" }, { status: 500 });
  }

  const { resend_api_key: resendApiKey } = secretRows[0];

  const { data: claimedRequest, error: claimRequestError } = await database.rpc("claim_notification_worker_request", {
    p_nonce: nonce,
    p_issued_at: issuedAt,
  });
  if (claimRequestError || !claimedRequest) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!resendApiKey) {
    return Response.json({ ok: false, error: "Resend key unavailable" }, { status: 500 });
  }

  const { error: reminderError } = await database.rpc("enqueue_due_appointment_reminders", { p_limit: 300 });
  if (reminderError) {
    console.error("reminder enqueue failed", { code: "operation_failed" });
  }

  const { data: rawClaimed, error: claimError } = await database.rpc("claim_notification_outbox", { p_limit: 60 });
  const claimed = rawClaimed as NotificationOutboxItem[] | null;
  if (claimError) {
    console.error("claim failed", { code: "operation_failed" });
    return Response.json({ ok: false, error: "Notification queue unavailable" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const item of claimed || []) {
    try {
      await sendEmail(resendApiKey, item);
      const { error: completeError } = await database.rpc("complete_notification_outbox", {
        p_id: item.id,
        p_success: true,
        p_error: null,
      });
      if (completeError) throw completeError;
      sent += 1;
    } catch {
      failed += 1;
      const { error: completeError } = await database.rpc("complete_notification_outbox", {
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
