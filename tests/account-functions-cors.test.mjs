import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";

for (const name of ["delete-my-customer-account", "offboard-owner-account"]) {
  async function fixture() {
    let handler;
    const source = await readFile(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), "utf8");
    vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, "")), {
      createClient: () => { throw new Error("Unauthenticated requests must not access Supabase"); },
      Deno: { env: { get: () => { throw new Error("Preflight must not read credentials"); } }, serve: (callback) => { handler = callback; } },
      Request, Response, JSON, Date, Map, atob,
    });
    return handler;
  }

  test(`${name}: browser preflight succeeds without authentication or database access`, async () => {
    const handler = await fixture();
    const response = await handler(new Request("https://example.invalid", { method: "OPTIONS", headers: {
      Origin: "https://barbeariasp.cullentech.com.br",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, apikey, x-client-info, content-type",
    } }));
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.match(response.headers.get("access-control-allow-methods"), /\bPOST\b/);
    const allowed = response.headers.get("access-control-allow-headers").toLowerCase().split(/,\s*/);
    for (const header of ["authorization", "apikey", "x-client-info", "content-type"]) assert.ok(allowed.includes(header));
    assert.equal(response.headers.has("access-control-allow-credentials"), false);
  });

  test(`${name}: unauthenticated POST remains 401 and its error is readable by the browser`, async () => {
    const handler = await fixture();
    const response = await handler(new Request("https://example.invalid", { method: "POST", body: "{}", headers: { Origin: "https://barbeariasp.cullentech.com.br" } }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "authentication_required");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });

  test(`${name}: CORS does not permit unsupported operations`, async () => {
    const handler = await fixture();
    const response = await handler(new Request("https://example.invalid", { method: "DELETE" }));
    assert.equal(response.status, 405);
    assert.equal((await response.json()).code, "method_not_allowed");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });
}
