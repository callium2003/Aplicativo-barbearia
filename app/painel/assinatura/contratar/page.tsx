"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPlan, formatBRL, installmentSummary } from "@/utils/subscription-plans";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

function ContratarForm() {
  const { activeProfessionals, href } = useSubscriptionData();
  const planCode = useSearchParams().get("plano");
  const plan = getPlan(planCode);
  const [installments, setInstallments] = useState<number>(plan?.maxInstallments ?? 1);
  const [accepted, setAccepted] = useState(false);

  if (!plan) return <section className={styles.card}>
    <p className="product-eyebrow">CONTRATAÇÃO</p>
    <h2>Escolha primeiro um plano</h2>
    <p>Selecione o período desejado para conferir o valor total, o parcelamento e as condições antes da contratação.</p>
    <Link className="product-button" href={href("planos")}>Ver planos disponíveis</Link>
  </section>;

  const overLimit = activeProfessionals !== null && activeProfessionals > plan.professionalLimit;
  return <div className={styles.grid}>
    <section className={styles.card}>
      <p className="product-eyebrow">REVISE SUA ESCOLHA</p>
      <h2>Plano {plan.name}</h2>
      <dl className={styles.summary}>
        <div><dt>Duração contratada</dt><dd>{plan.months} {plan.months === 1 ? "mês" : "meses"}</dd></div>
        <div><dt>Valor total</dt><dd className={styles.total}>{formatBRL(plan.priceCents)}</dd></div>
        <div><dt>Profissionais ativos</dt><dd>Até {plan.professionalLimit}</dd></div>
        <div><dt>Parcelamento selecionado</dt><dd>{installmentSummary(plan.priceCents, installments)}</dd></div>
      </dl>
      <p className={styles.note}>O parcelamento não altera a duração contratada. Uma parcela não representa a compra de um mês adicional.</p>
    </section>
    <section className={styles.card}>
      <p className="product-eyebrow">CONFIRMAÇÃO</p>
      <h2>Confira antes de continuar</h2>
      {overLimit ? <p className={styles.note}>Há {activeProfessionals} profissionais ativos. Acima de cinco, a contratação é sob consulta e não haverá cobrança automática.</p> : <div className={styles.form}>
        <label className="product-field">Parcelamento
          <select className="product-select" value={installments} onChange={event => setInstallments(Number(event.target.value))}>
            {Array.from({ length: plan.maxInstallments }, (_, index) => index + 1).map(count =>
              <option key={count} value={count}>{installmentSummary(plan.priceCents, count)}</option>)}
          </select>
        </label>
        <label className={styles.check}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Li o resumo do plano e entendi o valor total, a duração, o limite de profissionais e as regras de cancelamento.</span></label>
        <p className={styles.note}>O checkout seguro será aberto quando a integração de cobrança estiver disponível. Marcar esta opção agora não registra aceite nem cria cobrança.</p>
        <button className="product-button bronze" type="button" disabled aria-disabled="true">Contratação online em preparação</button>
        {accepted && <p role="status" className="product-message">Resumo conferido. Nenhuma contratação foi registrada.</p>}
      </div>}
      <div className={styles.actions}><Link className="product-button secondary" href={href("planos")}>Trocar plano</Link></div>
    </section>
  </div>;
}

export default function ContratarPage() {
  return <Suspense fallback={<section className={styles.card}><p role="status">Carregando o resumo do plano…</p></section>}><ContratarForm /></Suspense>;
}
