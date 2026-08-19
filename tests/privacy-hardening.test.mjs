import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? walk(path.join(directory, entry.name))
    : [path.join(directory, entry.name)]));
  return files.flat();
}

test("privacy hardening centralizes public Supabase configuration and frontend client", async () => {
  const config = await read("utils/supabase-config.ts");
  const client = await read("utils/supabase.ts");
  const nextConfig = await read("next.config.ts");
  const appFiles = (await walk(path.join(root, "app"))).filter((file) => file.endsWith(".tsx"));

  assert.match(config, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(config, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(config, /new URL/);
  assert.match(client, /createClient/);
  assert.match(nextConfig, /getPublicSupabaseConfig/);
  assert.doesNotMatch(nextConfig, /irszgnkzqseljowckrgz/);
  for (const file of appFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /createClient\(/, file);
    assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_(URL|PUBLISHABLE_KEY)/, file);
  }
});

test("email processors retain only controlled technical failure codes", async () => {
  const files = [
    "supabase/functions/process-notifications/index.ts",
    "supabase/functions/monitor-platform-health/index.ts",
    "scripts/process-notifications.mjs",
    "email-service/notify.php",
  ];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /response\.text\(/, file);
    assert.doesNotMatch(source, /last_error.+(?:message|exception|response)/i, file);
  }

  const worker = await read("supabase/functions/process-notifications/index.ts");
  const monitor = await read("supabase/functions/monitor-platform-health/index.ts");
  const script = await read("scripts/process-notifications.mjs");
  const php = await read("email-service/notify.php");
  assert.match(worker, /p_error:\s*"delivery_failed"/);
  assert.match(monitor, /http_\$\{response\.status\}/);
  assert.match(script, /p_error:\s*"delivery_failed"/);
  assert.match(php, /smtp_delivery_failed/);
});

test("screens and logs do not expose provider errors or personal data", async () => {
  const appFiles = (await walk(path.join(root, "app"))).filter((file) => file.endsWith(".tsx"));
  for (const file of appFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /error\.(?:message|details|hint)/, file);
    assert.doesNotMatch(source, /console\.(?:error|warn)\([^\n]*error(?:[),:]|$)/, file);
  }
  const notifications = await read("app/painel/notificacoes/page.tsx");
  assert.match(notifications, /Falha técnica registrada/);
  assert.doesNotMatch(notifications, /title=\{item\.last_error\}/);
});

test("migration constrains new notes, error codes, RPC grants and image paths", async () => {
  const migration = await read("supabase/migrations/20260818163652_harden_privacy_inputs_and_image_urls.sql");
  assert.match(migration, /check \(notes is null\) not valid/i);
  assert.match(migration, /notification_outbox_last_error_code_check/i);
  assert.match(migration, /\^\[A-Za-z0-9_-\]\{1,64\}\$/);
  assert.match(migration, /set_barbershop_photo_url/);
  assert.match(migration, /update_my_professional_profile/);
  assert.match(migration, /barbershop-images/);
  assert.match(migration, /professional-images/);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke all on function public\.set_barbershop_photo_url[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute on function public\.set_barbershop_photo_url[\s\S]*to authenticated/i);
  assert.match(migration, /revoke all on function public\.update_my_professional_profile[\s\S]*from public, anon/i);
});

test("SQL regression test preserves legacy notes and rejects new free text", async () => {
  const sql = await read("tests/privacy-hardening-notes-rls.sql");
  assert.match(sql, /legacy note was removed or changed/);
  assert.match(sql, /new non-null note was accepted/);
  assert.match(sql, /non-null note update was accepted/);
  assert.match(sql, /notes = null/);
  assert.match(sql, /rollback;/i);
});
