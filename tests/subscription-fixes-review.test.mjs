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

  // Preserves cancellation state when delayed payment arrives for canceled order, but allows new order to activate
  assert.match(sql, /recurring_state = case\s+when recurring_state = 'CANCELED' then 'CANCELED'/);
  assert.match(sql, /when v_order\.recurring_state = 'CANCELED' then 'cancelled'/);

  // Consumes or retains scheduled/applied plan contract for all subsequent renewals without mutating immutable order snapshot
  assert.match(sql, /select \* into v_scheduled\s+from public\.subscription_scheduled_plan_changes/);
  assert.match(sql, /status in \('SCHEDULED', 'APPLIED'\)/);
  assert.match(sql, /set status = 'APPLIED'/);

  // Reconciliation state in PAYMENT_RESTORED uses valid PENDING enum value
  assert.match(sql, /reconciliation_state = case when reconciliation_state = 'REVIEW_REQUIRED' then 'PENDING' else reconciliation_state end/);

  // Unique constraint for direct upsert compatibility
  assert.match(sql, /constraint subscription_scheduled_plan_changes_sub_key unique \(barbershop_id, provider_subscription_id\)/);

  // Cycle boundary and contract validation columns
  assert.match(sql, /boundary_payment_ids text\[\] default '\{\}'/);
  assert.match(sql, /effective_from_cycle text/);
  assert.match(sql, /expected_price_cents bigint/);
  assert.match(sql, /expected_cycle text/);

  // Preserves overdue, restored, and both cancellation spellings
  assert.match(sql, /v_event_upper in \('SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVE', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_CANCELLED'/);
  assert.match(sql, /PAYMENT_OVERDUE/);
  assert.match(sql, /PAYMENT_RESTORED/);
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

test("subscription-plan-change route persists scheduled plan contract locally with cycle boundary validation", () => {
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
  assert.match(source, /boundary_payment_id: boundaryPaymentIds\[0\] \|\| null/);
  assert.match(source, /boundary_payment_ids: boundaryPaymentIds/);
  assert.match(source, /effective_from_cycle/);
  assert.match(source, /expected_price_cents: targetPlan\.priceCents/);
  assert.match(source, /expected_cycle: targetPlan\.months === 12 \? "YEARLY" : "MONTHLY"/);
  assert.match(source, /effective_after/);
  assert.match(source, /onConflict: "barbershop_id,provider_subscription_id"/);
  assert.match(source, /if \(scheduledInsert\.error\)/);
  assert.match(source, /reconciliation_state: "REVIEW_REQUIRED"/);
  assert.match(source, /500/);
});

test("persist_asaas_recurring_subscription_event migration isolates payment deletion from subscription cancellation and retains renewed contract", () => {
  const source = readFileSync(
    new URL(
      "../supabase/migrations/20261113200000_subscription_scheduled_plan_changes_and_financial_hardening.sql",
      import.meta.url
    ),
    "utf8"
  );

  // Verifies that payment refund/deletion is dispatched before subscription cancellation
  const paymentRemovalIndex = source.indexOf("4. Estorno ou remocao de pagamento");
  const subCancellationIndex = source.indexOf("5. Cancelamento de assinatura");
  assert.ok(paymentRemovalIndex > 0, "Payment removal branch must exist");
  assert.ok(subCancellationIndex > paymentRemovalIndex, "Payment removal branch must precede subscription cancellation");

  // Verifies that subscription cancellation does not match payment events
  assert.match(source, /v_event_upper not like 'PAYMENT_%'/);

  // Verifies that applied/scheduled contract terms are retained for all renewals
  assert.match(source, /status in \('SCHEDULED', 'APPLIED'\)/);

  // Verifies that boundary payment array and old payments do not prematurely consume scheduled plan terms
  assert.match(source, /boundary_payment_ids is not null and p_payment_id = any\(v_scheduled\.boundary_payment_ids\)/);
  assert.match(source, /p_value_cents is not null and p_value_cents < coalesce\(v_scheduled\.expected_price_cents, v_scheduled\.price_cents\)/);
  assert.match(source, /upper\(p_cycle\) <> upper\(v_scheduled\.expected_cycle\)/);

  // Verifies that legacy 8-parameter function is dropped and unified 10-parameter signature with defaults is installed
  assert.match(source, /drop function if exists public\.persist_asaas_recurring_subscription_event\(text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*uuid,\s*text\);/);
  assert.match(source, /grant execute on function public\.persist_asaas_recurring_subscription_event\(text,text,text,text,text,text,uuid,text,bigint,text\) to service_role/);

  // Verifies that arrival of late payment for canceled order does not cancel active replacement contract
  assert.match(source, /created_at > v_order\.created_at/);
  assert.match(source, /recurring_state = 'ACTIVE'/);
  assert.match(source, /greatest\(coalesce\(current_period_ends_at, v_end_at\), v_end_at\)/);
});
