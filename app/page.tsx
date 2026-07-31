import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barbearia SP | Agenda para sua barbearia",
  description: "Uma página, agenda e gestão simples para barbearias.",
};

const features = [
  ["Sua página", "Nome, foto, contatos, serviços e preços em um link próprio."],
  ["Sua equipe", "Cadastre barbeiros, horários e permissões de acesso."],
  ["Sua agenda", "Organize horários e acompanhe cada atendimento em um só lugar."],
];

const plans = [
  ["Mensal", "Para começar sem compromisso", "Cobrança a cada mês"],
  ["Trimestral", "Para quem quer economizar", "Cobrança a cada 3 meses"],
  ["Semestral", "Mais tempo para crescer", "Cobrança a cada 6 meses"],
  ["Anual", "O melhor custo-benefício", "Cobrança uma vez por ano"],
];

export default function Home() {
  return <main>
    <nav><div className="brand"><span>BARBEARIA</span>SP</div><div className="navlinks"><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><Link href="/entrar">Entrar</Link><Link className="button small" href="/entrar">Começar teste grátis</Link></div></nav>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">AGENDE. ORGANIZE. CRESÇA.</p><h1>Sua barbearia<br/><em>em um só link.</em></h1><p className="lead">Crie a página da sua barbearia, mostre seus serviços e deixe a agenda organizada para você e seus profissionais.</p><div className="actions"><Link className="button" href="/entrar">Teste grátis por 30 dias</Link><a className="text-link" href="#planos">Ver planos →</a></div><p className="note">Sem cartão no cadastro. Sem aplicativo para o cliente baixar.</p></div>
      <div className="phone"><div className="phone-top"><span>9:41</span><span>•••</span></div><div className="phone-brand">BARBEARIA <b>SP</b></div><div className="cover"></div><h3>Barbearia do Centro</h3><p className="sub">Cortes • Barba • Estilo</p><div className="service"><span>Corte masculino</span><b>R$ 55</b></div><div className="service"><span>Barba completa</span><b>R$ 40</b></div><button>Agendar horário</button></div>
    </section>
    <section id="como-funciona" className="steps"><p className="eyebrow">FEITO PARA BARBEARIAS</p><h2>O cliente encontra.<br/>A barbearia controla.</h2><div className="feature-grid">{features.map(([title,text],i)=><article key={title}><span className="number">0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section id="planos" className="plans"><p className="eyebrow">PLANOS E TESTE GRATUITO</p><h2>Experimente antes<br/>de contratar.</h2><p className="plans-intro">Toda barbearia nova recebe 30 dias gratuitos com acesso completo. Ao fim do teste, escolha o período que fizer mais sentido para seu negócio.</p><div className="trial-card"><div><b>30 DIAS GRÁTIS</b><h3>Comece agora, sem cartão.</h3><p>Configure sua página, serviços, profissionais e agenda durante o período de teste.</p></div><Link className="button" href="/entrar">Começar teste grátis</Link></div><div className="plans-grid">{plans.map(([name, description, billing])=><article key={name} className="plan-card"><p>{name.toUpperCase()}</p><h3>{name}</h3><strong>Valor a definir</strong><span>{description}</span><small>{billing}</small><Link href="/entrar">Quero este plano</Link></article>)}</div><p className="plans-note">Os valores serão informados antes da contratação. O pagamento será processado de forma segura.</p></section>
    <section id="acesso" className="cta"><div><p className="eyebrow">PRIMEIRA VERSÃO</p><h2>Coloque sua barbearia no ar.</h2><p>Comece criando seu espaço. Depois, você personaliza tudo: marca, equipe, preços e agenda.</p></div><Link className="button light" href="/entrar">Criar minha página</Link></section>
    <footer><div className="brand"><span>BARBEARIA</span>SP</div><p>Agenda simples para negócios de estilo.</p></footer>
  </main>;
}
