import { resolveAsaasBillingConfig, sandboxBillingEnabled, verifiedSandboxClients } from "../../../utils/billing-sandbox-server.ts";
import { createAsaasClient } from "../../../utils/asaas-client.mjs";
import { createOrReuseSandboxCheckout } from "../../../utils/subscription-checkout-create.ts";
import { handleSandboxCheckout } from "../../../utils/subscription-checkout-handler.mjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleSandboxCheckout(request, {
    enabled: sandboxBillingEnabled(),
    create: async (token: string, orderId: string, customerOverrides?: { taxDocument?: string; phone?: string; responsibleName?: string }) => {
      const clients = await verifiedSandboxClients(token);
      if (!clients) return { status: "unauthenticated" as const };
      const { environment, apiKey, callbackOrigin, account } = resolveAsaasBillingConfig();
      if (!apiKey || !callbackOrigin || !account) throw new Error("Missing sandbox configuration");
      const asaasClient = createAsaasClient({ environment, apiKey });
      return createOrReuseSandboxCheckout(orderId, { ...clients, asaasClient, callbackOrigin, account, environment, customerOverrides });
    },
  });
}
