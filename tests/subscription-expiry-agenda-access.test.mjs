import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDirectory = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));

async function expiryMigration() {
  const names = await readdir(migrationsDirectory);
  const name = names.find((candidate) => candidate.endsWith("_enforce_subscription_expiry_agenda_access.sql"));
  assert.ok(name, "a forward-only migration must enforce subscription expiry in the agenda");
  return readFile(join(migrationsDirectory, name), "utf8");
}

async function priorityMigration() {
  const names = await readdir(migrationsDirectory);
  const name = names.find((candidate) => candidate.endsWith("_prioritize_subscription_expiry_public_message.sql"));
  assert.ok(name, "a forward-only migration must prioritize the subscription message over setup guidance");
  return readFile(join(migrationsDirectory, name), "utf8");
}

test("expired subscriptions close public booking without changing valid barbershops", async () => {
  const migration = await expiryMigration();

  assert.match(migration, /create or replace function private\.can_accept_public_booking\(p_barbershop_id uuid\)/i);
  assert.match(migration, /trial_ends_at > now\(\)/i);
  assert.match(migration, /current_period_ends_at > now\(\)/i);
  assert.match(migration, /Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP\./);
  assert.match(migration, /create or replace function public\.get_public_booking_availability\(p_slug text\)/i);
});

test("the five-day operational window never exposes customer data after its cutoff", async () => {
  const migration = await expiryMigration();
  const restrictedSlots = migration.match(/create or replace function public\.get_my_restricted_agenda_slots\([\s\S]*?\n\$\$;/i)?.[0] || "";

  assert.match(migration, /interval '5 days'/i);
  assert.match(migration, /create or replace function private\.barbershop_agenda_operational_until\(p_barbershop_id uuid\)/i);
  assert.match(migration, /create or replace function public\.get_my_restricted_agenda_slots\(/i);
  assert.ok(restrictedSlots);
  assert.doesNotMatch(restrictedSlots, /customer_name|customer_email|customer_phone/i);
  assert.match(migration, /create policy "Authenticated can read allowed appointments"/i);
  assert.match(migration, /private\.can_operate_barbershop_agenda\(barbershop_id\)/i);
});

test("an expired subscription takes precedence over incomplete public booking setup", async () => {
  const migration = await priorityMigration();
  const availability = migration.match(/create or replace function public\.get_public_booking_availability\(p_slug text\)[\s\S]*?\n\$\$;/i)?.[0] || "";
  const bookingTrigger = migration.match(/create or replace function private\.reject_booking_when_barbershop_is_not_ready\(\)[\s\S]*?\n\$\$;/i)?.[0] || "";

  assert.ok(availability);
  assert.ok(bookingTrigger);
  assert.ok(availability.indexOf("private.can_accept_public_booking") < availability.indexOf("private.is_barbershop_booking_configured"));
  assert.ok(bookingTrigger.indexOf("private.can_accept_public_booking") < bookingTrigger.indexOf("private.is_barbershop_booking_configured"));
  assert.match(migration, /Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP\./);
});
