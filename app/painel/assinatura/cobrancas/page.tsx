"use client";

import { formatBRL } from "@/utils/subscription-plans";
import { subscriptionDate } from "@/utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

const labels = { pending: "Pendente", paid: "Pago", overdue: "Vencido", refunded: "Estornado" };

export default function CobrancasPage() {
  const { bills } = useSubscriptionData();
  return <section className={styles.card}>
    <p className="product-eyebrow">HISTÓRICO FINANCEIRO</p>
    <h2>Minhas cobranças</h2>
    <p>Consulte pagamentos, cobranças pendentes, estornos e comprovantes vinculados à sua assinatura.</p>
    {bills === null ? <div className={styles.empty}>
      <span aria-hidden="true">▤</span><h2>Histórico ainda não conectado</h2>
      <p>A integração financeira está em preparação. Esta tela não afirma que não existem cobranças; ela será preenchida somente com dados confirmados pelo provedor.</p>
    </div> : bills.length === 0 ? <div className={styles.empty}>
      <span aria-hidden="true">✓</span><h2>Nenhuma cobrança registrada</h2>
      <p>Quando houver uma contratação confirmada, os lançamentos aparecerão aqui.</p>
    </div> : <div>{bills.map(item => <article className={styles.receipt} key={item.id}>
      <header><div><h3>{item.label}</h3><small>{subscriptionDate(item.date)}</small></div><span className={"product-status " + (item.status === "paid" ? "completed" : item.status === "pending" ? "confirmed" : "cancelled")}>{labels[item.status]}</span></header>
      <p><b>{formatBRL(item.amountCents)}</b></p>
    </article>)}</div>}
    <p className={styles.note}>O retorno de uma página de checkout não confirma pagamento. A situação será atualizada apenas após conciliação financeira.</p>
  </section>;
}
