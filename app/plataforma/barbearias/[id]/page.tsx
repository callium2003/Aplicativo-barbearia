"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";
import {
  exportPlatformBarbershopCustomers,
  loadPlatformBarbershopConsents,
  loadPlatformBarbershopCustomers,
  loadPlatformBarbershopDetail,
  reactivatePlatformBarbershopByAgreement,
  serializeCustomersToCsv,
  serializeCustomersToJson,
  suspendPlatformBarbershop,
} from "@/utils/platform-administration.mjs";
import styles from "../../platform.module.css";

type Detail = {
  barbershop_id: string;
  name: string;
  slug: string;
  registration_status: "active" | "inactive";
  created_at: string;
  phone: string | null;
  whatsapp: string | null;
  notification_email: string | null;
  address: string | null;
  initial_registration_completed: boolean;
  responsible_name: string | null;
  responsible_phone: string | null;
  tax_document: string | null;
  postal_code: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  subscription_status: string | null;
  plan_code: string | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  contract_status: "unavailable" | "trial" | "trial_ended" | "active" | "payment_attention" | "cancelled" | "ended" | "commercial_agreement";
  customer_count: number;
  active_professional_count: number;
  active_service_count: number;
  commercial_agreement_active: boolean;
  commercial_agreement_ends_at: string | null;
  commercial_agreement_reason: string | null;
  commercial_agreement_condition: string | null;
  commercial_agreement_duration_days: number | null;
};

type Professional = {
  professional_id: string;
  name: string;
  active: boolean;
  created_at: string;
};

type Service = {
  service_id: string;
  name: string;
  active: boolean;
  duration_minutes: number | null;
  price: number;
};

type Customer = {
  customer_id: string;
  name: string;
  email: string | null;
  phone: string;
  related_since: string;
};

type CustomerConsent = {
  customer_id: string;
  customer_name: string;
  barbershop_marketing_granted: boolean | null;
  barbershop_marketing_version: string | null;
  barbershop_marketing_source: string | null;
  barbershop_marketing_changed_at: string | null;
  platform_marketing_granted: boolean | null;
  platform_marketing_version: string | null;
  platform_marketing_source: string | null;
  platform_marketing_changed_at: string | null;
};

const contractLabel: Record<Detail["contract_status"], string> = {
  unavailable: "Não informado",
  trial: "Em teste",
  trial_ended: "Teste encerrado",
  active: "Ativo",
  payment_attention: "Atenção de pagamento",
  cancelled: "Cancelado",
  ended: "Encerrado",
  commercial_agreement: "Acordo comercial",
};

const formatDate = (val: string | null) =>
  val ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(val)) : "—";

