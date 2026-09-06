"use client";

import Link from "next/link";
import { getPlan } from "@/utils/subscription-plans";
import { subscriptionDate, type SubscriptionKind } from "@/utils/subscription-view";
import { useSubscriptionData } from "./SubscriptionContext";
import styles from "./subscription.module.css";

const stateCopy: Record<SubscriptionKind, { badge: string; title: string; text: string; cta: string }> = {
  unknown: { badge: "Situação não disponível", title: "Vamos conferir sua assinatura.", text: "Ainda não há informações suficientes para apresentar a situação do seu plano. Você pode conhecer as opções disponíveis.", cta: "Conhecer os planos" },
  trial: { badge: "Teste gratuito", title: "Sua barbearia tem espaço para crescer.", text: "Explore a agenda, organize a equipe e acompanhe seus resultados durante o teste gratuito. Sem cartão e sem cobrança automática ao terminar.", cta: "Conhecer os planos" },
  active: { badge: "Assinatura ativa", title: "Tudo pronto para a sua rotina.", text: "Acompanhe aqui o período do seu plano e as informações da sua assinatura.", cta: "Ver opções de plano" },
  ended: { badge: "Período encerrado", title: "Vamos planejar o próximo passo?", text: "O período informado para sua assinatura terminou. Conheça os planos para continuar. O fim do teste gratuito não gera dívida.", cta: "Ver planos disponíveis" },
  pending: { badge: "Aguardando pagamento", title: "Sua contratação está em andamento.", text: "A liberação do novo período depende da confirmação do pagamento. Seu período atual, se ainda válido, continua preservado.", cta: "Acompanhar pagamento" },
  grace: { badge: "Carência operacional", title: "Cuide dos compromissos já marcados.", text: "Nesta fase de três dias, o acesso é limitado aos compromissos existentes, regularização e exportação. Novas reservas ficam indisponíveis.", cta: "Regularizar assinatura" },
  restricted: { badge: "Acesso restrito", title: "Seu próximo passo está aqui.", text: "A agenda e as demais operações estão indisponíveis. Até 15 dias após o término, você pode regularizar a assinatura e solicitar seus dados.", cta: "Reativar assinatura" },
  preserved: { badge: "Dados preservados", title: "Ainda dá tempo de voltar.", text: "A janela comum de exportação terminou. Seus dados operacionais permanecem preservados até o prazo de eliminação, sem acesso para consulta.", cta: "Ver planos para reativar" },
  purged: { badge: "Dados eliminados", title: "Um novo começo para sua barbearia.", text: "A eliminação dos dados operacionais foi concluída. Uma nova contratação não recupera o histórico eliminado. Registros de retenção legal seguem tratamento separado.", cta: "Conhecer os planos" },
};

export function SubscriptionStateCard() {
  const { view, href } = useSubscriptionData();
  const copy = stateCopy[view.kind];
  return <section className={styles.hero} data-kind={view.kind} aria-labelledby="subscription-state-title">
    <span className={styles.badge}>{copy.badge}</span>
    <h2 id="subscription-state-title">{copy.title}</h2>
    <p>{copy.text}</p>
    {view.kind === "trial" && view.remainingDays !== undefined && <>
      <div className={styles.progress} role="progressbar" aria-label="Dias restantes do teste" aria-valuemin={0} aria-valuemax={30} aria-valuenow={Math.min(30, view.remainingDays)}>
        <span style={{ width: Math.min(100, view.remainingDays / 30 * 100) + "%" }} />
      </div>
      <p><b>{view.remainingDays} {view.remainingDays === 1 ? "dia restante" : "dias restantes"}</b> · até {subscriptionDate(view.endsAt)}</p>
    </>}
    {view.cancellationScheduled && <p>Cancelamento registrado. O período vigente permanece válido até {subscriptionDate(view.endsAt)}.</p>}
    {view.paymentAttention && <p>Há uma pendência financeira registrada. O período ainda vigente permanece válido.</p>}
    <div className={styles.actions}><Link className="product-button" href={href(view.kind === "pending" ? "cobrancas" : "planos")}>{copy.cta} <span aria-hidden="true">↗</span></Link></div>
  </section>;
}

export default function SubscriptionOverview() {
  const { subscription, view, activeProfessionals, href } = useSubscriptionData();
  const plan = getPlan(subscription?.plan_code);
  return <div className={styles.stack}>
    <SubscriptionStateCard />
    <div className={styles.metrics}>
      <div className={styles.metric}><small>Plano informado</small><strong>{view.kind === "trial" ? "Teste de 30 dias" : plan?.name || "Não informado"}</strong></div>
      <div className={styles.metric}><small>Fim do período informado</small><strong>{subscriptionDate(view.endsAt)}</strong></div>
      <div className={styles.metric}><small>Profissionais ativos</small><strong>{activeProfessionals ?? "Não disponível"}</strong></div>
    </div>
    {activeProfessionals !== null && activeProfessionals > 5 && <p className={styles.note}>Sua equipe tem mais de cinco profissionais ativos. A contratação deve ser feita sob consulta. Todos os profissionais e seus históricos permanecem preservados.</p>}
    <div className={styles.links}>
      {[["planos", "◇", "Escolher plano", "Compare duração, valores e parcelas."], ["cobrancas", "▤", "Minhas cobranças", "Pagamentos, estornos e comprovantes."], ["cancelar", "↶", "Gerenciar cancelamento", "Entenda o período e as condições."], ["dados", "↓", "Dados da barbearia", "Exportação, prazos e privacidade."]].map(([page, icon, title, text]) =>
        <Link className={styles.linkCard} href={href(page)} key={page}><span aria-hidden="true">{icon}</span><div><b>{title}</b><small>{text}</small></div><span aria-hidden="true">›</span></Link>)}
    </div>
    <p className={styles.note}>A contratação online está em preparação. Você já pode consultar os planos; nenhuma cobrança será feita nesta etapa.</p>
  </div>;
}
