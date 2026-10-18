import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../supabase/functions/public-booking-gateway/index.ts", import.meta.url), "utf8");
const executable = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ""));

function fixture({ allowed = true, rateError = null, rpcError = null, configured = true } = {}) {
  let handler;
  let clientsCreated = 0;
  let environmentReads = 0;
  const calls = [];
  vm.runInNewContext(executable, {
    Request, Response, TextEncoder, crypto: webcrypto,
    Deno: {
      env: { get: () => { environmentReads += 1; return configured ? "synthetic-configuration" : undefined; } },
      serve: (callback) => { handler = callback; },
    },
    createClient: () => {
      clientsCreated += 1;
      return {
        rpc(name, args) {
          calls.push({ name, args: structuredClone(args) });
          if (name === "consume_public_request_rate_limit") {
            return { single: async () => ({ data: { allowed }, error: rateError }) };
          }
          return Promise.resolve({ data: { result: "synthetic-public-data" }, error: rpcError });
        },
      };
    },
  });
  return {
    calls,
    get clientsCreated() { return clientsCreated; },
    get environmentReads() { return environmentReads; },
    request: (body, { method = "POST", headers = {}, raw = false } = {}) => handler(new Request("https://example.invalid/gateway", {
      method,
      headers: { "content-type": "application/json", ...headers },
      ...(["GET", "OPTIONS"].includes(method) ? {} : { body: raw ? body : JSON.stringify(body) }),
    })),
  };
}

for (const body of [null, [], [{ action: "availability" }], "availability", 1, true]) {
  test(`gateway rejects non-object payload ${JSON.stringify(body)} before privileged access`, async () => {
    const gateway = fixture();
    const response = await gateway.request(body);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_request" });
    assert.equal(gateway.clientsCreated, 0);
    assert.deepEqual(gateway.calls, []);
  });
}

const invalidActions = [
  undefined, null, false, 1, "unknown", "constructor", "toString", "__proto__", "hasOwnProperty",
  ["availability"], ["invitation"], [["invitation"]], {}, { toString: "availability" }, { toString: null },
];
for (const action of invalidActions) {
  test(`gateway rejects action ${JSON.stringify(action) ?? "missing"} without coercion or privileged access`, async () => {
    const gateway = fixture();
    const response = await gateway.request({ action });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_action" });
    assert.equal(gateway.clientsCreated, 0);
    assert.deepEqual(gateway.calls, []);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });
}

test("gateway rejects a JSON-escaped inherited action after parsing", async () => {
  const gateway = fixture();
  const response = await gateway.request('{"action":"\\u0063onstructor"}', { raw: true });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_action" });
  assert.equal(gateway.clientsCreated, 0);
  assert.deepEqual(gateway.calls, []);
});

test("gateway rejects malformed JSON before privileged access", async () => {
  const gateway = fixture();
  const response = await gateway.request("{", { raw: true });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });
  assert.equal(gateway.clientsCreated, 0);
  assert.deepEqual(gateway.calls, []);
});

const validActions = [
  ["invitation", "get_invitation_details", 10, { p_token: "synthetic-invitation" }],
  ["booking_status", "get_public_booking_availability", 30, { p_slug: "synthetic-shop" }],
  ["availability", "get_public_availability", 30, { p_slug: "synthetic-shop", p_date: "2026-10-19", p_service_ids: ["synthetic-service-a", "synthetic-service-b"] }],
  ["monthly_availability", "get_public_monthly_availability", 30, { p_slug: "synthetic-shop", p_month: "2026-10-01" }],
];
for (const [action, rpc, limit, args] of validActions) {
  test(`gateway preserves ${action} rate settings, RPC arguments and successful public response`, async () => {
    const gateway = fixture();
    const response = await gateway.request({ action, args });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { result: "synthetic-public-data" } });
    assert.equal(gateway.clientsCreated, 1);
    assert.deepEqual(gateway.calls, [
      { name: "consume_public_request_rate_limit", args: {
        p_action: action,
        p_origin_hash: createHash("sha256").update("unavailable").digest("hex"),
        p_subject_hash: "", p_window_seconds: 60, p_limit: limit,
      } },
      { name: rpc, args },
    ]);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("content-type"), "application/json");
  });
}

test("gateway preserves empty RPC arguments when args is omitted", async () => {
  const gateway = fixture();
  const response = await gateway.request({ action: "booking_status" });
  assert.equal(response.status, 200);
  assert.deepEqual(gateway.calls[1], { name: "get_public_booking_availability", args: {} });
});

test("gateway accepts a valid JSON-escaped action without reinterpreting it", async () => {
  const gateway = fixture();
  const response = await gateway.request('{"action":"\\u0061vailability"}', { raw: true });
  assert.equal(response.status, 200);
  assert.equal(gateway.calls[0].args.p_action, "availability");
  assert.equal(gateway.calls[1].name, "get_public_availability");
});

for (const [headers, expectedOrigin] of [
  [{ "cf-connecting-ip": " 192.0.2.10 ", "x-forwarded-for": "203.0.113.9, 192.0.2.20" }, "192.0.2.10"],
  [{ "x-forwarded-for": "203.0.113.9, , 192.0.2.20, " }, "192.0.2.20"],
  [{ "cf-connecting-ip": " ", "x-forwarded-for": " , " }, "unavailable"],
]) {
  test(`gateway preserves the origin hash for ${expectedOrigin}`, async () => {
    const gateway = fixture();
    const response = await gateway.request({ action: "availability" }, { headers });
    assert.equal(response.status, 200);
    assert.equal(gateway.calls[0].args.p_origin_hash, createHash("sha256").update(expectedOrigin).digest("hex"));
  });
}

for (const [options, status, error] of [
  [{ allowed: false }, 429, "too_many_requests"],
  [{ rateError: { message: "synthetic-private-rate-error" } }, 503, "rate_limit_unavailable"],
  [{ rpcError: { message: "synthetic-private-rpc-error" } }, 400, "request_failed"],
]) {
  test(`gateway preserves controlled ${status} ${error} responses`, async () => {
    const gateway = fixture(options);
    const response = await gateway.request({ action: "availability" });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error });
    assert.equal(gateway.calls.length, options.rpcError ? 2 : 1);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });
}

for (const method of ["OPTIONS", "GET"]) {
  test(`gateway preserves ${method} behavior without reading configuration or accessing Supabase`, async () => {
    const gateway = fixture({ configured: false });
    const response = await gateway.request(undefined, { method });
    assert.equal(response.status, method === "OPTIONS" ? 200 : 405);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    if (method === "OPTIONS") assert.equal(await response.text(), "ok");
    else assert.deepEqual(await response.json(), { error: "method_not_allowed" });
    assert.equal(gateway.environmentReads, 0);
    assert.equal(gateway.clientsCreated, 0);
    assert.deepEqual(gateway.calls, []);
  });
}

test("gateway preserves its controlled configuration error without accessing Supabase", async () => {
  const gateway = fixture({ configured: false });
  const response = await gateway.request({ action: "availability" });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "configuration_error" });
  assert.equal(gateway.clientsCreated, 0);
  assert.deepEqual(gateway.calls, []);
});
