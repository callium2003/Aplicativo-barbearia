import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDirectory = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));

async function operationalWritesMigration() {
  const names = await readdir(migrationsDirectory);
  const name = names.find((candidate) => candidate.endsWith("_enforce_subscription_operational_writes.sql"));
  assert.ok(name, "a forward-only migration must enforce subscription checks on operational writes");
  return readFile(join(migrationsDirectory, name), "utf8");
}

test("expired subscriptions block tenant operational writes without replacing the five-day agenda rule", async () => {
  const migration = await operationalWritesMigration();

  assert.match(migration, /create or replace function private\.can_write_barbershop_operations\(p_barbershop_id uuid\)/i);
  assert.match(migration, /private\.can_accept_public_booking\(p_barbershop_id\)/i);
  assert.match(migration, /create or replace function private\.enforce_active_subscription_for_operational_write\(\)/i);
  assert.match(migration, /if \(select auth\.uid\(\)\) is null or pg_trigger_depth\(\) > 1 then[\s\S]*return/i);

  for (const table of [
    "barbershops",
    "barbershop_registration_details",
    "business_hours",
    "services",
    "professionals",
    "professional_hours",
    "professional_breaks",
    "professional_time_blocks",
    "professional_saved_custom_hours",
    "professional_deactivation_reviews",
    "professional_commission_settings",
    "team_invitations",
    "team_members",
    "appointment_commissions",
  ]) {
    assert.match(
      migration,
      new RegExp(`create trigger enforce_active_subscription_${table}[\\s\\S]*?on public\\.${table}`, "i"),
      `${table} must be protected by the subscription trigger`,
    );
  }

  assert.doesNotMatch(migration, /on public\.appointments\s+for each row execute function private\.enforce_active_subscription_for_operational_write/i);
  assert.doesNotMatch(migration, /on public\.(barbershop_subscriptions|notification_preferences|user_notifications|customers|customer_consents|customer_privacy_requests)\b/i);
});

test("operational image writes require an active subscription while public reads stay unchanged", async () => {
  const migration = await operationalWritesMigration();

  for (const policy of [
    "Owner or manager can upload barbershop images",
    "Owner or manager can delete barbershop images",
    "Barber can upload own professional image",
    "Barber can delete own professional image",
    "Management can insert professional images",
    "Management can update professional images",
    "Management can delete professional images",
  ]) {
    assert.match(migration, new RegExp(`create policy "${policy}"[\\s\\S]*?private\\.can_write_barbershop_operations`, "i"));
  }

  assert.doesNotMatch(migration, /drop policy if exists "Public can read (barbershop|professional) images"/i);
  assert.match(migration, /grant execute on function private\.can_write_barbershop_operations\(uuid\)\s+to authenticated/i);
  assert.match(migration, /revoke all on function private\.enforce_active_subscription_for_operational_write\(\)\s+from public, anon, authenticated/i);
});
