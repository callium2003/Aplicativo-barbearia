import test from "node:test";
import assert from "node:assert/strict";
import { handleAsaasSandboxWebhook } from "../utils/asaas-webhook-handler.mjs";

const token = "sandbox-token-example-32-characters-long";
const account = "sandbox-account-fixture";
const event = { id: "evt_fixture&1", event: "CHECKOUT_PAID", account: { id: account }, checkout: { id: "checkout-test-1", status: "PAID", customerData: { email: "private@example.test" } } };
function req(body = event, header = token) { return new Request("https://example.test/api/webhooks/asaas", { method: "POST", headers: { "content-type": "application/json", "asaas-access-token": header }, body: JSON.stringify(body) }); }
test("authenticates token and account before any persistence", async () => {
  let calls = 0;
  const persist = async () => { calls++; return true; };
  assert.equal((await handleAsaasSandboxWebhook(req(), { enabled: false, token, account, persist })).status, 404);
  assert.equal((await handleAsaasSandboxWebhook(req(event, "wrong"), { enabled: true, token, account, persist })).status, 401);
  assert.equal((await handleAsaasSandboxWebhook(req({ ...event, account: { id: "other" } }), { enabled: true, token, account, persist })).status, 403);
  assert.equal(calls, 0);
});
test("persists minimal event before acknowledging and accepts duplicates", async () => {
  const saved = [];
  const persist = async (fields) => { saved.push(fields); return saved.length === 1; };
  for (let i = 0; i < 2; i++) assert.equal((await handleAsaasSandboxWebhook(req(), { enabled: true, token, account, persist })).status, 200);
  assert.deepEqual(saved[0], { p_account: account, p_event_id: "evt_fixture&1", p_event_type: "CHECKOUT_PAID", p_checkout_id: "checkout-test-1", p_checkout_status: "PAID" });
  assert.equal(JSON.stringify(saved).includes("private@example.test"), false);
});
test("rejects oversized or malformed payloads and never acknowledges persistence failures", async () => {
  const persist = async () => { throw new Error("sensitive"); };
  assert.equal((await handleAsaasSandboxWebhook(req({ x: "a".repeat(70000) }), { enabled: true, token, account, persist })).status, 413);
  assert.equal((await handleAsaasSandboxWebhook(req({ ...event, checkout: {} }), { enabled: true, token, account, persist })).status, 400);
  const response = await handleAsaasSandboxWebhook(req(), { enabled: true, token, account, persist });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes("sensitive"), false);
});
