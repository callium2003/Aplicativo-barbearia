import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("anonymous panel request redirects before rendering panel HTML", async () => {
  const port = 43000 + (process.pid % 1000);
  const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
  const server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env },
    stdio: "ignore",
  });
  try {
    let response;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/painel/agenda`, { redirect: "manual" });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.ok(response, "Next production server did not start");
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location"), response.url).pathname, "/entrar");
    assert.doesNotMatch(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.doesNotMatch(await response.text(), /<html|Agenda|Painel/i);
  } finally {
    server.kill();
  }
});
