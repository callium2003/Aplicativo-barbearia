"use client";

import Link from "next/link";
import { useSubscriptionData } from "../SubscriptionContext";
import styles from "../subscription.module.css";

export default function DadosPage() {
  const { href } = useSubscriptionData();
  return <div className={styles.grid}>
    <section className={styles.card}>
      <p className="product-eyebrow">DADOS DA BARBEARIA</p><h2>Exportação e privacidade</h2>
      <p>O responsável autorizado poderá solicitar um arquivo estruturado com os dados da barbearia, respeitando permissões e isolamento entre estabelecimentos.</p>
      <ul><li>Inclui histórico associado a profissionais inativos.</li><li>Não inclui senhas, segredos, dados de cartão ou informações de outra barbearia.</li><li>O arquivo terá data de geração e validade curta para download.</li></ul>
      <button type="button" className="product-button" disabled>Exportação em preparação</button>
      <div className={styles.actions}><Link className="product-button secondary" href="/painel/configurar#dados-cadastrais">Revisar dados cadastrais</Link></div>
    </section>
    <section className={styles.card}>
      <p className="product-eyebrow">APÓS O TÉRMINO</p><h2>Entenda os prazos</h2>
      <ol className={styles.timeline}>
        <li><span>3</span><div><b>Primeiros três dias</b><p>Compromissos existentes, regularização e exportação. Novas reservas ficam indisponíveis.</p></div></li>
        <li><span>15</span><div><b>Até quinze dias</b><p>Assinatura, conta, privacidade, regularização e exportação continuam disponíveis.</p></div></li>
        <li><span>59</span><div><b>Do dia 16 ao 59</b><p>Dados operacionais preservados, sem consulta comum. A reativação permanece possível.</p></div></li>
        <li><span>60</span><div><b>A partir de sessenta dias</b><p>Dados operacionais e pessoais tornam-se elegíveis para eliminação ou anonimização, ressalvadas retenções legais.</p></div></li>
      </ol>
      <p className={styles.note}>Esses prazos começam no término efetivo do acesso quando não existe uma nova vigência válida. A eliminação precisa ser confirmada pelo processo auditável do sistema.</p>
      <Link className="product-button secondary" href={href("planos")}>Ver opções de reativação</Link>
    </section>
  </div>;
}
