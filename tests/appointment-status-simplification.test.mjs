import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("forward migration normalizes confirmed appointments and installs a narrow status RPC", async () => {
  const names = (await readdir(new URL("../supabase/migrations/", import.meta.url)))
    .filter((name) => name.endsWith("_simplify_appointment_status.sql"));
  assert.equal(names.length, 1);
  const sql = await readFile(new URL(`../supabase/migrations/${names[0]}`, import.meta.url), "utf8");

  assert.match(sql, /update public\.appointments\s+set status = 'scheduled'\s+where status = 'confirmed'/i);
  assert.match(sql, /create or replace function public\.set_appointment_status/i);
  assert.match(sql, /p_status not in \('completed', 'no_show', 'cancelled'\)/i);
  assert.match(sql, /v_role = 'barber'.*p_status = 'cancelled'/is);
  assert.match(sql, /drop policy if exists "Barber can update own appointments"/i);
  assert.match(sql, /drop policy if exists "Owner or manager can update appointments"/i);
  assert.match(sql, /revoke all on function public\.set_appointment_status\(uuid,text\)/i);
  assert.match(sql, /grant execute on function public\.set_appointment_status\(uuid,text\) to authenticated/i);
  assert.match(sql, /delete from public\.notification_preferences\s+where event_type = 'appointment_confirmed'/i);
  assert.match(sql, /p_event_type not in \('new_appointment','appointment_cancelled','appointment_rescheduled','appointment_reminder_24h'\)/i);
  assert.doesNotMatch(sql, /\(2,'appointment_confirmed'\)/i);
});

test("runtime appointment surfaces no longer retain the legacy confirmed status", async () => {
  const runtimeFiles = [
    "../app/meus-agendamentos/page.tsx",
    "../app/painel/agenda/page.tsx",
    "../app/painel/agenda/presentation.mjs",
    "../app/painel/home/presentation.mjs",
    "../app/painel/page.tsx",
    "../app/painel/profissionais/[id]/page.tsx",
    "../app/painel/relatorios/page.tsx",
  ];

  for (const runtimeFile of runtimeFiles) {
    const source = await readFile(new URL(runtimeFile, import.meta.url), "utf8");
    assert.doesNotMatch(source, /status:\s*[^;\n]*["']confirmed["']/);
    assert.doesNotMatch(source, /\["scheduled",\s*"confirmed"\]/);
    assert.doesNotMatch(source, /confirmed:\s*"Agendado"/);
  }
});
