"use client";

import Link from "next/link";
import { getPlan } from "@/utils/subscription-plans";
import { subscriptionDate, type SubscriptionKind } from "@/utils/subscription-view";
import { useSubscriptionData } from "./SubscriptionContext";
import { publicPlansHref, subscriptionSections } from "./presentation.mjs";
import styles from "./subscription.module.css";

const stateCopy: Record<SubscriptionKind, { badge: string; title: string; text: string; cta: string }> = {
  unknown: { badge: "Situação não disponível", title: "Vamos conferir sua assinatura.", text: "Ainda não há informações suficientes para apresentar a situação atual da assinatura.", cta: "Conhecer o BarbeariaSP" },
  trial: { badge: "Período de teste", title: "Sua assinatura está em teste.", text: "Acompanhe aqui a vigência atual da sua assinatura.", cta: "Conhecer o BarbeariaSP" },
  active: { badge: "Assinatura ativa", title: "Tudo pronto para a sua rotina.", text: "Acompanhe aqui a situação e a vigência da sua assinatura atual.", cta: "Conhecer o BarbeariaSP" },
  ended: { badge: "Período encerrado", title: "Sua assinatura precisa de atenção.", text: "A vigência informada para a assinatura atual terminou.", cta: "Conhecer o BarbeariaSP" },
  pending: { badge: "Aguardando pagamento", title: "Sua contratação está em andamento.", text: "A liberação do novo período depende da confirmação do pagamento. Seu período atual, se ainda válido, continua preservado.", cta: "Acompanhar pagamento" },
  grace: { badge: "Carência operacional", title: "Cuide dos compromissos já marcados.", text: "Nesta fase de três dias, o acesso é limitado aos compromissos existentes, regularização e exportação. Novas reservas ficam indisponíveis.", cta: "Regularizar assinatura" },
  restricted: { badge: "Acesso restrito", title: "Seu próximo passo está aqui.", text: "A agenda e as demais operações estão indisponíveis. Até 15 dias após o término, você pode regularizar a assinatura e solicitar seus dados.", cta: "Reativar assinatura" },
  preserved: { badge: "Dados preservados", title: "A situação da assinatura exige atenção.", text: "Consulte seus dados ou fale com o atendimento para entender as opções disponíveis.", cta: "Conhecer o BarbeariaSP" },
  purged: { badge: "Dados eliminados", title: "A assinatura não está mais disponível.", text: "Fale com o atendimento para saber os próximos passos possíveis.", cta: "Conhecer o BarbeariaSP" },
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
    <div className={styles.actions}><Link className="product-button" href={view.kind === "pending" ? href("cobrancas") : publicPlansHref}>{copy.cta} <span aria-hidden="true">↗</span></Link></div>
  </section>;
}

export default function SubscriptionOverview() {
  const { subscription, view, href } = useSubscriptionData();
  const plan = getPlan(subscription?.plan_code);
  return <div className={styles.stack}>
    <SubscriptionStateCard />
    <div className={styles.metrics}>
      <div className={styles.metric}><small>Assinatura atual</small><strong>{view.kind === "trial" ? "Período de teste" : plan?.name || "Não informado"}</strong></div>
      <div className={styles.metric}><small>Vigência informada</small><strong>{subscriptionDate(view.endsAt)}</strong></div>
    </div>
    <section className={styles.nextSteps} aria-labelledby="subscription-next-steps">
      <div><p className="product-eyebrow">Central da assinatura</p><h2 id="subscription-next-steps">Gerencie sua assinatura</h2><p>Abra uma seção para consultar ou solicitar o que precisa.</p></div>
      <div className={styles.links}>
        {subscriptionSections.map((section) => <Link className={styles.linkCard} href={href(section.page)} key={section.page}><div><b>{section.title}</b><small>{section.description}</small></div><span aria-hidden="true">›</span></Link>)}
      </div>
    </section>
    <p className={styles.note}>Para conhecer outros planos ou condições comerciais, acesse a página principal do BarbeariaSP.</p>
  </div>;
}
