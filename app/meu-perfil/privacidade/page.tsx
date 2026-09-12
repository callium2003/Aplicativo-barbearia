"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { customerSupabase as supabase } from "@/utils/supabase";
import { CustomerBottomNavigation } from "@/app/customer-bottom-navigation";

type PrivacyRequest = {
  id: string;
  public_protocol: string;
  request_type: "DATA_EXPORT" | "ACCOUNT_DELETION";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED";
  requested_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

type PendingCustomerDeletion = {
  userId: string;
  requestedAt: number;
};

const pendingCustomerDeletionKey = "barbeariasp.pending-customer-deletion";
const pendingCustomerDeletionMaxAgeMs = 15 * 60 * 1000;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function parseJwtPayload(token: string) {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as {
      iat?: number;
      amr?: Array<{ method?: string; timestamp?: number }>;
    };
  } catch {
    return null;
  }
}

function hasRecentAuthentication(token: string) {
  const payload = parseJwtPayload(token);
  const limit = Math.floor(Date.now() / 1000) - 15 * 60;
  return Boolean(
    payload
      && Number.isInteger(payload.iat)
      && (payload.iat || 0) >= limit
      && payload.amr?.some((method) => method.method !== "token_refresh" && (method.timestamp || 0) >= limit),
  );
}

function requestTypeLabel(type: PrivacyRequest["request_type"]) {
  return type === "DATA_EXPORT" ? "Exportação de dados" : "Encerramento de conta";
}

function requestStatusLabel(status: PrivacyRequest["status"]) {
  return {
    PENDING: "Em análise",
    PROCESSING: "Em andamento",
    COMPLETED: "Concluído",
    REJECTED: "Não concluído",
    CANCELLED: "Cancelado",
  }[status];
}

