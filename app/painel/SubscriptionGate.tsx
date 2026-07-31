"use client";

import { createClient } from "@supabase/supabase-js";
import { ReactNode, useEffect, useState } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || exempt) { setReady(true); return; }

      const { data: shop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!shop) { window.location.replace("/painel/inicio"); return; }

      const { data: subscription } = await supabase
        .from("barbershop_subscriptions")
        .select("status,trial_ends_at")
        .eq("barbershop_id", shop.id)
        .maybeSingle();
      if (!hasAccess(subscription as Subscription | null)) { window.location.replace("/painel/assinatura"); return; }
      setReady(true);
    }

    void checkAccess();
  }, []);

  if (!ready) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f2ed", fontFamily: "Arial,sans-serif" }}>Verificando seu acesso...</main>;
  return <>{children}</>;
}
