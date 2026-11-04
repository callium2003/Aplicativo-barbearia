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

test("tenant retention routine protects active commercial agreements", () => {
  assert.match(
    migrationSource,
    /from private\.platform_commercial_agreements ca[\s\S]*?ca\.barbershop_id = b\.id[\s\S]*?ca\.active[\s\S]*?ca\.ends_at > now\(\)/i,
  );
  assert.match(
    migrationSource,
    /from private\.platform_commercial_agreements ca[\s\S]*?ca\.barbershop_id = v_candidate\.barbershop_id[\s\S]*?ca\.active[\s\S]*?ca\.ends_at > now\(\)/i,
  );
});

test("tenant retention candidate predicate covers all cleanup targets", () => {
  assert.match(migrationSource, /b\.instagram_url is not null/i);
  assert.match(migrationSource, /b\.facebook_url is not null/i);
  assert.match(migrationSource, /from public\.barbershop_customers bc/i);
  assert.match(migrationSource, /from public\.customer_consents cc/i);
  assert.match(migrationSource, /from public\.notification_outbox nox/i);
  assert.match(migrationSource, /from public\.barbershop_registration_details rd/i);
  assert.match(migrationSource, /from public\.audit_logs al/i);
  assert.match(migrationSource, /al\.entity_id is not null/i);
  assert.match(migrationSource, /from public\.user_notifications un/i);
  assert.match(migrationSource, /from public\.professionals prof/i);
  assert.match(migrationSource, /from storage\.objects obj/i);
  assert.match(migrationSource, /obj\.bucket_id in \('barbershop-images', 'support-attachments'\)/i);
  assert.match(migrationSource, /a\.status = 'scheduled' and a\.starts_at > now\(\)/i);
});

test("tenant retention routine provides tenant-scoped storage listing and wrapper RPCs", () => {
  assert.match(
    migrationSource,
    /create or replace function public\.list_tenant_retention_storage\(p_barbershop_id uuid\)/i,
  );
  assert.match(
    migrationSource,
    /revoke all on function public\.list_tenant_retention_storage\(uuid\)\s+from public, anon, authenticated/i,
  );
  assert.match(
    migrationSource,
    /grant execute on function public\.list_tenant_retention_storage\(uuid\)\s+to service_role/i,
  );
  assert.match(
    migrationSource,
    /create or replace function public\.run_tenant_retention_cycle\(/i,
  );
  assert.match(
    migrationSource,
    /grant execute on function public\.run_tenant_retention_cycle\(integer, boolean\)\s+to service_role/i,
  );
});

test("tenant retention routine anonymizes professionals and purges tenant storage metadata", () => {
  assert.match(
    migrationSource,
    /update public\.professionals\s+set active = false,\s+photo_url = null/i,
  );
  assert.match(
    migrationSource,
    /delete from storage\.objects obj/i,
  );
});

test("tenant retention routine removes internal user notifications belonging to purged tenant", () => {
  assert.match(
    migrationSource,
    /delete from public\.user_notifications\s+where barbershop_id = v_candidate\.barbershop_id/i,
  );
});

test("tenant retention routine neutralizes audit logs including entity identifiers", () => {
  assert.match(
    migrationSource,
    /update public\.audit_logs\s+set actor_user_id = null,\s+entity_id = null,\s+metadata = '{}'::jsonb/i,
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
  assert.match(sql, /ACORDO COMERCIAL ATIVO/i);
  assert.match(sql, /CONTAS COMPARTILHADAS/i);
  assert.match(sql, /REEXECUÇÃO E IDEMPOTÊNCIA/i);
  assert.match(sql, /REATIVAÇÃO CONCORRENTE/i);
  assert.match(sql, /REGISTRO DE AUDITORIA/i);
  assert.match(sql, /Log de auditoria vazou dados pessoais/i);
});

