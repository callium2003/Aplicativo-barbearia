import Link from "next/link";
import type { Metadata } from "next";
import styles from "./privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Política de Privacidade | BarbeariaSP",
  description: "Política de Privacidade e Proteção de Dados da BarbeariaSP.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <Link className={styles.brand} href="/">BARBEARIA<span>SP</span></Link>
        <p className={styles.eyebrow}>Privacidade e proteção de dados</p>
        <h1 className={styles.title}>Política de Privacidade e Proteção de Dados</h1>
        <p className={styles.updated}>Última atualização: 18 de agosto de 2026</p>
        <p className={styles.intro}>A BarbeariaSP, inscrita no CNPJ nº 39.299.793/0001-27, com sede na Rua Igaratinga, 137, respeita a sua privacidade e está comprometida com a proteção dos dados pessoais de clientes, usuários e visitantes de suas plataformas digitais.</p>
        <p className={styles.intro}>Esta Política explica quais dados pessoais podemos coletar, por que os utilizamos, como são armazenados e compartilhados e quais são os seus direitos. O tratamento de dados pessoais realizado pela BarbeariaSP observa a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD) e demais normas aplicáveis.</p>

        <section className={styles.section}>
          <h2>1. A quem esta Política se aplica</h2>
          <p>Esta Política aplica-se aos dados pessoais tratados por meio do site barbeariasp.com.br, sistemas de agendamento, canais de atendimento e demais serviços ou plataformas digitais utilizados pela BarbeariaSP.</p>
        </section>

        <section className={styles.section}>
          <h2>2. Dados pessoais que podemos coletar</h2>
          <p>Dependendo da forma como você utiliza nossos serviços, podemos tratar dados cadastrais, dados relacionados a agendamentos, dados de pagamento e informações técnicas coletadas automaticamente.</p>
          <h3>Dados cadastrais</h3>
          <ul><li>Nome e sobrenome;</li><li>Telefone;</li><li>Endereço de e-mail;</li><li>Data de nascimento, quando necessária;</li><li>Informações relacionadas à sua conta ou cadastro.</li></ul>
          <h3>Dados relacionados a agendamentos</h3>
          <ul><li>Serviço escolhido;</li><li>Profissional selecionado;</li><li>Unidade, quando aplicável;</li><li>Data e horário do atendimento;</li><li>Histórico de agendamentos;</li><li>Cancelamentos e alterações;</li><li>Preferências relacionadas aos serviços contratados.</li></ul>
          <h3>Dados de pagamento</h3>
          <p>Quando houver pagamento eletrônico, poderão ser processadas informações necessárias à transação. Os dados completos de cartão poderão ser processados diretamente por empresas especializadas em pagamentos, quando aplicável. A BarbeariaSP poderá receber apenas informações necessárias para identificar e confirmar a transação.</p>
          <h3>Dados coletados automaticamente</h3>
          <ul><li>Endereço IP;</li><li>Tipo e versão do navegador;</li><li>Sistema operacional e tipo de dispositivo;</li><li>Data, horário, páginas e origem do acesso;</li><li>Identificadores e informações relacionadas a cookies;</li><li>Informações técnicas relacionadas ao funcionamento e à segurança da plataforma.</li></ul>
        </section>

        <section className={styles.section}>
          <h2>3. Para que utilizamos seus dados</h2>
          <ul><li>Criar e administrar seu cadastro;</li><li>Permitir, confirmar, alterar ou cancelar agendamentos;</li><li>Enviar lembretes relacionados aos seus agendamentos;</li><li>Processar pagamentos, quando aplicável;</li><li>Prestar atendimento ao cliente e manter registros das operações;</li><li>Prevenir fraudes e acessos não autorizados;</li><li>Melhorar nossos serviços e plataformas digitais;</li><li>Realizar análises estatísticas e de desempenho;</li><li>Cumprir obrigações legais ou regulatórias e exercer ou defender direitos;</li><li>Enviar comunicações comerciais e promocionais, quando permitido pela legislação aplicável.</li></ul>
        </section>

        <section className={styles.section}>
          <h2>4. Bases legais utilizadas</h2>
          <p>O tratamento dos dados pessoais será realizado com fundamento nas hipóteses previstas na LGPD, conforme a finalidade de cada operação.</p>
          <ul><li>Execução de contrato ou procedimentos preliminares relacionados a contrato;</li><li>Cumprimento de obrigação legal ou regulatória;</li><li>Exercício regular de direitos;</li><li>Legítimo interesse, quando aplicável e observados os direitos e liberdades fundamentais do titular;</li><li>Consentimento, quando necessário.</li></ul>
          <p>Quando determinada atividade depender de consentimento, você poderá revogá-lo pelos meios disponibilizados pela BarbeariaSP, sem prejuízo dos tratamentos realizados anteriormente de forma legítima.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Cookies</h2>
          <p>A BarbeariaSP poderá utilizar cookies e tecnologias semelhantes para permitir o funcionamento de recursos, guardar preferências e compreender como as plataformas são utilizadas.</p>
          <h3>Cookies essenciais</h3><p>Necessários para o funcionamento, segurança e disponibilização dos recursos básicos da plataforma.</p>
          <h3>Cookies de funcionalidade</h3><p>Permitem lembrar determinadas escolhas e preferências do usuário.</p>
          <h3>Cookies analíticos</h3><p>Auxiliam na compreensão de como os usuários utilizam as plataformas e na identificação de oportunidades de melhoria.</p>
          <h3>Cookies de publicidade e marketing</h3><p>Quando utilizados, permitem avaliar campanhas e apresentar comunicações ou anúncios mais relevantes. Quando exigido pela legislação aplicável, cookies não essenciais serão utilizados de acordo com as escolhas realizadas pelo usuário.</p>
        </section>

        <section className={styles.section}>
          <h2>6. Compartilhamento de dados</h2>
          <p>A BarbeariaSP poderá compartilhar dados pessoais com empresas necessárias à prestação dos seus serviços, incluindo provedores de hospedagem e infraestrutura, plataformas de banco de dados, sistemas de autenticação e agendamento, empresas de pagamentos, serviços de comunicação, prestadores tecnológicos, serviços de análise e monitoramento, consultores, contadores e assessores jurídicos.</p>
          <p>Esses terceiros deverão tratar os dados conforme suas respectivas responsabilidades, contratos aplicáveis e legislação de proteção de dados. Também poderemos compartilhar informações quando necessário para cumprir obrigação legal, determinação judicial ou solicitação válida de autoridade competente.</p>
        </section>

        <section className={styles.section}>
          <h2>7. Transferência internacional de dados</h2>
          <p>Alguns fornecedores de tecnologia poderão armazenar ou processar informações em outros países. Quando houver transferência internacional de dados pessoais, serão adotadas as medidas aplicáveis previstas na legislação brasileira de proteção de dados.</p>
        </section>

        <section className={styles.section}>
          <h2>8. Armazenamento e retenção</h2>
          <p>Os dados pessoais serão mantidos somente pelo período necessário para cumprir as finalidades para as quais foram coletados, respeitando obrigações legais, regulatórias, contratuais e o exercício regular de direitos.</p>
          <p>Quando uma conta permanecer sem atividade por 24 meses, os dados pessoais poderão ser excluídos ou anonimizados, mediante aviso prévio de 30 dias, ressalvadas as hipóteses de conservação previstas em lei. Após o término do tratamento, os dados poderão ser eliminados, anonimizados ou conservados quando houver fundamento legal para sua manutenção.</p>
        </section>

        <section className={styles.section}>
          <h2>9. Segurança</h2>
          <p>Adotamos medidas técnicas e administrativas destinadas a proteger os dados pessoais contra acesso não autorizado, destruição, perda, alteração, comunicação ou divulgação indevida e tratamento inadequado ou ilícito.</p>
          <p>Apesar das medidas adotadas, nenhum sistema conectado à internet pode ser considerado absolutamente seguro. Caso seja identificado incidente de segurança envolvendo dados pessoais, serão adotadas as providências previstas na legislação aplicável.</p>
        </section>

        <section className={styles.section}>
          <h2>10. Direitos do titular</h2>
          <p>Nos termos da LGPD, você poderá exercer, quando aplicável, direitos relacionados aos seus dados pessoais.</p>
          <ul><li>Confirmação da existência de tratamento e acesso aos dados;</li><li>Correção de dados incompletos, inexatos ou desatualizados;</li><li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a legislação;</li><li>Portabilidade, observadas as regras aplicáveis;</li><li>Eliminação de dados tratados com fundamento no consentimento, quando aplicável;</li><li>Informação sobre entidades com as quais seus dados foram compartilhados;</li><li>Informação sobre a possibilidade de não fornecer consentimento e suas consequências;</li><li>Revogação do consentimento e oposição ao tratamento nas hipóteses previstas em lei;</li><li>Solicitação de revisão de determinadas decisões tomadas exclusivamente com base em tratamento automatizado, quando aplicável.</li></ul>
          <p>Alguns pedidos poderão não resultar na exclusão imediata dos dados quando sua conservação for permitida ou exigida pela legislação.</p>
        </section>

        <section className={styles.section}>
          <h2>11. Como exercer seus direitos</h2>
          <p>Para solicitar informações ou exercer direitos relacionados aos seus dados, entre em contato pelo e-mail <a href="mailto:contato@cullentech.com.br">contato@cullentech.com.br</a>.</p>
          <p>Para proteger seus dados, poderemos solicitar informações adicionais destinadas à confirmação da identidade do solicitante antes de atender determinadas solicitações. O exercício dos direitos previstos na LGPD é gratuito, observadas as disposições legais aplicáveis.</p>
        </section>

        <section className={styles.section}>
          <h2>12. Serviços e links de terceiros</h2>
          <p>Nossas plataformas poderão utilizar ou apresentar links para serviços externos. Ao acessar plataformas de terceiros, como serviços fornecidos por Google, Apple, Meta, Microsoft ou outros fornecedores, o tratamento de dados realizado diretamente por essas empresas estará sujeito às respectivas políticas e termos. A BarbeariaSP não controla as práticas independentes de privacidade adotadas por esses terceiros.</p>
        </section>

        <section className={styles.section}>
          <h2>13. Dados de crianças e adolescentes</h2>
          <p>Nossos serviços não são direcionados especificamente à coleta de dados pessoais de crianças. Caso seja necessário tratar dados de crianças ou adolescentes para alguma finalidade relacionada aos nossos serviços, serão observadas as disposições aplicáveis da LGPD, especialmente o melhor interesse do menor.</p>
        </section>

        <section className={styles.section}>
          <h2>14. Alterações desta Política</h2>
          <p>Esta Política poderá ser atualizada para refletir mudanças em nossos serviços, tecnologias, fornecedores ou requisitos legais e regulatórios. A versão vigente será disponibilizada nas plataformas com indicação da data da última atualização. Alterações relevantes poderão ser comunicadas por meios adicionais quando necessário.</p>
        </section>

        <section className={styles.section}>
          <h2>15. Controlador e contato</h2>
          <div className={styles.contact}>
            <p><strong>BarbeariaSP</strong><br />CNPJ: 39.299.793/0001-27<br />Endereço: Rua Igaratinga, 137<br />E-mail para assuntos relacionados à privacidade e proteção de dados: <a href="mailto:contato@cullentech.com.br">contato@cullentech.com.br</a></p>
          </div>
          <p>Ao utilizar nossos serviços, recomendamos que você consulte periodicamente esta Política para compreender como seus dados pessoais são tratados.</p>
        </section>

        <Link className={styles.back} href="/">← Voltar para a página inicial</Link>
      </article>
    </main>
  );
}
