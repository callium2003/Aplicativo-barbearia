"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBRL } from "@/utils/subscription-plans";
import { subscriptionDate } from "@/utils/subscription-view";
import { supabase } from "@/utils/supabase";
import { useSubscriptionData, type BillingRecord } from "../SubscriptionContext";
import styles from "../subscription.module.css";

const labels = { pending: "Pendente", paid: "Pago", overdue: "Vencido", refunded: "Estornado" };

export default function CobrancasPage() {
  const { bills, role, barbershopId, refresh } = useSubscriptionData();
  const [fetchedBills, setFetchedBills] = useState<BillingRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const effectiveBills = fetchedBills ?? bills;

  async function loadBills() {
    if (role !== "owner" || !barbershopId) return;
    const shopId = barbershopId;
    setLoading(true);
    setRefreshError("");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setRefreshError("Sessão não identificada. Recarregue a página.");
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/subscription-bills?barbershopId=${encodeURIComponent(shopId)}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setFetchedBills(json.bills || []);
        refresh?.();
      } else {
        setRefreshError("Não foi possível carregar as cobranças no momento.");
      }
    } catch {
      setRefreshError("Erro de conexão ao carregar cobranças.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bills === null && role === "owner" && barbershopId) {
      const shopId = barbershopId;
      let alive = true;
      async function run() {
        setLoading(true);
        setRefreshError("");
        try {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (!token) {
            if (alive) {
              setRefreshError("Sessão não identificada. Recarregue a página.");
              setLoading(false);
            }
            return;
          }
          const res = await fetch(`/api/subscription-bills?barbershopId=${encodeURIComponent(shopId)}`, {
            headers: { authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res.ok) {
            const json = await res.json();
            if (alive) setFetchedBills(json.bills || []);
          } else {
            if (alive) setRefreshError("Não foi possível carregar as cobranças no momento.");
          }
        } catch {
          if (alive) setRefreshError("Erro de conexão ao carregar cobranças.");
        } finally {
          if (alive) setLoading(false);
        }
      }
      void run();
      return () => {
        alive = false;
      };
    }
  }, [bills, role, barbershopId]);

  return <section className={styles.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
      <div>
        <p className="product-eyebrow">HISTÓRICO FINANCEIRO</p>
        <h2>Minhas cobranças</h2>
      </div>
      {role === "owner" && (
        <button
          type="button"
          className="product-button secondary"
          style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
          onClick={() => void loadBills()}
          disabled={loading}
        >
          {loading ? "Atualizando…" : "Atualizar histórico"}
        </button>
      )}
    </div>
    <p>Consulte pagamentos, cobranças pendentes, estornos e comprovantes vinculados à sua assinatura.</p>

    {refreshError && <p className={styles.note} style={{ color: "var(--danger, #e53e3e)" }}>{refreshError}</p>}

    {role !== "owner" ? (
      <div className={styles.empty}>
        <span aria-hidden="true">🔒</span>
        <h2>Acesso restrito</h2>
        <p>Somente o proprietário da barbearia tem permissão para visualizar o histórico financeiro e cobranças.</p>
      </div>
    ) : loading && effectiveBills === null ? (
      <div className={styles.empty}>
        <p>Carregando histórico financeiro…</p>
      </div>
    ) : !effectiveBills || effectiveBills.length === 0 ? (
      <div className={styles.empty}>
        <span aria-hidden="true">✓</span>
        <h2>Nenhuma cobrança registrada</h2>
        <p>Quando houver uma contratação confirmada ou fatura emitida, os lançamentos aparecerão aqui.</p>
      </div>
    ) : (
      <div>
        {effectiveBills.map(item => (
          <article className={styles.receipt} key={item.id}>
            <header>
              <div>
                <h3>{item.label}</h3>
                <small>{subscriptionDate(item.date)}</small>
              </div>
              <span className={"product-status " + (item.status === "paid" ? "completed" : item.status === "pending" ? "confirmed" : "cancelled")}>
                {labels[item.status]}
              </span>
            </header>
            <p><b>{formatBRL(item.amountCents)}</b></p>
            {item.status === "pending" && (
              <p style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {item.checkoutUrl && (
                  <a className="product-button secondary" href={item.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    Concluir pagamento no Asaas ↗
                  </a>
                )}
                <Link className="product-button bronze" href="/painel/assinatura/planos">
                  Gerar novo link de pagamento
                </Link>
              </p>
            )}
          </article>
        ))}
      </div>
    )}
    {effectiveBills?.some((item) => item.status === "pending") && (
      <p className={styles.note}>
        Cobranças via Pix ou cartão podem levar alguns instantes para confirmação bancária. Assim que o pagamento for compensado, o status é atualizado automaticamente para Pago.
      </p>
    )}
  </section>;
}
