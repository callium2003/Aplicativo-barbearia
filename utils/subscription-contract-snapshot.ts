type StoredContract = {
  plan_code?: string | null;
  months?: number | null;
  price_cents?: number | null;
  user_limit?: number | null;
  status?: string | null;
  previous_plan_code?: string | null;
  previous_months?: number | null;
  previous_price_cents?: number | null;
  previous_user_limit?: number | null;
};

/** Historical terms come from persisted contracts, never the current sales catalog. */
export function resolveSubscriptionContractSnapshot(
  planCode: string | null,
  order: StoredContract,
  appliedChange?: StoredContract | null,
) {
  const previous = appliedChange?.status === "SCHEDULED" ? {
    plan_code: appliedChange.previous_plan_code, months: appliedChange.previous_months,
    price_cents: appliedChange.previous_price_cents, user_limit: appliedChange.previous_user_limit,
  } : null;
  const contract = previous?.plan_code === planCode ? previous
    : appliedChange?.status !== "SCHEDULED" && appliedChange?.plan_code === planCode ? appliedChange : order;
  if (!planCode || contract.plan_code !== planCode
    || ![1, 3, 12].includes(contract.months ?? 0)
    || !Number.isSafeInteger(contract.price_cents) || (contract.price_cents ?? 0) < 1
    || !Number.isInteger(contract.user_limit) || (contract.user_limit ?? 0) < 1) return null;
  return { code: planCode, months: contract.months!, priceCents: contract.price_cents!, userLimit: contract.user_limit! };
}
