"use client";

import Link from "next/link";
import { subscriptionPlans, formatBRL, installmentSummary } from "@/utils/subscription-plans";
import { useSubscriptionData } from "./SubscriptionContext";
import styles from "./subscription.module.css";

export default function SubscriptionPlans() {
  const { href } = useSubscriptionData();
  return <div className={styles.stack}>
    <section className={styles.card}><p className="product-eyebrow">UMA ROTINA MAIS ORGANIZADA</p><h2>O mesmo produto. O período que combina com você.</h2><p>Todos os planos incluem agenda, equipe, clientes, relatórios e até cinco profissionais ativos. O preço é o total de todo o período.</p></section>
    <div className={styles.grid}>{subscriptionPlans.map(plan =>
      <article key={plan.code} className={styles.plan} data-featured={plan.code === "anual"}>
        <span className={styles.tag}>{plan.code === "anual" ? "12 meses de organização" : plan.months === 1 ? "Flexibilidade para começar" : "Planeje sua rotina"}</span>
        <h2>{plan.name}</h2><strong className={styles.price}>{formatBRL(plan.priceCents)}</strong>
        <p>Total por {plan.months} {plan.months === 1 ? "mês" : "meses"}</p>
        <p>{plan.maxInstallments === 1 ? "Pagamento em uma parcela" : "Até " + plan.maxInstallments + " parcelas"}<br />{installmentSummary(plan.priceCents, plan.maxInstallments)}</p>
        <ul><li>Até cinco profissionais ativos</li><li>Agenda e página de agendamento</li><li>Clientes, equipe e relatórios</li><li>Histórico dos profissionais inativos preservado</li></ul>
        <Link className={"product-button " + (plan.code === "anual" ? "bronze" : "secondary")} href={href("contratar", plan.code)}>Ver plano {plan.name.toLowerCase()} <span aria-hidden="true">→</span></Link>
      </article>)}</div>
    <section className={styles.card}><h2>Mais de cinco profissionais?</h2><p>A contratação é sob consulta, de acordo com o tamanho da sua equipe. Não há cobrança automática por profissionais adicionais.</p><p className={styles.note}>O atendimento comercial para planos personalizados estará disponível junto com a contratação online.</p></section>
    <p className={styles.note}>O teste dura 30 dias e não exige cartão. Parcelamento não muda a duração do plano. A contratação online estará disponível em breve.</p>
  </div>;
}
