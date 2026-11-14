import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { subscriptionPlans, formatBRL } from "@/utils/subscription-plans";
import styles from "./marketing-page.module.css";
import { demoScreenGroups } from "./marketing-demo-screens.mjs";
import LandingHeroVideo from "@/app/components/LandingHeroVideo";
import LandingCalculator from "@/app/components/LandingCalculator";
import LeadCaptureForm from "@/app/components/LeadCaptureForm";

export const metadata: Metadata = {
  metadataBase: new URL("https://barbeariasp.cullentech.com.br"),
  verification: { google: "eOwPNtBSxOKtaDZH3LDuSyBacVO6gJGK1BNexENQXsg" },
  title: "Sistema para Barbearia com Agenda Online | BarbeariaSP",
  description:
    "Sistema de gestão para barbearias com agendamento online 24h, clientes, equipe, comissões e relatórios. Teste grátis por 30 dias, sem cartão.",
  keywords: [
    "sistema para barbearia",
    "software barbearia",
    "agendamento online barbearia",
    "gestão de barbearia",
    "app barbearia",
    "comissão barbeiro",
    "BarbeariaSP",
  ],
  alternates: {
    canonical: "https://barbeariasp.cullentech.com.br",
  },
  openGraph: {
    title: "Sistema para Barbearia com Agenda Online | BarbeariaSP",
    description:
      "Sistema de gestão para barbearias com agendamento online 24h, clientes, equipe, comissões e relatórios. Teste grátis por 30 dias, sem cartão.",
    url: "https://barbeariasp.cullentech.com.br",
    siteName: "BarbeariaSP",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/barbeariasp-institutional-hero.png",
        width: 1200,
        height: 630,
        alt: "BarbeariaSP - Sistema de Gestão e Agendamento para Barbearias",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistema para Barbearia com Agenda Online | BarbeariaSP",
    description: "Sistema de gestão para barbearias com agendamento online 24h, clientes, equipe, comissões e relatórios. Teste grátis por 30 dias, sem cartão.",
    images: ["/barbeariasp-institutional-hero.png"],
  },
};

const capabilities = [
  ["Agenda online 24/7", "Agenda online disponível 24 horas para os clientes escolherem seus horários pelo navegador."],
  ["Serviços flexíveis", "Até três serviços no mesmo agendamento, com cálculo inteligente de tempo total."],
  ["Equipe e permissões", "Gerencie horários e disponibilidade da equipe, com acessos separados para proprietário, gestor e profissional."],
  ["Clientes organizados", "Cadastro e histórico de clientes para acompanhar os atendimentos da sua barbearia."],
  ["Comissões e Relatórios", "Controle as comissões dos profissionais e acompanhe relatórios de faturamento e atendimentos."],
  ["Lembretes automáticos", "Envie confirmações e lembretes para ajudar os clientes a acompanhar seus agendamentos."],
];

const journey = [
  ["01", "Cliente faz o agendamento online", "Acessa a página exclusiva da sua barbearia pelo celular ou Instagram, escolhe serviço, barbeiro e horário."],
  ["02", "Equipe se organiza", "A agenda inteligente bloqueia o horário em tempo real e impede choque de horários."],
  ["03", "Atendimento acontece", "O cliente recebe lembrete e cada profissional acompanha a própria rotina pelo celular."],
  ["04", "Você acompanha o crescimento", "Faturamento, comissões de balcão e histórico de clientes consolidados automaticamente."],
];

