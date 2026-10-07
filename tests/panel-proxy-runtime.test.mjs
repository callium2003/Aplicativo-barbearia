import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { NextRequest, NextResponse } from "next/server.js";

const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const executable = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, ""));

async function requestWithAuth(user, error = null, cookieWrites = []) {
  const context = vm.createContext({
    NextResponse,
    URL,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key" } },
    createServerClient: (_url, _key, options) => ({ auth: { getUser: async () => {
      for (const { cookies, headers } of cookieWrites) options.cookies.setAll(cookies, headers);
      return { data: { user }, error };
    } } }),
  });
  vm.runInContext(`${executable}\nglobalThis.handler = proxy;`, context);
  return context.handler(new NextRequest("http://localhost:3000/painel/agenda"));
}

test("verified panel session proceeds without redirecting to login", async () => {
  const response = await requestWithAuth({ id: "synthetic-user" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

const authCacheHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  "Expires": "0",
  "Pragma": "no-cache",
};

for (const user of [{ id: "synthetic-user" }, null]) {
  test(`auth cookie writes preserve cache headers on ${user ? "panel response" : "login redirect"}`, async () => {
    const response = await requestWithAuth(user, null, [
      { cookies: [{ name: "synthetic-session", value: "synthetic-first", options: { path: "/" } }], headers: authCacheHeaders },
      { cookies: [{ name: "synthetic-session", value: "synthetic-final", options: { path: "/" } }], headers: {} },
    ]);
    assert.equal(response.status, user ? 200 : 307);
    assert.equal(response.cookies.get("synthetic-session")?.value, "synthetic-final");
    for (const [name, value] of Object.entries(authCacheHeaders)) assert.equal(response.headers.get(name), value);
    if (!user) assert.equal(response.headers.get("x-middleware-next"), null);
  });
}

test("invalid panel session redirects to login", async () => {
  const response = await requestWithAuth(null, { name: "AuthApiError", status: 401 });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/entrar");
});

test("Auth connection failure does not turn an existing session into a login redirect loop", async () => {
  const response = await requestWithAuth(null, { name: "AuthRetryableFetchError", status: 0 });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("retry-after"), "5");
  assert.doesNotMatch(await response.text(), /Agenda|Painel|synthetic-user/);
});
