import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const recentToken = () => {
  const now = Math.floor(Date.now() / 1000);
  return `header.${Buffer.from(JSON.stringify({ iat: now, amr: [{ method: "oauth", timestamp: now }] })).toString("base64url")}.signature`;
};

async function fixture({ storageFailure = false, customer = false, eligible = true } = {}) {
  const operations = [];
  let handler;
  const state = { barbershop_id: "shop-a", status: "export_confirmed", eligible_at: eligible ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 86400000).toISOString(), eligible };
  const admin = {
    auth: {
      getUser: async () => { operations.push("getUser"); return { data: { user: { id: "owner-a" } }, error: null }; },
      admin: { deleteUser: async (id) => { operations.push(`deleteUser:${id}`); return { error: null }; } },
    },
    rpc: async (name, args) => {
      operations.push(`rpc:${name}:${args.p_user_id || args.p_barbershop_id}`);
      if (name === "get_owner_offboarding_state") return { data: state, error: null };
      if (name === "list_owner_offboarding_storage") return { data: [{ bucket_id: "barbershop-images", object_name: "shop-a/photo.jpg" }], error: null };
      if (name === "finalize_owner_offboarding") return { data: { barbershop_id: "shop-a", status: "ready_for_auth_deletion" }, error: null };
      if (name === "begin_owner_offboarding") return { data: { ...state, status: "deactivated" }, error: null };
      if (name === "confirm_owner_offboarding_export") return { data: state, error: null };
      throw new Error(`unexpected rpc: ${name}`);
    },
    storage: { from: (bucket) => ({ remove: async (paths) => {
      operations.push(`remove:${bucket}:${paths.join(",")}`);
      return { error: storageFailure ? new Error("synthetic failure") : null };
    } }) },
    from: (table) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => {
      operations.push(`lookup:${table}`);
      return { data: customer ? { id: "customer-a" } : null, error: null };
    } }) }) }),
  };
  const customerClient = { rpc: async (name) => {
    operations.push(`customer-rpc:${name}`);
    return { data: null, error: null };
  } };
  const source = await read("supabase/functions/offboard-owner-account/index.ts");
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, "")), {
    createClient: (_url, key) => key === "service-test-key" ? admin : customerClient,
    Deno: { env: { get: (key) => ({ SUPABASE_URL: "https://example.invalid", SUPABASE_ANON_KEY: "publishable-test-key", SUPABASE_SERVICE_ROLE_KEY: "service-test-key" })[key] }, serve: (callback) => { handler = callback; } },
    Request, Response, JSON, Date, Map, atob,
  });
  return { operations, handler };
}

const request = (action, token = recentToken()) => new Request("https://example.invalid/functions/v1/offboard-owner-account", {
  method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, p_user_id: "attacker-chosen-id" }),
});

test("owner offboarding derives identity from a verified bearer and never trusts a supplied user id", async () => {
  const { handler, operations } = await fixture();
  const result = await handler(request("start"));
  assert.equal(result.status, 200);
  assert.deepEqual(operations, ["getUser", "rpc:begin_owner_offboarding:owner-a"]);
});

test("owner offboarding refuses early finalization before touching Storage or Auth", async () => {
  const { handler, operations } = await fixture({ eligible: false });
  const result = await handler(request("finalize"));
  assert.equal(result.status, 403);
  assert.deepEqual(operations, ["getUser", "rpc:get_owner_offboarding_state:owner-a"]);
});

test("owner offboarding removes Storage before anonymization and deletes Auth last", async () => {
  const { handler, operations } = await fixture({ customer: true });
  const result = await handler(request("finalize"));
  assert.equal(result.status, 200);
  assert.deepEqual(operations, [
    "getUser", "rpc:get_owner_offboarding_state:owner-a",
    "rpc:list_owner_offboarding_storage:owner-a", "remove:barbershop-images:shop-a/photo.jpg",
    "rpc:finalize_owner_offboarding:owner-a", "lookup:customers",
    "customer-rpc:anonymize_my_customer_account", "deleteUser:owner-a",
  ]);
});

test("Storage failure stops owner anonymization and Auth deletion", async () => {
  const { handler, operations } = await fixture({ storageFailure: true });
  const result = await handler(request("finalize"));
  assert.equal(result.status, 500);
  assert.equal(operations.some((operation) => operation.startsWith("rpc:finalize_owner_offboarding")), false);
  assert.equal(operations.some((operation) => operation.startsWith("deleteUser")), false);
});

test("missing bearer cannot access owner offboarding", async () => {
  const { handler, operations } = await fixture();
  const result = await handler(new Request("https://example.invalid", { method: "POST", body: JSON.stringify({ action: "start" }) }));
  assert.equal(result.status, 401);
  assert.deepEqual(operations, []);
});
