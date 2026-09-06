"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LegacySubscription, SubscriptionView } from "@/utils/subscription-view";

export type BillingRecord = {
  id: string;
  label: string;
  date: string;
  amountCents: number;
  status: "pending" | "paid" | "overdue" | "refunded";
};
export type SubscriptionData = {
  shopName: string;
  role: "owner" | "manager";
  subscription: LegacySubscription | null;
  view: SubscriptionView;
  activeProfessionals: number | null;
  bills: BillingRecord[] | null;
  href: (page?: string, plan?: string) => string;
};
export const subscriptionHref = (page = "", plan?: string) =>
  "/painel/assinatura" + (page ? "/" + page : "") + (plan ? "?plano=" + encodeURIComponent(plan) : "");

const Context = createContext<SubscriptionData | null>(null);
export function SubscriptionDataProvider({ value, children }: { value: SubscriptionData; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSubscriptionData() {
  const value = useContext(Context);
  if (!value) throw new Error("Contexto da assinatura indisponível.");
  return value;
}
