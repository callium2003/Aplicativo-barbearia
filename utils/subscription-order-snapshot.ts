import { subscriptionPlans } from "./subscription-plans.ts";

/** Copies the server catalog offer. The caller must authorize and persist it. */
export function createSubscriptionOfferSnapshot(planCode: unknown) {
  const plan = subscriptionPlans.find((item) => item.code === planCode);
  if (!plan) throw new Error("Plano inválido");
  return {
    planCode: plan.code,
    planName: plan.name,
    months: plan.months,
    priceCents: plan.priceCents,
    maxInstallments: plan.maxInstallments,
    userLimit: plan.userLimit,
  };
}
