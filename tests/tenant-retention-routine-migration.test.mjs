import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationSource = await readFile(
  new URL("../supabase/migrations/20261104200000_install_tenant_retention_and_anonymization_routine.sql", import.meta.url),
  "utf8",
);

test("tenant retention routine creates isolated execution logs table with strict RLS", () => {
  assert.match(
    migrationSource,
    /create table if not exists private\.tenant_retention_execution_logs/i,
  );
  assert.match(
    migrationSource,
    /alter table private\.tenant_retention_execution_logs enable row level security/i,
  );
  assert.match(
    migrationSource,
    /revoke all on private\.tenant_retention_execution_logs from public, anon, authenticated/i,
  );
  assert.match(
    migrationSource,
    /grant select, insert on private\.tenant_retention_execution_logs to service_role/i,
  );
});

test("tenant retention function enforces security definer and isolated search path", () => {
  assert.match(
    migrationSource,
    /create or replace function private\.process_tenant_retention_cycle\s*\([\s\S]*?\)\s*returns jsonb/i,
  );
  assert.match(
    migrationSource,
    /security definer\s+set search_path = ''/i,
  );
});

test("tenant retention function revokes privileges from public, anon and authenticated", () => {
  assert.match(
    migrationSource,
    /revoke all on function private\.process_tenant_retention_cycle\(integer, boolean\)\s+from public, anon, authenticated/i,
  );
  assert.match(
    migrationSource,
    /grant execute on function private\.process_tenant_retention_cycle\(integer, boolean\)\s+to service_role/i,
  );
});

test("tenant retention function implements concurrency protection and batching", () => {
  assert.match(
    migrationSource,
    /for update of b skip locked/i,
  );
  assert.match(
    migrationSource,
    /limit v_batch_limit/i,
  );
});

test("tenant retention function supports dry_run simulation without writes", () => {
  assert.match(
    migrationSource,
    /p_dry_run boolean default false/i,
  );
  assert.match(
    migrationSource,
    /if not p_dry_run then/i,
  );
});

test("tenant retention routine prepares cron configuration helper with restricted access", () => {
  assert.match(
    migrationSource,
    /create or replace function private\.configure_tenant_retention_cron\(\)/i,
  );
  assert.match(
    migrationSource,
    /barbeariasp-tenant-retention-cycle/i,
  );
  assert.match(
    migrationSource,
    /revoke all on function private\.configure_tenant_retention_cron\(\)\s+from public, anon, authenticated/i,
  );
  assert.match(
    migrationSource,
    /grant execute on function private\.configure_tenant_retention_cron\(\)\s+to service_role/i,
  );
});

test("tenant retention fixture verifies isolation, dry-run, anonymization and idempotency", async () => {
  const sql = await readFile(
    new URL("tenant-retention-routine.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /begin;/i);
  assert.match(sql, /rollback;/i);
  assert.match(sql, /TESTE DE SIMULAÇÃO/i);
  assert.match(sql, /TESTE DE EXECUÇÃO REAL/i);
  assert.match(sql, /ISOLAMENTO: Barbearia B/i);
  assert.match(sql, /CONTAS COMPARTILHADAS/i);
  assert.match(sql, /REEXECUÇÃO E IDEMPOTÊNCIA/i);
  assert.match(sql, /REATIVAÇÃO CONCORRENTE/i);
  assert.match(sql, /REGISTRO DE AUDITORIA/i);
  assert.match(sql, /Log de auditoria vazou dados pessoais/i);
});

