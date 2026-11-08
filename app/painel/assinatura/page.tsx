import SubscriptionOverview from "./SubscriptionOverview";
import { sandboxBillingEnabled } from "../../../utils/billing-sandbox-server.ts";

export default async function Assinatura({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const params = await searchParams;
  return <SubscriptionOverview sandboxEnabled={sandboxBillingEnabled()} checkoutReturned={['retorno','cancelado','expirado'].includes(params.checkout || '')} />;
}
