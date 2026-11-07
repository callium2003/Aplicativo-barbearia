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
  title: "BarbeariaSP | Agenda e gestão para sua barbearia",
  description:
    "A plataforma definitiva para barbearias: agendamento online 24h sem baixar aplicativo, equipe organizada, comissões automáticas e mais tempo livre. Teste grátis por 30 dias.",
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
    title: "BarbeariaSP | Sua barbearia no controle. Sua agenda sempre aberta.",
    description:
      "Agendamento online sem aplicativo, equipe organizada e gestão transparente para sua barbearia crescer. Experimente na prática por 30 dias grátis.",
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
    title: "BarbeariaSP | Sistema de Gestão para Barbearias",
    description: "Agendamento online 24h e gestão descomplicada para sua barbearia. Teste grátis por 30 dias.",
    images: ["/barbeariasp-institutional-hero.png"],
  },
};

const capabilities = [
  ["Agenda online 24/7", "Disponibilidade e horários organizados para toda a equipe, aberta dia e noite."],
  ["Serviços flexíveis", "Até três serviços no mesmo agendamento, com cálculo inteligente de tempo total."],
  ["Equipe e permissões", "Acessos separados para proprietário, gestor e profissional da cadeira."],
  ["Clientes organizados", "Histórico de atendimentos, aniversários e preferências sempre à mão."],
  ["Comissões e Relatórios", "Visão transparente de serviços, ocupação, faturamento e comissões automáticas."],
  ["Lembretes automáticos", "Confirmações e lembretes para reduzir até 70% das faltas e atrasos."],
];

const journey = [
  ["01", "Cliente agenda em 3 cliques", "Acessa a página exclusiva da sua barbearia pelo celular ou Instagram, escolhe serviço, barbeiro e horário."],
  ["02", "Equipe se organiza", "A agenda inteligente bloqueia o horário em tempo real e impede choque de horários."],
  ["03", "Atendimento acontece", "O cliente recebe lembrete e cada profissional acompanha a própria rotina pelo celular."],
  ["04", "Você acompanha o crescimento", "Faturamento, comissões de balcão e histórico de clientes consolidados automaticamente."],
];

const faqs = [
  ["Preciso de cartão de crédito para começar o teste?", "Não. O cadastro inicial e os 30 dias de teste são 100% gratuitos e não exigem cartão de crédito ou compromisso financeiro."],
  ["Meu cliente precisa baixar ou instalar algum aplicativo?", "Não. Seu cliente acessa a página pública exclusiva da sua barbearia direto pelo navegador do celular (link na bio do Instagram ou WhatsApp) e agenda em poucos segundos."],
  ["Posso cadastrar minha equipe de barbeiros?", `Sim. Os planos incluem até ${subscriptionPlans[0].professionalLimit} profissionais ativos. Acima desse limite, a contratação de profissionais ativos, sob consulta. Profissionais inativos não consomem o limite.`],
  ["Quanto custam os planos?", `Preços totais pelo período contratado: ${subscriptionPlans.map((plan) => `${plan.name}: ${formatBRL(plan.priceCents)} por ${plan.months} ${plan.months === 1 ? "mês" : "meses"}`).join("; ")}. O parcelamento não altera a duração do plano contratado.`],
  ["Posso parcelar no cartão?", `${subscriptionPlans.map((plan) => `${plan.name}: ${plan.maxInstallments === 1 ? "1x" : `até ${plan.maxInstallments}x`}`).join("; ")}. O parcelamento não altera a duração do plano contratado.`],
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
              Sua barbearia no controle.<span>Sua agenda sempre aberta.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Acabe com a perda de tempo no WhatsApp e reduza as faltas de clientes. Agendamento online 24h sem baixar aplicativo, equipe organizada e comissões automáticas.
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
              <span>✓ Configuração em 5 minutos</span>
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
          <h2 id="pain-title">Pare de perder dinheiro com gestão improvisada</h2>
          <p>Veja a diferença que a BarbeariaSP faz na sua rotina desde o primeiro dia:</p>
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
              <h3>Sua Barbearia no Piloto Automático</h3>
            </div>
            <ul>
              <li>Link no Instagram e WhatsApp aberto 24h com confirmação imediata.</li>
              <li>Lembretes automáticos que reduzem faltas em até 70%.</li>
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
          <h2 id="journey-title">Da agenda do cliente à gestão da barbearia</h2>
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
          <h2 id="capabilities-title">Recursos que simplificam o dia a dia</h2>
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
            <h2>Teste por 30 dias. Configure, use e veja na prática.</h2>
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
            Preços totais pelo período contratado. Acima de {subscriptionPlans[0].professionalLimit} profissionais ativos, sob consulta. Profissionais inativos não consomem o limite.
          </p>
          <div className={styles.launchPromoBadge}>
            🏷️ <strong>Condição Especial de Lançamento:</strong> Garanta o valor atual nas renovações ou 15% de desconto sobre o preço de tabela vigente.
          </div>
        </div>

        <div className={styles.planGrid}>
          {subscriptionPlans.slice(0, 3).map((plan) => (
            <article className={`${styles.planCard} ${plan.code.includes("middle") ? styles.planCardFeatured : ""}`} key={plan.code}>
              {plan.code.includes("middle") && <span className={styles.featuredBadge}>MAIS ESCOLHIDO</span>}
              <h3>{plan.name}</h3>
              <p>Até {plan.professionalLimit} profissionais ativos na equipe</p>
              <div className={styles.planPricing}>
                <strong>{formatBRL(plan.priceCents)}</strong>
                <small>/mês no plano mensal</small>
              </div>
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
            Possui uma rede com 8 ou mais profissionais? Temos planos com limites ampliados e suporte prioritário.{" "}
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
          <h2 id="final-cta-title">Pronto para organizar sua barbearia?</h2>
          <p>Comece seu teste hoje mesmo e use todos os recursos liberados durante 30 dias.</p>
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
