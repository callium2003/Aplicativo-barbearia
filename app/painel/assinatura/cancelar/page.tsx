"use client";

import { useState } from "react";
import Link from "next/link";
import { subscriptionDate } from "@/utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import { subscriptionCancellationOptions } from "../presentation.mjs";
import styles from "../subscription.module.css";

export default function CancelarPage() {
  const { view } = useSubscriptionData();
  const [choice, setChoice] = useState<"renew" | "end">("renew");
  return <div className={styles.stack}>
    <section className={styles.card}>
      <p className="product-eyebrow">RENOVAÇÃO</p><h2>Escolha a renovação da assinatura</h2>
      <p>Renovar automaticamente e não renovar ao final são escolhas diferentes. A configuração financeira será efetivada somente quando a cobrança estiver integrada.</p>
      <div className={styles.form}>
        {subscriptionCancellationOptions.map((option) => <label className={styles.choice} key={option.id}>
          <input type="radio" name="cancellation" checked={choice === option.id} onChange={() => setChoice(option.id as "renew" | "end")} />
          <span><strong>{option.title}</strong><small>{option.id === "end" ? `${option.description} Vigência atual: ${subscriptionDate(view.endsAt)}.` : option.description}</small></span>
        </label>)}
      </div>
    </section>
    <section className={styles.card}>
      <p className="product-eyebrow">ANTES DE CONFIRMAR</p>
      <h2>{choice === "renew" ? "Renovação automática selecionada" : "Seu período continua válido"}</h2>
      <p>{choice === "renew" ? "A renovação automática será a configuração padrão da assinatura. A situação real será confirmada pelo meio de pagamento quando ele estiver configurado." : "A não renovação não transforma o período vigente em inadimplência e não encerra o acesso antes da data informada."}</p>
      <p className={styles.note}>Por enquanto, selecionar uma opção nesta tela não altera a assinatura, a cobrança ou o acesso.</p>
    </section>
    <section className={styles.card}>
      <p className="product-eyebrow">ENCERRAMENTO IMEDIATO</p>
      <h2>Cancelar agora</h2>
      <p>O cancelamento imediato poderá interromper o acesso antes do fim da vigência. Antes de confirmar, você poderá conhecer os benefícios da ferramenta e será solicitada uma nova autenticação.</p>
      <div className={styles.actions}><Link className="product-button secondary" href="/#produto">Conhecer os benefícios</Link></div>
      <p className={styles.note}>O fluxo de confirmação, nova autenticação e conciliação com o meio de pagamento será liberado após a integração financeira. Nenhum cancelamento é feito por este card neste momento.</p>
      <button type="button" className="product-button danger" disabled>Cancelamento imediato em preparação</button>
    </section>
  </div>;
}
