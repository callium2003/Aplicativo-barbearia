import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { NextRequest, NextResponse } from "next/server.js";

const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const executable = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, ""));

async function requestWithAuth(user, error = null) {
  const context = vm.createContext({
    NextResponse,
    URL,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key" } },
    createServerClient: () => ({ auth: { getUser: async () => ({ data: { user }, error }) } }),
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
