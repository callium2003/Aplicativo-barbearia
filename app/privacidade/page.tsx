import Link from "next/link";
import type { Metadata } from "next";
import styles from "./privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados | BarbeariaSP",
  description: "Política de Privacidade, Proteção de Dados e Regras de Divulgação da plataforma BarbeariaSP em conformidade com a LGPD e o Código de Defesa do Consumidor.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <Link className={styles.brand} href="/">BARBEARIA<span>SP</span></Link>
        <p className={styles.eyebrow}>Privacidade, proteção de dados e transparência</p>
        <h1 className={styles.title}>Política de Privacidade e Proteção de Dados</h1>
        <p className={styles.updated}>Última atualização: 11 de setembro de 2026</p>

        <p className={styles.intro}>
          A BarbeariaSP, operada pela pessoa jurídica inscrita no CNPJ sob o nº 39.299.793/0001-27, com sede na Rua Igaratinga, 137, respeita a sua privacidade, preza pela transparência e assume o compromisso público de resguardar com máxima segurança os dados pessoais de todos os usuários de seus serviços digitais.
        </p>
        <p className={styles.intro}>
          Esta Política explica de maneira clara, acessível e objetiva quais dados são coletados, as finalidades de seu uso, as garantias contra abusos publicitários, as medidas de proteção aplicadas e os mecanismos pelos quais você pode exercer plenamente seus direitos, em estrita observância à Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD), à Lei nº 12.965/2014 (Marco Civil da Internet) e à Lei nº 8.078/1990 (Código de Defesa do Consumidor — CDC).
        </p>

        <section className={styles.section}>
          <h2>1. A quem esta Política se aplica e Papéis de Tratamento</h2>
          <p>Esta Política aplica-se aos diferentes públicos que interagem em nosso ecossistema:</p>
          <ul>
            <li>
              <strong>Clientes Finais (Consumidores):</strong> Indivíduos que utilizam a plataforma para localizar barbearias parceiras, consultar serviços, preços e horários, e efetuar ou gerenciar seus agendamentos de corte e cuidados pessoais. No contexto da prestação presencial do serviço, a barbearia parceira atua como <em>Controladora</em> dos dados operacionais do atendimento, e a BarbeariaSP atua como <em>Operadora</em> tecnológica da infraestrutura de agendamento e <em>Controladora</em> da conta unificada do cliente na plataforma.
            </li>
            <li>
              <strong>Barbearias e Profissionais Parceiros (B2B):</strong> Gestores, proprietários e profissionais que contratam a plataforma na modalidade de Software como Serviço (SaaS) para administração de suas agendas, equipe e relacionamento com seus clientes.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Dados Pessoais que Coletamos (Princípio da Minimização)</h2>
          <p>
            Coletamos estritamente os dados essenciais para viabilizar o agendamento e garantir a integridade da comunicação operacional:
          </p>
          
          <h3>A) Dados do Cliente Final</h3>
          <ul>
            <li><strong>Nome completo:</strong> Identificação do titular para recepção no estabelecimento parceiro;</li>
            <li><strong>Celular com WhatsApp:</strong> Canal prioritário para envio de confirmações imediatas de agendamento, lembretes de horário prévios e contato de emergência da barbearia parceira;</li>
            <li><strong>Endereço de e-mail:</strong> Autenticação segura sem senha (magic link) e envio de comprovantes e notificações essenciais da conta;</li>
            <li><strong>Histórico de agendamentos:</strong> Relação de serviços selecionados, profissional escolhido, barbearia, data, horário e situação da reserva (agendado, concluído ou cancelado).</li>
          </ul>

          <h3>B) Dados da Barbearia Parceira e Profissionais (SaaS B2B)</h3>
          <ul>
            <li>Dados cadastrais do estabelecimento: Razão social, nome fantasia, CNPJ, endereço completo, telefone e WhatsApp comercial;</li>
            <li>Dados dos profissionais da equipe: Nome, foto de perfil profissional para catálogo de atendimento, especialidades e escala de horários de trabalho.</li>
          </ul>

          <h3>C) Registros Técnicos de Acesso</h3>
          <p>
            Em cumprimento ao artigo 15 do Marco Civil da Internet (Lei nº 12.965/2014), coletamos dados técnicos obrigatórios de conexão: endereço IP, data, hora e porta lógica de acesso, armazenados sob sigilo absoluto em ambiente seguro pelo prazo legal de 6 (seis) meses para prevenção a fraudes e segurança cibernética.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Dados que NÃO Coletamos e Diretrizes de Pagamento</h2>
          <p>
            Para assegurar tranquilidade e reduzir riscos de segurança, estabelecemos limites rígidos de não coleta:
          </p>
          <ul>
            <li>
              <strong>Ausência Total de Dados Financeiros de Clientes Finais:</strong> A realização de agendamentos no aplicativo é gratuita. <strong>Não coletamos, não processamos e não armazenamos números de cartão de crédito, códigos de segurança (CVV) ou dados bancários de clientes.</strong> O pagamento pelo serviço de corte ou estética é realizado presencialmente, direto no balcão da barbearia parceira, pelo meio de pagamento acordado no momento do atendimento.
            </li>
            <li>
              <strong>Cobrança de Mensalidades da Barbearia (SaaS):</strong> A contratação e cobrança dos planos de assinatura das barbearias parceiras é operacionalizada integralmente por instituição de pagamento parceira autorizada pelo Banco Central do Brasil e em rigorosa conformidade com os padrões internacionais de segurança PCI-DSS. A BarbeariaSP não armazena dados de cartão em seus servidores.
            </li>
            <li>
              <strong>Dados Supérfluos ou Sensíveis:</strong> Não solicitamos data de nascimento, gênero, filiação política, orientação religiosa, dados biométricos ou documentos como CPF para a realização de agendamentos pelo cliente.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Agendamento para Dependentes e Menores de Idade</h2>
          <p>
            A plataforma BarbeariaSP é voltada a titulares civis plenamente capazes. Na hipótese de atendimento a crianças ou adolescentes (como cortes infantis), o agendamento e o fornecimento dos dados de contato devem ser realizados exclusivamente pelos pais ou responsáveis legais, em estrita conformidade com o artigo 14 da LGPD e no melhor interesse do menor.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Finalidades e Bases Legais do Tratamento</h2>
          <p>
            Todo tratamento de dados pessoais na BarbeariaSP está fundamentado em hipóteses legítimas previstas no artigo 7º da LGPD:
          </p>
          <ul>
            <li><strong>Execução de Contrato (Art. 7º, V):</strong> Efetivação do agendamento, alocação de horário com o profissional, envio de confirmações operacionais e autenticação do usuário;</li>
            <li><strong>Obrigação Legal ou Regulatória (Art. 7º, II):</strong> Manutenção de registros de acesso nos termos do Marco Civil da Internet e escrituração fiscal obrigatória das assinaturas B2B;</li>
            <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Segurança do sistema, auditoria de integridade, prevenção a fraudes de agendamentos simultâneos abusivos e aperfeiçoamento da estabilidade técnica;</li>
            <li><strong>Consentimento (Art. 7º, I):</strong> Envio de comunicações de divulgação, novidades e vantagens promocionais, mediante concessão livre, facultativa e revogável a qualquer momento.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Comunicações Operacionais versus Comunicações de Divulgação (Marketing)</h2>
          <p>
            Em respeito ao consumidor e em conformidade com as regras de publicidade do Código de Defesa do Consumidor (Art. 36 e 37 da Lei nº 8.078/1990) e com as diretrizes de privacidade, distinguimos expressamente dois tipos de mensagens:
          </p>

          <h3>A) Mensagens Operacionais e Transacionais (Essenciais)</h3>
          <p>
            São comunicações estritamente indispensáveis para viabilizar o atendimento agendado pelo cliente (base legal: Execução de Contrato):
          </p>
          <ul>
            <li>Confirmação em tempo real da solicitação e agendamento de horário;</li>
            <li>Lembretes automáticos prévios de horário (enviados com antecedência razoável para evitar no-show e facilitar o comparecimento);</li>
            <li>Links seguros de acesso à conta (magic link);</li>
            <li>Avisos de reagendamento, alteração ou cancelamento motivados por imprevistos da barbearia.</li>
          </ul>
          <p>
            Por sua natureza funcional, essas mensagens não contêm publicidade e não podem ser desativadas sem inviabilizar o próprio agendamento.
          </p>

          <h3>B) Comunicações de Divulgação e Promocionais (Opcionais)</h3>
          <p>
            Compreendem comunicados com ofertas, cupons de desconto, avisos de novos serviços, reengajamento de clientes ou novidades da plataforma. Estas comunicações obedecem às seguintes regras obrigatórias de divulgação:
          </p>
          <ul>
            <li><strong>Identificação Imediata do Emissor:</strong> Toda mensagem promocional identifica com clareza e destaque a barbearia remetente ou a plataforma BarbeariaSP, evitando qualquer dubiedade sobre sua origem;</li>
            <li><strong>Consentimento Facultativo e Específico:</strong> Você decide livremente se deseja receber novidades ao finalizar seu agendamento, sem que a recusa impeça ou prejudique a conclusão do serviço;</li>
            <li><strong>Direito ao Descadastramento Imediato e Gratuito (Opt-Out):</strong> Você pode interromper o recebimento de divulgações a qualquer instante, por qualquer um dos canais disponíveis:
              <ul>
                <li>No aplicativo: acessando a opção <em>Preferências de comunicação</em> ou em <em>Meu Perfil &gt; Privacidade</em> e desativando o recebimento de novidades;</li>
                <li>No WhatsApp promocional: respondendo à mensagem recebida com a palavra <strong>PARAR</strong> ou <strong>CANCELAR</strong>;</li>
                <li>No e-mail promocional: clicando no link de descadastro (unsubscribe) posicionado no rodapé da mensagem.</li>
              </ul>
            </li>
            <li><strong>Respeito aos Horários de Envio:</strong> Disparos de campanhas de divulgação são limitados ao horário comercial e diurno, respeitando os horários de repouso e a tranquilidade do consumidor;</li>
            <li><strong>Vedação a Spam e Proteção de Base:</strong> As barbearias parceiras concordam em não disparar comunicações massivas não autorizadas e a não utilizar bases de contatos frias ou adquiridas externamente.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Cookies, Sessão e Ausência de Rastreamento Publicitário Externo</h2>
          <p>
            Utilizamos tecnologias de cookies e armazenamento local exclusivamente para finalidades técnicas essenciais ao funcionamento da aplicação:
          </p>
          <ul>
            <li><strong>Manutenção de Sessão Autenticada:</strong> Preservar o acesso seguro à conta do cliente ou do gestor durante a navegação;</li>
            <li><strong>Segurança Anti-Falsificação:</strong> Proteger a plataforma contra tentativas de ataques CSRF e requisições não autorizadas;</li>
            <li><strong>Ausência de Rastreamento Publicitário de Terceiros:</strong> A BarbeariaSP <strong>não comercializa espaços para redes de anúncios programáticos (como Google AdSense) e não utiliza pixels invasivos de rastreamento comportamental de terceiros</strong> para fins de perseguição de navegação entre sites.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. Compartilhamento Seguro de Dados e Proibição de Comercialização</h2>
          <p>
            <strong>A BarbeariaSP não vende, não aluga e não comercializa dados pessoais ou listas de contatos com terceiros sob hipótese alguma.</strong> O compartilhamento restringe-se estritamente ao que for necessário para a entrega do serviço:
          </p>
          <ul>
            <li>Com a <strong>barbearia parceira</strong> selecionada pelo usuário, para que possa identificar o cliente, cumprir o agendamento e realizar o atendimento no estabelecimento;</li>
            <li>Com <strong>provedores de infraestrutura de nuvem e mensageria transacional</strong> (hospedagem, banco de dados seguro e envio de e-mails e mensagens operacionais), todos submetidos a rigorosas cláusulas de confidencialidade e segurança da informação;</li>
            <li>Com <strong>autoridades públicas competentes</strong>, única e exclusivamente mediante ordem judicial formal fundamentada ou exigência legal expressa.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. Transferência Internacional de Dados</h2>
          <p>
            Determinados serviços de infraestrutura em nuvem, servidores de bancos de dados de alta disponibilidade e provedores de autenticação podem manter servidores localizados fora do território nacional. Em todas as hipóteses, a transferência internacional de dados observa integralmente os requisitos do artigo 33 da LGPD, garantindo níveis de governança e segurança da informação equivalentes ou superiores aos estabelecidos pela legislação brasileira.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Armazenamento, Retenção e Encerramento de Contas</h2>
          <p>
            Os dados pessoais são armazenados exclusivamente pelo período necessário para cumprir as finalidades legítimas para as quais foram coletados:
          </p>

          <h3>A) Encerramento da Conta de Cliente Final (LGPD-01)</h3>
          <p>
            Quando a conta for encerrada, apagaremos ou removeremos a identificação dos seus dados pessoais sempre que possível. Alguns registros poderão ser mantidos pelo tempo necessário para cumprir obrigações legais, fiscais, de segurança ou para resguardar direitos. Dados usados apenas para estatísticas ou histórico serão mantidos sem identificar você.
          </p>

          <h3>B) Cancelamento e Ciclo de Vida da Barbearia Parceira (SaaS)</h3>
          <p>
            O encerramento do contrato de assinatura da barbearia parceira é conduzido com previsibilidade operacional através das seguintes fases transparentes:
          </p>
          <ul>
            <li><strong>Não renovação / Término de ciclo:</strong> Acesso integral preservado até o último dia do período faturado ou término do período de testes;</li>
            <li><strong>Dias 1 a 3 pós-término:</strong> Tolerância operacional destinada ao cumprimento de horários previamente agendados, regularização financeira ou exportação administrativa de dados; novos agendamentos públicos ficam suspensos;</li>
            <li><strong>Dias 4 a 15 pós-término:</strong> A página pública da barbearia permanece desativada, sendo assegurado ao gestor o acesso exclusivo para download integral de seus dados ou reativação do plano;</li>
            <li><strong>Dias 16 a 59 pós-término:</strong> Dados mantidos em congelamento seguro e inativo nos bancos de dados;</li>
            <li><strong>A partir do 60º dia:</strong> Expurgo irreversível ou anonimização definitiva de todos os dados operacionais da barbearia parceira, mantendo-se unicamente os registros fiscais e notas fiscais pelo prazo legal de 5 (cinco) anos exigido pela legislação tributária.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>11. Decisões Automatizadas e Não Perfilamento (Art. 20 da LGPD)</h2>
          <p>
            A BarbeariaSP não utiliza sistemas de inteligência artificial ou algoritmos automatizados para realizar análise de risco de crédito (credit scoring), perfilamento socioeconômico discriminatório ou tomada de decisões que gerem efeitos jurídicos ou que afetem de forma relevante os interesses ou direitos dos usuários. A plataforma destina-se unicamente à intermediação e gestão transparente de horários e atendimentos de barbearia.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Segurança da Informação e Notificação de Incidentes</h2>
          <p>
            Empregamos padrões técnicos de segurança da informação adequados à proteção dos dados pessoais contra perda, destruição acidental, acessos não autorizados ou divulgação indevida:
          </p>
          <ul>
            <li>Criptografia ponta a ponta em trânsito com protocolo seguro HTTPS / TLS;</li>
            <li>Mecanismos avançados de autenticação sem necessidade de senhas estáticas fracas (magic links autenticados e OAuth seguro);</li>
            <li>Políticas de Segurança em Nível de Linha (Row Level Security — RLS) no banco de dados, impedindo acessos cruzados entre diferentes clientes e estabelecimentos;</li>
            <li>Mecanismos de limitação de taxa e cotas de reservas para mitigar riscos de automações maliciosas e ataques de negação de serviço.</li>
          </ul>
          <p>
            Na remota hipótese de ocorrência de incidente de segurança relevante que possa acarretar risco ou dano relevante aos titulares, a BarbeariaSP comunicará tempestivamente o fato à Autoridade Nacional de Proteção de Dados (ANPD) e aos usuários potencialmente impactados, prestando esclarecimentos sobre as causas e as medidas técnicas corretivas adotadas, em conformidade com o artigo 48 da LGPD.
          </p>
        </section>

        <section className={styles.section}>
          <h2>13. Seus Direitos e Autonomia no Aplicativo (Self-Service)</h2>
          <p>
            Você dispõe de ampla autonomia para exercer diretamente os direitos previstos no artigo 18 da LGPD:
          </p>
          <ul>
            <li><strong>Confirmação e Acesso:</strong> Consulta a todos os seus agendamentos ativos e passados no painel do cliente;</li>
            <li><strong>Portabilidade e Exportação:</strong> Em <em>Meu Perfil &gt; Privacidade</em>, você pode baixar a qualquer momento uma cópia integral dos seus dados cadastrais e histórico de agendamentos em formato digital estruturado (JSON);</li>
            <li><strong>Gestão de Preferências de Comunicação:</strong> Você pode ativar ou desativar livremente as notificações de divulgação promocional a qualquer instante em suas configurações;</li>
            <li><strong>Encerramento de Conta e Eliminação de Dados:</strong> Você pode solicitar o encerramento autônomo da sua conta diretamente no aplicativo em <em>Meu Perfil &gt; Privacidade</em>, exigindo reautenticação de segurança para sua proteção;</li>
            <li><strong>Canal Direto com o Encarregado de Dados:</strong> Esclarecimentos adicionais, correções de dados ou solicitações complexas podem ser encaminhadas diretamente ao nosso Encarregado pelo canal formal de e-mail.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>14. Alterações desta Política de Privacidade</h2>
          <p>
            Esta Política poderá ser revisada periodicamente para acompanhar inovações no produto, diretrizes da Autoridade Nacional de Proteção de Dados (ANPD) ou atualizações legislativas. Qualquer modificação substancial será sinalizada com a indicação da nova data de revisão no cabeçalho deste documento e, quando pertinente, comunicada pelos canais cadastrados.
          </p>
        </section>

        <section className={styles.section}>
          <h2>15. Identificação do Controlador e Contato do Encarregado (DPO)</h2>
          <div className={styles.contact}>
            <p>
              <strong>BarbeariaSP Tecnologia e Serviços</strong><br />
              CNPJ: 39.299.793/0001-27<br />
              Sede: Rua Igaratinga, 137<br />
              Encarregado pelo Tratamento de Dados Pessoais (DPO): Equipe de Privacidade e Governança<br />
              Canal oficial de atendimento para privacidade e LGPD: <a href="mailto:contato@cullentech.com.br">contato@cullentech.com.br</a>
            </p>
          </div>
        </section>

        <Link className={styles.back} href="/">← Voltar para a página inicial</Link>
      </article>
    </main>
  );
}