const faqs = [
  ["O BarbeariaSP funciona em qualquer cidade do Brasil?", "Sim. O BarbeariaSP é um sistema web desenvolvido para barbearias de todo o Brasil. Proprietários, profissionais e clientes podem acessar a plataforma pelo navegador, conforme suas permissões."],
  ["Preciso instalar um programa para gerenciar minha barbearia?", "Não. O BarbeariaSP funciona diretamente no navegador, permitindo gerenciar agenda, clientes, equipe e comissões sem instalar um programa no computador."],
  ["Preciso de cartão de crédito para começar o teste?", "Não. O cadastro inicial e os 30 dias de teste são 100% gratuitos e não exigem cartão de crédito ou compromisso financeiro."],
  ["Meu cliente precisa baixar ou instalar algum aplicativo?", "Não. Seu cliente acessa a página pública exclusiva da sua barbearia direto pelo navegador do celular (link na bio do Instagram ou WhatsApp) e agenda em poucos segundos."],
  ["Posso cadastrar minha equipe de barbeiros?", `Sim. ${subscriptionPlans.map((plan) => `${plan.name}: até ${plan.userLimit} usuários`).join("; ")}. O proprietário está incluído. Acesso inativado libera vaga; uma pessoa com vários papéis conta uma vez. Convites pendentes reservam vaga. Para 8 ou mais usuários, sob consulta.`],
  ["Quanto custam os planos?", `Preços totais pelo período contratado: ${subscriptionPlans.map((plan) => `${plan.name}: ${formatBRL(plan.priceCents)} por ${plan.months} ${plan.months === 1 ? "mês" : "meses"}`).join("; ")}. O parcelamento não altera a duração do plano contratado.`],
  ["Posso parcelar no cartão?", `${subscriptionPlans.map((plan) => `${plan.name}: ${plan.maxInstallments === 1 ? "1x" : `até ${plan.maxInstallments}x`}`).join("; ")}. Os planos mensais e anuais são assinaturas com renovação automática no cartão ao final de cada período. O parcelamento não altera a duração do plano contratado. A contratação paga estará disponível após a integração financeira.`],
  ["O que acontece após os 30 dias de teste grátis?", "Se você optar por não assinar, sua conta não sofrerá cobranças automáticas. Seus dados ficam protegidos e você pode exportar seus relatórios ou ativar um plano quando desejar."],
];

