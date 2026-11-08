"use client";

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
      if (session.error || !token) throw new Error("Entre novamente para continuar o teste.");
      requestId.current ??= crypto.randomUUID();
      const url = await startSandboxSubscription({ token, planCode, idempotencyKey: requestId.current });
      window.location.assign(url);
    } catch {
      setMessage("Não foi possível iniciar o checkout de teste. Confira sua sessão e tente novamente; uma tentativa anterior pode estar aguardando conciliação.");
      setBusy(false);
    }
  }

  return <div className={styles.stack}>
    <section className={styles.card}>
      <span className={styles.badge}>SANDBOX · TESTE</span>
      <h2>Testar contratação anual</h2>
      <p>Este é um teste no Asaas Sandbox. Os valores são provisórios e não representam a oferta comercial final.</p>
      <p><strong>{planName}</strong> · {formatBRL(priceCents)} por 12 meses · até {userLimit} usuários.</p>
      <p>O checkout permite até três parcelas no cartão fictício. O retorno não confirma pagamento: o período só será concedido após conciliação financeira, preservando seu trial e períodos pagos. A renovação anual exige nova autorização.</p>
      <label className={styles.check}><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Entendo que esta contratação e os valores são apenas para teste.</label>
      <div className={styles.actions}><button className="product-button bronze" disabled={!accepted || busy} onClick={() => void begin()}>{busy ? "Preparando teste…" : "Abrir checkout de teste"}</button></div>
      {message && <p role="alert">{message}</p>}
    </section>
  </div>;
}
