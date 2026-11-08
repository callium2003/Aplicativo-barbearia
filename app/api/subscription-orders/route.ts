import { sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createPendingSubscriptionOrder } from "../../../utils/subscription-order-create.ts";
import { handleSubscriptionOrder } from "../../../utils/subscription-order-handler.mjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleSubscriptionOrder(request, {
    // This initial entry point is deliberately unavailable in production builds.
    enabled: sandboxBillingEnabled(),
    create: async (token: string, input: { planCode?: unknown; idempotencyKey?: unknown; acceptedTerms?: unknown }) => {
      const termsVersion = process.env.BILLING_SANDBOX_TERMS_VERSION;
      if (!termsVersion) throw new Error("Missing sandbox configuration");
      const clients = await verifiedSandboxClients(token);
      if (!clients) return { status: "unauthenticated" as const };
      return createPendingSubscriptionOrder(input, { ...clients, termsVersion });
    },
  });
}