export default function MeuPerfilPrivacidadePage() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [message, setMessage] = useState("Carregando sua área de privacidade...");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeletionConfirmation, setShowDeletionConfirmation] = useState(false);

  async function loadRequests() {
    const { data, error } = await supabase
      .from("customer_privacy_requests")
      .select("id,public_protocol,request_type,status,requested_at,completed_at,cancelled_at")
      .order("requested_at", { ascending: false });
    if (error) {
      setMessage("Não foi possível consultar seus protocolos. (código: operation_failed)");
      return;
    }
    setRequests((data || []) as PrivacyRequest[]);
    setMessage("");
  }

  async function deleteAccount() {
    setDeleting(true);
    setMessage("");
    const { data, error } = await supabase.functions.invoke("delete-my-customer-account");
    setDeleting(false);
    if (error || !data || data.status !== "completed") {
      setMessage("Não foi possível concluir o encerramento. (código: operation_failed)");
      return;
    }

    setMessage("Conta cancelada conforme sua solicitação. Caso deseje retornar, será preciso fazer um novo cadastro.");
    await supabase.auth.signOut({ scope: "local" });
    window.setTimeout(() => window.location.replace("/"), 2600);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.replace("/cliente/entrar?returnTo=%2Fmeu-perfil%2Fprivacidade");
        return;
      }
      const pendingRaw = window.sessionStorage.getItem(pendingCustomerDeletionKey);
      if (pendingRaw) {
        window.sessionStorage.removeItem(pendingCustomerDeletionKey);
        try {
          const pending = JSON.parse(pendingRaw) as PendingCustomerDeletion;
          const isValidRequest = pending.userId === session.user.id
            && Date.now() - pending.requestedAt <= pendingCustomerDeletionMaxAgeMs
            && hasRecentAuthentication(session.access_token);
          if (isValidRequest) {
            await deleteAccount();
            return;
          }
        } catch {
          // A intenção incompleta nunca autoriza o encerramento.
        }
      }
      if (active) await loadRequests();
    }
    void load();
    return () => { active = false; };
  }, []);

  async function downloadExport() {
    setExporting(true);
    setMessage("");
    const { data, error } = await supabase.rpc("export_my_customer_data");
    setExporting(false);
    if (error || !data) {
      setMessage("Não foi possível gerar sua exportação. (código: operation_failed)");
      return;
    }

    const exportData = data as { protocol?: string };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meus-dados-barbeariasp.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`Exportação concluída. Protocolo: ${exportData.protocol || "registrado"}.`);
    await loadRequests();
  }

  async function confirmAccountDeletion() {
    setShowDeletionConfirmation(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !hasRecentAuthentication(session.access_token)) {
      if (session?.user) {
        const pending: PendingCustomerDeletion = { userId: session.user.id, requestedAt: Date.now() };
        window.sessionStorage.setItem(pendingCustomerDeletionKey, JSON.stringify(pending));
      }
      setMessage("Confirme novamente seu acesso para continuar o encerramento da conta.");
      window.location.replace("/cliente/entrar?reauth=1&returnTo=%2Fmeu-perfil%2Fprivacidade");
      return;
    }
    await deleteAccount();
  }

  return (
    <main className="customer-shell customer-privacy-shell">
      <div className="customer-editorial-cover customer-privacy-cover">
        <Image
          src="/barbeariasp-institutional-hero.png"
          alt="Interior de uma barbearia"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1180px"
        />
        <div className="customer-editorial-cover-shade" />
      </div>

      <header className="customer-topbar customer-privacy-topbar">
        <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
        <Link className="customer-button secondary" href="/meu-perfil">Voltar ao perfil</Link>
      </header>

      <div className="customer-content customer-privacy-content">
        <div className="customer-page-head customer-privacy-heading">
          <div>
            <p className="customer-eyebrow">Área do cliente</p>
            <h1 className="customer-title">Privacidade e meus dados</h1>
            <p className="customer-subtitle">Consulte e baixe uma cópia dos seus dados ou encerre sua conta.</p>
          </div>
        </div>

        {message && <p className={`customer-message ${message.includes("concluída") || message.includes("encerrada") || message.includes("cancelada") ? "success" : "error"}`} role="status">{message}</p>}

        <section className="customer-privacy-summary" aria-labelledby="customer-privacy-summary-title">
          <h2 id="customer-privacy-summary-title">Resumo dos seus dados</h2>
          <div className="customer-privacy-summary-list">
            <article className="customer-privacy-summary-item">
              <h3>Perfil</h3>
              <p>Dados pessoais e de contato cadastrados.</p>
            </article>
            <article className="customer-privacy-summary-item">
              <h3>Agendamentos</h3>
              <p>Histórico de atendimentos, serviços, horários e status.</p>
            </article>
            <article className="customer-privacy-summary-item">
              <h3>Relacionamentos com barbearias</h3>
              <p>Barbearias vinculadas e profissionais relacionados aos seus atendimentos.</p>
            </article>
            <article className="customer-privacy-summary-item">
              <h3>Preferências de comunicação</h3>
              <p>Canais, tipos de mensagem e permissões opcionais.</p>
            </article>
          </div>
          <button className="customer-button secondary customer-privacy-export" type="button" disabled={exporting} onClick={() => void downloadExport()}>
            {exporting ? "Gerando arquivo..." : "Baixar meus dados em JSON"}
          </button>
        </section>

        <section className="customer-privacy-protocols" aria-labelledby="customer-privacy-protocols-title">
          <div className="customer-privacy-section-head">
            <div>
              <p className="customer-eyebrow">ACOMPANHAMENTO</p>
              <h2 id="customer-privacy-protocols-title">Protocolos de solicitações</h2>
            </div>
          </div>
          {!requests.length ? <p className="customer-privacy-empty">Nenhuma solicitação registrada nesta conta.</p> : (
            <div className="customer-privacy-protocol-list">
              {requests.map((request) => (
                <article className="customer-privacy-protocol" key={request.id}>
                  <div>
                    <h3>{requestTypeLabel(request.request_type)}</h3>
                    <p>Solicitado em {formatDate(request.requested_at)}</p>
                    <small>Protocolo: {request.public_protocol}</small>
                  </div>
                  <span className={`customer-privacy-protocol-status ${request.status.toLowerCase()}`}>
                    {requestStatusLabel(request.status)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="customer-privacy-danger" aria-labelledby="customer-privacy-danger-title">
          <h2 id="customer-privacy-danger-title">Encerrar conta</h2>
          <p>Para sua segurança, você precisará entrar novamente antes de confirmar.</p>
          <p>Ao encerrar sua conta, seus dados pessoais serão apagados ou mantidos sem identificação, quando necessário.</p>
          <button className="customer-button secondary customer-privacy-delete" type="button" disabled={deleting} onClick={() => setShowDeletionConfirmation(true)}>
            {deleting ? "Encerrando conta..." : "Encerrar conta"}
          </button>
          <Link className="customer-button secondary customer-privacy-back" href="/meu-perfil">Voltar ao perfil</Link>
          {showDeletionConfirmation && (
            <section className="customer-privacy-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="customer-deletion-confirmation-title">
              <h3 id="customer-deletion-confirmation-title">Confirmar encerramento</h3>
              <p>Tem certeza que deseja encerrar sua conta no BarbeariaSP? Todos os seus dados serão removidos e você não terá mais acesso às suas agendas.</p>
              <div className="customer-privacy-confirmation-actions">
                <button className="customer-button secondary" type="button" onClick={() => window.location.replace("/meu-perfil")}>Não, voltar ao perfil</button>
                <button className="customer-button customer-privacy-confirm" type="button" onClick={() => void confirmAccountDeletion()}>Sim, encerrar conta</button>
              </div>
            </section>
          )}
        </section>
      </div>

      <CustomerBottomNavigation active="perfil" />
    </main>
  );
}
