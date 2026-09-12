import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { subscriptionPlans, formatBRL } from "@/utils/subscription-plans";
import styles from "./marketing-page.module.css";

export const metadata: Metadata = {
  title: "BarbeariaSP | Agenda e gestão para sua barbearia",
  description:
    "Página pública, agendamento online, equipe, clientes e gestão para sua barbearia em um só lugar.",
};

const productScreens = [
  {
    src: "/marketing-public-page.png",
    alt: "Exemplo da página pública de uma barbearia no BarbeariaSP",
    title: "Sua página pública",
    text: "Serviços, equipe, contatos e agendamento em um link próprio.",
  },
  {
    src: "/marketing-booking-services.png",
    alt: "Exemplo da seleção de serviços e profissional no agendamento",
    title: "Agendamento sem complicação",
    text: "O cliente escolhe até três serviços e um profissional compatível.",
  },
  {
    src: "/marketing-customer-area.png",
    alt: "Exemplo da área do cliente com próximo agendamento",
    title: "Área do cliente",
    text: "Agenda, reagendamento, cadastro, consentimentos e privacidade.",
  },
];

const capabilities = [
  ["Agenda online", "Disponibilidade e horários organizados para toda a equipe."],
  ["Serviços flexíveis", "Até três serviços no mesmo agendamento, com duração total calculada."],
  ["Equipe e permissões", "Acessos adequados para proprietário, gestor e profissional."],
  ["Clientes", "Histórico de atendimentos e dados de contato sempre à mão."],
  ["Relatórios", "Visão de serviços, ocupação, atendimento e comissões."],
  ["Notificações", "Confirmações e lembretes para apoiar a rotina da barbearia."],
];

const journey = [
  ["01", "Cliente agenda", "Escolhe a data, os serviços, o profissional e o horário."],
  ["02", "Equipe se organiza", "A agenda reúne os atendimentos e reduz conflitos."],
  ["03", "Atendimento acontece", "Cada profissional acompanha a própria rotina."],
  ["04", "Você acompanha", "Clientes e relatórios ajudam nas decisões do negócio."],
];

const faqs = [
  ["Preciso de cartão para começar?", "Não. O cadastro inicial e os 30 dias de teste não exigem cartão."],
  ["Meu cliente precisa instalar um aplicativo?", "Não. Ele acessa a página pública da barbearia pelo navegador e agenda por ali."],
  ["Posso cadastrar minha equipe?", `Sim. Os planos incluem até ${subscriptionPlans[0].professionalLimit} profissionais ativos. Acima desse limite, a contratação é sob consulta. Profissionais inativos não consomem o limite.`],
  ["Quanto custam os planos?", `Os preços totais por período são: ${subscriptionPlans.map((plan) => `${plan.name}: ${formatBRL(plan.priceCents)} por ${plan.months} ${plan.months === 1 ? "mês" : "meses"}`).join("; ")}.`],
  ["Posso parcelar no cartão?", `${subscriptionPlans.map((plan) => `${plan.name}: ${plan.maxInstallments === 1 ? "1x" : `até ${plan.maxInstallments}x`}`).join("; ")}. O parcelamento não altera a duração do plano contratado.`],
];

