"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { subscriptionDate } from "@/utils/subscription-view";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

type Renewal = { kind: "annual_purchase" | "unlinked" | "card" | "pix"; cancelled?: boolean };
export default function CancelarPage() {
  const { view, href } = useSubscriptionData();
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
      {view.kind === "trial" ? (
        <section className={styles.card}>
          <p className="product-eyebrow">ASSINATURA E TESTES</p>
          <h2>Período de teste gratuito</h2>
          <p>
            Sua barbearia está no período gratuito de teste de 30 dias: resta(m) <strong>{view.remainingDays !== undefined ? `${view.remainingDays} dia(s)` : "alguns dias"}</strong> (término em <strong>{subscriptionDate(view.endsAt)}</strong>).
          </p>
          <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "1rem", margin: "1rem 0" }}>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem", color: "#10b981" }}>✓ Sem cartão cadastrado nem cobranças agendadas</h3>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              Durante o período de teste gratuito, você não possui renovação automática ativa. Não é necessário realizar nenhum cancelamento: caso opte por não contratar um plano, o período de testes encerra automaticamente ao término sem cobrança alguma.
            </p>
          </div>
          <div className={styles.actions}>
            <Link className="product-button bronze" href={href("planos")}>
              Conhecer e contratar planos
            </Link>
            <Link className="product-button secondary" href={href()}>
              Voltar para central da assinatura
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.card}>
          <p className="product-eyebrow">RENOVAÇÃO</p>
          <h2>Renovação da assinatura</h2>
          <p>
            Vencimento da assinatura: <strong>{subscriptionDate(view.endsAt)}</strong>. O cancelamento preserva todo o período já pago até a data de vencimento.
          </p>
          {renewal?.kind === "annual_purchase" && !renewal?.cancelled && !view.cancellationScheduled && (
            <p>Seu plano contratado é <strong>Anual</strong> com vigência até <strong>{subscriptionDate(view.endsAt)}</strong>. Você pode cancelar para garantir que a assinatura não seja renovada ao término do ciclo.</p>
          )}
          {renewal?.kind === "unlinked" && !renewal?.cancelled && !view.cancellationScheduled && (
            <p>Seu acesso está ativo até <strong>{subscriptionDate(view.endsAt)}</strong>. Você pode registrar o cancelamento para que a assinatura não seja continuada após esse período.</p>
          )}
          {recurring && !renewal?.cancelled && !view.cancellationScheduled && (
            <p>A renovação automática ocorre ao final de cada período até você cancelar.</p>
          )}
          {(renewal?.cancelled || view.cancellationScheduled) ? (
            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "1rem", margin: "1rem 0" }}>
              <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem", color: "#10b981" }}>✓ Cancelamento registrado</h3>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                A renovação da assinatura foi cancelada. Seu acesso à barbearia continua <b>100% ativo e liberado até {subscriptionDate(view.endsAt)}</b>.
                Nossa equipe administrativa foi notificada e permanece à disposição caso queira retomar seu plano ou precise de assistência.
              </p>
            </div>
          ) : (
            <>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "1rem", margin: "1rem 0" }}>
                <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>💬 Precisa de ajuda com sua barbearia?</h3>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
                  Antes de cancelar, podemos ajudar sua barbearia com dúvidas operacionais, treinamento da equipe ou condições especiais personalizadas para o seu momento.
                </p>
                <a
                  className="product-button secondary"
                  href="mailto:contato@cullentech.com.br?subject=D%C3%BAvidas%20sobre%20minha%20assinatura%20BarbeariaSP"
                  style={{ display: "inline-block", fontSize: "0.85rem" }}
                >
                  Falar com a equipe BarbeariaSP ↗
                </a>
              </div>
              <label className={styles.check}>
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Quero cancelar a renovação da assinatura e manter o acesso até o fim do período pago.
              </label>
              <div className={styles.actions}>
                <button className="product-button danger" disabled={busy || !accepted} onClick={() => void checkRenewal(true)}>
                  Cancelar renovação da assinatura
                </button>
              </div>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {recurring && (
            <div className={styles.actions} style={{ marginTop: "1rem" }}>
              <button className="product-button secondary" style={{ fontSize: "0.85rem" }} disabled={busy} onClick={() => void checkRenewal(false)}>
                {busy ? "Sincronizando com Asaas…" : "Sincronizar status com Asaas"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
