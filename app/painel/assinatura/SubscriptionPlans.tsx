"use client";

import Link from "next/link";
import { subscriptionPlans, formatBRL, installmentSummary } from "@/utils/subscription-plans";
import { useSubscriptionData } from "./SubscriptionContext";
import styles from "./subscription.module.css";

export default function SubscriptionPlans({ sandboxEnabled = false }: { sandboxEnabled?: boolean }) {
  const { href, view } = useSubscriptionData();
  const canStartOrder = view.kind !== "active" && view.kind !== "pending";
  return <div className={styles.stack}>
    <section className={styles.card}><p className="product-eyebrow">UMA ROTINA MAIS ORGANIZADA</p><h2>O mesmo produto. O período que combina com você.</h2><p>Todos os planos incluem agenda, equipe, clientes e relatórios. O limite de usuários inclui o proprietário; clientes não ocupam vagas. O preço é o total de todo o período.</p></section>
    {sandboxEnabled && <p className={styles.note} role="status">Planos mensais e anuais usam cartão de crédito recorrente com renovação automática por ciclo. O plano mensal também aceita Pix Automático.</p>}
    <div className={styles.grid}>{subscriptionPlans.map(plan =>
      <article key={plan.code} className={styles.plan} data-featured={plan.code.includes("anual")}>
        <span className={styles.tag}>{plan.code.includes("anual") ? "12 meses de organização" : plan.months === 1 ? "Flexibilidade para começar" : "Planeje sua rotina"}</span>
        <h2>{plan.name}</h2><strong className={styles.price}>{formatBRL(plan.priceCents)}</strong>
        <p>Total por {plan.months} {plan.months === 1 ? "mês" : "meses"}</p>
        <p>{plan.months === 12 ? "Cobrança anual com renovação automática" : "Cobrança mensal com renovação automática"}<br />{installmentSummary(plan.priceCents, plan.maxInstallments)}</p>
        <ul><li>Até {plan.userLimit} usuários, incluindo o proprietário</li><li>Agenda e página de agendamento</li><li>Clientes, equipe e relatórios</li><li>Acesso inativado libera vaga; convite pendente reserva vaga</li></ul>
        {canStartOrder
          ? <Link className={"product-button " + (plan.code.includes("anual") ? "bronze" : "secondary")} href={href("contratar", plan.code)}>Ver plano {plan.name.toLowerCase()} <span aria-hidden="true">→</span></Link>
          : <span className={styles.note}>Contratação indisponível enquanto sua assinatura estiver {view.kind === "active" ? "ativa" : "em andamento"}.</span>}
      </article>)}</div>
    <section className={styles.card}><h2>Precisa de 8 ou mais usuários?</h2><p>A contratação é sob consulta, de acordo com o tamanho da sua equipe. Não há cobrança automática por usuários adicionais. Uma pessoa com vários papéis na mesma barbearia conta uma vez.</p><p className={styles.note}>O atendimento comercial para planos personalizados estará disponível junto com a contratação online.</p></section>
    <p className={styles.note}>O período gratuito dura 30 dias e não exige cartão. Os planos são assinaturas com renovação automática no cartão de crédito ao final de cada período (mensal ou anual), podendo ser cancelados a qualquer momento pelo app.</p>
  </div>;
}
