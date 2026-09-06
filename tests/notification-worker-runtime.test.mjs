import assert from "node:assert/strict";
import { createHmac, randomUUID, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../supabase/functions/process-notifications/index.ts", import.meta.url), "utf8");
const executable = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ""));
const secret = "synthetic-test-secret";

function fixture({ failDelivery = false, failNonce = false, now = Date.now() } = {}) {
  let handler;
  const calls = [];
  const logs = [];
  const nonces = new Set();
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "get_notification_worker_secrets") {
        return { data: [{ cron_secret: secret, resend_api_key: "synthetic-provider-key" }] };
      }
      if (name === "claim_notification_worker_request") {
        if (failNonce) return { error: { message: "synthetic-private-error" } };
        if (nonces.has(args.p_nonce)) return { data: false };
        nonces.add(args.p_nonce);
        return { data: true };
      }
      if (name === "claim_notification_outbox") {
        return { data: failDelivery ? [{ id: "synthetic-id", recipient_email: "test@example.invalid", payload: {} }] : [] };
      }
      return { data: null, error: null };
    },
  };
  vm.runInNewContext(executable, {
    Deno: {
      env: { get: (name) => ({ SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key" })[name] },
      serve: (callback) => { handler = callback; },
    },
    Date: class extends Date { static now() { return now; } },
    createClient: () => client,
    crypto: webcrypto,
    TextEncoder,
    Response,
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    fetch: async () => new Response("synthetic-private-error test@example.invalid", { status: 500 }),
  });
  return { handler, calls, logs };
}

function request({ age = 0, invalidSignature = false, unsigned = false } = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000) - age);
  const nonce = randomUUID();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.POST./functions/v1/process-notifications`).digest("hex");
  return new Request("https://example.invalid/functions/v1/process-notifications", {
    method: "POST",
    headers: unsigned ? {} : {
      "x-cron-timestamp": timestamp,
      "x-cron-nonce": nonce,
      "x-cron-signature": invalidSignature ? "0".repeat(64) : signature,
    },
  });
}

test("worker rejects missing, forged and expired signatures before consuming the queue", async () => {
  for (const options of [{ unsigned: true }, { invalidSignature: true }, { age: 600 }, { age: -600 }]) {
    const state = fixture();
    assert.equal((await state.handler(request(options))).status, 401);
    assert.deepEqual(state.calls.map((call) => call.name), ["get_notification_worker_secrets"]);
  }
});

test("worker accepts a signed request once and rejects its replay before queue access", async () => {
  const state = fixture();
  const signed = request();
  assert.equal((await state.handler(signed.clone())).status, 200);
  assert.deepEqual(state.calls.map((call) => call.name), [
    "get_notification_worker_secrets", "claim_notification_worker_request",
    "enqueue_due_appointment_reminders", "claim_notification_outbox",
  ]);
  const beforeReplay = state.calls.length;
  assert.equal((await state.handler(signed.clone())).status, 401);
  assert.deepEqual(state.calls.slice(beforeReplay).map((call) => call.name), [
    "get_notification_worker_secrets", "claim_notification_worker_request",
  ]);
});

test("worker fails closed when claiming the nonce fails", async () => {
  const state = fixture({ failNonce: true });
  const response = await state.handler(request());
  assert.equal(response.status, 401);
  assert.equal(state.calls.some((call) => call.name === "claim_notification_outbox"), false);
  assert.doesNotMatch(await response.text(), /synthetic-private-error/);
});

test("delivery failures retain controlled codes without provider response or customer data", async () => {
  const state = fixture({ failDelivery: true });
  const response = await state.handler(request());
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(body).failed, 1);
  const completion = state.calls.find((call) => call.name === "complete_notification_outbox");
  assert.equal(completion.args.p_error, "delivery_failed");
  assert.doesNotMatch(JSON.stringify(state.logs) + body, /synthetic-private-error|test@example\.invalid|synthetic-provider-key/);
});


test("worker rejects the exact five-minute boundary before claiming a nonce", async () => {
  const signed = request();
  const now = (Number(signed.headers.get("x-cron-timestamp")) + 300) * 1000;
  const state = fixture({ now });
  assert.equal((await state.handler(signed)).status, 401);
  assert.deepEqual(state.calls.map((call) => call.name), ["get_notification_worker_secrets"]);
});

test("forward migration closes the database expiry boundary and keeps service-only grants", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260906005431_close_notification_nonce_expiry_window.sql", import.meta.url), "utf8");
  assert.match(sql, /abs\(v_now_epoch - p_issued_at\) >= 300/);
  assert.ok(sql.indexOf(">= 300") < sql.indexOf("delete from"));
  assert.match(sql, /on conflict \(nonce\) do nothing/i);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /to service_role/);
});
