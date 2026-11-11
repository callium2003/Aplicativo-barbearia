"use client";

import { useState } from "react";
import Link from "next/link";
import { subscriptionPlans, formatBRL, installmentSummary } from "@/utils/subscription-plans";
import { useSubscriptionData } from "./SubscriptionContext";
import styles from "./subscription.module.css";

export default function SubscriptionPlans({ sandboxEnabled = false }: { sandboxEnabled?: boolean }) {
  const { href, view } = useSubscriptionData();
  const canStartOrder = view.kind !== "active" && view.kind !== "pending";
  const [openPlan, setOpenPlan] = useState<string | null>("middle-mensal");

  const togglePlan = (code: string) => {
    setOpenPlan((current) => (current === code ? null : code));
  };

  return <div className={styles.stack}>
    <section className={styles.card}>
      <p className="product-eyebrow">UMA ROTINA MAIS ORGANIZADA</p>
      <h2>O mesmo produto. O período que combina com você.</h2>
      <p>Todos os planos incluem agenda, equipe, clientes e relatórios. O limite de usuários inclui o proprietário; clientes não ocupam vagas. O preço é o total de todo o período.</p>
    </section>
    {sandboxEnabled && (
      <p className={styles.note} role="status">
        Planos mensais e anuais usam cartão de crédito recorrente com renovação automática por ciclo. O plano mensal também aceita Pix Automático.
      </p>
    )}

    <div className={styles.accordion} role="region" aria-label="Opções de planos de assinatura">
      {subscriptionPlans.map((plan) => {
        const isOpen = openPlan === plan.code;
        const isAnnual = plan.months === 12;
        const cycleName = isAnnual ? "Anual" : "Mensal";
        const cycleSuffix = isAnnual ? "/ano" : "/mês";
        const cleanName = plan.name.replace(" (Anual)", "");

        return (
          <article
            key={plan.code}
            className={styles.accordionItem}
            data-open={isOpen ? "true" : "false"}
          >
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => togglePlan(plan.code)}
              aria-expanded={isOpen}
              aria-controls={`plan-details-${plan.code}`}
            >
              <div className={styles.accordionHeaderTitle}>
                <span className={styles.accordionTag}>
                  {isAnnual ? "12 meses · 2 meses grátis" : "Flexibilidade para começar"}
                </span>
                <h3>{cleanName} — {cycleName}</h3>
                <small>Até {plan.userLimit} usuários (incluindo proprietário)</small>
              </div>
              <div className={styles.accordionHeaderRight}>
                <span className={styles.accordionPrice}>
                  {formatBRL(plan.priceCents)}<small style={{ fontSize: "0.8em", color: "#857a70" }}>{cycleSuffix}</small>
                </span>
                <span className={styles.accordionArrow} aria-hidden="true">
                  ▼
                </span>
              </div>
            </button>

            {isOpen && (
              <div id={`plan-details-${plan.code}`} className={styles.accordionBody}>
                <p>
                  <b>Total: {formatBRL(plan.priceCents)} por {plan.months} {plan.months === 1 ? "mês" : "meses"}</b> · {isAnnual ? "Cobrança anual com renovação automática" : "Cobrança mensal com renovação automática"}
                  <br />
                  <small style={{ color: "#857a70" }}>{installmentSummary(plan.priceCents, plan.maxInstallments)}</small>
                </p>
                <ul>
                  <li>Até {plan.userLimit} usuários simultâneos, incluindo o proprietário</li>
                  <li>Agenda completa e página de agendamento online dos clientes</li>
                  <li>Gestão de clientes, histórico de serviços e relatórios operacionais</li>
                  <li>Acesso inativado libera vaga na equipe; convite pendente reserva vaga</li>
                </ul>
                <div style={{ marginTop: "0.5rem" }}>
                  {canStartOrder ? (
                    <Link
                      className={"product-button " + (isAnnual ? "bronze" : "secondary")}
                      href={href("contratar", plan.code)}
                    >
                      Ver plano {cleanName.toLowerCase()} ({cycleName.toLowerCase()}) <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className={styles.note}>
                      Contratação indisponível enquanto sua assinatura estiver {view.kind === "active" ? "ativa" : "em andamento"}.
                    </span>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>

    <section className={styles.card}>
      <h2>Precisa de 8 ou mais usuários?</h2>
      <p>A contratação é sob consulta, de acordo com o tamanho da sua equipe. Não há cobrança automática por usuários adicionais. Uma pessoa com vários papéis na mesma barbearia conta uma vez.</p>
      <p className={styles.note}>O atendimento comercial para planos personalizados estará disponível junto com a contratação online.</p>
    </section>
    <p className={styles.note}>O período gratuito dura 30 dias e não exige cartão. Os planos são assinaturas com renovação automática no cartão de crédito ao final de cada período (mensal ou anual), podendo ser cancelados a qualquer momento pelo app.</p>
  </div>;
}