function Brand() {
  return (
    <span className={styles.brand} aria-label="BarbeariaSP">
      BARBEARIA<span>SP</span>
    </span>
  );
}

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BarbeariaSP",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: "49.90",
      highPrice: "119.90",
      offerCount: "3",
    },
    description: "Sistema web de agendamento online e gestão para barbearias.",
    provider: {
      "@type": "Organization",
      name: "CullenTech Soluções Digitais Ltda",
      url: "https://cullentech.com.br",
    },
  };

  return (
    <main className={styles.page}>
      {/* Dados Estruturados para SEO e IA (ChatGPT / Google / Gemini) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Cabeçalho de Navegação */}
      <header className={styles.header}>
        <Link className={styles.brandLink} href="/" aria-label="Página inicial do BarbeariaSP">
          <Brand />
        </Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="#produto">Produto</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#calculadora">Simulador</a>
          <a href="#planos">Planos</a>
          <a href="#contato">Fale Conosco</a>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.clientLoginLink} href="/cliente/entrar" aria-label="Entrar na Área do Cliente">
            Área do Cliente
          </Link>
          <Link className={styles.loginLink} href="/entrar" aria-label="Entrar na Área da Barbearia">
            Área da Barbearia
          </Link>
        </div>
      </header>

      {/* Hero Section com Mockup de Vídeo e Badges Dinâmicos */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroBackdrop}>
          <Image
            className={styles.heroImage}
            src="/barbeariasp-institutional-hero.png"
            alt="Interior acolhedor de uma barbearia com a marca BarbeariaSP na parede"
            fill
            priority
            sizes="100vw"
          />
          <div className={styles.heroShade} />
          <div className={styles.heroGlow} />
        </div>

        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroTag}>
              <span className={styles.tagDot} /> GESTÃO INTELIGENTE PARA BARBEARIAS MODERNAS
            </div>
            <h1 id="hero-title">
              Sistema para sua barbearia.<span>Agendamento online 24 horas.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Organize sua barbearia em um só lugar: agenda online 24h, cadastro de clientes, gestão da equipe, controle de comissões e relatórios. Seus clientes agendam pelo navegador, sem instalar aplicativo.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/entrar">
                Começar teste grátis
              </Link>
              <a className={styles.secondaryButtonDark} href="#como-funciona">
                Ver como funciona
              </a>
            </div>
            <div className={styles.heroTrustPill}>
              <span>✓ 30 dias grátis</span>
              <span>✓ Sem cartão no cadastro</span>
              <span>✓ Sem instalação de aplicativo</span>
            </div>
          </div>

          <div className={styles.heroMedia}>
            <LandingHeroVideo />
          </div>
        </div>
      </section>

      {/* Seção Dores vs Soluções */}
      <section className={styles.painVsGain} aria-labelledby="pain-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>EVOLUÇÃO DO SEU NEGÓCIO</p>
          <h2 id="pain-title">Organize a agenda e a gestão da sua barbearia</h2>
          <p>Veja como um sistema de gestão para barbearias ajuda a organizar horários, profissionais, atendimentos e comissões em uma única plataforma.</p>
        </div>

        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCardBad}>
            <div className={styles.comparisonHeader}>
              <span className={styles.cardStatusBad}>✕ Como é sem sistema</span>
              <h3>No WhatsApp e no Caderno</h3>
            </div>
            <ul>
              <li>Cliente manda mensagem às 23h e fica sem resposta até de manhã.</li>
              <li>Clientes esquecem o horário e deixam a cadeira vazia de última hora.</li>
              <li>Barbeiro perde tempo entre cortes respondendo mensagens de agendamento.</li>
              <li>Fechamento de comissões manual demorado e sujeito a atritos na equipe.</li>
            </ul>
          </div>

          <div className={styles.comparisonCardGood}>
            <div className={styles.comparisonHeader}>
              <span className={styles.cardStatusGood}>✓ Com o BarbeariaSP</span>
              <h3>Mais organização para sua barbearia</h3>
            </div>
            <ul>
              <li>Link no Instagram e WhatsApp aberto 24h com confirmação imediata.</li>
              <li>Confirmações e lembretes automáticos ajudam os clientes a lembrar dos horários agendados.</li>
              <li>Cada profissional acompanha sua agenda individual pelo próprio celular.</li>
              <li>Cálculo de comissões instantâneo e relatórios de faturamento na hora.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Seção de Demonstração com Telas Reais */}
      <section className={styles.product} id="produto" aria-labelledby="product-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>PRODUTO COMPLETO</p>
          <h2 id="product-title">Conheça o BarbeariaSP por completo</h2>
          <p>Da página pública à gestão, tudo funciona como uma única experiência fluida e sem atrito.</p>
        </div>
        <p className={styles.demoNotice}>
          Telas reais do aplicativo com dados fictícios de demonstração. Toque em uma imagem para ampliar.
        </p>
        {demoScreenGroups.map((group) => (
          <section className={styles.demoGroup} key={group.id} aria-labelledby={group.id}>
            <div className={styles.sectionHeading}>
              <h3 id={group.id}>{group.title}</h3>
              <p>{group.description}</p>
            </div>
            <div className={styles.screenGrid}>
              {group.screens.map((screen) => (
                <article className={styles.screenCard} key={screen.title}>
                  <a
                    className={styles.screenFrame}
                    href={screen.src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ampliar: ${screen.title} (abre em nova aba)`}
                  >
                    <Image
                      src={screen.src}
                      alt={screen.alt}
                      width={screen.width}
                      height={screen.height}
                      sizes="(max-width: 760px) 82vw, 360px"
                    />
                  </a>
                  <h4>{screen.title}</h4>
                  <p>{screen.text}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      {/* Como Funciona / Jornada */}
      <section className={styles.journey} id="como-funciona" aria-labelledby="journey-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>FLUXO DESCOMPLICADO</p>
          <h2 id="journey-title">Como funciona o agendamento online do BarbeariaSP</h2>
          <p>Um fluxo simples para o cliente e uma rotina muito mais organizada para sua equipe.</p>
        </div>
        <ol className={styles.journeyGrid}>
          {journey.map(([number, title, text]) => (
            <li key={number}>
              <span className={styles.journeyNumber}>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Recursos e Diferenciais */}
      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>ROTINA EM UM SÓ LUGAR</p>
          <h2 id="capabilities-title">Software de gestão para barbearias: tudo em um só lugar</h2>
        </div>
        <div className={styles.capabilityGrid}>
          {capabilities.map(([title, text]) => (
            <article key={title} className={styles.capabilityCard}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className={styles.managementPanel}>
          <div>
            <p className={styles.eyebrow}>PARA SUA EQUIPE. PARA SEU NEGÓCIO.</p>
            <h2>Menos improviso. Mais tempo para atender bem.</h2>
          </div>
          <ul>
            <li>Agenda da equipe com horários e profissionais organizados.</li>
            <li>Clientes, serviços, comissões e configurações centralizadas.</li>
            <li>Relatórios operacionais para acompanhar o faturamento e crescimento.</li>
          </ul>
        </div>
      </section>

      {/* Calculadora Interativa de Economia */}
      <section className={styles.calculatorSection} id="calculadora" aria-labelledby="calc-title">
        <LandingCalculator />
      </section>

      {/* Planos Oficiais Asaas com Toggle */}
      <section className={styles.plans} id="planos" aria-labelledby="plans-title">
        <div className={styles.trialBanner}>
          <div>
            <p className={styles.eyebrow}>EXPERIMENTE NA PRÁTICA</p>
            <h2>Experimente o sistema para sua barbearia por 30 dias grátis</h2>
            <p>Sem cartão no cadastro. Sem compromisso durante o teste.</p>
          </div>
          <Link className={styles.lightButton} href="/entrar">
            Testar grátis por 30 dias
          </Link>
        </div>

        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>PLANOS FLEXÍVEIS</p>
          <h2 id="plans-title">Escolha o plano ideal para o tamanho da sua barbearia</h2>
          <p>
            Preços totais pelo período contratado nos ciclos Mensal e Anual. O limite inclui o proprietário e os demais usuários da equipe; clientes não ocupam vagas. Para 8 ou mais usuários, sob consulta.
          </p>
          <div className={styles.launchPromoBadge}>
            🏷️ <strong>Condição Especial de Lançamento:</strong> Se houver reajuste futuro na tabela comercial, quem contratar no lançamento terá 15% de desconto sobre o preço de tabela vigente na renovação.
          </div>
        </div>

        {/* Seletor de Ciclo de Cobrança: Mensal vs Anual */}
        <div className={styles.cycleToggleContainer}>
          <input
            type="radio"
            name="plan-cycle"
            id="cycle-mensal"
            defaultChecked
            className={styles.cycleRadio}
          />
          <label htmlFor="cycle-mensal" className={styles.cycleLabel}>
            Mensal
          </label>

          <input
            type="radio"
            name="plan-cycle"
            id="cycle-anual"
            className={styles.cycleRadio}
          />
          <label htmlFor="cycle-anual" className={styles.cycleLabel}>
            <span>Anual</span>
            <span className={styles.cycleSavingsBadge}>10 meses por 1 ano (2 meses grátis)</span>
          </label>
        </div>

        <div className={styles.annualPromoBanner}>
          ⭐ <strong>Plano Anual:</strong> Valor de 10 meses por 1 ano inteiro de acesso (12 meses). Assinatura anual com renovação automática no cartão pelo painel.
        </div>

        <div className={styles.planGrid}>
          {subscriptionPlans.map((plan) => (
            <article
              className={`${styles.planCard} ${plan.code.includes("middle") ? styles.planCardFeatured : ""} ${plan.months === 12 ? styles.planCardAnnual : styles.planCardMonthly}`}
              key={plan.code}
            >
              {plan.code.includes("middle") && <span className={styles.featuredBadge}>MAIS ESCOLHIDO</span>}
              {plan.months === 12 && <span className={styles.annualBadge}>10 MESES POR 1 ANO</span>}
              <h3>{plan.name}</h3>
              <p>Até {plan.userLimit} usuários, incluindo o proprietário</p>
              <div className={styles.planPricing}>
                <strong>{formatBRL(plan.priceCents)}</strong>
                <small>
                  {plan.months === 12 ? "/ano no plano Anual (10 meses por 1 ano)" : "/mês no plano Mensal"}
                </small>
                {plan.months === 12 && (
                  <span className={styles.planEquivalentPrice}>
                    Equivalente a {formatBRL(Math.round(plan.priceCents / 12))}/mês · em até {plan.maxInstallments}x
                  </span>
                )}
              </div>
              {plan.months === 12 && (
                <div className={styles.annualSavingsNotice}>
                  🎉 Valor de 10 meses por 1 ano
                </div>
              )}
              <ul className={styles.planFeatures}>
                <li>✓ Página pública exclusiva da barbearia</li>
                <li>✓ Agendamento online 24h sem baixar app</li>
                <li>✓ Gestão de horários e bloqueios</li>
                <li>✓ Cálculo automático de comissões</li>
                <li>✓ Relatórios gerenciais e histórico</li>
              </ul>
              <Link className={styles.planButton} href="/entrar">Começar teste grátis</Link>
            </article>
          ))}
        </div>

        <div className={styles.customPlanNotice}>
          <p>
            Sua barbearia precisa de 8 ou mais usuários? Consulte as condições do plano personalizado.{" "}
            <a href="#contato">Fale com nossa equipe comercial</a>
          </p>
        </div>

        <p className={styles.alreadyUsingNotice}>
          Já usa o BarbeariaSP? <Link href="/entrar">Acesse o painel da barbearia</Link>
        </p>
      </section>

      {/* Formulário de Captação de Leads (CullenTech) */}
      <section className={styles.leadSection} id="contato" aria-labelledby="contact-title">
        <LeadCaptureForm />
      </section>

      {/* Segurança e Privacidade */}
      <section className={styles.trust} aria-labelledby="trust-title">
        <div>
          <p className={styles.eyebrow}>SEGURANÇA E PRIVACIDADE</p>
          <h2 id="trust-title">Acesso certo para cada pessoa</h2>
        </div>
        <p>
          Proprietários, gestores e profissionais acessam somente o que precisam. Os dados de cada barbearia permanecem estritamente isolados, e seus clientes têm controle total sobre seu cadastro e privacidade sob as diretrizes da LGPD.
        </p>
      </section>

      {/* FAQ Comercial e Técnico */}
      <section className={styles.faq} aria-labelledby="faq-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>TIRE SUAS DÚVIDAS</p>
          <h2 id="faq-title">Perguntas frequentes</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map(([question, answer]) => (
            <details key={question} className={styles.faqItem}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Chamada Final (CTA) */}
      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div>
          <h2 id="final-cta-title">Pronto para modernizar a gestão da sua barbearia?</h2>
          <p>Experimente o BarbeariaSP por 30 dias grátis e descubra como organizar sua agenda, seus clientes e sua equipe em um só lugar.</p>
        </div>
        <Link className={styles.primaryButton} href="/entrar">
          Começar teste grátis
        </Link>
      </section>

      {/* Rodapé Institucional */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Brand />
          <p>Tecnologia em agendamento e gestão para barbearias de alta performance.</p>
          <small>Operado por CullenTech Soluções Digitais Ltda. · CNPJ 39.299.793/0001-27</small>
        </div>
        <div className={styles.footerLinks}>
          <a href="#produto">Produto</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#calculadora">Simulador</a>
          <a href="#planos">Planos</a>
          <Link href="/cliente/entrar">Área do Cliente</Link>
          <Link href="/entrar">Área da Barbearia</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/regras-assinatura">Regras de assinatura</Link>
        </div>
        <p className={styles.footerCopy}>© 2026 BarbeariaSP. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
