"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { formatBRL, getPlan, subscriptionPlans } from "@/utils/subscription-plans";
import { subscriptionDate } from "@/utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

type PlanChangeState = {
  currentPlanCode: string;
  currentPeriodEndsAt: string | null;
  scheduledPlanCode: string;
  nextDueDate: string | null;
};

export default function AlterarPlanoPage() {
  const { subscription, view, href } = useSubscriptionData();
  const [state, setState] = useState<PlanChangeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCode, setSubmittingCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (view.kind !== "active" || view.cancellationScheduled) return;
    let alive = true;
    async function load() {
      setError("");
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) {
          if (alive) setError("Entre novamente para continuar.");
          return;
        }
        const res = await fetch("/api/subscription-plan-change", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (alive) setError(data?.error || "Não foi possível consultar as opções de alteração de plano.");
          return;
        }
        if (alive && data) setState(data);
      } catch {
        if (alive) setError("Erro de conexão ao consultar sua assinatura.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [view.kind, view.cancellationScheduled]);

  async function selectNewPlan(planCode: string) {
    if (submittingCode) return;
    setSubmittingCode(planCode);
    setError("");
    setSuccess("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Entre novamente para continuar.");
        return;
      }
      const res = await fetch("/api/subscription-plan-change", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ planCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Não foi possível agendar a alteração do plano.");
        return;
      }
      setState(data);
      const chosen = getPlan(planCode);
      const renewalDate = subscriptionDate(data?.currentPeriodEndsAt || subscription?.current_period_ends_at);
      setSuccess(
        `Alteração agendada! O plano ${chosen?.name || planCode} entrará em vigor na próxima renovação em ${renewalDate}.`
      );
    } catch {
      setError("Erro de conexão ao atualizar o plano.");
    } finally {
      setSubmittingCode(null);
    }
  }

  const currentPlan = getPlan(state?.currentPlanCode || subscription?.plan_code);
  const scheduledPlan = state ? getPlan(state.scheduledPlanCode) : null;
  const renewalDateLabel = subscriptionDate(state?.currentPeriodEndsAt || view.endsAt);

  if (view.kind !== "active" || view.cancellationScheduled) {
    return (
      <section className={styles.card}>
        <h2>Alterar plano</h2>
        <p>
          A alteração de plano para a próxima renovação está disponível apenas quando há uma assinatura ativa com renovação automática.
        </p>
        <Link className="product-button secondary" href={href()}>
          Voltar para Assinatura
        </Link>
      </section>
    );
  }

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <p className="product-eyebrow">ALTERAÇÃO PROGRAMADA</p>
        <h2>Alterar plano da assinatura</h2>
        <p>
          Seu plano atual (<strong>{currentPlan?.name || "Não informado"}</strong>) continua ativo e sem nenhuma cobrança adicional até{" "}
          <strong>{renewalDateLabel}</strong>. O novo plano escolhido entrará em vigor automaticamente na renovação.
        </p>

        {state && state.scheduledPlanCode !== state.currentPlanCode && (
          <div
            role="status"
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(180, 83, 9, 0.08)",
              border: "1px solid rgba(180, 83, 9, 0.25)",
            }}
          >
            <strong>Próxima renovação em {renewalDateLabel}:</strong> já está agendada para{" "}
            <strong>{scheduledPlan?.name || state.scheduledPlanCode}</strong> ({formatBRL(scheduledPlan?.priceCents || 0)}).
          </div>
        )}
      </section>

      {error && (
        <p role="alert" style={{ color: "var(--sp-danger, #dc2626)", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" style={{ color: "#15803d", fontWeight: 600 }}>
          {success}
        </p>
      )}

      {loading ? (
        <section className={styles.card}>
          <p>Carregando situação atual no Asaas…</p>
        </section>
      ) : (
        <div className={styles.accordion}>
          {subscriptionPlans.map((plan) => {
            const isAnnual = plan.months === 12;
            const cycleName = isAnnual ? "Anual" : "Mensal";
            const cycleSuffix = isAnnual ? "/ano" : "/mês";
            const cleanName = plan.name.replace(" (Anual)", "").replace(/^Plano\s+/i, "");
            const isScheduled = state?.scheduledPlanCode === plan.code;
            const isCurrent = (state?.currentPlanCode || subscription?.plan_code) === plan.code;

            return (
              <article key={plan.code} className={styles.accordionItem} data-open="true">
                <div className={styles.accordionHeader} style={{ cursor: "default" }}>
                  <div className={styles.accordionHeaderTitle}>
                    <span className={styles.accordionTag}>
                      {isScheduled
                        ? "Selecionado para próxima renovação"
                        : isCurrent
                        ? "Plano atual"
                        : isAnnual
                        ? "12 meses · 2 meses grátis"
                        : "Renovação mensal"}
                    </span>
                    <h3>
                      Plano {cleanName} — {cycleName}
                    </h3>
                    <small>Até {plan.userLimit} usuários (incluindo proprietário)</small>
                  </div>
                  <div className={styles.accordionHeaderRight}>
                    <span className={styles.accordionPrice}>
                      {formatBRL(plan.priceCents)}
                      <small style={{ fontSize: "0.8em", color: "#857a70" }}>{cycleSuffix}</small>
                    </span>
                  </div>
                </div>
                <div className={styles.accordionBody}>
                  <button
                    type="button"
                    className={isScheduled ? "product-button secondary" : "product-button bronze"}
                    disabled={isScheduled || submittingCode !== null}
                    onClick={() => void selectNewPlan(plan.code)}
                  >
                    {submittingCode === plan.code
                      ? "Agendando alteração…"
                      : isScheduled
                      ? `Vigente na renovação (${renewalDateLabel})`
                      : `Alterar para ${cleanName} (${cycleName.toLowerCase()}) na renovação`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
