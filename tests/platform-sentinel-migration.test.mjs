import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261031060000_install_platform_sentinel_incident_automation.sql", import.meta.url),
  "utf8",
);

const functionBody = (name) => {
  const start = migration.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migration.indexOf("$$;", start);
  return migration.slice(start, end);
};

test("sentinel migration enables system authoring for automated incident notes", () => {
  assert.match(
    migration,
    /alter table public\.platform_operational_incident_notes\s+alter column author_user_id drop not null/i,
  );
});

test("sentinel migration creates service probe states table with check constraints and seed", () => {
  assert.match(migration, /create table if not exists private\.platform_service_probe_states/i);
  assert.match(migration, /service_name in \('api', 'database', 'auth', 'storage', 'notifications', 'booking_gateway', 'cron_jobs'\)/i);
  assert.match(migration, /last_status in \('healthy', 'degraded', 'down'\)/i);
  assert.match(migration, /insert into private\.platform_service_probe_states/i);
});

test("record_service_sentinel_probe enforces security definer, empty search_path and 3-cycle threshold", () => {
  const body = functionBody("public.record_service_sentinel_probe");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /is_active_platform_owner\(\)/i);
  assert.match(body, /current_user <> 'service_role'/i);
  // Auto-abertura com 3 falhas
  assert.match(body, /v_new_failures >= 3/i);
  assert.match(body, /v_action_taken := 'incident_opened'/i);
  // Auto-resolução com 3 sucessos
  assert.match(body, /v_new_successes >= 3/i);
  assert.match(body, /v_action_taken := 'incident_resolved'/i);
  // Registro de auditoria
  assert.match(body, /private\.write_platform_audit_event/i);
});

test("get_platform_sentinel_overview and ingest_platform_infra_webhook run as security definer with empty search_path", () => {
  const overviewBody = functionBody("public.get_platform_sentinel_overview");
  assert.match(overviewBody, /security definer/i);
  assert.match(overviewBody, /set search_path to ''/i);

  const webhookBody = functionBody("public.ingest_platform_infra_webhook");
  assert.match(webhookBody, /security definer/i);
  assert.match(webhookBody, /set search_path to ''/i);
  assert.match(webhookBody, /record_service_sentinel_probe/i);
});

