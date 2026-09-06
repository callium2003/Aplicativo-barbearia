"use client";

import { useState } from "react";
import SubscriptionOverview from "../../painel/assinatura/SubscriptionOverview";
import SubscriptionPlans from "../../painel/assinatura/SubscriptionPlans";
import ContratarPage from "../../painel/assinatura/contratar/page";
import CobrancasPage from "../../painel/assinatura/cobrancas/page";
import CancelarPage from "../../painel/assinatura/cancelar/page";
import DadosPage from "../../painel/assinatura/dados/page";
import { SubscriptionDataProvider, subscriptionHref, type SubscriptionData } from "../../painel/assinatura/SubscriptionContext";
import type { SubscriptionKind } from "@/utils/subscription-view";
import styles from "../../painel/assinatura/subscription.module.css";

const pageOptions = [
  ["overview", "Visão geral"], ["plans", "Planos"], ["contract", "Contratação"],
  ["bills", "Cobranças"], ["cancel", "Cancelamento"], ["data", "Dados"],
] as const;
const stateOptions: SubscriptionKind[] = ["trial", "active", "ended", "pending", "grace", "restricted", "preserved", "purged", "unknown"];

export default function SubscriptionPreview() {
  const [page, setPage] = useState<(typeof pageOptions)[number][0]>("overview");
  const [kind, setKind] = useState<SubscriptionKind>("trial");
  const data: SubscriptionData = {
    shopName: "Barbearia do Centro", role: "owner",
    subscription: { status: kind === "active" ? "active" : "trialing", plan_code: "anual", trial_ends_at: "2026-09-24T12:00:00Z", current_period_ends_at: "2027-09-06T12:00:00Z" },
    view: { kind, endsAt: kind === "trial" ? "2026-09-24T12:00:00Z" : "2027-09-06T12:00:00Z", remainingDays: kind === "trial" ? 18 : undefined },
    activeProfessionals: 4, bills: null, href: subscriptionHref,
  };
  const screen = page === "overview" ? <SubscriptionOverview /> : page === "plans" ? <SubscriptionPlans /> : page === "contract" ? <ContratarPage /> : page === "bills" ? <CobrancasPage /> : page === "cancel" ? <CancelarPage /> : <DadosPage />;
  return <main className="product-shell">
    <section className={styles.preview}>
      <p><b>Prévia local do design de assinatura.</b> Esta rota responde 404 no build de produção.</p>
      <div className={styles.previewLinks}>
        {pageOptions.map(([value, label]) => <button type="button" key={value} onClick={() => setPage(value)}>{label}</button>)}
        <select aria-label="Estado da assinatura" value={kind} onChange={event => setKind(event.target.value as SubscriptionKind)}>
          {stateOptions.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
    </section>
    <div className={"product-content " + styles.content}>
      <div className="product-page-head"><div><p className="product-eyebrow">BARBEARIA DO CENTRO</p><h1 className="product-title">Plano e assinatura</h1><p className="product-subtitle">Seu plano, seus pagamentos e os próximos passos.</p></div></div>
      <SubscriptionDataProvider value={data}>{screen}</SubscriptionDataProvider>
    </div>
  </main>;
}