function Brand() {
  return <span className={styles.brand} aria-label="BarbeariaSP">Barbearia<span>SP</span></span>;
}

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brandLink} href="/" aria-label="Página inicial do BarbeariaSP"><Brand /></Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="#produto">Produto</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.loginLink} href="/entrar">Entrar</Link>
          <Link className={styles.primaryButton} href="/entrar">Começar teste grátis</Link>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <Image className={styles.heroImage} src="/barbeariasp-institutional-hero.png" alt="Interior acolhedor de uma barbearia com a marca BarbeariaSP na parede" fill priority sizes="100vw" />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>GESTÃO PARA BARBEARIAS</p>
          <h1 id="hero-title">Sua barbearia no controle.<span>Sua agenda sempre aberta.</span></h1>
          <p>Agendamento online, equipe organizada e gestão simples para você focar no que realmente importa: seus clientes.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/entrar">Começar teste grátis</Link>
            <a className={styles.secondaryButtonDark} href="#como-funciona">Ver como funciona</a>
          </div>
          <small>30 dias grátis · sem cartão no cadastro</small>
        </div>
      </section>

      <section className={styles.product} id="produto" aria-labelledby="product-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>PRODUTO COMPLETO</p>
          <h2 id="product-title">Conheça o BarbeariaSP por completo</h2>
          <p>Da página pública à gestão, tudo funciona como uma única experiência.</p>
        </div>
        <div className={styles.screenGrid}>
          {productScreens.map((screen) => (
            <article className={styles.screenCard} key={screen.title}>
              <div className={styles.screenFrame}>
                <Image src={screen.src} alt={screen.alt} width={390} height={844} sizes="(max-width: 760px) 82vw, 360px" />
              </div>
              <h3>{screen.title}</h3><p>{screen.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.journey} id="como-funciona" aria-labelledby="journey-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>DO AGENDAMENTO À GESTÃO</p>
          <h2 id="journey-title">Da agenda do cliente à gestão da barbearia</h2>
          <p>Um fluxo simples para o cliente e uma rotina mais clara para a equipe.</p>
        </div>
        <ol className={styles.journeyGrid}>
          {journey.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}
        </ol>
      </section>

      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>ROTINA EM UM SÓ LUGAR</p>
          <h2 id="capabilities-title">Recursos que simplificam o dia a dia</h2>
        </div>
        <div className={styles.capabilityGrid}>
          {capabilities.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <div className={styles.managementPanel}>
          <div><p className={styles.eyebrow}>PARA SUA EQUIPE. PARA SEU NEGÓCIO.</p><h2>Menos improviso. Mais tempo para atender bem.</h2></div>
          <ul><li>Agenda da equipe com horários e profissionais.</li><li>Clientes, serviços, comissões e configurações.</li><li>Relatórios para acompanhar a operação.</li></ul>
        </div>
      </section>

      <section className={styles.plans} id="planos" aria-labelledby="plans-title">
        <div className={styles.trialBanner}>
          <div><p className={styles.eyebrow}>EXPERIMENTE NA PRÁTICA</p><h2>Teste por 30 dias. Configure, use e veja na prática.</h2><p>Sem cartão no cadastro. Sem compromisso durante o teste.</p></div>
          <Link className={styles.lightButton} href="/entrar">Testar grátis por 30 dias</Link>
        </div>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>PLANOS FLEXÍVEIS</p><h2 id="plans-title">Escolha o período ideal para sua barbearia</h2><p>Preços totais pelo período contratado. Acima de {subscriptionPlans[0].professionalLimit} profissionais ativos, sob consulta.</p>
        </div>
        <div className={styles.planGrid}>
          {subscriptionPlans.map((plan) => (
            <article className={styles.planCard} key={plan.code}>
              <h3>{plan.name}</h3>
              <p>{plan.months} {plan.months === 1 ? "mês" : "meses"} de acesso</p>
              <strong>{formatBRL(plan.priceCents)}</strong>
              <small>Total pelo período · {plan.maxInstallments === 1 ? "1x no cartão" : `Até ${plan.maxInstallments}x no cartão`}</small>
              <p>Até {plan.professionalLimit} profissionais ativos</p>
              <Link href="/entrar">Começar teste grátis</Link>
            </article>
          ))}
        </div>
        <p>Já usa o BarbeariaSP? <Link href="#planos">Confira os planos nesta página</Link></p>
      </section>

      <section className={styles.trust} aria-labelledby="trust-title">
        <div><p className={styles.eyebrow}>SEGURANÇA E PRIVACIDADE</p><h2 id="trust-title">Acesso certo para cada pessoa</h2></div>
        <p>Proprietários, gestores e profissionais acessam somente o que precisam. Os dados de cada barbearia permanecem separados, e o cliente controla cadastro e consentimentos.</p>
      </section>

      <section className={styles.faq} aria-labelledby="faq-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>TIRE SUAS DÚVIDAS</p><h2 id="faq-title">Perguntas frequentes</h2></div>
        <div className={styles.faqList}>
          {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div><h2 id="final-cta-title">Pronto para organizar sua barbearia?</h2><p>Comece agora e use todos os recursos durante 30 dias.</p></div>
        <Link className={styles.primaryButton} href="/entrar">Começar teste grátis</Link>
      </section>

      <footer className={styles.footer}>
        <div><Brand /><p>Agenda e gestão simples para barbearias.</p></div>
        <div className={styles.footerLinks}>
          <a href="#produto">Produto</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <Link href="/entrar">Entrar</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
          <span className={styles.legalPending}>Termos de Uso — em preparação</span>
          <span className={styles.legalPending}>Regras de assinatura — em preparação</span>
        </div>
        <p>© 2026 BarbeariaSP</p>
      </footer>
    </main>
  );
}
