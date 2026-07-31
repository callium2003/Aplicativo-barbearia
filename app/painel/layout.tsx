import { ReactNode } from "react";
import SubscriptionGate from "./SubscriptionGate";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return <SubscriptionGate>{children}</SubscriptionGate>;
}
