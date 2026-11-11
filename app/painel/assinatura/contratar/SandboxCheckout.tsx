"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { supabase } from "../../../../utils/supabase";
import { formatBRL } from "../../../../utils/subscription-plans";
import { extractErrorMessage, startSandboxPixAutomatic, startSandboxSubscription } from "../../../../utils/sandbox-subscription-flow";
import { subscriptionDate } from "../../../../utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

type Props = { planCode: string; planName: string; priceCents: number; months: number; userLimit: number };

export default function SandboxCheckout({ planCode, planName, priceCents, months, userLimit }: Props) {
  const { view, href } = useSubscriptionData();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pixQr, setPixQr] = useState<{ payload?: string; encodedImage?: string } | null>(null);
  const requestId = useRef<string | null>(null);

  async function begin(method: "card" | "pix") {
    if (!accepted || busy || (view.kind === "active" && !view.cancellationScheduled)) return;
    setBusy(true);
    setMessage("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (session.error || !token) throw new Error("Entre novamente para continuar.");
      requestId.current ??= crypto.randomUUID();
      if (method === "pix") {
        const result = await startSandboxPixAutomatic({ token, planCode, idempotencyKey: requestId.current });
        setPixQr(result.paymentQr ?? null);
        setMessage("Autorize o Pix Automático com o QR Code ou código exibido. A assinatura só fica ativa após a confirmação financeira e da autorização.");
        setBusy(false);
      } else {
        const url = await startSandboxSubscription({ token, planCode, idempotencyKey: requestId.current });
        window.location.assign(url);
      }
    } catch (caught) {
      setMessage(extractErrorMessage(caught, "Não foi possível abrir o pagamento. Tente novamente em instantes."));
      setBusy(false);
    }
  }

  return <div className={styles.stack}>
    <section className={styles.card}>
      <h2>Confirme sua contratação</h2>
      <p>Revise as condições do plano antes de seguir para o pagamento.</p>
      <div className={styles.purchaseSummary}>
        <p><strong>{planName}</strong></p>
        <p>{formatBRL(priceCents)} por {months === 1 ? "mês" : "12 meses"} · até {userLimit} usuários.</p>
        <p>{months === 1 ? "Assinatura mensal com renovação automática." : "Assinatura anual com renovação automática."}</p>
        <p>Sua assinatura iniciará somente após o período de teste.</p>
      </div>

      {view.kind === "active" && !view.cancellationScheduled ? (
        <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "1rem", margin: "1rem 0" }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem", color: "#10b981" }}>✓ Assinatura já está ativa</h3>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
            Sua barbearia já possui assinatura ativa com vencimento em <b>{subscriptionDate(view.endsAt)}</b>. Não é necessário realizar um novo pagamento agora.
          </p>
          <Link className="product-button secondary" href={href()}>
            Voltar para central da assinatura
          </Link>
        </div>
      ) : (
        <>
          {view.cancellationScheduled && (
            <p className={styles.note} style={{ margin: "0 0 1rem" }}>
              Sua renovação anterior foi cancelada. Ao contratar um novo plano, seu período vigente até <b>{subscriptionDate(view.endsAt)}</b> é preservado e a nova vigência se iniciará após a confirmação.
            </p>
          )}
          <label className={styles.check}>
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e as <Link href="/regras-assinatura" target="_blank">Regras de Assinatura</Link>.</span>
          </label>
          <div className={styles.actions}>
            {months === 1 ? (
              <>
                <button className="product-button bronze" disabled={!accepted || busy} onClick={() => void begin("card")}>
                  {busy ? "Abrindo pagamento…" : "Pagar com cartão"}
                </button>
                <button className="product-button secondary" disabled={!accepted || busy} onClick={() => void begin("pix")}>
                  Autorizar Pix Automático
                </button>
              </>
            ) : (
              <button className="product-button bronze" disabled={!accepted || busy} onClick={() => void begin("card")}>
                {busy ? "Abrindo pagamento…" : "Ir para pagamento"}
              </button>
            )}
          </div>
          {message && <p role="alert">{message}</p>}
        </>
      )}

      {pixQr && (
        <section className={styles.purchaseSummary}>
          <h3>Autorize o Pix Automático</h3>
          {pixQr.encodedImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img alt="QR Code para autorizar Pix Automático" src={`data:image/png;base64,${pixQr.encodedImage}`} width={256} height={256} />
          )}
          {pixQr.payload && (
            <>
              <p>Código Pix:</p>
              <code>{pixQr.payload}</code>
              <button className="product-button secondary" onClick={() => void navigator.clipboard.writeText(pixQr.payload!)}>
                Copiar código Pix
              </button>
            </>
          )}
          <p>Não feche esta página como prova de pagamento: aguarde a confirmação da autorização e da cobrança.</p>
        </section>
      )}
    </section>
  </div>;
}
