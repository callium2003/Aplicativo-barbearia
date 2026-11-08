import SubscriptionOverview from "./SubscriptionOverview";
import { sandboxBillingEnabled } from "../../../utils/billing-sandbox-server.ts";

export default async function Assinatura({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const params = await searchParams;
  const checkoutState = ['retorno', 'cancelado', 'expirado'].includes(params.checkout || '')
    ? params.checkout as 'retorno' | 'cancelado' | 'expirado'
    : undefined;
  return <SubscriptionOverview sandboxEnabled={sandboxBillingEnabled()} checkoutState={checkoutState} />;
}
