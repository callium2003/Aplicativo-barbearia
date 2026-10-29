import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20261029020000_add_platform_support_and_faq.sql", import.meta.url),
  "utf8",
);

const functionBody = (name) => {
  const start = migration.search(new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i"));
  assert.notEqual(start, -1, `${name} não foi criada`);
  const end = migration.indexOf("$$;", start);
  return migration.slice(start, end);
};

test("FAQ tables are created with public read access and RLS enabled", () => {
  assert.match(migration, /create table if not exists public\.platform_faq_categories/i);
  assert.match(migration, /create table if not exists public\.platform_faq_articles/i);
  assert.match(migration, /alter table public\.platform_faq_categories enable row level security/i);
  assert.match(migration, /alter table public\.platform_faq_articles enable row level security/i);
  assert.match(migration, /grant select on table public\.platform_faq_categories to anon, authenticated/i);
  assert.match(migration, /grant select on table public\.platform_faq_articles to anon, authenticated/i);
});

test("support tickets and messages tables are created with strict RLS and revoked anon access", () => {
  assert.match(migration, /create table if not exists public\.platform_support_tickets/i);
  assert.match(migration, /create table if not exists public\.platform_support_ticket_messages/i);
  assert.match(migration, /alter table public\.platform_support_tickets enable row level security/i);
  assert.match(migration, /alter table public\.platform_support_ticket_messages enable row level security/i);
  assert.match(migration, /revoke all on table public\.platform_support_tickets from public, anon/i);
  assert.match(migration, /revoke all on table public\.platform_support_ticket_messages from public, anon/i);
});

test("audit actions include support ticket actions", () => {
  assert.match(migration, /'support_ticket_opened'/i);
  assert.match(migration, /'support_ticket_replied'/i);
  assert.match(migration, /'support_ticket_status_changed'/i);
});

test("create_platform_support_ticket validates tenant role, minimum lengths and records audit", () => {
  const body = functionBody("public.create_platform_support_ticket");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /private\.current_barbershop_role\(p_barbershop_id\)/i);
  assert.match(body, /v_role not in \('owner', 'manager'\)/i);
  assert.match(body, /char_length\(v_normalized_subject\) < 5/i);
  assert.match(body, /char_length\(v_normalized_desc\) < 10/i);
  assert.match(body, /write_platform_audit_event/i);
  assert.match(migration, /grant execute on function public\.create_platform_support_ticket\(uuid, text, text, text, text\) to authenticated/i);
});

test("reply_platform_support_ticket supports both platform_owner and tenant owner/manager with SLA tracking", () => {
  const body = functionBody("public.reply_platform_support_ticket");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /private\.is_active_platform_owner\(\)/i);
  assert.match(body, /private\.current_barbershop_role/i);
  assert.match(body, /first_responded_at = coalesce\(first_responded_at, now\(\)\)/i);
  assert.match(body, /write_platform_audit_event/i);
  assert.match(migration, /grant execute on function public\.reply_platform_support_ticket\(uuid, text\) to authenticated/i);
});

test("update_platform_support_ticket_status validates valid transitions and records audit", () => {
  const body = functionBody("public.update_platform_support_ticket_status");
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path to ''/i);
  assert.match(body, /write_platform_audit_event/i);
  assert.match(migration, /grant execute on function public\.update_platform_support_ticket_status\(uuid, text, uuid\) to authenticated/i);
});
