"use client";

import { useState } from "react";
import Link from "next/link";
import { subscriptionPlans, formatBRL, installmentSummary } from "@/utils/subscription-plans";
import { useSubscriptionData } from "./SubscriptionContext";
import styles from "./subscription.module.css";

export default function SubscriptionPlans({ sandboxEnabled = false }: { sandboxEnabled?: boolean }) {
  const { href, view, renewalKind, subscription } = useSubscriptionData();
  const renewingQuarterly = view.kind === "active" && renewalKind === "quarterly_purchase";
  const canStartOrder = view.kind !== "active" && view.kind !== "pending" || Boolean(view.cancellationScheduled) || (view.kind === "active" && renewalKind === "quarterly_purchase");
  const [openPlan, setOpenPlan] = useState<string | null>(renewingQuarterly ? subscription?.plan_code || null : "middle-mensal");

  const togglePlan = (code: string) => {
    setOpenPlan((current) => (current === code ? null : code));
  };

  return <div className={styles.stack}>
    <section className={styles.card}>
      <p className="product-eyebrow">UMA ROTINA MAIS ORGANIZADA</p>
      <h2>O mesmo produto. O período que combina com você.</h2>
      <p>Todos os planos incluem agenda, equipe, clientes e relatórios. O limite de usuários inclui o proprietário; clientes não ocupam vagas. O preço é o total de todo o período.</p>
      {renewingQuarterly && <p>Você pode renovar antecipadamente o mesmo plano trimestral, preservando o período já pago. A contratação de outro plano fica disponível após o término da vigência atual.</p>}
    </section>
    {sandboxEnabled && (
      <p className={styles.note} role="status">
        O mensal mantém cartão recorrente ou fatura Pix por ciclo. O trimestral aceita cartão à vista ou em até 2x sem juros e Pix avulso à vista, sem renovação automática. Para renovar o trimestral, faça uma nova compra. Pix Automático está disponível somente no mensal.
      </p>
    )}

    <div className={styles.accordion} role="region" aria-label="Opções de planos de assinatura">
      {subscriptionPlans.map((plan) => {
        const isOpen = openPlan === plan.code;
        const isQuarterly = plan.months === 3;
        const cycleName = isQuarterly ? "Trimestral" : "Mensal";
        const cycleSuffix = isQuarterly ? "/trimestre" : "/mês";
        const cleanName = plan.name.replace(" (Trimestral)", "").replace(/^Plano\s+/i, "");

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
                  {isQuarterly ? "3 meses de acesso" : "Flexibilidade para começar"}
                </span>
                <h3>Plano {cleanName} — {cycleName}</h3>
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
                  <b>Total: {formatBRL(plan.priceCents)} por {plan.months} {plan.months === 1 ? "mês" : "meses"}</b> · {isQuarterly ? "Compra trimestral sem renovação automática" : "Cobrança mensal com renovação automática"}
                  <br />
                  <small style={{ color: "#857a70" }}>{isQuarterly ? `Cartão à vista ou em até ${installmentSummary(plan.priceCents, plan.maxInstallments)} sem juros. Pix avulso à vista. Nova compra para renovar.` : installmentSummary(plan.priceCents, plan.maxInstallments)}</small>
                </p>
                <ul>
                  <li>Até {plan.userLimit} usuários simultâneos, incluindo o proprietário</li>
                  <li>Agenda completa e página de agendamento online dos clientes</li>
                  <li>Gestão de clientes, histórico de serviços e relatórios operacionais</li>
                  <li>Acesso inativado libera vaga na equipe; convite pendente reserva vaga</li>
                </ul>
                <div style={{ marginTop: "0.5rem" }}>
                  {canStartOrder && (!renewingQuarterly || plan.code === subscription?.plan_code) ? (
                    <Link
                      className="product-button bronze"
                      href={href("contratar", plan.code)}
                    >
                      <span className={styles.buttonBullet} aria-hidden="true" />
                      Ver plano {cleanName} ({cycleName.toLowerCase()}) <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className={styles.note}>
                      {renewingQuarterly ? "Para contratar outro plano, aguarde o término da vigência atual." : `Contratação indisponível enquanto sua assinatura estiver ${view.kind === "active" ? "ativa" : "em andamento"}.`}
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
    <p className={styles.note}>O período gratuito dura 30 dias e não exige cartão. O mensal tem renovação automática no cartão e cancelamento pelo app. O trimestral concede três meses de calendário por compra e exige nova compra para renovar, preservando o período já pago.</p>
  </div>;
}
