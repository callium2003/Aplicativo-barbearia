import { ReactNode } from "react";
import SignOutButton from "./SignOutButton";
import SessionGuard from "./SessionGuard";
import SubscriptionGate from "./SubscriptionGate";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return <SubscriptionGate><SessionGuard /><SignOutButton />{children}</SubscriptionGate>;
}
