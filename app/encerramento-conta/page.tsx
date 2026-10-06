"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

type State = { status: string; eligible_at: string | null; eligible: boolean };

export default function EncerramentoContaPage() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.functions.invoke("offboard-owner-account", { body: { action: "status" } })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setMessage("Entre novamente para consultar o encerramento da conta.");
        else setState((data?.state || null) as State | null);
      })
      .catch(() => { if (alive) setMessage("Não foi possível consultar o encerramento agora."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function finalize() {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("offboard-owner-account", { body: { action: "finalize" } });
      if (error || data?.code !== "completed") {
        setMessage(data?.code === "recent_authentication_required"
          ? "Por segurança, saia e entre novamente antes de concluir."
          : "Não foi possível concluir agora. Seu pedido foi preservado; tente novamente ou contate o suporte.");
        return;
      }
      window.location.replace("/");
    } catch {
      setMessage("Não foi possível concluir agora. Seu pedido foi preservado; tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="product-shell"><div className="product-content">
    <div className="product-page-head"><div>
      <p className="product-eyebrow">BARBEARIASP</p>
      <h1 className="product-title">Encerramento da conta</h1>
      <p className="product-subtitle">Acompanhe a etapa final do encerramento da sua barbearia.</p>
    </div></div>
    {loading ? <p role="status">Consultando sua solicitação…</p> : !state ? <p>Nenhum encerramento de barbearia está vinculado a esta conta.</p> : <section className="configuration-card">
      <h2>{state.status === "ready_for_auth_deletion" ? "Concluir exclusão do acesso" : "Aguardando prazo de retenção"}</h2>
      <p>{state.eligible_at
        ? `A anonimização e a exclusão da identidade poderão ocorrer a partir de ${new Date(state.eligible_at).toLocaleDateString("pt-BR")}.`
        : "O fim efetivo da assinatura ainda não foi determinado. A exclusão permanece suspensa."}</p>
      {state.status === "deactivated" && <p>Volte à exportação de dados e confirme o download antes de concluir.</p>}
      {(state.status === "export_confirmed" || state.status === "ready_for_auth_deletion") && <button type="button" className="product-button" disabled={busy || !state.eligible} onClick={() => void finalize()}>{busy ? "Concluindo…" : "Concluir encerramento"}</button>}
    </section>}
    {message && <p role="status">{message}</p>}
    <p><Link href="/entrar">Entrar novamente</Link></p>
  </div></main>;
}
