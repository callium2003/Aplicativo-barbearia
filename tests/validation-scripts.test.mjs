import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("daily validation never prepares a Hostinger standalone package", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.build, "next build --webpack");
  assert.doesNotMatch(packageJson.scripts.test, /npm run build/);
  assert.equal(packageJson.scripts["test:build"], "npm run build && npm run test:unit");
  assert.equal(
    packageJson.scripts["package:hostinger"],
    "node scripts/build-hostinger.mjs && node scripts/prepare-hostinger-standalone.mjs",
  );

  const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(nextConfig, /process\.env\.BARBEARIASP_BUILD_TARGET\s*===\s*["']hostinger["']/);
});
