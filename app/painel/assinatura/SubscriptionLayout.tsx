"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { getPanelContext } from "@/utils/panel-context";
import { legacySubscriptionView, type LegacySubscription } from "@/utils/subscription-view";
import PanelShell from "../PanelShell";
import { SubscriptionDataProvider, subscriptionHref, type SubscriptionData } from "./SubscriptionContext";
import { subscriptionSections } from "./presentation.mjs";
import styles from "./subscription.module.css";

export default function SubscriptionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === subscriptionHref();
  const [result, setResult] = useState<{ data: SubscriptionData; shopId: string } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const context = await getPanelContext(supabase);
        if (!alive) return;
        if (!context.userId) { window.location.replace("/entrar"); return; }
        if (context.role === "barber") { window.location.replace("/painel/agenda"); return; }
        if (!context.barbershopId || !context.role) { window.location.replace("/painel/inicio"); return; }
        // Existing financial RLS is owner-only. Managers get a notice, not a failed private query.
        const shop = await supabase.from("barbershops").select("name").eq("id", context.barbershopId).maybeSingle();
        if (shop.error) throw shop.error;
        let subscription: LegacySubscription | null = null;
        let activeProfessionals: number | null = null;
        if (context.role === "owner") {
          const [sub, professionals] = await Promise.all([
            supabase.from("barbershop_subscriptions")
              .select("status,plan_code,trial_started_at,trial_ends_at,current_period_ends_at")
              .eq("barbershop_id", context.barbershopId).maybeSingle(),
            supabase.from("professionals").select("id", { count: "exact", head: true })
              .eq("barbershop_id", context.barbershopId).eq("active", true),
          ]);
          if (sub.error) throw sub.error;
          subscription = sub.data;
          activeProfessionals = professionals.error ? null : professionals.count;
        }
        if (alive) setResult({
          shopId: context.barbershopId,
          data: {
            shopName: shop.data?.name || "Minha barbearia", role: context.role,
            subscription, activeProfessionals, view: legacySubscriptionView(subscription, Date.now()),
            bills: null, href: subscriptionHref,
          },
        });
      } catch {
        if (alive) setError("Não foi possível carregar sua assinatura. Tente novamente.");
      }
    }
    void load();
    return () => { alive = false; };
  }, [attempt]);

  if (!result) return <main className="product-shell"><div className={"product-content " + styles.content}>
    <Link className={styles.back} href="/painel/mais">← Mais</Link>
    <div className={styles.card}>
      <h1 className="product-title">Plano e assinatura</h1>
      <p role={error ? "alert" : "status"}>{error || "Carregando sua assinatura…"}</p>
      {error && <button className="product-button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Tentar novamente</button>}
    </div>
  </div></main>;

  return <PanelShell role={result.data.role} active="more" shopName={result.data.shopName} barbershopId={result.shopId} mobileBackHref={isOverview ? "/painel/mais" : subscriptionHref()} mobileBackLabel={isOverview ? "Voltar para Mais" : "Voltar para Assinatura"} mobileTitle="Assinatura" hideMobileBack={isOverview}>
    <div className={"product-content " + styles.content}>
      <Link className={styles.back} href="/painel/mais">← Mais</Link>
      <div className="product-page-head"><div>
        <p className="product-eyebrow">{result.data.shopName}</p>
        <h1 className="product-title">Plano e assinatura</h1>
        <p className="product-subtitle">Gerencie a assinatura atual, cobranças, dados e cancelamento.</p>
      </div></div>
      {result.data.role === "manager" ? <div className={styles.card}>
        <h2>Gestão financeira do proprietário</h2>
        <p>As informações e ações da assinatura ficam disponíveis para o proprietário da barbearia. Fale com ele para consultar a situação atual ou solicitar uma alteração.</p>
        <Link className="product-button secondary" href="/painel">Voltar à gestão</Link>
      </div> : <SubscriptionDataProvider value={result.data}>
        <nav className={styles.screenReaderNav} aria-label="Seções da assinatura">{subscriptionSections.map((section) => <Link key={section.page} href={subscriptionHref(section.page)}>{section.title}</Link>)}</nav>
        {children}
      </SubscriptionDataProvider>}
    </div>
  </PanelShell>;
}
