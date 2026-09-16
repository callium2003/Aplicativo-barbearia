import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");

async function performanceMigration() {
  const files = await readdir(migrationsDir);
  const file = files.find((name) => name.endsWith("_optimize_deactivation_review_and_consent_policy.sql"));
  assert.ok(file, "a migration forward-only de performance deve existir");
  return readFile(path.join(migrationsDir, file), "utf8");
}

test("indexa as duas chaves estrangeiras de autoria da revisão de inativação", async () => {
  const sql = await performanceMigration();

  assert.match(sql, /create index if not exists professional_deactivation_reviews_created_by_idx\s+on public\.professional_deactivation_reviews \(created_by\)/i);
  assert.match(sql, /create index if not exists professional_deactivation_reviews_resolved_by_idx\s+on public\.professional_deactivation_reviews \(resolved_by\)/i);
});

test("mantém a autorização do consentimento e transforma o contexto constante em initPlan", async () => {
  const sql = await performanceMigration();

  assert.match(sql, /drop policy if exists "Customer can record own consent events" on public\.customer_consents/i);
  assert.match(sql, /create policy "Customer can record own consent events"[\s\S]*for insert[\s\S]*to authenticated/i);
  assert.match(sql, /c\.auth_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /\(select current_setting\('app\.crm_consent_write', true\)\) = 'customer_preferences'/i);
  assert.match(sql, /consent_version = '1\.0'[\s\S]*source = 'customer_preferences'/i);
});
