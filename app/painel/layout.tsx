import { ReactNode } from "react";
import SignOutButton from "./SignOutButton";
import SubscriptionGate from "./SubscriptionGate";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return <SubscriptionGate><SignOutButton />{children}</SubscriptionGate>;
}
