"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";

type PrivacyRequest = {
  id: string;
  public_protocol: string;
  request_type: "DATA_EXPORT" | "ACCOUNT_DELETION";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED";
  requested_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

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

export default function MeuPerfilPrivacidadePage() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [message, setMessage] = useState("Carregando sua área de privacidade...");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionAcknowledged, setDeletionAcknowledged] = useState(false);

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

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace("/cliente/entrar?returnTo=%2Fmeu-perfil%2Fprivacidade");
        return;
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

  async function requestAccountDeletion() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !hasRecentAuthentication(session.access_token)) {
      window.location.replace("/cliente/entrar?reauth=1&returnTo=%2Fmeu-perfil%2Fprivacidade");
      return;
    }
    if (!deletionAcknowledged) return;
    if (!window.confirm("Esta ação não poderá ser desfeita. Deseja excluir sua conta agora?")) return;

    setDeleting(true);
    setMessage("");
    const { data, error } = await supabase.functions.invoke("delete-my-customer-account");
    setDeleting(false);
    if (error || !data || data.status !== "completed") {
      setMessage("Não foi possível concluir o encerramento. (código: operation_failed)");
      return;
    }

    setMessage(`Conta encerrada. Protocolo: ${data.protocol || "registrado"}.`);
    await supabase.auth.signOut({ scope: "local" });
    window.setTimeout(() => window.location.replace("/"), 1600);
  }

  return (
    <main className="customer-shell">
      <header className="customer-topbar">
        <Link className="customer-brand" href="/">BARBEARIA<span>SP</span></Link>
        <Link className="customer-button secondary" href="/meu-perfil">Voltar ao perfil</Link>
      </header>

      <div className="customer-content" style={{ maxWidth: 760 }}>
        <div className="customer-page-head">
          <div>
            <p className="customer-eyebrow">Área do cliente</p>
            <h1 className="customer-title">Privacidade e seus dados</h1>
            <p className="customer-subtitle">Consulte os dados tratados e exerça seus direitos pela sua conta autenticada.</p>
          </div>
        </div>

        {message && <p className={`customer-message ${message.includes("concluída") || message.includes("encerrada") ? "success" : "error"}`} role="status">{message}</p>}

        <section className="customer-card pad">
          <h2>Resumo dos seus dados</h2>
          <ul style={{ display: "grid", gap: 8, paddingLeft: 20, lineHeight: 1.55 }}>
            <li>Perfil da conta: nome, e-mail e telefone.</li>
            <li>Agendamentos: data, serviço, profissional, status e valores registrados.</li>
            <li>Relacionamento: barbearias vinculadas e preferências de comunicação.</li>
          </ul>
          <p>Observações internas, auditorias, dados de funcionários, comissões e segredos não fazem parte da sua exportação.</p>
          <button className="customer-button" type="button" disabled={exporting} onClick={() => void downloadExport()}>
            {exporting ? "Gerando arquivo..." : "Baixar meus dados em JSON"}
          </button>
        </section>

        <section className="customer-card pad" style={{ marginTop: 18 }}>
          <h2>Protocolos de solicitações</h2>
          {!requests.length ? <p>Nenhuma solicitação registrada nesta conta.</p> : (
            <div style={{ display: "grid", gap: 12 }}>
              {requests.map((request) => (
                <article key={request.id} style={{ borderTop: "1px solid #e7e3db", paddingTop: 12 }}>
                  <b>{request.request_type === "DATA_EXPORT" ? "Exportação de dados" : "Encerramento de conta"}</b>
                  <br />
                  <small>Protocolo {request.public_protocol} · {request.status} · solicitado em {formatDate(request.requested_at)}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="customer-card pad" style={{ marginTop: 18 }}>
          <h2>Encerrar conta</h2>
          <p>Esta ação não poderá ser desfeita. Você precisará entrar novamente antes da confirmação final.</p>
          <ul style={{ display: "grid", gap: 8, paddingLeft: 20, lineHeight: 1.55 }}>
            <li>Seu perfil, acesso, vínculos, preferências, notificações e demais dados pessoais serão removidos.</li>
            <li>Seus agendamentos futuros serão excluídos e os horários voltarão a ficar disponíveis.</li>
            <li>Agendamentos concluídos serão mantidos sem sua identificação, somente como histórico da barbearia com data e serviço realizado.</li>
          </ul>
          <label className="customer-consent-row" style={{ marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={deletionAcknowledged}
              disabled={deleting}
              onChange={(event) => setDeletionAcknowledged(event.target.checked)}
            />
            <span>Li, entendi os efeitos e quero prosseguir com a exclusão da conta.</span>
          </label>
          <button className="customer-button secondary" type="button" disabled={deleting || !deletionAcknowledged} onClick={() => void requestAccountDeletion()}>
            {deleting ? "Excluindo conta..." : "Excluir minha conta"}
          </button>
        </section>
      </div>
    </main>
  );
}
