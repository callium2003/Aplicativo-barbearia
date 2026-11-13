import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("migration 20261113200000 creates subscription_scheduled_plan_changes and hardens reconciliation", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20261113200000_subscription_scheduled_plan_changes_and_financial_hardening.sql", import.meta.url),
    "utf8"
  );

  // Table and privileges
  assert.match(sql, /create table if not exists public\.subscription_scheduled_plan_changes/);
  assert.match(sql, /grant select, insert, update on table public\.subscription_scheduled_plan_changes to service_role/);
  assert.match(sql, /grant select on table public\.subscription_paid_periods to service_role/);

  // Deduplication with checkout reconciliation
  assert.match(sql, /exists \(\s*select 1 from public\.subscription_payment_evidence/);
  assert.match(sql, /exists \(\s*select 1 from public\.subscription_paid_periods/);

  // Preserves cancellation state when delayed payment arrives
  assert.match(sql, /recurring_state = case\s+when recurring_state = 'CANCELED' then 'CANCELED'/);
  assert.match(sql, /set status = case when v_sub\.status = 'cancelled' or v_order\.recurring_state = 'CANCELED' then 'cancelled' else 'active' end/);

  // Consumes scheduled plan contract
  assert.match(sql, /select \* into v_scheduled\s+from public\.subscription_scheduled_plan_changes/);
  assert.match(sql, /set status = 'APPLIED'/);
});

test("subscription-bills route does not perform secondary manual period extension", () => {
  const source = readFileSync(
    new URL("../app/api/subscription-bills/route.ts", import.meta.url),
    "utf8"
  );

  // Verifies that persist_asaas_recurring_subscription_event is called
  assert.match(source, /persist_asaas_recurring_subscription_event/);

  // Verifies that redundant manual setMonth / setDate on currentSub is NOT present
  assert.doesNotMatch(source, /endAt\.setMonth/);
  assert.doesNotMatch(source, /periodMs = currentSub\.current_period_ends_at/);
});

test("subscription-bills scopes checkoutUrl rewriting to the configured account", () => {
  const source = readFileSync(
    new URL("../app/api/subscription-bills/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /isCurrentConfigAccount = !order\.provider_account_id \|\| order\.provider_account_id === billingConfig\.account/);
  assert.match(source, /provider_account_id/);
});

test("subscription-renewal route checks mutation results and uses valid support ticket schema", () => {
  const source = readFileSync(
    new URL("../app/api/subscription-renewal/route.ts", import.meta.url),
    "utf8"
  );

  // Checks mutation error inspection
  assert.match(source, /if \(orderUp\.error\)/);
  assert.match(source, /if \(subUp\.error\)/);

  // Checks support ticket schema compliance
  assert.match(source, /created_by: user\.id/);
  assert.match(source, /created_by_role: "owner"/);
  assert.match(source, /category_id: "billing"/);
  assert.match(source, /priority: "high"/);
  assert.match(source, /status: "open"/);
  assert.doesNotMatch(source, /requester_id: user\.id/);
  assert.doesNotMatch(source, /status: "OPEN"/);
});

test("subscription-plan-change route persists scheduled plan contract locally", () => {
  const source = readFileSync(
    new URL("../app/api/subscription-plan-change/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /from\("subscription_scheduled_plan_changes"\)/);
  assert.match(source, /plan_code: targetPlan\.code/);
  assert.match(source, /months: targetPlan\.months/);
  assert.match(source, /price_cents: targetPlan\.priceCents/);
  assert.match(source, /user_limit: targetPlan\.userLimit/);
  assert.match(source, /status: "SCHEDULED"/);
});
