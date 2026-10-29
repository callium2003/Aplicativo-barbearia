"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";
import {
  loadPlatformBarbershopConsents,
  loadPlatformBarbershopCustomers,
  loadPlatformBarbershopDetail,
} from "@/utils/platform-administration.mjs";
import styles from "../platform.module.css";

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
  contract_status: "unavailable" | "trial" | "trial_ended" | "active" | "payment_attention" | "cancelled" | "ended";
  customer_count: number;
  active_professional_count: number;
  active_service_count: number;
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
        </div>
        <div className={styles.tableWrap}>
          <table>
            <tbody>
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
      <section className={styles.tableCard}>
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
    </main>
  );
}
