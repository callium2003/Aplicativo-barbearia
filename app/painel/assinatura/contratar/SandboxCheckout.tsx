"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../utils/supabase";
import { formatBRL } from "../../../../utils/subscription-plans";
import { extractErrorMessage, startSandboxPixSubscription, startSandboxSubscription } from "../../../../utils/sandbox-subscription-flow";
import { subscriptionDate } from "../../../../utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

type Props = { planCode: string; planName: string; priceCents: number; months: number; userLimit: number };

function isValidTaxDocument(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if ((d.length !== 11 && d.length !== 14) || /^(\d)\1+$/.test(d)) return false;
  if (d.length === 11) {
    const calc = (len: number) => ((d.slice(0, len).split("").reduce((s, n, i) => s + Number(n) * (len + 1 - i), 0) * 10) % 11) % 10;
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
  const calc = (w: number[]) => {
    const r = w.reduce((s, f, i) => s + Number(d[i]) * f, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[12])
    && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[13]);
}

export default function SandboxCheckout({ planCode, planName, priceCents, months, userLimit }: Props) {
  const { view, href, barbershopId } = useSubscriptionData();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [phone, setPhone] = useState("");
  const [taxDocument, setTaxDocument] = useState("");
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function fetchRegistration() {
      if (!barbershopId) return;
      try {
        const { data } = await supabase
          .from("barbershop_registration_details")
          .select("responsible_name,responsible_phone,tax_document")
          .eq("barbershop_id", barbershopId)
          .maybeSingle();
        if (alive && data) {
          setResponsibleName(data.responsible_name || "");
          setPhone(data.responsible_phone || "");
          setTaxDocument(data.tax_document || "");
        }
      } catch {
        // Non-blocking
      }
    }
    void fetchRegistration();
    return () => { alive = false; };
  }, [barbershopId]);

  async function begin(method: "card" | "pix") {
    if (!accepted || busy || (view.kind === "active" && !view.cancellationScheduled)) return;
    const cleanDoc = taxDocument.replace(/\D/g, "");
    if (!isValidTaxDocument(cleanDoc)) {
      setMessage("Por favor, informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para prosseguir com a assinatura.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setMessage("Por favor, informe um celular ou telefone com DDD válido.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (barbershopId) {
        await supabase
          .from("barbershop_registration_details")
          .update({
            tax_document: cleanDoc,
            responsible_name: responsibleName.trim() || undefined,
            responsible_phone: phone.trim() || undefined,
          })
          .eq("barbershop_id", barbershopId);
      }

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (session.error || !token) throw new Error("Entre novamente para continuar.");
      requestId.current ??= crypto.randomUUID();
      if (method === "pix") {
        const url = await startSandboxPixSubscription({
          token,
          planCode,
          idempotencyKey: requestId.current,
          taxDocument: cleanDoc,
          phone: phone.trim(),
          responsibleName: responsibleName.trim(),
        });
        window.location.assign(url);
      } else {
        const url = await startSandboxSubscription({
          token,
          planCode,
          idempotencyKey: requestId.current,
          taxDocument: cleanDoc,
          phone: phone.trim(),
          responsibleName: responsibleName.trim(),
        });
        window.location.assign(url);
      }
    } catch (caught) {
      requestId.current = null;
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

          <div style={{ margin: "1.25rem 0", display: "grid", gap: "0.75rem", background: "rgba(180, 83, 9, 0.04)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(180, 83, 9, 0.15)" }}>
            <h3 style={{ fontSize: "0.95rem", margin: 0, color: "var(--bronze-dark, #78350f)" }}>Identificação para Nota Fiscal e Checkout</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "inherit" }}>Confira seu CPF/CNPJ e celular para que apareçam preenchidos no Asaas.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem", fontWeight: 600 }}>
                <span>CPF ou CNPJ *</span>
                <input
                  required
                  className="product-input"
                  style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem", borderRadius: "6px", border: "1px solid #ccc", background: "#fff" }}
                  placeholder="000.000.000-00"
                  value={taxDocument}
                  onChange={(e) => setTaxDocument(e.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem", fontWeight: 600 }}>
                <span>Celular com DDD *</span>
                <input
                  required
                  className="product-input"
                  style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem", borderRadius: "6px", border: "1px solid #ccc", background: "#fff" }}
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>
          </div>

          <label className={styles.check}>
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e as <Link href="/regras-assinatura" target="_blank">Regras de Assinatura</Link>.</span>
          </label>
          <div className={styles.actions}>
            <button className="product-button bronze" disabled={!accepted || busy} onClick={() => void begin("card")}>
              {busy ? "Abrindo pagamento…" : "Pagar com cartão"}
            </button>
            <button className="product-button secondary" disabled={!accepted || busy} onClick={() => void begin("pix")}>
              {busy ? "Abrindo pagamento…" : "Pagar com PIX"}
            </button>
          </div>
          {message && <p role="alert" style={{ color: "var(--sp-danger, #dc2626)", fontWeight: 600, marginTop: "0.75rem" }}>{message}</p>}
        </>
      )}
    </section>
  </div>;
}
