import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261029023000_add_platform_operational_incidents.sql", import.meta.url),
  "utf8",
);

const functionBody = (name) => {
  const start = migration.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migration.indexOf("$$;", start);
  return migration.slice(start, end);
};

test("platform operational incidents and notes tables are created with RLS and revoked anon access", () => {
  assert.match(migration, /create table if not exists public\.platform_operational_incidents/i);
  assert.match(migration, /create table if not exists public\.platform_operational_incident_notes/i);
  assert.match(migration, /alter table public\.platform_operational_incidents enable row level security/i);
  assert.match(migration, /alter table public\.platform_operational_incident_notes enable row level security/i);
  assert.match(migration, /revoke all on table public\.platform_operational_incidents from public, anon/i);
  assert.match(migration, /revoke all on table public\.platform_operational_incident_notes from public, anon/i);
});

test("audit actions include incident lifecycle actions", () => {
  assert.match(migration, /'incident_created'/i);
  assert.match(migration, /'incident_acknowledged'/i);
  assert.match(migration, /'incident_assigned'/i);
  assert.match(migration, /'incident_note_added'/i);
  assert.match(migration, /'incident_status_changed'/i);
  assert.match(migration, /'incident_resolved'/i);
});

test("incident RPCs require active platform owner check and run as security definer", () => {
  const rpcs = [
    "public.list_platform_operational_incidents",
    "public.get_platform_operational_incident_detail",
    "public.create_platform_operational_incident",
    "public.acknowledge_platform_operational_incident",
    "public.assign_platform_operational_incident",
    "public.add_platform_operational_incident_note",
    "public.resolve_platform_operational_incident",
  ];

  for (const rpc of rpcs) {
    const body = functionBody(rpc);
    assert.match(body, /security definer/i, `${rpc} deve ser SECURITY DEFINER`);
    assert.match(body, /set search_path to ''/i, `${rpc} deve ter search_path vazio`);
    assert.match(body, /private\.is_active_platform_owner\(\)/i, `${rpc} deve validar platform_owner`);
  }
});
