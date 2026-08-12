import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260812100000_add_audit_coverage.sql", import.meta.url), "utf8");

test("audit coverage migration keeps the writer private and removes public write grants", () => {
  assert.match(migration, /create or replace function private\.write_audit_log/);
  assert.match(migration, /security definer/);
  assert.match(migration, /revoke insert, update, delete, truncate, references, trigger on table public\.audit_logs from anon, authenticated/);
  assert.match(migration, /create trigger audit_appointments_change/);
  assert.match(migration, /create trigger audit_services_change/);
  assert.match(migration, /create trigger audit_professionals_change/);
  assert.match(migration, /create trigger audit_notification_preferences_change/);
});

test("audit metadata avoids customer contact fields", () => {
  assert.doesNotMatch(migration, /customer_(name|email|phone)/);
  assert.doesNotMatch(migration, /responsible_(name|phone)/);
});

test("customer profile changes are attributed through the barbershop relationship", async () => {
  const customerMigration = await readFile(new URL("../supabase/migrations/20260812103000_add_customer_audit_trigger.sql", import.meta.url), "utf8");
  assert.match(customerMigration, /barbershop_customers/);
  assert.match(customerMigration, /customers\.' \|\| lower\(tg_op\)/);
});
