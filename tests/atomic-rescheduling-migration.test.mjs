import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("atomic customer rescheduling locks the original and exposes no public execution", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260916191502_add_atomic_customer_rescheduling.sql", import.meta.url), "utf8");
  assert.match(migration, /create function public\.reschedule_customer_appointment/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /update public\.appointments set status = 'cancelled'/i);
  assert.match(migration, /select public\.book_customer_appointment/i);
  assert.match(migration, /revoke all on function public\.reschedule_customer_appointment[\s\S]*from public/i);
  assert.match(migration, /grant execute on function public\.reschedule_customer_appointment[\s\S]*to authenticated/i);
});
