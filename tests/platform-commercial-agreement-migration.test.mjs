import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261029013000_add_platform_commercial_agreement_reactivation.sql", import.meta.url),
  "utf8",
);

const functionBody = (name) => {
  const start = migration.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migration.indexOf("$$;", start);
  return migration.slice(start, end);
};

test("commercial agreements table is private with RLS and no client access", () => {
  assert.match(migration, /create table if not exists private\.platform_commercial_agreements/i);
  assert.match(migration, /alter table private\.platform_commercial_agreements enable row level security/i);
  assert.match(migration, /revoke all on table private\.platform_commercial_agreements from public, anon, authenticated/i);
  assert.match(migration, /duration_days integer not null check \(duration_days >= 1 and duration_days <= 365\)/i);
});

test("audit actions include commercial agreement activation, renewal and suspension", () => {
  assert.match(migration, /'commercial_agreement_activated'/i);
  assert.match(migration, /'commercial_agreement_renewed'/i);
  assert.match(migration, /'barbershop_suspended'/i);
});

test("reactivate_platform_barbershop_by_agreement enforces platform_owner role and validates inputs", () => {
  const body = functionBody("public.reactivate_platform_barbershop_by_agreement");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /private\.assert_platform_barbershop\(p_barbershop_id\)/i);
  assert.match(body, /p_duration_days < 1 or p_duration_days > 365/i);
  assert.match(body, /char_length\(v_normalized_reason\) < 3/i);
  assert.match(body, /char_length\(v_normalized_condition\) < 3/i);
  assert.match(body, /write_platform_audit_event/i);
  assert.match(migration, /grant execute on function public\.reactivate_platform_barbershop_by_agreement\(uuid, integer, text, text\) to authenticated/i);
});

test("suspend_platform_barbershop deactivates agreement and barbershop with audit", () => {
  const body = functionBody("public.suspend_platform_barbershop");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /private\.assert_platform_barbershop\(p_barbershop_id\)/i);
  assert.match(body, /char_length\(v_normalized_reason\) < 3/i);
  assert.match(body, /update public\.barbershops\s+set active = false/i);
  assert.match(body, /write_platform_audit_event\(\s*p_barbershop_id,\s*'barbershop_suspended'/i);
  assert.match(migration, /grant execute on function public\.suspend_platform_barbershop\(uuid, text\) to authenticated/i);
});

test("operational access and projections reflect commercial_agreement contract status", () => {
  const bookingBody = functionBody("private.can_accept_public_booking");
  assert.match(bookingBody, /private\.platform_commercial_agreements/i);
  assert.match(bookingBody, /ca\.ends_at > now\(\)/i);

  const overviewBody = functionBody("public.get_platform_barbershop_overview");
  assert.match(overviewBody, /'commercial_agreement'/i);

  const detailBody = functionBody("public.get_platform_barbershop_detail");
  assert.match(detailBody, /'commercial_agreement'/i);
  assert.match(detailBody, /commercial_agreement_active/i);
});

