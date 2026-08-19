"use client";

import { supabase } from "@/utils/supabase";
import { ReactNode, useEffect, useState } from "react";

import { getPanelContext } from "@/utils/panel-context";

type Subscription = {
  status: "trialing" | "active" | "past_due" | "cancelled";
  trial_ends_at: string | null;
};

function hasAccess(subscription: Subscription | null) {
  if (!subscription) return false;
  if (subscription.status === "active") return true;
  return subscription.status === "trialing" && !!subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date();
}

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const exempt = path === "/painel" || path === "/painel/inicio" || path === "/painel/assinatura";

    async function checkAccess() {
      const context = await getPanelContext(supabase);
      if (!context.userId || exempt) { setReady(true); return; }

      // Team members (barbers/managers) are covered by the shop subscription
      if (context.role === "barber" || context.role === "manager") {
        setReady(true);
        return;
      }

      if (!context.barbershopId) { window.location.replace("/painel/inicio"); return; }

      const { data: subscription } = await supabase
        .from("barbershop_subscriptions")
        .select("status,trial_ends_at")
        .eq("barbershop_id", context.barbershopId)
        .maybeSingle();
      if (!hasAccess(subscription as Subscription | null)) { window.location.replace("/painel/assinatura"); return; }
      setReady(true);
    }

    void checkAccess();
  }, []);

  if (!ready) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f2ed", fontFamily: "Arial,sans-serif" }}>Verificando seu acesso...</main>;
  return <>{children}</>;
}
