import type { Metadata } from "next";
import type { ReactNode } from "react";
import SubscriptionLayout from "./SubscriptionLayout";

export const metadata: Metadata = {
  title: "Plano e assinatura | BarbeariaSP",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: ReactNode }) {
  return <SubscriptionLayout>{children}</SubscriptionLayout>;
}
