"use client";

import { supabase } from "@/utils/supabase";
import { loadPlatformAdministration } from "@/utils/platform-administration.mjs";
import { buildTelephoneLink, buildWhatsAppLink } from "@/app/contact-links.mjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./platform.module.css";

type PlatformBarbershop = {
  barbershop_id: string;
  name: string;
  slug: string;
  registration_status: "active" | "inactive";
  subscription_status: string | null;
  plan_code: string | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  contract_status: "unavailable" | "trial" | "trial_ended" | "active" | "payment_attention" | "cancelled" | "ended" | "commercial_agreement";
  billing_mode?: "CARD_RECURRING" | "PIX_AUTOMATIC" | "ONE_TIME" | null;
  billing_cycle?: "mensal" | "anual" | "avulso" | null;
  cancellation_scheduled?: boolean;
  invoices_paid?: number;
  invoices_pending?: number;
  invoices_overdue?: number;
  asaas_status?: string | null;
  responsible_name?: string | null;
  contact_phone?: string | null;
  notification_email?: string | null;
};

const contractLabel: Record<PlatformBarbershop["contract_status"], string> = {
  unavailable: "Não informado",
  trial: "Em teste",
  trial_ended: "Teste encerrado",
  active: "Ativo",
  payment_attention: "Atenção de pagamento",
  cancelled: "Cancelado",
  ended: "Encerrado",
  commercial_agreement: "Acordo comercial",
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value))
    : "—";

const formatBillingMode = (mode?: string | null, cycle?: string | null) => {
  const cycleLabel = cycle === "anual" ? "Anual" : cycle === "mensal" ? "Mensal" : "";
  if (!mode && !cycleLabel) return "—";
  if (mode === "CARD_RECURRING") return `${cycleLabel || "Recorrente"} (Cartão)`;
  if (mode === "PIX_AUTOMATIC") return `${cycleLabel || "Mensal"} (Pix Automático)`;
  if (mode === "ONE_TIME") return `${cycleLabel || "À vista"} (Avulso)`;
  return cycleLabel || mode || "—";
};

