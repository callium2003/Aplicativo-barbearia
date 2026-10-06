"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildOperationalExport, makeOperationalExportFilename, type OperationalExportPayload } from "@/utils/operational-export";
import { supabase } from "@/utils/supabase";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

type OffboardingState = { status: "deactivated" | "export_confirmed" | "ready_for_auth_deletion" | "completed"; eligible_at: string | null; eligible: boolean };

function hasRecentAuthentication(accessToken: string) {
  try {
    const encoded = accessToken.split(".")[1];
    if (!encoded) return false;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as {
      iat?: number; amr?: Array<{ method?: string; timestamp?: number }>;
    };
    const limit = Math.floor(Date.now() / 1000) - 15 * 60;
    return Number.isInteger(payload.iat) && (payload.iat || 0) >= limit
      && payload.amr?.some((method) => method.method !== "token_refresh" && (method.timestamp || 0) >= limit) === true;
  } catch {
    return false;
  }
}

export default function DadosPage() {
  const { role } = useSubscriptionData();
  const [exporting, setExporting] = useState(false);
  const [offboarding, setOffboarding] = useState<OffboardingState | null>(null);
  const [offboardingBusy, setOffboardingBusy] = useState(false);
  const [offboardingConfirmation, setOffboardingConfirmation] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [message, setMessage] = useState("");
  const [offboardingMessage, setOffboardingMessage] = useState("");

  useEffect(() => {
    if (role !== "owner") return;
    let alive = true;
    void supabase.functions.invoke("offboard-owner-account", { body: { action: "status" } })
      .then(({ data, error }) => {
        if (alive && !error) setOffboarding((data?.state || null) as OffboardingState | null);
      });
    return () => { alive = false; };
  }, [role]);

  async function runOffboarding(action: "start" | "confirm_export" | "finalize") {
    setOffboardingBusy(true);
    setOffboardingMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !hasRecentAuthentication(session.access_token)) {
        setOffboardingMessage("Por segurança, saia e entre novamente antes de continuar o encerramento.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("offboard-owner-account", { body: { action } });
      if (error || !data || data.code !== "ok" && data.code !== "completed") {
        setOffboardingMessage(data?.code === "retention_period_active"
          ? "O prazo de retenção ainda não terminou. Seus dados permanecem protegidos até a data indicada."
          : "Não foi possível concluir esta etapa. Tente novamente ou contate o suporte.");
        return;
      }
      if (action === "finalize") {
        window.location.replace("/");
        return;
      }
      setOffboarding(data.state as OffboardingState);
      setOffboardingConfirmation(false);
      setOffboardingMessage(action === "start"
        ? "Barbearia desativada. Baixe seus dados antes de confirmar a exportação."
        : "Exportação confirmada. A anonimização poderá começar após o prazo de retenção indicado.");
    } catch {
      setOffboardingMessage("Não foi possível concluir esta etapa. Tente novamente.");
    } finally {
      setOffboardingBusy(false);
    }
  }

  async function downloadOperationalData() {
    setExporting(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !hasRecentAuthentication(session.access_token)) {
        setMessage("Por segurança, saia e entre novamente antes de gerar este arquivo.");
        return;
      }
      const { data, error } = await supabase.rpc("export_my_barbershop_operational_data");
      if (error || !data) throw error || new Error("empty_export");

      const payload = data as OperationalExportPayload;
      const archive = await buildOperationalExport(payload);
      const downloadBytes = new Uint8Array(archive.bytes.length);
      downloadBytes.set(archive.bytes);
      const blob = new Blob([downloadBytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = makeOperationalExportFilename(payload);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDownloaded(true);
      setMessage("Arquivo gerado e baixado neste dispositivo.");
    } catch {
      setMessage("Não foi possível gerar o arquivo agora. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }

  return <div className={styles.stack}>
    <section className={styles.card}>
      <p className="product-eyebrow">DADOS DA BARBEARIA</p><h2>Exportação e privacidade</h2>
      <p>Gere um arquivo com os registros da sua operação durante o período de vigência do contrato.</p>
      <button type="button" className="product-button" disabled={exporting} onClick={() => void downloadOperationalData()}>{exporting ? "Gerando arquivo…" : "Gerar e baixar arquivo"}</button>
      {message && <p className={styles.note} role="status">{message}</p>}
      <p className={styles.note}>O download é imediato e não fica armazenado pela plataforma. O ZIP contém uma planilha Excel e um JSON com o mesmo conteúdo. Por segurança, ele não inclui credenciais de acesso, sessões, convites, dados de outras barbearias nem registros técnicos internos.</p>
    </section>
    {role === "owner" && <section className={styles.card} aria-labelledby="owner-offboarding-title">
      <p className="product-eyebrow">ENCERRAMENTO</p>
      <h2 id="owner-offboarding-title">Encerrar a conta da barbearia</h2>
      {!offboarding && <>
        <p>Ao iniciar, a página pública e os acessos da equipe são desativados. Seus dados continuam disponíveis para exportação. A anonimização do proprietário e a exclusão do acesso só poderão ocorrer a partir do 60º dia após o fim efetivo da assinatura.</p>
        {!offboardingConfirmation
          ? <button type="button" className="product-button secondary" disabled={offboardingBusy} onClick={() => setOffboardingConfirmation(true)}>Iniciar encerramento</button>
          : <div>
              <p>Confirma a desativação da barbearia e dos acessos da equipe?</p>
              <button type="button" className="product-button" disabled={offboardingBusy} onClick={() => void runOffboarding("start")}>Sim, desativar barbearia</button>{" "}
              <button type="button" className="product-button secondary" disabled={offboardingBusy} onClick={() => setOffboardingConfirmation(false)}>Voltar</button>
            </div>}
      </>}
      {offboarding?.status === "deactivated" && <>
        <p>Baixe o arquivo acima. Depois confirme que recebeu o download para registrar esta etapa.</p>
        <button type="button" className="product-button secondary" disabled={!downloaded || offboardingBusy} onClick={() => void runOffboarding("confirm_export")}>Confirmei o download dos meus dados</button>
      </>}
      {(offboarding?.status === "export_confirmed" || offboarding?.status === "ready_for_auth_deletion") && <>
        <p>{offboarding.eligible_at
          ? `A anonimização e exclusão da identidade poderão ser solicitadas a partir de ${new Date(offboarding.eligible_at).toLocaleDateString("pt-BR")}.`
          : "Ainda não há uma data de fim efetivo da assinatura confirmada; a exclusão permanece suspensa."}</p>
        <p>Quando chegar a data, entre novamente e conclua o encerramento. Os registros operacionais necessários serão preservados sem seus dados pessoais.</p>
        <button type="button" className="product-button" disabled={offboardingBusy || !offboarding.eligible} onClick={() => void runOffboarding("finalize")}>Concluir encerramento da conta</button>
        <p className={styles.note}>Se a conclusão for interrompida, <Link href="/encerramento-conta">retome o pedido de encerramento</Link> com a mesma conta.</p>
      </>}
      {offboardingMessage && <p className={styles.note} role="status">{offboardingMessage}</p>}
    </section>}
  </div>;
}
