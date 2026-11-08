import { redirect } from "next/navigation";
import { sandboxBillingEnabled } from "../../../../utils/billing-sandbox-server.ts";
import { subscriptionPlans } from "../../../../utils/subscription-plans.ts";
import SandboxCheckout from "./SandboxCheckout";

export default async function ContratarPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  if (!sandboxBillingEnabled()) redirect("/#planos");
  const { plano } = await searchParams;
  const plan = subscriptionPlans.find((item) => item.code === plano && item.months === 12);
  if (!plan) redirect("/painel/assinatura/planos");
  return <SandboxCheckout planCode={plan.code} planName={plan.name} priceCents={plan.priceCents} userLimit={plan.userLimit} />;
}
