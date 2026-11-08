import { redirect } from "next/navigation";
import { sandboxBillingEnabled } from '../../../../utils/billing-sandbox-server.ts';
import SubscriptionPlans from '../SubscriptionPlans';

export default function PlanosPage() {
  if (!sandboxBillingEnabled()) redirect("/#planos");
  return <SubscriptionPlans sandboxEnabled />;
}
