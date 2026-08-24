import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("customer privacy portal downloads only its authenticated export and requests account deletion", async () => {
  const page = await read("app/meu-perfil/privacidade/page.tsx");

  assert.match(page, /export_my_customer_data/);
  assert.match(page, /delete-my-customer-account/);
  assert.match(page, /customer_privacy_requests/);
  assert.match(page, /Voltar ao perfil/);
  assert.doesNotMatch(page, /customer_id\s*:/);
  assert.doesNotMatch(page, /service_role/i);
});

test("account deletion function obtains the subject only from a verified bearer token", async () => {
  const edgeFunction = await read("supabase/functions/delete-my-customer-account/index.ts");

  assert.match(edgeFunction, /Authorization/);
  assert.match(edgeFunction, /getUser\(token\)/);
  assert.match(edgeFunction, /anonymize_my_customer_account/);
  assert.match(edgeFunction, /auth\.admin\.deleteUser/);
  assert.match(edgeFunction, /authentication_required/);
  assert.doesNotMatch(edgeFunction, /request\.json\(/);
  assert.doesNotMatch(edgeFunction, /(?:body|requestBody)\s*\.\s*user_id/);
  assert.doesNotMatch(edgeFunction, /console\.(?:log|warn|error)/);
});

test("privacy migration protects requests, exports only owned data, and keeps grants minimal", async () => {
  const migration = await read("supabase/migrations/20260819041728_harden_customer_privacy_rights.sql");
  const sql = await read("tests/customer-privacy-rights-rls.sql");

  assert.match(migration, /create table public\.customer_privacy_requests/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /customer_privacy_requests_one_open_request_per_type/);
  assert.match(migration, /export_my_customer_data\(\)/);
  assert.match(migration, /anonymize_my_customer_account\(\)/);
  assert.match(migration, /Recent authentication required/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /storage\.allow_delete_query/);
  assert.match(migration, /customer_privacy_requests request/);
  assert.match(migration, /revoke all on function public\.export_my_customer_data\(\) from public, anon/);
  assert.match(migration, /grant execute on function public\.anonymize_my_customer_account\(\) to authenticated/);
  assert.match(sql, /rollback;/i);
  assert.match(sql, /customer A must not read customer B privacy protocols/);
  assert.match(sql, /anonymization must be idempotent/);
  assert.match(sql, /an old session must not allow anonymization/);
  assert.match(sql, /required financial snapshot was changed by anonymization/);
});
