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
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(config, /process\.env\[name\]/);
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
  assert.doesNotMatch(notifications, /Falha técnica registrada|title=\{item\.last_error\}|get_notification_delivery_monitor/);
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

test("forward migration enables RLS automatically only for new public tables", async () => {
  const migration = await read("supabase/migrations/20260915113000_enable_rls_for_new_public_tables.sql");

  assert.match(migration, /create\s+or\s+replace\s+function\s+private\.enable_rls_for_new_public_tables\s*\(\)/i);
  assert.match(migration, /returns\s+event_trigger/i);
  assert.match(migration, /security\s+definer/i);
  assert.match(migration, /set\s+search_path\s*=\s*pg_catalog/i);
  assert.match(migration, /command_tag\s+in\s*\(\s*'CREATE TABLE'/i);
  assert.match(migration, /cmd\.schema_name\s*=\s*'public'/i);
  assert.match(migration, /alter\s+table\s+if\s+exists\s+%s\s+enable\s+row\s+level\s+security/i);
  assert.match(migration, /create\s+event\s+trigger\s+ensure_rls_for_new_public_tables/i);
  assert.match(migration, /when\s+tag\s+in\s*\(\s*'CREATE TABLE'/i);
  assert.doesNotMatch(migration, /alter\s+table\s+public\.[\w"]+\s+enable\s+row\s+level\s+security/i);
});

test("forward migration removes default Data API grants from future public objects", async () => {
  const migration = await read("supabase/migrations/20260915114500_revoke_default_data_api_grants.sql");

  assert.match(
    migration,
    /alter\s+default\s+privileges\s+for\s+role\s+postgres\s+in\s+schema\s+public\s+revoke\s+select,\s*insert,\s*update,\s*delete\s+on\s+tables\s+from\s+anon,\s*authenticated,\s*service_role/i,
  );
  assert.match(
    migration,
    /alter\s+default\s+privileges\s+for\s+role\s+postgres\s+in\s+schema\s+public\s+revoke\s+usage,\s*select\s+on\s+sequences\s+from\s+anon,\s*authenticated,\s*service_role/i,
  );
  assert.doesNotMatch(migration, /revoke\s+all\s+on\s+table\s+public\./i);
});

test("forward migration preserves tenant scope when management updates professional images", async () => {
  const migration = await read("supabase/migrations/20260915130000_harden_storage_trigger_function_grants.sql");

  assert.match(migration, /drop policy if exists "Management can update professional images" on storage\.objects/i);
  assert.match(migration, /create policy "Management can update professional images"/i);
  assert.match(migration, /for update to authenticated/i);
  assert.match(migration, /using[\s\S]*private\.current_barbershop_role\(professional\.barbershop_id\)[\s\S]*with check/i);
  assert.match(migration, /with check[\s\S]*private\.current_barbershop_role\(professional\.barbershop_id\)/i);
});

test("forward migration removes public execution from internal trigger functions", async () => {
  const migration = await read("supabase/migrations/20260915130000_harden_storage_trigger_function_grants.sql");

  for (const functionName of [
    "prevent_customer_overlapping_appointments()",
    "set_customer_crm_updated_at()",
  ]) {
    const escapedName = functionName.replace(/[()]/g, "\\$&");
    assert.match(migration, new RegExp(`revoke execute on function public\\.${escapedName} from public, anon, authenticated`, "i"));
  }
});

test("health monitor compares the cron secret without ordinary equality", async () => {
  const monitor = await read("supabase/functions/monitor-platform-health/index.ts");

  assert.match(monitor, /function constantTimeEqual\(/);
  assert.match(monitor, /!constantTimeEqual\(req\.headers\.get\("x-cron-secret"\) \|\| "", cronSecret\)/);
  assert.doesNotMatch(monitor, /req\.headers\.get\("x-cron-secret"\)\s*!==\s*cronSecret/);
});
