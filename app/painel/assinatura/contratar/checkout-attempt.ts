export type CheckoutAttempt = { method: "card" | "pix"; idempotencyKey: string };

export function checkoutAttemptForMethod(previous: CheckoutAttempt | null, method: CheckoutAttempt["method"]): CheckoutAttempt {
  if (previous?.method === method) return previous;
  return { method, idempotencyKey: crypto.randomUUID() };
}