const formatPlanName = (code?: string | null) => {
  if (!code) return "—";
  const clean = code.replace(/-(?:mensal|anual)$/i, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export default function PlatformPage() {
  const [barbershops, setBarbershops] = useState<PlatformBarbershop[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");
  const [activeFilter, setActiveFilter] = useState<"all" | "retention" | "attention" | "active" | "trial">("all");
  const [retentionTarget, setRetentionTarget] = useState<PlatformBarbershop | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const result = await loadPlatformAdministration(supabase);
      if (result.status === "unauthenticated") {
        window.location.replace("/plataforma/entrar");
        return;
      }
      if (result.status === "forbidden") {
        setState("denied");
        return;
      }
      setBarbershops(result.barbershops as PlatformBarbershop[]);
      setState("ready");
    } catch {
      setState("failed");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchOverview();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchOverview]);

  function refresh() {
    setState("loading");
    void fetchOverview();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/plataforma/entrar");
  }

  const scheduledCancellations = useMemo(
    () => barbershops.filter((s) => s.cancellation_scheduled),
    [barbershops]
  );
  const paymentAttentions = useMemo(
    () => barbershops.filter((s) => s.contract_status === "payment_attention" || (s.invoices_overdue ?? 0) > 0),
    [barbershops]
  );
  const activeSubs = useMemo(
    () => barbershops.filter((s) => s.contract_status === "active"),
    [barbershops]
  );
  const trialSubs = useMemo(
    () => barbershops.filter((s) => s.contract_status === "trial"),
    [barbershops]
  );

  const filteredBarbershops = useMemo(() => {
    switch (activeFilter) {
      case "retention":
        return scheduledCancellations;
      case "attention":
        return paymentAttentions;
      case "active":
        return activeSubs;
      case "trial":
        return trialSubs;
      default:
        return barbershops;
    }
  }, [activeFilter, barbershops, scheduledCancellations, paymentAttentions, activeSubs, trialSubs]);

  if (state === "loading") {
    return (
      <main className={styles.centered}>
        <p>Verificando acesso interno…</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className={styles.centered}>
        <section className={styles.denied}>
          <p className={styles.eyebrow}>CullenTech</p>
          <h1>Acesso interno não autorizado</h1>
          <p>Esta identidade não possui permissão para administrar a plataforma.</p>
          <button onClick={() => void signOut()}>Sair</button>
        </section>
      </main>
    );
  }

  if (state === "failed") {
    return (
      <main className={styles.centered}>
        <p>Não foi possível carregar o resumo agora.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CullenTech</p>
          <h1>Administração da plataforma</h1>
          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "14px" }}>
            <span style={{ fontWeight: 700, color: "var(--sp-ink)" }}>Barbearias & Cobranças</span>
            <Link href="/plataforma/suporte" style={{ color: "var(--sp-muted)", textDecoration: "none" }}>
              Central de Chamados
            </Link>
            <Link href="/plataforma/incidentes" style={{ color: "var(--sp-muted)", textDecoration: "none" }}>
              Alertas & Incidentes
            </Link>
          </div>
        </div>
        <button className={styles.signOut} onClick={() => void signOut()}>
          Sair
        </button>
      </header>

      {/* Resumo de Indicadores Cadastrais e Faturamento */}
      <section className={styles.billingSummary} aria-label="Resumo cadastral e faturamento">
        <div>
          <strong>{barbershops.length}</strong>
          <span>barbearias cadastradas</span>
        </div>
        <div>
          <strong>{activeSubs.length}</strong>
          <span>assinaturas ativas</span>
        </div>
        <div>
          <strong>{trialSubs.length}</strong>
          <span>em período de teste</span>
        </div>
        <div className={scheduledCancellations.length > 0 ? styles.summaryAlert : undefined}>
          <strong>{scheduledCancellations.length}</strong>
          <span>cancelamento agendado (retenção)</span>
        </div>
        <div className={paymentAttentions.length > 0 ? styles.summaryDanger : undefined}>
          <strong>{paymentAttentions.length}</strong>
          <span>atenção / atraso financeiro</span>
        </div>
      </section>

      {/* Visão de Faturamento e Assinaturas */}
      <section className={styles.tableCard}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Gestão de Assinaturas e Cobranças</h2>
            <p>
              Acompanhamento centralizado de contratos, provedor Asaas, modalidades e faturas. Acesso restrito ao papel platform_owner.
            </p>
          </div>
          <button onClick={refresh}>Atualizar</button>
        </div>

        {/* Filtros rápidos */}
        <div className={styles.filterBar} role="tablist" aria-label="Filtros de visualização">
          <button
            type="button"
            className={`${styles.filterBtn} ${activeFilter === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Todas ({barbershops.length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${styles.filterBtnAlert} ${
              activeFilter === "retention" ? styles.filterBtnAlertActive : ""
            }`}
            onClick={() => setActiveFilter("retention")}
          >
            ⚠️ Cancelamento Agendado ({scheduledCancellations.length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${activeFilter === "attention" ? styles.filterBtnActive : ""}`}
            onClick={() => setActiveFilter("attention")}
          >
            Atenção de Pagamento ({paymentAttentions.length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${activeFilter === "active" ? styles.filterBtnActive : ""}`}
            onClick={() => setActiveFilter("active")}
          >
            Ativas ({activeSubs.length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${activeFilter === "trial" ? styles.filterBtnActive : ""}`}
            onClick={() => setActiveFilter("trial")}
          >
            Em Teste ({trialSubs.length})
          </button>
        </div>

        {/* Tabela de Barbearias e Assinaturas */}
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Barbearia</th>
                <th>Status Contrato / Asaas</th>
                <th>Plano & Modalidade</th>
                <th>Vigência / Vencimento</th>
                <th>Faturas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredBarbershops.map((shop) => {
                const isScheduled = !!shop.cancellation_scheduled;
                return (
                  <tr key={shop.barbershop_id} className={isScheduled ? styles.retentionAlertRow : undefined}>
                    <td>
                      <Link href={`/plataforma/barbearias/${shop.barbershop_id}`}>
                        <strong>{shop.name}</strong>
                      </Link>
                      <small>/{shop.slug}</small>
                      {shop.responsible_name && shop.responsible_name !== "Não informado" && (
                        <small style={{ color: "var(--sp-ink)", marginTop: "2px" }}>
                          Resp.: {shop.responsible_name}
                        </small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        {isScheduled ? (
                          <span className={styles.retentionBadge}>
                            ⚠️ Cancelamento Agendado
                          </span>
                        ) : shop.contract_status === "active" ? (
                          <span className={`${styles.badge} ${styles.badgeActive}`}>Ativo</span>
                        ) : shop.contract_status === "trial" ? (
                          <span className={`${styles.badge} ${styles.badgeTrial}`}>Em Teste</span>
                        ) : shop.contract_status === "commercial_agreement" ? (
                          <span className={`${styles.badge} ${styles.badgeAgreement}`}>Acordo Comercial</span>
                        ) : shop.contract_status === "payment_attention" ? (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>Atenção Pagamento</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            {contractLabel[shop.contract_status]}
                          </span>
                        )}
                        <small style={{ fontSize: "11px" }}>
                          Asaas: {shop.asaas_status ?? "—"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <strong>{formatPlanName(shop.plan_code)}</strong>
                      <small>{formatBillingMode(shop.billing_mode, shop.billing_cycle)}</small>
                    </td>
                    <td>
                      <strong>{formatDate(shop.current_period_ends_at || shop.trial_ends_at)}</strong>
                      <small>
                        {shop.current_period_ends_at
                          ? isScheduled
                            ? "Acesso pré-pago remanescente"
                            : "Vigência ativa"
                          : shop.trial_ends_at
                          ? "Fim do período de teste"
                          : "Sem vigência cadastrada"}
                      </small>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                        <span className={`${styles.invoiceTag} ${styles.invoicePaid}`}>
                          {shop.invoices_paid ?? 0} pagas
                        </span>
                        {(shop.invoices_pending ?? 0) > 0 && (
                          <span className={`${styles.invoiceTag} ${styles.invoicePending}`}>
                            {shop.invoices_pending} pendentes
                          </span>
                        )}
                        {(shop.invoices_overdue ?? 0) > 0 && (
                          <span className={`${styles.invoiceTag} ${styles.invoiceOverdue}`}>
                            {shop.invoices_overdue} em atraso
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {isScheduled ? (
                          <button
                            type="button"
                            className={styles.retentionActionBtn}
                            onClick={() => setRetentionTarget(shop)}
                            title="Atuar preventivamente com contato/retenção"
                          >
                            Atuar Retenção
                          </button>
                        ) : (
                          <Link href={`/plataforma/barbearias/${shop.barbershop_id}`} style={{ textDecoration: "none" }}>
                            <small style={{ color: "var(--sp-primary, #b34728)", fontWeight: 700 }}>
                              Detalhes &rarr;
                            </small>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBarbershops.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "28px" }}>
                    Nenhuma barbearia encontrada para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Atuação Preventiva de Retenção */}
      {retentionTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="retentionModalTitle">
          <div className={styles.modalCard} style={{ maxWidth: "560px" }}>
            <div className={styles.modalHeader}>
              <h2 id="retentionModalTitle" style={{ margin: 0, color: "#92400e" }}>
                ⚠️ Ação de Retenção &bull; {retentionTarget.name}
              </h2>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setRetentionTarget(null)}
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "16px 0", display: "grid", gap: "14px" }}>
              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "8px", padding: "12px 14px", color: "#92400e", fontSize: "14px", lineHeight: "1.5" }}>
                <strong>Cancelamento Agendado:</strong> O locatário cancelou a renovação automática no provedor, mas o acesso ao sistema permanece liberado até <strong>{formatDate(retentionTarget.current_period_ends_at)}</strong>.
              </div>

              <div style={{ display: "grid", gap: "8px", fontSize: "14px" }}>
                <div><strong>Barbearia:</strong> {retentionTarget.name} (<code>/{retentionTarget.slug}</code>)</div>
                <div><strong>Responsável:</strong> {retentionTarget.responsible_name || "Não informado"}</div>
                <div><strong>Plano Atual:</strong> {formatPlanName(retentionTarget.plan_code)} ({formatBillingMode(retentionTarget.billing_mode, retentionTarget.billing_cycle)})</div>
                <div><strong>Vigência Liberada Até:</strong> {formatDate(retentionTarget.current_period_ends_at)}</div>
                <div>
                  <strong>Telefone / WhatsApp:</strong>{" "}
                  {(() => {
                    const phone = retentionTarget.contact_phone;
                    if (!phone || phone === "Não informado") return "Não informado";
                    const waLink = buildWhatsAppLink(phone);
                    const telLink = buildTelephoneLink(phone);
                    if (waLink) {
                      return (
                        <span style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--sp-primary, #b34728)", fontWeight: 700 }}
                          >
                            {phone} (Abrir WhatsApp)
                          </a>
                          {telLink && (
                            <a
                              href={telLink}
                              style={{ color: "var(--sp-muted, #666)", fontSize: "13px" }}
                              title="Ligar para o estabelecimento"
                            >
                              (Ligar)
                            </a>
                          )}
                        </span>
                      );
                    }
                    return phone;
                  })()}
                </div>
                <div>
                  <strong>E-mail:</strong>{" "}
                  {retentionTarget.notification_email && retentionTarget.notification_email !== "Não informado" ? (
                    <a
                      href={`mailto:${retentionTarget.notification_email}`}
                      style={{ color: "var(--sp-primary, #b34728)", fontWeight: 600 }}
                    >
                      {retentionTarget.notification_email}
                    </a>
                  ) : (
                    "Não informado"
                  )}
                </div>
              </div>

              <div style={{ background: "var(--sp-surface-soft, #f7f7f5)", border: "1px solid var(--sp-line)", borderRadius: "8px", padding: "12px", fontSize: "13px", lineHeight: "1.5" }}>
                <strong>Roteiro Recomendado CullenTech:</strong>
                <ol style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                  <li>Compreender o motivo do cancelamento (custos, dúvidas de operação, volume de agendamentos).</li>
                  <li>Apresentar condições especiais de retenção: garantia de 15% de desconto de lançamento na renovação ou adequação ao plano Simple/Middle.</li>
                  <li>Reverter o cancelamento antes do encerramento da vigência em {formatDate(retentionTarget.current_period_ends_at)}.</li>
                </ol>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.signOut}
                onClick={() => setRetentionTarget(null)}
              >
                Fechar
              </button>
              <Link href={`/plataforma/barbearias/${retentionTarget.barbershop_id}`} style={{ textDecoration: "none" }}>
                <button type="button" className={styles.primaryButton}>
                  Abrir Ficha da Barbearia
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
