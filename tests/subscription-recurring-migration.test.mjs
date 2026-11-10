import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("recurring provider links are local-only and never grant access", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261108230000_subscription_recurring_provider_links.sql", import.meta.url), "utf8");
  assert.match(sql, /billing_mode text[\s\S]*CARD_RECURRING/);
  assert.match(sql, /provider_customer_id/);
  assert.match(sql, /provider_subscription_id/);
  assert.match(sql, /provider_pix_authorization_id/);
  assert.match(sql, /concede vigência/i);
  assert.doesNotMatch(sql, /update[\s\S]+barbershop_subscriptions[\s\S]+active/i);
});
