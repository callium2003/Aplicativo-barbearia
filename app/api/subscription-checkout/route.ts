import { sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { createOrReuseSandboxCheckout } from "../../../utils/subscription-checkout-create.ts";
import { handleSandboxCheckout } from "../../../utils/subscription-checkout-handler.mjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleSandboxCheckout(request, {
    enabled: sandboxBillingEnabled(),
    create: async (token: string, orderId: string) => {
      const clients = await verifiedSandboxClients(token);
      if (!clients) return { status: "unauthenticated" as const };
      const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
      const callbackOrigin = process.env.BILLING_SANDBOX_CALLBACK_ORIGIN;
      const account = process.env.ASAAS_SANDBOX_ACCOUNT_ID;
      if (!apiKey || !callbackOrigin || !account) throw new Error("Missing sandbox configuration");
      const asaasClient = createAsaasClient({ environment: "sandbox", apiKey });
      return createOrReuseSandboxCheckout(orderId, { ...clients, asaasClient, callbackOrigin, account });
    },
  });
}
