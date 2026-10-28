"use client";

import { supabase } from "@/utils/supabase";
import { loadPlatformAdministration } from "@/utils/platform-administration.mjs";
import { useCallback, useEffect, useState } from "react";
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
  contract_status: "unavailable" | "trial" | "trial_ended" | "active" | "payment_attention" | "cancelled" | "ended";
};

const contractLabel: Record<PlatformBarbershop["contract_status"], string> = {
  unavailable: "Não informado", trial: "Em teste", trial_ended: "Teste encerrado", active: "Ativo", payment_attention: "Atenção de pagamento", cancelled: "Cancelado", ended: "Encerrado",
};
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "—";

export default function PlatformPage() {
  const [barbershops, setBarbershops] = useState<PlatformBarbershop[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await loadPlatformAdministration(supabase);
      if (result.status === "unauthenticated") { window.location.replace("/plataforma/entrar"); return; }
      if (result.status === "forbidden") { setState("denied"); return; }
      setBarbershops(result.barbershops as PlatformBarbershop[]); setState("ready");
    } catch {
      setState("failed");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function signOut() { await supabase.auth.signOut(); window.location.replace("/plataforma/entrar"); }

  if (state === "loading") return <main className={styles.centered}><p>Verificando acesso interno…</p></main>;
  if (state === "denied") return <main className={styles.centered}><section className={styles.denied}><p className={styles.eyebrow}>CullenTech</p><h1>Acesso interno não autorizado</h1><p>Esta identidade não possui permissão para administrar a plataforma.</p><button onClick={() => void signOut()}>Sair</button></section></main>;
  if (state === "failed") return <main className={styles.centered}><p>Não foi possível carregar o resumo agora.</p></main>;

  return <main className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>CullenTech</p><h1>Administração da plataforma</h1><p>Resumo operacional das barbearias cadastradas.</p></div><button className={styles.signOut} onClick={() => void signOut()}>Sair</button></header>
    <section className={styles.summary} aria-label="Resumo cadastral"><div><strong>{barbershops.length}</strong><span>barbearias cadastradas</span></div><div><strong>{barbershops.filter((shop) => shop.registration_status === "active").length}</strong><span>cadastros ativos</span></div><div><strong>{barbershops.filter((shop) => shop.contract_status === "trial").length}</strong><span>em período de teste</span></div></section>
    <section className={styles.tableCard}><div className={styles.sectionHead}><div><h2>Barbearias</h2><p>Dados mínimos para acompanhamento contratual. Esta área é somente leitura.</p></div><button onClick={() => void load()}>Atualizar</button></div><div className={styles.tableWrap}><table><thead><tr><th>Barbearia</th><th>Cadastro</th><th>Contrato</th><th>Plano</th><th>Fim do teste</th><th>Vigência</th></tr></thead><tbody>{barbershops.map((shop) => <tr key={shop.barbershop_id}><td><strong>{shop.name}</strong><small>/{shop.slug}</small></td><td>{shop.registration_status === "active" ? "Ativo" : "Inativo"}</td><td>{contractLabel[shop.contract_status]}</td><td>{shop.plan_code ?? "—"}</td><td>{formatDate(shop.trial_ends_at)}</td><td>{formatDate(shop.current_period_ends_at)}</td></tr>)}{barbershops.length === 0 && <tr><td colSpan={6}>Nenhuma barbearia cadastrada.</td></tr>}</tbody></table></div></section>
  </main>;
}
