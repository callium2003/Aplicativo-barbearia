import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("restores public booking readiness without reopening private functions", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260910191829_restore_public_booking_readiness.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /create or replace function private\.is_barbershop_booking_ready\(p_barbershop_id uuid\)/);
  assert.match(migration, /create or replace function public\.get_public_booking_status\(p_slug text\)/);
  assert.match(migration, /revoke all on function private\.is_barbershop_booking_ready\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.get_public_booking_status\(text\) from public, anon/);
  assert.match(migration, /grant execute on function public\.get_public_booking_status\(text\) to anon, authenticated/);
  assert.match(migration, /create or replace function public\.get_public_availability\(/);
  assert.match(migration, /grant execute on function public\.get_public_availability\(text, date, uuid\[\]\) to anon, authenticated/);
  assert.match(migration, /create trigger a_reject_booking_when_barbershop_is_not_ready/);
});