const formatPrice = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function PlatformBarbershopPage() {
  const params = useParams<{ id: string }>();
  const barbershopId = params?.id;

  const [state, setState] = useState<"loading" | "ready" | "denied" | "not_found" | "failed">("loading");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [consents, setConsents] = useState<CustomerConsent[] | null>(null);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [consentsError, setConsentsError] = useState<string | null>(null);

  const [exportFormat, setExportFormat] = useState<"csv" | "json" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [agreementDurationDays, setAgreementDurationDays] = useState(10);
  const [agreementReason, setAgreementReason] = useState("");
  const [agreementCondition, setAgreementCondition] = useState("");
  const [agreementSubmitting, setAgreementSubmitting] = useState(false);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [agreementMessage, setAgreementMessage] = useState<string | null>(null);

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendSubmitting, setSuspendSubmitting] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!barbershopId) return;
    try {
      const result = await loadPlatformBarbershopDetail(supabase, barbershopId);
      if (result.status === "unauthenticated") {
        window.location.replace("/plataforma/entrar");
        return;
      }
      if (result.status === "forbidden") {
        setState("denied");
        return;
      }
      if (result.status === "not_found") {
        setState("not_found");
        return;
      }
      setDetail(result.detail as Detail);
      setProfessionals(result.professionals as Professional[]);
      setServices(result.services as Service[]);
      setState("ready");
    } catch {
      setState("failed");
    }
  }, [barbershopId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchDetail(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDetail]);

  async function handleLoadCustomers() {
    if (!barbershopId || customersLoading) return;
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const res = await loadPlatformBarbershopCustomers(supabase, barbershopId);
      if (res.status === "ready") {
        setCustomers(res.customers as Customer[]);
      } else {
        setCustomersError("Não foi possível abrir os clientes.");
      }
    } catch {
      setCustomersError("Erro ao carregar clientes.");
    } finally {
      setCustomersLoading(false);
    }
  }

  async function handleLoadConsents() {
    if (!barbershopId || consentsLoading) return;
    setConsentsLoading(true);
    setConsentsError(null);
    try {
      const res = await loadPlatformBarbershopConsents(supabase, barbershopId);
      if (res.status === "ready") {
        setConsents(res.consents as CustomerConsent[]);
      } else {
        setConsentsError("Não foi possível carregar os consentimentos.");
      }
    } catch {
      setConsentsError("Erro ao carregar consentimentos.");
    } finally {
      setConsentsLoading(false);
    }
  }

  function handleRequestExport(format: "csv" | "json") {
    setExportError(null);
    setExportMessage(null);
    setExportFormat(format);
  }

  function handleCancelExport() {
    if (exporting) return;
    setExportFormat(null);
  }

  async function handleConfirmExport() {
    if (!barbershopId || !exportFormat || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await exportPlatformBarbershopCustomers(supabase, barbershopId, exportFormat);
      if (res.status === "unauthenticated") {
        window.location.replace("/plataforma/entrar");
        return;
      }
      if (res.status === "forbidden") {
        setState("denied");
        return;
      }
      if (res.status === "not_found") {
        setState("not_found");
        return;
      }
      if (res.status === "ready") {
        const records = res.records;
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        let content: string;
        let mimeType: string;

        if (exportFormat === "csv") {
          content = serializeCustomersToCsv(records);
          mimeType = "text/csv;charset=utf-8;";
        } else {
          content = serializeCustomersToJson(records, {
            barbershopId,
            exportedAt: now.toISOString(),
          });
          mimeType = "application/json;charset=utf-8;";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clientes-${detail?.slug ?? "barbearia"}-${dateStr}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportMessage(
          `Exportação concluída: ${records.length} ${records.length === 1 ? "registro baixado" : "registros baixados"} em ${exportFormat.toUpperCase()}. Auditoria gravada.`,
        );
        setExportFormat(null);
      } else {
        setExportError("Não foi possível exportar os dados.");
      }
    } catch {
      setExportError("Erro ao processar a exportação.");
    } finally {
      setExporting(false);
    }
  }

  async function handleConfirmAgreement() {
    if (!barbershopId || agreementSubmitting) return;
    setAgreementSubmitting(true);
    setAgreementError(null);
    try {
      const res = await reactivatePlatformBarbershopByAgreement(supabase, barbershopId, {
        durationDays: agreementDurationDays,
        reason: agreementReason,
        condition: agreementCondition,
      });
      if (res.status === "unauthenticated") {
        window.location.replace("/plataforma/entrar");
        return;
      }
      if (res.status === "forbidden") {
        setState("denied");
        return;
      }
      if (res.status === "invalid_input") {
        setAgreementError(res.error ?? "Dados inválidos para reativação.");
        return;
      }
      if (res.status === "success") {
        setAgreementModalOpen(false);
        setAgreementReason("");
        setAgreementCondition("");
        setAgreementMessage("Reativação por acordo comercial realizada com sucesso. Auditoria gravada.");
        await fetchDetail();
      } else {
        setAgreementError("Não foi possível registrar o acordo comercial.");
      }
    } catch {
      setAgreementError("Erro ao processar o acordo comercial.");
    } finally {
      setAgreementSubmitting(false);
    }
  }

  async function handleConfirmSuspend() {
    if (!barbershopId || suspendSubmitting) return;
    setSuspendSubmitting(true);
    setSuspendError(null);
    try {
      const res = await suspendPlatformBarbershop(supabase, barbershopId, {
        reason: suspendReason,
      });
      if (res.status === "unauthenticated") {
        window.location.replace("/plataforma/entrar");
        return;
      }
      if (res.status === "forbidden") {
        setState("denied");
        return;
      }
      if (res.status === "invalid_input") {
        setSuspendError(res.error ?? "Motivo da suspensão é obrigatório.");
        return;
      }
      if (res.status === "success") {
        setSuspendModalOpen(false);
        setSuspendReason("");
        setAgreementMessage("Barbearia suspensa com sucesso. Registro de auditoria gravado.");
        await fetchDetail();
      } else {
        setSuspendError("Não foi possível suspender a barbearia.");
      }
    } catch {
      setSuspendError("Erro ao suspender a barbearia.");
    } finally {
      setSuspendSubmitting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/plataforma/entrar");
  }

  if (state === "loading") {
    return <main className={styles.centered}><p>Carregando barbearia…</p></main>;
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
  if (state === "not_found") {
    return (
      <main className={styles.centered}>
        <section className={styles.denied}>
          <p className={styles.eyebrow}>CullenTech</p>
          <h1>Barbearia não encontrada</h1>
          <p>O identificador informado não existe ou não pôde ser localizado.</p>
          <Link href="/plataforma"><button>Voltar à lista</button></Link>
        </section>
      </main>
    );
  }
  if (state === "failed" || !detail) {
    return (
      <main className={styles.centered}>
        <section className={styles.denied}>
          <p className={styles.eyebrow}>CullenTech</p>
          <h1>Falha no carregamento</h1>
          <p>Não foi possível carregar os dados desta barbearia agora.</p>
          <button onClick={() => { setState("loading"); void fetchDetail(); }}>Tentar novamente</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CullenTech &bull; Consulta de Barbearia</p>
          <h1>{detail.name}</h1>
          <p>Identificador: <code>/{detail.slug}</code> &bull; Situação: <strong>{detail.registration_status === "active" ? "Ativa" : "Inativa"}</strong></p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/plataforma"><button className={styles.signOut}>Voltar</button></Link>
          <button className={styles.signOut} onClick={() => void signOut()}>Sair</button>
        </div>
      </header>

      {/* Indicadores Operacionais */}
      <section className={styles.summary} aria-label="Indicadores operacionais">
        <div>
          <strong>{detail.customer_count}</strong>
          <span>clientes vinculados</span>
        </div>
        <div>
          <strong>{detail.active_professional_count}</strong>
          <span>profissionais ativos</span>
        </div>
        <div>
          <strong>{detail.active_service_count}</strong>
          <span>serviços ativos</span>
        </div>
      </section>

      {/* Cadastro e Contrato */}
      <section className={styles.tableCard} style={{ marginBottom: "24px" }}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Cadastro e Contrato</h2>
            <p>Dados cadastrais, fiscais e vigência contratual. Somente leitura.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setAgreementError(null);
                setAgreementModalOpen(true);
              }}
              style={{
                background: detail.commercial_agreement_active ? "var(--sp-accent, #3b71ca)" : "var(--sp-primary, #b34728)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--sp-radius-sm)",
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {detail.commercial_agreement_active ? "Renovar acordo" : "Reativar por acordo"}
            </button>
            {detail.registration_status === "active" && (
              <button
                type="button"
                onClick={() => {
                  setSuspendError(null);
                  setSuspendModalOpen(true);
                }}
                className={styles.signOut}
                style={{ color: "var(--sp-danger, #b3261e)", borderColor: "var(--sp-danger, #b3261e)" }}
              >
                Suspender
              </button>
            )}
          </div>
        </div>

        {agreementMessage && (
          <p style={{ color: "var(--sp-success, #1e7e34)", padding: "0 0 14px", margin: 0, fontWeight: 500 }}>
            {agreementMessage}
          </p>
        )}

        <div className={styles.tableWrap}>
          <table>
            <tbody>
              {detail.commercial_agreement_active && (
                <tr style={{ background: "rgba(59, 113, 202, 0.08)" }}>
                  <th style={{ width: "240px" }}>Acordo Comercial Vigente</th>
                  <td>
                    <strong style={{ color: "var(--sp-accent, #3b71ca)" }}>
                      Ativo por {detail.commercial_agreement_duration_days} dias &bull; Até {formatDate(detail.commercial_agreement_ends_at)}
                    </strong>
                    <span><strong>Condição:</strong> {detail.commercial_agreement_condition}</span>
                    <span><strong>Motivo:</strong> {detail.commercial_agreement_reason}</span>
                  </td>
                </tr>
              )}
              <tr>
                <th style={{ width: "240px" }}>Contrato / Vigência</th>
                <td>
                  <strong>{contractLabel[detail.contract_status]}</strong>
                  <span>Plano: {detail.plan_code ?? "—"} &bull; Fim do teste: {formatDate(detail.trial_ends_at)} &bull; Fim da vigência: {formatDate(detail.current_period_ends_at)}</span>
                </td>
              </tr>
              <tr>
                <th>Responsável</th>
                <td>
                  <strong>{detail.responsible_name ?? "—"}</strong>
                  <span>Telefone: {detail.responsible_phone ?? "—"} &bull; CPF/CNPJ: {detail.tax_document ?? "—"}</span>
                </td>
              </tr>
              <tr>
                <th>Contatos da Barbearia</th>
                <td>
                  <span>Telefone público: {detail.phone ?? "—"} &bull; WhatsApp: {detail.whatsapp ?? "—"} &bull; E-mail de notificação: {detail.notification_email ?? "—"}</span>
                </td>
              </tr>
              <tr>
                <th>Endereço Cadastrado</th>
                <td>
                  <span>{detail.address ? `${detail.address} ` : ""}{detail.address_number ? `nº ${detail.address_number}, ` : ""}{detail.neighborhood ? `${detail.neighborhood}, ` : ""}{detail.city ? `${detail.city}/${detail.state}` : ""}{detail.postal_code ? ` — CEP ${detail.postal_code}` : ""}</span>
                </td>
              </tr>
              <tr>
                <th>Cadastro no Sistema</th>
                <td>{formatDate(detail.created_at)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Profissionais */}
      <section className={styles.tableCard} style={{ marginBottom: "24px" }}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Profissionais ({professionals.length})</h2>
            <p>Situação ativa/inativa. Sem exibição de telefones, comissões ou agenda.</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Situação</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.professional_id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.active ? "Ativo" : "Inativo"}</td>
                  <td>{formatDate(p.created_at)}</td>
                </tr>
              ))}
              {professionals.length === 0 && (
                <tr><td colSpan={3}>Nenhum profissional cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Serviços */}
      <section className={styles.tableCard} style={{ marginBottom: "24px" }}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Serviços ({services.length})</h2>
            <p>Catálogo público de serviços, duração e preço.</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Situação</th>
                <th>Duração</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.service_id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.active ? "Ativo" : "Inativo"}</td>
                  <td>{s.duration_minutes ? `${s.duration_minutes} min` : "—"}</td>
                  <td>{formatPrice(s.price)}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan={4}>Nenhum serviço cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Clientes com auditoria */}
      <section className={styles.tableCard} style={{ marginBottom: "24px" }}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Clientes vinculados</h2>
            <p>Exibição auditada de dados completos (nome, e-mail e telefone).</p>
          </div>
          {customers === null && (
            <button onClick={() => void handleLoadCustomers()} disabled={customersLoading}>
              {customersLoading ? "Abrindo…" : "Abrir clientes (gera auditoria)"}
            </button>
          )}
        </div>
        {customersError && <p style={{ color: "var(--sp-danger, #b3261e)" }}>{customersError}</p>}
        {customers !== null && (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Vinculado desde</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer_id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.phone}</td>
                    <td>{formatDate(c.related_since)}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={4}>Nenhum cliente vinculado a esta barbearia.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consentimentos e permissões */}
      <section className={styles.tableCard} style={{ marginBottom: "24px" }}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Consentimentos e permissões</h2>
            <p>Situação atual dos consentimentos de marketing por cliente. Leitura auditada.</p>
          </div>
          {consents === null && (
            <button onClick={() => void handleLoadConsents()} disabled={consentsLoading}>
              {consentsLoading ? "Carregando…" : "Consultar consentimentos (gera auditoria)"}
            </button>
          )}
        </div>
        {consentsError && <p style={{ color: "var(--sp-danger, #b3261e)" }}>{consentsError}</p>}
        {consents !== null && (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Marketing Barbearia</th>
                  <th>Marketing Plataforma</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.customer_id}>
                    <td><strong>{c.customer_name}</strong></td>
                    <td>
                      {c.barbershop_marketing_granted === null ? (
                        <span>Não informado</span>
                      ) : c.barbershop_marketing_granted ? (
                        <span>Concedido ({c.barbershop_marketing_source ?? "origem não inf."} &bull; {formatDate(c.barbershop_marketing_changed_at)})</span>
                      ) : (
                        <span>Revogado/Recusado ({formatDate(c.barbershop_marketing_changed_at)})</span>
                      )}
                    </td>
                    <td>
                      {c.platform_marketing_granted === null ? (
                        <span>Não informado</span>
                      ) : c.platform_marketing_granted ? (
                        <span>Concedido (v{c.platform_marketing_version ?? "1"} &bull; {formatDate(c.platform_marketing_changed_at)})</span>
                      ) : (
                        <span>Revogado/Recusado ({formatDate(c.platform_marketing_changed_at)})</span>
                      )}
                    </td>
                  </tr>
                ))}
                {consents.length === 0 && (
                  <tr><td colSpan={3}>Nenhum cliente para consultar consentimentos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Exportação de Clientes */}
      <section className={styles.tableCard}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Exportação de Clientes</h2>
            <p>Exportação manual em massa dos clientes e seus consentimentos vigentes em CSV ou JSON. Ação restrita a <code>platform_owner</code> com download imediato e registro de auditoria.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleRequestExport("csv")}
              disabled={exporting}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => handleRequestExport("json")}
              disabled={exporting}
            >
              Exportar JSON
            </button>
          </div>
        </div>

        {exportMessage && (
          <p style={{ color: "var(--sp-success, #1e7e34)", margin: "0 0 12px", fontWeight: 500 }}>
            {exportMessage}
          </p>
        )}
        {exportError && (
          <p style={{ color: "var(--sp-danger, #b3261e)", margin: "0 0 12px" }}>
            {exportError}
          </p>
        )}
      </section>

      {/* Diálogo de Confirmação de Exportação */}
      {exportFormat && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-export-title"
          className={styles.modalBackdrop}
        >
          <div className={styles.modalCard}>
            <h3 id="confirm-export-title">
              Confirmar exportação ({exportFormat.toUpperCase()})
            </h3>
            <p>
              Você está prestes a exportar os dados cadastrais e de consentimento vigentes dos clientes vinculados a <strong>{detail.name}</strong>.
            </p>
            <p className={styles.warningNote}>
              Aviso de auditoria: Esta ação gera imediatamente um registro na trilha privada de auditoria da plataforma. O download será iniciado imediatamente no navegador, sem envio por e-mail e sem retenção do arquivo no servidor.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleCancelExport}
                disabled={exporting}
                className={styles.signOut}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmExport()}
                disabled={exporting}
                className={styles.primaryButton}
              >
                {exporting ? "Gerando download…" : `Confirmar e Baixar ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Acordo Comercial */}
      {agreementModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="agreement-modal-title"
          className={styles.modalBackdrop}
        >
          <div className={styles.modalCard} style={{ maxWidth: "520px" }}>
            <h3 id="agreement-modal-title">
              {detail.commercial_agreement_active ? "Renovar Acordo Comercial" : "Reativar por Acordo Comercial"}
            </h3>
            <p>
              Reativação operacional temporária para <strong>{detail.name}</strong> mantendo intacto o histórico e eventuais débitos no Asaas.
            </p>

            <div style={{ display: "grid", gap: "14px", margin: "16px 0" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Período de ativação (dias):
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {[5, 6, 10, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAgreementDurationDays(d)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: agreementDurationDays === d ? "2px solid var(--sp-primary, #b34728)" : "1px solid var(--sp-line)",
                        background: agreementDurationDays === d ? "rgba(179, 71, 40, 0.1)" : "#fff",
                        fontWeight: agreementDurationDays === d ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {d} dias
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={agreementDurationDays}
                  onChange={(e) => setAgreementDurationDays(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--sp-line)" }}
                  placeholder="Número de dias (1 a 365)"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Motivo da reativação (obrigatório):
                </label>
                <input
                  type="text"
                  value={agreementReason}
                  onChange={(e) => setAgreementReason(e.target.value)}
                  placeholder="Ex: Negociação de dívida em andamento"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--sp-line)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Condição comercial acordada (obrigatório):
                </label>
                <textarea
                  rows={3}
                  value={agreementCondition}
                  onChange={(e) => setAgreementCondition(e.target.value)}
                  placeholder="Ex: Quitação das faturas vencidas em 2 parcelas via Pix"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--sp-line)", resize: "vertical" }}
                />
              </div>
            </div>

            <p className={styles.warningNote}>
              Aviso: Esta ação grava imediatamente um evento na trilha de auditoria e não exclui faturas do provedor financeiro. Ao final dos {agreementDurationDays} dias, se não houver renovação explícita, a barbearia retorna ao bloqueio operacional.
            </p>

            {agreementError && (
              <p style={{ color: "var(--sp-danger, #b3261e)", fontSize: "13px", margin: "0 0 14px" }}>
                {agreementError}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setAgreementModalOpen(false)}
                disabled={agreementSubmitting}
                className={styles.signOut}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAgreement()}
                disabled={agreementSubmitting}
                className={styles.primaryButton}
              >
                {agreementSubmitting ? "Gravando…" : "Confirmar Reativação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Suspensão */}
      {suspendModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="suspend-modal-title"
          className={styles.modalBackdrop}
        >
          <div className={styles.modalCard} style={{ maxWidth: "480px" }}>
            <h3 id="suspend-modal-title">
              Suspender Barbearia
            </h3>
            <p>
              Confirma a suspensão operacional imediata da barbearia <strong>{detail.name}</strong>?
            </p>

            <div style={{ margin: "16px 0" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                Motivo da suspensão (obrigatório):
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Ex: Não cumprimento do acordo comercial acordado"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--sp-line)", resize: "vertical" }}
              />
            </div>

            <p className={styles.warningNote}>
              Aviso: A barbearia será inativada e qualquer acordo comercial ativo será encerrado. Agendamentos públicos serão bloqueados. Ação gravada na auditoria.
            </p>

            {suspendError && (
              <p style={{ color: "var(--sp-danger, #b3261e)", fontSize: "13px", margin: "0 0 14px" }}>
                {suspendError}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                disabled={suspendSubmitting}
                className={styles.signOut}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSuspend()}
                disabled={suspendSubmitting}
                style={{
                  background: "var(--sp-danger, #b3261e)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--sp-radius-sm)",
                  padding: "10px 16px",
                  fontWeight: 600,
                  cursor: suspendSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {suspendSubmitting ? "Suspendendo…" : "Confirmar Suspensão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
