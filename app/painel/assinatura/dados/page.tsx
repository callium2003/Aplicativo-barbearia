"use client";

import { useState } from "react";
import { buildOperationalExport, makeOperationalExportFilename, type OperationalExportPayload } from "@/utils/operational-export";
import { supabase } from "@/utils/supabase";
import styles from "../subscription.module.css";

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
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

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
  </div>;
}
