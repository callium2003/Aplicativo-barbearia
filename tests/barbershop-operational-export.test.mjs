import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("the owner-facing export is a direct download and does not request credentials", async () => {
  const page = await read("app/painel/assinatura/dados/page.tsx");

  assert.match(page, /export_my_barbershop_operational_data/);
  assert.match(page, /Gerar e baixar arquivo/);
  assert.match(page, /download/);
  assert.doesNotMatch(page, /senha/i);
  assert.doesNotMatch(page, /service_role/i);
});

test("the export RPC enforces owner-only tenant isolation and minimized auditing", async () => {
  const migration = await read("supabase/migrations/20260912150000_export_barbershop_operational_data.sql");

  assert.match(migration, /create or replace function public\.export_my_barbershop_operational_data\(\)/i);
  assert.match(migration, /private\.current_barbershop_role\(v_barbershop_id\)\s*<>\s*'owner'/i);
  assert.match(migration, /private\.has_recent_barbershop_authentication\(\)/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /private\.write_audit_log\(/i);
  assert.match(migration, /'barbershop_operational_export'/i);
  assert.match(migration, /revoke all on function public\.export_my_barbershop_operational_data\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.export_my_barbershop_operational_data\(\) to authenticated/i);
  assert.match(migration, /where appointment\.barbershop_id = v_barbershop_id/i);
  assert.match(migration, /where consent\.barbershop_id = v_barbershop_id/i);
  assert.doesNotMatch(migration, /auth\.users/i);
  assert.doesNotMatch(migration, /password/i);
  assert.doesNotMatch(migration, /token_hash|team_invitations/i);
});
