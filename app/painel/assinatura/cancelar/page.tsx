"use client";

import { useState } from "react";
import { subscriptionDate } from "@/utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

export default function CancelarPage() {
  const { view } = useSubscriptionData();
  const [choice, setChoice] = useState<"end" | "early">("end");
  return <div className={styles.grid}>
    <section className={styles.card}>
      <p className="product-eyebrow">CANCELAMENTO</p><h2>Escolha como deseja encerrar</h2>
      <p>Cancelar futuras renovações, encerrar o acesso e solicitar reembolso são ações diferentes. Confira cada possibilidade antes de enviar uma solicitação.</p>
      <div className={styles.form}>
        <label className={styles.choice}><input type="radio" name="cancellation" checked={choice === "end"} onChange={() => setChoice("end")} /><span><strong>Não renovar ao final</strong><small>O acesso permanece até o fim do período já contratado: {subscriptionDate(view.endsAt)}.</small></span></label>
        <label className={styles.choice}><input type="radio" name="cancellation" checked={choice === "early"} onChange={() => setChoice("early")} /><span><strong>Solicitar encerramento antecipado</strong><small>A data efetiva e eventual reembolso dependem das regras contratuais e legais aplicáveis.</small></span></label>
      </div>
    </section>
    <section className={styles.card}>
      <p className="product-eyebrow">ANTES DE CONFIRMAR</p>
      <h2>{choice === "end" ? "Seu período continua válido" : "A solicitação será analisada"}</h2>
      <p>{choice === "end" ? "A solicitação impede uma futura renovação aplicável e não transforma o período vigente em inadimplência." : "O cálculo considera o período elegível não utilizado. Taxas do provedor não serão descontadas automaticamente do direito de reembolso."}</p>
      <p className={styles.note}>O envio de cancelamento estará disponível com a integração financeira. Nenhuma alteração será feita ao selecionar uma opção nesta tela.</p>
      <button type="button" className="product-button danger" disabled>Cancelamento online em preparação</button>
    </section>
  </div>;
}
