"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { supabase } from "../../../../utils/supabase";
import { formatBRL } from "../../../../utils/subscription-plans";
import { startSandboxSubscription } from "../../../../utils/sandbox-subscription-flow";
import styles from "../subscription.module.css";

type Props = { planCode: string; planName: string; priceCents: number; userLimit: number };

export default function SandboxCheckout({ planCode, planName, priceCents, userLimit }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestId = useRef<string | null>(null);

  async function begin() {
    if (!accepted || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (session.error || !token) throw new Error("Entre novamente para continuar.");
      requestId.current ??= crypto.randomUUID();
      const url = await startSandboxSubscription({ token, planCode, idempotencyKey: requestId.current });
      window.location.assign(url);
    } catch {
      setMessage("Não foi possível abrir o pagamento. Confira sua sessão e tente novamente em alguns instantes.");
      setBusy(false);
    }
  }

  return <div className={styles.stack}>
    <section className={styles.card}>
      <h2>Confirme sua contratação</h2>
      <p>Revise as condições do plano antes de seguir para o pagamento.</p>
      <div className={styles.purchaseSummary}>
        <p><strong>{planName}</strong></p>
        <p>{formatBRL(priceCents)} por 12 meses · até {userLimit} usuários.</p>
        <p>Pagamento anual no cartão, à vista ou em até três parcelas sem juros. A renovação exige uma nova autorização ao fim do período anual.</p>
        <p>Se você ainda estiver no período de teste, os dias restantes serão preservados. A nova vigência será liberada após a confirmação do pagamento.</p>
      </div>
      <label className={styles.check}><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> <span>Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e as <Link href="/regras-assinatura" target="_blank">Regras de Assinatura</Link>.</span></label>
      <div className={styles.actions}><button className="product-button bronze" disabled={!accepted || busy} onClick={() => void begin()}>{busy ? "Abrindo pagamento…" : "Ir para pagamento"}</button></div>
      {message && <p role="alert">{message}</p>}
    </section>
  </div>;
}
