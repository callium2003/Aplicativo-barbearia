import Link from "next/link";
import type { Metadata } from "next";
import styles from "../privacidade/privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Termos de Uso e Condições Gerais | BarbeariaSP",
  description: "Termos de Uso e Condições Gerais de utilização e contratação da plataforma BarbeariaSP.",
};

export default function TermsOfServicePage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <Link className={styles.brand} href="/">BARBEARIA<span>SP</span></Link>
        <p className={styles.eyebrow}>Termos e condições gerais de contratação e uso</p>
        <h1 className={styles.title}>Termos de Uso da Plataforma BarbeariaSP</h1>
        <p className={styles.updated}>Última atualização: 11 de setembro de 2026</p>

        <p className={styles.intro}>
          Estes Termos de Uso e Condições Gerais de Uso regulam o acesso e a utilização dos serviços digitais disponibilizados pela BarbeariaSP, operada pela pessoa jurídica inscrita no CNPJ sob o nº 39.299.793/0001-27, com sede na Rua Igaratinga, 137.
        </p>
        <p className={styles.intro}>
          Ao navegar na plataforma, realizar o cadastro, efetuar um agendamento ou contratar planos de software, você declara expressamente que leu, compreendeu e concorda integralmente com as disposições aqui estabelecidas e com a nossa <Link href="/privacidade">Política de Privacidade</Link>.
        </p>

        <section className={styles.section}>
          <h2>1. Definições e Partes do Ecossistema</h2>
          <p>Para os fins destes Termos, consideram-se:</p>
          <ul>
            <li>
              <strong>BarbeariaSP (ou &quot;Plataforma&quot;):</strong> Provedora da solução tecnológica de software como serviço (SaaS), responsável pela disponibilização, suporte e manutenção do sistema de agendamento online e gestão operacional de barbearias;
            </li>
            <li>
              <strong>Cliente Final (Consumidor):</strong> Usuário que acessa a plataforma de forma gratuita para localizar barbearias parceiras, consultar horários, reservar e gerenciar seus agendamentos presenciais;
            </li>
            <li>
              <strong>Barbearia Parceira (Estabelecimento B2B):</strong> Pessoa jurídica ou profissional autônomo que contrata a licença do software BarbeariaSP para organização de sua equipe, serviços, catálogo e controle de atendimentos;
            </li>
            <li>
              <strong>Serviços Presenciais:</strong> Cortes de cabelo, barba, procedimentos estéticos e demais serviços executados fisicamente nas dependências da barbearia parceira pelos seus respectivos profissionais.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Objeto e Delimitação Expressa de Responsabilidades</h2>
          <p>
            A BarbeariaSP atua exclusivamente como intermediadora tecnológica de software para viabilizar a gestão eficiente de horários e a conveniência do agendamento digital:
          </p>
          <ul>
            <li>
              <strong>Responsabilidade Exclusiva pelos Atendimentos Presenciais:</strong> A execução física dos cortes e procedimentos, a capacitação técnica dos profissionais, a higiene dos instrumentos, as condições sanitárias das instalações, o cumprimento dos horários marcados e a segurança física no salão são de responsabilidade integral e exclusiva da barbearia parceira contratada. A BarbeariaSP não presta serviços de barbearia nem interfere na relação técnica e profissional presencial.
            </li>
            <li>
              <strong>Pagamento Direto no Balcão:</strong> O agendamento através da plataforma é totalmente gratuito para o cliente final. <strong>O pagamento pelo corte ou serviço estético realizado ocorre diretamente no balcão da barbearia parceira</strong>, através dos meios de pagamento aceitos pelo estabelecimento no momento do atendimento. A BarbeariaSP não recebe valores de clientes finais, não processa cobranças de cortes e não retém qualquer taxa sobre os atendimentos no balcão.
            </li>
            <li>
              <strong>Preços e Informações de Serviços:</strong> A definição de preços, tempo de duração estimado de cada serviço e descrição no catálogo são configurados com autonomia pela própria barbearia parceira em seu painel de gestão.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Elegibilidade, Cadastro e Atendimento a Dependentes</h2>
          <p>
            O acesso à plataforma requer a observância das seguintes regras cadastrais:
          </p>
          <ul>
            <li><strong>Capacidade Civil:</strong> Os serviços destinam-se a pessoas físicas civilmente capazes nos termos da legislação brasileira;</li>
            <li><strong>Atendimento a Crianças e Adolescentes:</strong> O agendamento de serviços destinados a dependentes ou menores de idade (como cortes infantis) deve ser realizado exclusivamente pelos pais ou responsáveis legais, que assumem a responsabilidade civil pelo acompanhamento do menor durante o atendimento no estabelecimento (em consonância com o artigo 14 da LGPD e com o Estatuto da Criança e do Adolescente);</li>
            <li><strong>Veracidade dos Dados:</strong> O usuário compromete-se a fornecer dados verdadeiros, atualizados e completos (especialmente nome e número de WhatsApp operacional para contato de emergência e confirmações). O uso de identidades falsas ou apropriação indevida de dados de terceiros sujeitará o infrator às sanções cíveis e criminais cabíveis.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Regras de Agendamento, Pontualidade e Tolerância (No-Show)</h2>
          <p>
            A dinâmica de agendamentos fundamenta-se na boa-fé e na cooperação mútua entre clientes e estabelecimentos:
          </p>
          <ul>
            <li><strong>Pontualidade e Comparecimento:</strong> Recomenda-se o comparecimento à barbearia com antecedência de 5 a 10 minutos do horário marcado para garantir a fluidez da agenda;</li>
            <li><strong>Tolerância de Atraso:</strong> Cada barbearia parceira define sua política razoável de tolerância a atrasos (geralmente entre 10 e 15 minutos). Ultrapassada a tolerância, o profissional poderá atender o cliente seguinte ou cancelar a reserva para não comprometer a agenda dos demais consumidores;</li>
            <li><strong>Cancelamento Responsável pelo Cliente:</strong> Caso não possa comparecer, o cliente deve realizar o cancelamento com a maior antecedência possível através do aplicativo em <em>Meus Agendamentos</em>, permitindo que o horário seja disponibilizado a outros interessados;</li>
            <li><strong>Prevenção a Abusos e Reservas Fantasma:</strong> Para preservar a operação das barbearias parceiras contra agendamentos abusivos ou em massa, a plataforma adota controles automáticos de cotas de reservas futuras pendentes por titular.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Regras da Assinatura da Barbearia Parceira (SaaS B2B)</h2>
          <p>
            A contratação da plataforma pelas barbearias parceiras obedece a regras comerciais e operacionais claras:
          </p>
          <ul>
            <li><strong>Licença de Uso de Software:</strong> A contratação confere à barbearia uma licença temporária, revogável e não exclusiva para utilização do software, nos termos do plano escolhido (Mensal, Trimestral, Semestral ou Anual) e respeitados os limites de profissionais ativos contratados;</li>
            <li><strong>Período de Avaliação Gratuita (Trial):</strong> Novos estabelecimentos têm direito a 30 (trinta) dias de teste integral dos recursos sem qualquer cobrança surpresa prévia;</li>
            <li><strong>Processamento de Pagamento Seguro:</strong> As cobranças da assinatura da barbearia são processadas por instituição de pagamento parceira autorizada pelo Banco Central do Brasil em conformidade com padrões de segurança PCI-DSS. A BarbeariaSP não armazena dados de cartão de crédito em seus servidores;</li>
            <li><strong>Direito de Arrependimento (Art. 49 do CDC):</strong> Na contratação inicial de planos pagos, a barbearia parceira poderá exercer seu direito de arrependimento no prazo legal de até 7 (sete) dias a contar da contratação ou da primeira cobrança, mediante cancelamento formal com reembolso integral dos valores pagos;</li>
            <li><strong>Ciclo e Fases Pós-Cancelamento da Assinatura:</strong> Em caso de não renovação ou cancelamento do plano pela barbearia:
              <ul>
                <li><em>Dias 1 a 3 pós-término:</em> Tolerância operacional para cumprimento dos atendimentos previamente agendados, ficando bloqueadas novas reservas públicas;</li>
                <li><em>Dias 4 a 15 pós-término:</em> Suspensão da página pública da barbearia, permanecendo liberado o acesso do gestor para exportação completa de dados e relatórios;</li>
                <li><em>Dias 16 a 59 pós-término:</em> Dados mantidos em congelamento seguro e inativo nos servidores;</li>
                <li><em>A partir do 60º dia:</em> Expurgo ou anonimização definitiva dos dados operacionais da barbearia parceira, ressalvada a retenção de notas fiscais e registros contábeis pelo prazo legal de 5 (cinco) anos exigido pela legislação tributária.</li>
              </ul>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Propriedade Intelectual e Condutas Vedadas</h2>
          <p>
            A marca BarbeariaSP, o código-fonte, arquitetura, interface, layout, logotipos, banco de dados e marcas registradas são de titularidade exclusiva da BarbeariaSP ou licenciados à mesma.
          </p>
          <p>É expressamente proibido ao usuário ou à barbearia parceira:</p>
          <ul>
            <li>Praticar engenharia reversa, descompilação ou cópia de qualquer componente do software;</li>
            <li>Empregar ferramentas automatizadas não autorizadas de extração de dados (scraping), robôs ou rotinas para coletar dados da plataforma;</li>
            <li>Disparar mensagens em massa não solicitadas (spam) ou importar bases de contatos frias obtidas externamente;</li>
            <li>Utilizar a plataforma para qualquer finalidade ilícita, fraudulenta ou que viole direitos de terceiros.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Privacidade e Proteção de Dados</h2>
          <p>
            A proteção à privacidade e aos dados pessoais é princípio fundamental da plataforma. O tratamento de dados pessoais realizado pela BarbeariaSP rege-se pela nossa <Link href="/privacidade">Política de Privacidade</Link>, elaborada em estrita conformidade com a Lei nº 13.709/2018 (LGPD) e com o Marco Civil da Internet (Lei nº 12.965/2014).
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Disponibilidade da Plataforma e Suporte Técnico</h2>
          <p>
            A BarbeariaSP empenha seus melhores esforços técnicos para assegurar índices elevados de disponibilidade de seus serviços em nuvem. No entanto, o acesso poderá ser pontualmente interrompido para manutenções programadas, melhorias de infraestrutura ou em razão de instabilidades de terceiros (como falhas de redes de telecomunicações ou da API do WhatsApp), hipóteses em que a plataforma atuará com diligência para restabelecer os serviços no menor prazo viável.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Alterações destes Termos de Uso</h2>
          <p>
            A BarbeariaSP reserva-se o direito de atualizar estes Termos periodicamente para refletir adequações legais, melhorias funcionais ou atualizações nos planos comerciais. Qualquer alteração substancial será informada com clareza nesta página e sinalizada aos usuários pelos canais de contato cadastrados, com a indicação da nova data de revisão.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Legislação Aplicável e Foro</h2>
          <p>
            Estes Termos são regidos e interpretados de acordo com a legislação da República Federativa do Brasil. Para a resolução de eventuais controvérsias oriundas destes Termos, fica eleito o foro da comarca de Belo Horizonte / MG, ressalvada a competência do foro do domicílio do consumidor nas relações protegidas pelo Código de Defesa do Consumidor (Lei nº 8.078/1990).
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Contato e Suporte Oficial</h2>
          <div className={styles.contact}>
            <p>
              <strong>BarbeariaSP Tecnologia e Serviços</strong><br />
              CNPJ: 39.299.793/0001-27<br />
              Sede: Rua Igaratinga, 137<br />
              Canal oficial de atendimento e suporte: <a href="mailto:contato@cullentech.com.br">contato@cullentech.com.br</a>
            </p>
          </div>
        </section>

        <Link className={styles.back} href="/">← Voltar para a página inicial</Link>
      </article>
    </main>
  );
}
