import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("uses a monthly public availability projection instead of one RPC per calendar day", async () => {
  const page = await read("app/[slug]/page.tsx");
  const migration = await read("supabase/migrations/20260915140000_public_booking_abuse_protection.sql");

  assert.match(migration, /create or replace function public\.get_public_monthly_availability/i);
  assert.match(page, /monthly_availability/);
  assert.doesNotMatch(page, /dateKeys\.map\(async \(key\)[\s\S]{0,600}get_public_availability/);
});

test("routes public booking reads through the protected Edge Function and keeps final booking validation", async () => {
  const page = await read("app/[slug]/page.tsx");
  const gateway = await read("supabase/functions/public-booking-gateway/index.ts");

  assert.match(page, /functions\.invoke\("public-booking-gateway"/);
  assert.match(page, /book_customer_appointment/);
  assert.match(gateway, /429/);
  assert.match(gateway, /get_public_monthly_availability/);
  assert.match(gateway, /get_public_availability/);
});

test("makes new team invitations expire after two days while preserving explicit privilege boundaries", async () => {
  const migration = await read("supabase/migrations/20260915140000_public_booking_abuse_protection.sql");

  assert.match(migration, /now\(\) \+ interval '2 days'/i);
  assert.match(migration, /revoke all on function public\.get_public_availability\(text, date, uuid\[\]\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.get_public_availability\(text, date, uuid\[\]\) to service_role/i);
});
