import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261029010000_add_platform_customer_export.sql", import.meta.url),
  "utf8",
);

const functionBody = (name) => {
  const start = migration.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migration.indexOf("$$;", start);
  return migration.slice(start, end);
};

test("platform audit trail is extended with customer_data_exported action and metadata column", () => {
  assert.match(migration, /alter table private\.platform_audit_events add constraint platform_audit_events_action_check/i);
  assert.match(migration, /'customer_data_exported'/i);
  assert.match(migration, /alter table private\.platform_audit_events add column if not exists metadata jsonb/i);
  assert.match(functionBody("private.write_platform_audit_event"), /metadata/i);
  assert.match(migration, /revoke all on function private\.write_platform_audit_event\(uuid, text, integer, jsonb\) from public, anon, authenticated/i);
});

test("export function validates internal role, accepts only csv/json and writes audit trail", () => {
  const body = functionBody("public.export_platform_barbershop_customers");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /private\.assert_platform_barbershop\(p_barbershop_id\)/i);
  assert.match(body, /v_normalized_format not in \('csv', 'json'\)/i);
  assert.match(body, /write_platform_audit_event\(\s*p_barbershop_id,\s*'customer_data_exported',\s*v_count,\s*jsonb_build_object\('format',\s*v_normalized_format\)\s*\)/i);
  assert.match(migration, /revoke all on function public\.export_platform_barbershop_customers\(uuid, text\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.export_platform_barbershop_customers\(uuid, text\) to authenticated/i);
});

test("export projection excludes authentication secrets and provider data", () => {
  assert.doesNotMatch(migration, /provider_subscription_id|encrypted_password|raw_user_meta|auth\.users/i);
  const body = functionBody("public.export_platform_barbershop_customers");
  assert.match(body, /public\.barbershop_customers/i);
  assert.match(body, /public\.customers/i);
  assert.match(body, /BARBERSHOP_MARKETING/i);
  assert.match(body, /PLATFORM_MARKETING/i);
});

