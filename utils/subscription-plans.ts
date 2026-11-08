export const subscriptionPlans = [
  { code: "simple-mensal", name: "Plano Simple", months: 1, priceCents: 4990, maxInstallments: 1, userLimit: 3 },
  { code: "middle-mensal", name: "Plano Middle", months: 1, priceCents: 7990, maxInstallments: 1, userLimit: 5 },
  { code: "master-mensal", name: "Plano Master", months: 1, priceCents: 11990, maxInstallments: 1, userLimit: 7 },
  { code: "simple-anual", name: "Plano Simple (Anual)", months: 12, priceCents: 49900, maxInstallments: 3, userLimit: 3 },
  { code: "middle-anual", name: "Plano Middle (Anual)", months: 12, priceCents: 79900, maxInstallments: 3, userLimit: 5 },
  { code: "master-anual", name: "Plano Master (Anual)", months: 12, priceCents: 119900, maxInstallments: 3, userLimit: 7 },
] as const;

export type SubscriptionPlan = (typeof subscriptionPlans)[number];

export const legacyPlans = [
  { code: "mensal", name: "Mensal", months: 1, priceCents: 9990, maxInstallments: 1, professionalLimit: 5 },
  { code: "trimestral", name: "Trimestral", months: 3, priceCents: 28490, maxInstallments: 2, professionalLimit: 5 },
  { code: "semestral", name: "Semestral", months: 6, priceCents: 53990, maxInstallments: 3, professionalLimit: 5 },
  { code: "anual", name: "Anual", months: 12, priceCents: 99900, maxInstallments: 4, professionalLimit: 5 },
] as const;

export type LegacyPlan = (typeof legacyPlans)[number];

export function getPlan(code: unknown): SubscriptionPlan | LegacyPlan | undefined {
  if (typeof code !== "string") return undefined;
  if (code === "anual") return legacyPlans[3];
  if (code === "semestral") return legacyPlans[2];
  if (code === "trimestral") return legacyPlans[1];
  if (code === "mensal") return legacyPlans[0];
  return subscriptionPlans.find((plan) => plan.code === code);
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function splitInstallments(priceCents: number, count: number): number[] {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || !Number.isInteger(count) || count < 1 || count > 4) {
    throw new RangeError("Valor ou quantidade de parcelas inválida.");
  }
  const base = Math.floor(priceCents / count);
  const remainder = priceCents % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function installmentSummary(priceCents: number, count: number) {
  const values = splitInstallments(priceCents, count);
  if (count === 1) return "1x de " + formatBRL(priceCents);
  if (values.every((value) => value === values[0])) return count + "x de " + formatBRL(values[0]);
  const groups = [...new Set(values)].map(value => values.filter(item => item === value).length + "x de " + formatBRL(value));
  return groups.join(" + ");
}
