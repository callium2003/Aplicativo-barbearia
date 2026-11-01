import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const baseMigration = await readFile(
  new URL("../supabase/migrations/20261031060000_install_platform_sentinel_incident_automation.sql", import.meta.url),
  "utf8",
);

const hardeningMigration = await readFile(
  new URL("../supabase/migrations/20261031230000_harden_platform_sentinel_automation.sql", import.meta.url),
  "utf8",
);

const functionBody = (migrationSource, name) => {
  const start = migrationSource.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migrationSource.indexOf("$$;", start);
  return migrationSource.slice(start, end);
};

test("sentinel migration enables system authoring for automated incident notes", () => {
  assert.match(
    baseMigration,
    /alter table public\.platform_operational_incident_notes\s+alter column author_user_id drop not null/i,
  );
});

test("sentinel hardening enables system actors and global platform events in audit", () => {
  assert.match(
    hardeningMigration,
    /alter table private\.platform_audit_events\s+alter column actor_user_id drop not null/i,
  );
  assert.match(
    hardeningMigration,
    /alter table private\.platform_audit_events\s+alter column barbershop_id drop not null/i,
  );
});

test("sentinel hardening enforces RLS and restricts table privileges on probe states", () => {
  assert.match(
    hardeningMigration,
    /alter table private\.platform_service_probe_states enable row level security/i,
  );
  assert.match(
    hardeningMigration,
    /revoke all on table private\.platform_service_probe_states from public, anon, authenticated/i,
  );
  assert.match(
    hardeningMigration,
    /grant select, insert, update on table private\.platform_service_probe_states to service_role/i,
  );
  assert.match(
    hardeningMigration,
    /create policy "Service role and definer access only"/i,
  );
});

test("sentinel hardening installs reliable caller role verification for service_role", () => {
  const helperBody = functionBody(hardeningMigration, "private.is_service_role");
  assert.match(helperBody, /security definer/i);
  assert.match(helperBody, /set search_path to ''/i);
  assert.match(helperBody, /request\.jwt\.claim\.role/i);
  assert.match(helperBody, /auth\.jwt\(\) ->> 'role'/i);
  assert.match(helperBody, /session_user in \('service_role', 'postgres'\)/i);
});

test("hardened record_service_sentinel_probe uses reliable caller check, stale incident clearance and 3-cycle rules", () => {
  const body = functionBody(hardeningMigration, "public.record_service_sentinel_probe");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /private\.is_service_role\(\)\s+or\s+private\.is_active_platform_owner\(\)/i);
  assert.doesNotMatch(body, /current_user <> 'service_role'/i);

  // Tratamento de incidentes externamente encerrados
  assert.match(body, /status in \('open', 'acknowledged', 'investigating'\)/i);
  assert.match(body, /v_current_incident_id := null/i);

  // Auto-abertura com 3 falhas
  assert.match(body, /v_new_failures >= 3/i);
  assert.match(body, /v_action_taken := 'incident_opened'/i);

  // Auto-resolução com 3 sucessos
  assert.match(body, /v_new_successes >= 3/i);
  assert.match(body, /v_action_taken := 'incident_resolved'/i);

  // Auditoria append-only atribuída ao sistema
  assert.match(body, /private\.write_platform_audit_event/i);
  assert.match(body, /'actor_type',\s*'system'/i);
});

test("hardened get_platform_sentinel_overview and ingest_platform_infra_webhook enforce security and reliable auth", () => {
  const overviewBody = functionBody(hardeningMigration, "public.get_platform_sentinel_overview");
  assert.match(overviewBody, /security definer/i);
  assert.match(overviewBody, /set search_path to ''/i);
  assert.match(overviewBody, /private\.is_service_role\(\)\s+or\s+private\.is_active_platform_owner\(\)/i);
  assert.doesNotMatch(overviewBody, /current_user <> 'service_role'/i);

  const webhookBody = functionBody(hardeningMigration, "public.ingest_platform_infra_webhook");
  assert.match(webhookBody, /security definer/i);
  assert.match(webhookBody, /set search_path to ''/i);
  assert.match(webhookBody, /private\.is_service_role\(\)\s+or\s+private\.is_active_platform_owner\(\)/i);
  assert.doesNotMatch(webhookBody, /current_user <> 'service_role'/i);
  assert.match(webhookBody, /record_service_sentinel_probe/i);
});

test("probe states table supports unknown status and prevents false healthy presentation without measurement", () => {
  assert.match(hardeningMigration, /check \(last_status in \('healthy', 'degraded', 'down', 'unknown'\)\)/i);
  assert.match(hardeningMigration, /alter table private\.platform_service_probe_states\s+alter column last_status set default 'unknown'/i);
});
