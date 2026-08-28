import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const prepareHostinger = path.join(root, "scripts", "prepare-hostinger-standalone.mjs");
const expectedUrl = "https://browser-bundle-check.supabase.co";
const expectedKey = "sb_publishable_browser_bundle_check_1234567890";

test("the sign-in client bundle embeds the required public Supabase configuration", async () => {
  const build = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: expectedUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: expectedKey,
    },
  });

  assert.equal(build.status, 0, build.stderr || build.stdout);

  const chunkDirectory = path.join(root, ".next", "static", "chunks", "app", "entrar");
  const chunkNames = (await readdir(chunkDirectory)).filter((name) => name.startsWith("page-") && name.endsWith(".js"));
  assert.equal(chunkNames.length, 1, `expected one sign-in page chunk, found ${chunkNames.length}`);

  const bundle = await readFile(path.join(chunkDirectory, chunkNames[0]), "utf8");
  assert.ok(bundle.includes(expectedUrl), "the public Supabase URL was not embedded in the sign-in client bundle");
  assert.ok(bundle.includes(expectedKey), "the public Supabase publishable key was not embedded in the sign-in client bundle");

  const prepare = spawnSync(process.execPath, [prepareHostinger], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);
});
