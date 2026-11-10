"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { subscriptionDate } from "@/utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

type Renewal = { kind: "annual_purchase" | "unlinked" | "card" | "pix"; cancelled?: boolean };
export default function CancelarPage() {
  const { view } = useSubscriptionData();
  const [renewal, setRenewal] = useState<Renewal | null>(null);
  const [busy, setBusy] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  async function checkRenewal(cancel = false) {
    setBusy(true);
    setError("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Entre novamente para continuar.");
      const response = await fetch("/api/subscription-renewal", {
        method: cancel ? "POST" : "GET",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível conferir a renovação.");
      setRenewal(data);
      setAccepted(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conferir a renovação.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error("Entre novamente para continuar.");
        const response = await fetch("/api/subscription-renewal", {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível conferir a renovação.");
        if (active) {
          setRenewal(data);
          setAccepted(false);
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Não foi possível conferir a renovação.");
        }
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const recurring = renewal?.kind === "card" || renewal?.kind === "pix";
  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <p className="product-eyebrow">RENOVAÇÃO</p>
        <h2>{renewal?.kind === "annual_purchase" ? "Contratação anual" : "Renovação da assinatura"}</h2>
        <p>Vigência atual: {subscriptionDate(view.endsAt)}. O cancelamento da renovação preserva o período já pago.</p>
        {renewal?.kind === "annual_purchase" && (
          <p>Sua contratação anual foi realizada por pagamento à vista ou em parcelas. Não há cobrança recorrente vinculada. A renovação do próximo período exige uma nova autorização; cancelar a renovação não cancela parcelas já contratadas.</p>
        )}
        {renewal?.kind === "unlinked" && (
          <p>Nenhuma renovação automática foi localizada. Se você concluiu uma contratação recorrente, a integração com o pagamento precisa ser conferida.</p>
        )}
        {recurring && (
          <p>{renewal?.cancelled ? "Renovação automática cancelada e confirmada pelo Asaas." : "A renovação automática ocorre ao final de cada período até você cancelar."}</p>
        )}
        {recurring && !renewal?.cancelled && (
          <>
            <label className={styles.check}>
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Quero cancelar a renovação automática e manter o acesso até o fim do período pago.
            </label>
            <div className={styles.actions}>
              <button className="product-button danger" disabled={busy || !accepted} onClick={() => void checkRenewal(true)}>
                Cancelar renovação automática
              </button>
            </div>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <button className="product-button secondary" disabled={busy} onClick={() => void checkRenewal(false)}>
            {busy ? "Conferindo…" : "Atualizar situação"}
          </button>
        </div>
      </section>
    </div>
  );
}
