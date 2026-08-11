import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("health endpoint is dynamic, private-data-free, and not cached", async () => {
  const route = await readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /status: "ok"/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store, max-age=0/);
  assert.doesNotMatch(route, /createClient|\.from\(|process\.env/);
});
