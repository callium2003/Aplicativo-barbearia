import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261029004500_add_platform_barbershop_consultation.sql", import.meta.url),
  "utf8",
);

const functionBody = (name) => {
  const start = migration.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migration.indexOf("$$;", start);
  return migration.slice(start, end);
};

const consultation = [
  "public.get_platform_barbershop_detail",
  "public.list_platform_barbershop_professionals",
  "public.list_platform_barbershop_services",
  "public.list_platform_barbershop_customers",
  "public.list_platform_barbershop_customer_consents",
];

test("platform audit trail is private, minimal and closed to client roles", () => {
  assert.match(migration, /create table if not exists private\.platform_audit_events/i);
  assert.match(migration, /alter table private\.platform_audit_events enable row level security/i);
  assert.match(migration, /revoke all on table private\.platform_audit_events from public, anon, authenticated/i);
  assert.match(migration, /action text not null check \(action in \('customer_data_opened', 'customer_consents_viewed'\)\)/i);
  assert.doesNotMatch(migration, /grant [^;]*platform_audit_events/i);
  assert.doesNotMatch(functionBody("private.write_platform_audit_event"), /email|phone|name/i);
});

test("every consultation function checks the internal role and is executable only by authenticated", () => {
  assert.match(migration, /revoke all on function private\.is_active_platform_owner\(\) from public, anon, authenticated/i);
  for (const name of consultation) {
    const body = functionBody(name);
    assert.match(body, /security definer/i, name);
    assert.match(body, /set search_path to ''/i, name);
    assert.match(body, /private\.assert_platform_barbershop\(p_barbershop_id\)/i, name);
    const escaped = name.replace(".", "\\.");
    assert.match(migration, new RegExp(`revoke all on function ${escaped}\\(uuid\\) from public, anon, authenticated`, "i"), name);
    assert.match(migration, new RegExp(`grant execute on function ${escaped}\\(uuid\\) to authenticated`, "i"), name);
  }
});

test("only opening customers or consents writes an audit event", () => {
  assert.match(functionBody("public.list_platform_barbershop_customers"), /write_platform_audit_event\(p_barbershop_id, 'customer_data_opened'/i);
  assert.match(functionBody("public.list_platform_barbershop_customer_consents"), /write_platform_audit_event\(p_barbershop_id, 'customer_consents_viewed'/i);
  for (const name of consultation.slice(0, 3)) assert.doesNotMatch(functionBody(name), /write_platform_audit_event/i, name);
});

test("projections exclude provider identifiers, staff phone, commissions and authentication data", () => {
  assert.doesNotMatch(migration, /provider_subscription_id|commission|auth\.users|encrypted_password|raw_user_meta/i);
  assert.doesNotMatch(functionBody("public.list_platform_barbershop_professionals"), /phone|email/i);
  assert.match(functionBody("public.list_platform_barbershop_customers"), /public\.barbershop_customers/i);
});
