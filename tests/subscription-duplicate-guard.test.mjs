import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("server guard blocks a new order while a paid period is still valid", async () => {
  const migration = await read("../supabase/migrations/20261108224000_block_duplicate_active_subscription_orders.sql");
  assert.match(migration, /s\.status = 'active'/);
  assert.match(migration, /s\.current_period_ends_at is null or s\.current_period_ends_at > clock_timestamp\(\)/);
  assert.match(migration, /Active subscription requires a plan change/);
});

test("subscription central hides new-order actions for active and pending states", async () => {
  const overview = await read("../app/painel/assinatura/SubscriptionOverview.tsx");
  const plans = await read("../app/painel/assinatura/SubscriptionPlans.tsx");
  assert.match(overview, /view\.kind !== "active" && view\.kind !== "pending"/);
  assert.match(plans, /const canStartOrder = view\.kind !== "active" && view\.kind !== "pending"/);
  assert.match(overview, /Alterar plano/);
});
