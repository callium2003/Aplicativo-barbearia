import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261028143000_add_platform_administration_foundation.sql", import.meta.url),
  "utf8",
);

test("platform administration is private and grants no direct access to tenant roles", () => {
  assert.match(migration, /create table if not exists private\.platform_administrators/i);
  assert.match(migration, /role text not null check \(role = 'platform_owner'\)/i);
  assert.match(migration, /revoke all on table private\.platform_administrators from public, anon, authenticated/i);
  assert.match(migration, /create table if not exists private\.platform_administrator_audit/i);
  assert.match(migration, /create trigger audit_platform_administrator_change/i);
  assert.match(migration, /auth\.uid\(\)/i);
  assert.doesNotMatch(migration, /revoke all on schema private/i);
  assert.doesNotMatch(migration, /grant .*platform_administrators.*(?:anon|authenticated)/i);
  assert.doesNotMatch(migration, /grant .*platform_administrator_audit.*(?:anon|authenticated)/i);
  assert.doesNotMatch(migration, /insert into private\.platform_administrators/i);
});

test("platform overview requires an active platform owner and returns a minimal projection", () => {
  assert.match(migration, /create or replace function public\.get_platform_barbershop_overview\(\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /raise exception 'Acesso interno não autorizado'/i);
  assert.match(migration, /b\.name/i);
  assert.match(migration, /b\.slug/i);
  assert.match(migration, /s\.status/i);
  assert.match(migration, /s\.plan_code/i);
  assert.match(migration, /s\.trial_ends_at/i);
  assert.match(migration, /s\.current_period_ends_at/i);
  assert.doesNotMatch(migration, /customer_email|customer_phone|appointment|provider_subscription_id|asaas/i);
  assert.match(migration, /revoke all on function public\.get_platform_barbershop_overview\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.get_platform_barbershop_overview\(\) to authenticated/i);
});

test("platform routes are kept separate from the tenant panel", async () => {
  const [page, access, administration] = await Promise.all([
    readFile(new URL("../app/plataforma/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/plataforma/entrar/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../utils/platform-administration.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(page, /loadPlatformAdministration/);
  assert.match(administration, /get_platform_barbershop_overview/);
  assert.match(page, /Acesso interno não autorizado/);
  assert.match(access, /\/plataforma\/entrar/);
  assert.doesNotMatch(page, /\/painel/);
});
