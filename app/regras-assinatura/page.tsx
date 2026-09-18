import Link from "next/link";
import type { Metadata } from "next";
import styles from "../privacidade/privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Regras de Assinatura e Contratação SaaS | BarbeariaSP",
  description: "Regras comerciais, planos, ciclo de vigência, cancelamento, reembolso e retenção de dados da assinatura SaaS da BarbeariaSP.",
};

export default function SubscriptionRulesPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <Link className={styles.brand} href="/">BARBEARIA<span>SP</span></Link>
        <p className={styles.eyebrow}>Contrato e políticas comerciais SaaS B2B</p>
        <h1 className={styles.title}>Regras de Assinatura e Contratação SaaS</h1>
        <p className={styles.updated}>Última atualização: 16 de setembro de 2026</p>

        <p className={styles.intro}>
          O presente documento estabelece as regras comerciais, operacionais e jurídicas que regulam a contratação e o uso dos planos de assinatura de software da plataforma <strong>BarbeariaSP</strong>, operada pela pessoa jurídica inscrita no CNPJ sob o nº 39.299.793/0001-27, com sede na Rua Igaratinga, 137.
        </p>
        <p className={styles.intro}>
          Ao contratar qualquer um dos planos ou usufruir do período de avaliação gratuita, o estabelecimento parceiro (Barbearia Parceira) adere integralmente a estas Regras de Assinatura, bem como aos nossos <Link href="/termos">Termos de Uso</Link> e à nossa <Link href="/privacidade">Política de Privacidade</Link>.
        </p>

        <section className={styles.section}>
          <h2>1. Objeto da Licença e Natureza Jurídica</h2>
          <p>
            A contratação da assinatura confere à Barbearia Parceira uma <strong>licença temporária, não exclusiva, revogável e intransferível de uso de software como serviço (SaaS B2B)</strong>. O software compreende o sistema web de agendamento online, área pública da barbearia, painel administrativo de gestão, catálogo de serviços, controle de horários, cálculo de comissões de profissionais e relatórios gerenciais operacionais.
          </p>
          <p>
            A contratação da licença de software não transfere qualquer direito de propriedade intelectual, código-fonte ou patente da plataforma para a barbearia contratante.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Período de Avaliação Gratuita (Trial de 30 Dias)</h2>
          <p>
            A BarbeariaSP disponibiliza a novos estabelecimentos um período inicial de avaliação gratuita com o objetivo de permitir a experimentação prática de todos os recursos da plataforma:
          </p>
          <ul>
            <li><strong>Duração:</strong> O período de trial tem duração exata de <strong>30 (trinta) dias corridos</strong> a partir da criação do cadastro do estabelecimento;</li>
            <li><strong>Sem Cartão no Cadastro:</strong> Não é exigida a inclusão de dados de cartão de crédito ou compromisso financeiro para iniciar a avaliação gratuita;</li>
            <li><strong>Acesso Completo:</strong> Durante os 30 dias, a barbearia tem acesso integral a todas as ferramentas de agendamento, gestão de equipe e relatórios;</li>
            <li><strong>Sem Cobrança Surpresa:</strong> Encerrado o período de 30 dias sem que a barbearia realize ativamente a contratação de um plano pago, o sistema não efetuará nenhuma cobrança automática, iniciando-se as fases de carência e retenção descritas na Seção 6.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Planos de Assinatura, Preços e Formas de Pagamento</h2>
          <p>
            Os planos de assinatura são estruturados por períodos pré-determinados com valores totais fixos para o período contratado:
          </p>
          <ul>
            <li><strong>Plano Mensal:</strong> 1 mês de vigência · <strong>R$ 99,90</strong> à vista (1x no cartão ou meio equivalente);</li>
            <li><strong>Plano Trimestral:</strong> 3 meses de vigência · <strong>R$ 284,90</strong> total pelo período (em até 2x no cartão de crédito);</li>
            <li><strong>Plano Semestral:</strong> 6 meses de vigência · <strong>R$ 539,90</strong> total pelo período (em até 3x no cartão de crédito);</li>
            <li><strong>Plano Anual:</strong> 12 meses de vigência · <strong>R$ 999,00</strong> total pelo período (em até 4x no cartão de crédito);</li>
          </ul>
          <p>
            <strong>Regra de Parcelamento:</strong> O parcelamento no cartão de crédito é uma facilidade de liquidação financeira do valor total do período contratado. O pagamento parcelado não converte o plano em mensalidade recorrente nem amplia o tempo de vigência além do período contratado.
          </p>
          <p>
            <strong>Capacidade da Equipe:</strong> Todos os planos incluem até <strong>5 (cinco) profissionais ativos</strong> cadastrados simultaneamente na equipe da barbearia. Profissionais inativos não consomem a cota. Equipes com mais de 5 profissionais ativos operam mediante plano personalizado sob consulta.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Segurança no Processamento de Pagamentos</h2>
          <p>
            Para garantir a máxima proteção patrimonial e segurança da informação dos estabelecimentos parceiros:
          </p>
          <ul>
            <li>As transações financeiras e cobranças de assinatura são processadas por instituição de pagamento parceira autorizada pelo Banco Central do Brasil, operando em conformidade com as normas internacionais de segurança PCI-DSS;</li>
            <li><strong>A BarbeariaSP não armazena números de cartão de crédito, códigos de segurança (CVV) ou chaves privadas bancárias</strong> em seus bancos de dados e servidores;</li>
            <li>Notas fiscais eletrônicas de prestação de serviços (NFS-e) são emitidas e enviadas para o e-mail cadastrado do titular da barbearia após a confirmação bancária do pagamento.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Direito Legal de Arrependimento (Artigo 49 do CDC)</h2>
          <p>
            Na contratação inicial de qualquer plano pago, a Barbearia Parceira poderá exercer o direito legal de arrependimento no prazo de <strong>até 7 (sete) dias corridos</strong> a contar da confirmação do primeiro pagamento ou contratação.
          </p>
          <p>
            Exercido tempestivamente o direito de arrependimento via painel administrativo ou por meio de solicitação ao suporte, a assinatura será encerrada e o valor integralmente pago será restituído através do mesmo método de pagamento utilizado na compra, sem qualquer retenção ou multa.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Cancelamento, Não Renovação e Reembolso em Períodos Antecipados</h2>
          <p>
            A Barbearia Parceira possui total autonomia para gerenciar a vigência de sua assinatura:
          </p>
          <ul>
            <li><strong>Cancelamento sem Renovação:</strong> O gestor pode optar pela não renovação do plano a qualquer momento pelo painel em <em>Assinatura &gt; Cancelar Plano</em>. Nesse caso, o acesso a todos os recursos permanece plenamente ativo até o último dia da vigência paga contratada (<code>access_ends_at</code>);</li>
            <li><strong>Rescisão Antecipada com Devolução:</strong> Em caso de solicitação de encerramento antecipado com devolução de valores antes do término da vigência (fora do prazo de 7 dias de arrependimento), o estorno observará o cálculo proporcional estrito aos meses integrais futuros ainda não iniciados nem usufruídos, deduzidas as tarifas operacionais transacionais do meio de pagamento;</li>
            <li>Não há aplicação de multas punitivas leoninas ou cláusulas de fidelidade forçada que impeçam a saída do estabelecimento parceiro.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Ciclo de Desativação e Retenção de Dados Pós-Vigência</h2>
          <p>
            Encerrada a vigência paga ou o período de testes sem renovação, a plataforma adota um protocolo seguro e transparente de fases de desativação (conforme a Seção 44 da Especificação Funcional do Produto):
          </p>
          <ul>
            <li>
              <strong>Fase 1 — Carência Operacional (Dias 1 a 5 pós-término):</strong> Tolerância operacional para que a barbearia possa cumprir os atendimentos presenciais que já estavam previamente marcados na agenda. Durante esses 5 dias, a criação de novas reservas públicas externas fica suspensa;
            </li>
            <li>
              <strong>Fase 2 — Suspensão Pública e Janela de Exportação (Dias 6 a 15 pós-término):</strong> A página pública de agendamento da barbearia é desativada. O acesso administrativo do proprietário permanece liberado exclusivamente para consulta histórica e exportação integral de dados operacionais e relatórios;
            </li>
            <li>
              <strong>Fase 3 — Congelamento Seguro (Dias 16 a 59 pós-término):</strong> Os dados do estabelecimento permanecem congelados e protegidos em ambiente seguro, sem acesso externo. Caso a barbearia deseje reativar o serviço nesse período, os dados cadastrais, profissionais e catálogo de serviços serão prontamente restaurados;
            </li>
            <li>
              <strong>Fase 4 — Expurgo ou Anonimização (A partir do 60º dia):</strong> Dados pessoais e operacionais que não precisem ser mantidos passam pelo ciclo de expurgo ou anonimização. Registros fiscais seguem o prazo legal aplicável; quando houver necessidade operacional legítima, como relatórios, comissões, cancelamentos e não comparecimentos, o histórico poderá ser preservado somente como registro anonimizado, sem identificar clientes.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. Portabilidade e Exportação de Dados da Barbearia</h2>
          <p>
            Em conformidade com as boas práticas de software livre de lock-in, é assegurado à Barbearia Parceira o direito de <strong>exportar a totalidade dos seus dados operacionais</strong> a qualquer momento durante a vigência ativa do contrato e durante a Fase 2 pós-término:
          </p>
          <ul>
            <li>A exportação abrange a base de clientes atendidos, histórico de agendamentos, serviços cadastrados, equipe de profissionais e relatórios de comissões;</li>
            <li>Os arquivos são gerados em formato aberto, legível e interoperável (como JSON e CSV), garantindo a liberdade e a soberania do estabelecimento sobre suas informações comerciais.</li>
            <li>A Barbearia poderá exportar os dados operacionais disponíveis antes do encerramento definitivo. Após o prazo de retenção, os dados pessoais poderão ser eliminados ou anonimizados e não poderão ser recuperados pela plataforma.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. Níveis de Serviço (SLA) e Disponibilidade</h2>
          <p>
            A BarbeariaSP emprega esforços comercialmente razoáveis para assegurar que a plataforma opere com alta disponibilidade (meta de 99,5% de uptime nos serviços de agendamento). Não se computam no cálculo de disponibilidade as manutenções preventivas programadas (comunicadas com antecedência e executadas preferencialmente em horários de menor fluxo) e interrupções decorrentes de falhas gerais de infraestrutura de telecomunicações ou internet externa.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Canais de Suporte e Atendimento ao Assinante</h2>
          <p>
            Para esclarecimentos sobre faturamento, upgrade ou downgrade de planos, solicitação de suporte técnico ou emissão de notas fiscais, o assinante conta com os seguintes canais dedicados:
          </p>
          <ul>
            <li><strong>E-mail de Suporte:</strong> <a href="mailto:contato@cullentech.com.br">contato@cullentech.com.br</a></li>
            <li><strong>Horário de Atendimento:</strong> De segunda a sexta-feira, das 09h00 às 18h00 (horário de Brasília).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>11. Foro e Legislação Aplicável</h2>
          <p>
            As presentes Regras de Assinatura são regidas e interpretadas exclusivamente sob as leis da República Federativa do Brasil, em especial pela Lei nº 9.609/1998 (Lei do Software), Marco Civil da Internet (Lei nº 12.965/2014) e Código Civil Brasileiro, elegendo-se o foro da Comarca da Capital do Estado de São Paulo para dirimir qualquer controvérsia oriunda deste contrato.
          </p>
        </section>

        <p style={{ marginTop: 40, textAlign: "center" }}>
          <Link className={styles.back} href="/">← Voltar à página inicial</Link>
        </p>
      </article>
    </main>
  );
}
