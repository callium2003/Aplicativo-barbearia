export type SubscriptionKind = "unknown" | "trial" | "active" | "ended" | "pending" | "grace" | "restricted" | "preserved" | "purged";
export type SubscriptionView = {
  kind: SubscriptionKind;
  endsAt?: string | null;
  remainingDays?: number;
  cancellationScheduled?: boolean;
  paymentAttention?: boolean;
};

export type LegacySubscription = {
  status: string;
  plan_code?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
};

export function isSubscriptionPath(path: string) {
  return path === "/painel/assinatura" || path.startsWith("/painel/assinatura/");
}

// Presentation only. Never use browser time or this adapter as an authorization check.
// Legacy rows cannot prove grace, export deadlines, pending payment or completed purge.
export function legacySubscriptionView(row: LegacySubscription | null, now: number): SubscriptionView {
  if (!row || !Number.isFinite(now)) return { kind: "unknown" };
  const paidEnd = row.current_period_ends_at ? Date.parse(row.current_period_ends_at) : NaN;
  if (["active", "cancelled", "past_due"].includes(row.status) && paidEnd > now) {
    return { kind: "active", endsAt: row.current_period_ends_at, cancellationScheduled: row.status === "cancelled", paymentAttention: row.status === "past_due" };
  }
  if (row.status === "active") {
    if (Number.isFinite(paidEnd)) return { kind: "ended", endsAt: row.current_period_ends_at };
    return { kind: "active" };
  }
  if (row.status === "trialing") {
    const end = row.trial_ends_at ? Date.parse(row.trial_ends_at) : NaN;
    if (!Number.isFinite(end)) return { kind: "unknown" };
    return end > now
      ? { kind: "trial", endsAt: row.trial_ends_at, remainingDays: Math.ceil((end - now) / 86400000) }
      : { kind: "ended", endsAt: row.trial_ends_at };
  }
  if (["cancelled", "past_due"].includes(row.status) && Number.isFinite(paidEnd)) return { kind: "ended", endsAt: row.current_period_ends_at };
  return { kind: "unknown" };
}

export function subscriptionDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}
