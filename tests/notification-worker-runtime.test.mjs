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
  let connections = 0;
  const sql = async (strings, ...values) => {
    const query = strings.join("?");
    if (query.includes("get_notification_worker_secrets")) {
      calls.push({ name: "get_notification_worker_secrets", args: {} });
      return [{ cron_secret: secret, resend_api_key: "synthetic-provider-key" }];
    }
    if (query.includes("claim_notification_worker_request")) {
      const args = { p_nonce: values[0], p_issued_at: values[1] };
      calls.push({ name: "claim_notification_worker_request", args });
      if (failNonce) throw new Error("synthetic-private-error");
      if (nonces.has(args.p_nonce)) return [{ value: false }];
      nonces.add(args.p_nonce);
      return [{ value: true }];
    }
    if (query.includes("enqueue_due_appointment_reminders")) {
      calls.push({ name: "enqueue_due_appointment_reminders", args: { p_limit: values[0] } });
      return [{ value: 0 }];
    }
    if (query.includes("claim_notification_outbox")) {
      calls.push({ name: "claim_notification_outbox", args: { p_limit: values[0] } });
      return failDelivery ? [{ id: "synthetic-id", recipient_email: "test@example.invalid", payload: {} }] : [];
    }
    if (query.includes("complete_notification_outbox")) {
      calls.push({
        name: "complete_notification_outbox",
        args: { p_id: values[0], p_success: values[1], p_error: values[2] },
      });
      return [{ value: true }];
    }
    throw new Error("unexpected synthetic query");
  };
  vm.runInNewContext(executable, {
    Deno: {
      env: { get: (name) => ({
        SUPABASE_DB_URL: "postgres://synthetic.invalid/test",
        BARBEARIASP_NOTIFICATION_CRON_SECRET: secret,
      })[name] },
      serve: (callback) => { handler = callback; },
    },
    Date: class extends Date { static now() { return now; } },
    postgres: () => {
      connections += 1;
      return sql;
    },
    crypto: webcrypto,
    TextEncoder,
    Response,
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    fetch: async () => new Response("synthetic-private-error test@example.invalid", { status: 500 }),
  });
  return { handler, calls, logs, get connections() { return connections; } };
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
    assert.equal(state.connections, 0);
    assert.deepEqual(state.calls, []);
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
  assert.deepEqual(state.calls, []);
});

test("health monitor rejects an invalid cron secret before opening Postgres", async () => {
  const monitorSource = await readFile(
    new URL("../supabase/functions/monitor-platform-health/index.ts", import.meta.url),
    "utf8",
  );
  const monitorExecutable = stripTypeScriptTypes(monitorSource.replace(/^import .*;\r?\n/gm, ""));
  let handler;
  let queryCount = 0;
  let connectionCount = 0;
  const sql = async () => {
    queryCount += 1;
    return [{ cron_secret: secret, resend_api_key: "synthetic-provider-key" }];
  };
  vm.runInNewContext(monitorExecutable, {
    Deno: {
      env: { get: (name) => ({
        SUPABASE_DB_URL: "postgres://synthetic.invalid/test",
        BARBEARIASP_NOTIFICATION_CRON_SECRET: secret,
      })[name] },
      serve: (callback) => { handler = callback; },
    },
    postgres: () => {
      connectionCount += 1;
      return sql;
    },
    AbortSignal,
    Intl,
    Date,
    Response,
    console: { log() {}, error() {} },
    fetch: async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
  });

  const response = await handler(new Request("https://example.invalid/functions/v1/monitor-platform-health", {
    method: "POST",
    headers: { "x-cron-secret": "invalid-secret" },
  }));

  assert.equal(response.status, 401);
  assert.equal(connectionCount, 0);
  assert.equal(queryCount, 0);
});

test("forward migration closes the database expiry boundary and keeps service-only grants", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260906005431_close_notification_nonce_expiry_window.sql", import.meta.url), "utf8");
  assert.match(sql, /abs\(v_now_epoch - p_issued_at\) >= 300/);
  assert.ok(sql.indexOf(">= 300") < sql.indexOf("delete from"));
  assert.match(sql, /on conflict \(nonce\) do nothing/i);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /to service_role/);
});
