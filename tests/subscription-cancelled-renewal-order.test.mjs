import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("migration allows new subscription order when renewal was cancelled or period is expired", async () => {
  const migration = await read("../supabase/migrations/20261111090000_allow_new_subscription_on_cancelled_renewal.sql");
  assert.match(migration, /update public\.barbershop_subscriptions s/);
  assert.match(migration, /set status = 'cancelled'/);
  assert.match(migration, /o\.recurring_state = 'CANCELED'/);
  assert.match(migration, /create or replace function public\.create_subscription_order/);
  assert.match(migration, /not exists\s*\(\s*select 1 from public\.subscription_orders o\s+where o\.barbershop_id=p_barbershop_id\s+and o\.status='CONFIRMED'\s+and o\.recurring_state='CANCELED'\s*\)/);
});

test("SubscriptionPlans and SubscriptionOverview allow ordering when cancellation is scheduled", async () => {
  const plans = await read("../app/painel/assinatura/SubscriptionPlans.tsx");
  const overview = await read("../app/painel/assinatura/SubscriptionOverview.tsx");
  assert.match(plans, /canStartOrder = view\.kind !== "active" && view\.kind !== "pending" \|\| Boolean\(view\.cancellationScheduled\)/);
  assert.match(plans, /product-button bronze/);
  assert.match(plans, /buttonBullet/);
  assert.match(overview, /view\.cancellationScheduled \? "Contratar nova assinatura" : "Contrate seu plano"/);
});

test("SandboxCheckout presents updated renewal and trial notice texts", async () => {
  const checkout = await read("../app/painel/assinatura/contratar/SandboxCheckout.tsx");
  assert.match(checkout, /months === 1 \? "Assinatura mensal com renovação automática\." : "Assinatura anual com renovação automática\."/);
  assert.match(checkout, /Sua assinatura iniciará somente após o período de teste\./);
  assert.match(checkout, /view\.kind === "active" && !view\.cancellationScheduled/);
});
