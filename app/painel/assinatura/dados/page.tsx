"use client";

import styles from "../subscription.module.css";

export default function DadosPage() {
  return <div className={styles.stack}>
    <section className={styles.card}>
      <p className="product-eyebrow">DADOS DA BARBEARIA</p><h2>Exportação e privacidade</h2>
      <p>Solicite um arquivo estruturado dos dados operacionais autorizados da sua barbearia, como agenda, clientes, serviços, equipe, horários e configurações aplicáveis. O pedido respeitará permissões e o isolamento entre estabelecimentos.</p>
      <button type="button" className="product-button" disabled>Solicitar arquivo em preparação</button>
      <p className={styles.note}>Esta seção trata do arquivo da operação da barbearia. Dados da conta, perfil público, sessão e preferências pessoais permanecem em suas respectivas áreas dentro de Mais. Quando a solicitação estiver disponível, a central mostrará a situação do arquivo e o prazo de download.</p>
    </section>
  </div>;
}
