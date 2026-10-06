import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { GoTrueClient } from "@supabase/auth-js";

test("o retorno Google do cliente restaura só a sessão do cliente, sem trocar a Gestão", async () => {
  const source = stripTypeScriptTypes(await readFile(new URL("../utils/supabase.ts", import.meta.url), "utf8"))
    .replace(/^import .*;\r?\n/gm, "")
    .replace(/export const /g, "const ");
  const customerOptions = [];
  const managementOptions = [];
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const url = new URL(`http://localhost:3000/cliente/entrar?returnTo=%2Fcullenbarba#access_token=customer-test-token&refresh_token=customer-test-refresh&expires_in=3600&expires_at=${expiresAt}&token_type=bearer`);
  const fakeWindow = { location: url, addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(source, {
    window: fakeWindow,
    getPublicSupabaseConfig: () => ({ url: "https://example.invalid", publishableKey: "test-public-key" }),
    createBrowserClient: (_url, _key, options) => { managementOptions.push(options.auth); return {}; },
    createClient: (_url, _key, options) => { customerOptions.push(options.auth); return {}; },
    subscribeToPanelContextCacheInvalidation() {},
  });
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const oldBroadcastChannel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  globalThis.window = fakeWindow;
  globalThis.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
  const storage = new Map();
  const createAuth = (options, key, flowType) => new GoTrueClient({
    ...options, storageKey: key, flowType, autoRefreshToken: false, url: "https://example.invalid/auth/v1",
    storage: { getItem: (name) => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value), removeItem: (name) => storage.delete(name) },
    fetch: async () => new Response(JSON.stringify({ id: "customer-user", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  let management;
  let customer;
  try {
    management = createAuth(managementOptions[0], "management-test-session", "pkce");
    customer = createAuth(customerOptions[0], "customer-test-session", "implicit");
    const [managementResult, customerResult] = await Promise.all([management.getSession(), customer.getSession()]);
    assert.equal(managementResult.error, null);
    assert.equal(managementResult.data.session, null);
    assert.equal(customerResult.error, null);
    assert.equal(customerResult.data.session?.user.id, "customer-user");
    assert.ok(storage.has("customer-test-session"));
    assert.equal(storage.has("management-test-session"), false);
    assert.equal(url.hash, "");
  } finally {
    await management?.stopAutoRefresh();
    await customer?.stopAutoRefresh();
    globalThis.BroadcastChannel = oldBroadcastChannel;
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});
