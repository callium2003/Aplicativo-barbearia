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
  grace: { badge: "Carência operacional", title: "Cuide dos compromissos já marcados.", text: "Nesta fase de cinco dias, o acesso é limitado aos compromissos existentes, regularização e exportação. Novas reservas ficam indisponíveis.", cta: "Regularizar assinatura" },
  restricted: { badge: "Acesso restrito", title: "Seu próximo passo está aqui.", text: "A agenda e as demais operações estão indisponíveis. Até 15 dias após o término, você pode regularizar a assinatura e solicitar seus dados.", cta: "Reativar assinatura" },
  preserved: { badge: "Dados preservados", title: "A situação da assinatura exige atenção.", text: "Consulte seus dados ou fale com o atendimento para entender as opções disponíveis.", cta: "Conhecer o BarbeariaSP" },
  purged: { badge: "Dados eliminados", title: "A assinatura não está mais disponível.", text: "Fale com o atendimento para saber os próximos passos possíveis.", cta: "Conhecer o BarbeariaSP" },
};

type CheckoutState = "retorno" | "cancelado" | "expirado";
const checkoutCopy: Record<CheckoutState, { title: string; text: string; action: string }> = {
  retorno: {
    title: "Estamos confirmando seu pagamento",
    text: "Assim que o pagamento for confirmado, seu plano e a nova vigência aparecerão nesta página. Seu período atual continua válido durante a verificação.",
    action: "Verificar pagamento",
  },
  cancelado: {
    title: "Pagamento não concluído",
    text: "A contratação não foi concluída. Você pode escolher o plano novamente quando quiser continuar.",
    action: "Escolher plano",
  },
  expirado: {
    title: "O prazo para pagamento terminou",
    text: "Esse pagamento não está mais disponível. Escolha o plano novamente para gerar uma nova solicitação.",
    action: "Escolher plano",
  },
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
    {view.kind === "active" && view.trialRemainingDays !== undefined && view.trialRemainingDays > 0 && (
      <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(180, 83, 9, 0.08)", border: "1px solid rgba(180, 83, 9, 0.2)" }}>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--bronze-dark, #78350f)" }}>
          Período de teste gratuito ativo: resta(m) {view.trialRemainingDays} {view.trialRemainingDays === 1 ? "dia" : "dias"} (término em {subscriptionDate(view.trialEndsAt)})
        </p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "inherit" }}>
          Sua assinatura contratada iniciará automaticamente em seguida, com vigência garantida até {subscriptionDate(view.endsAt)}.
        </p>
      </div>
    )}
    {view.cancellationScheduled && <p>Cancelamento registrado. O período vigente permanece válido até {subscriptionDate(view.endsAt)}.</p>}
    {view.paymentAttention && <p>Há uma pendência financeira registrada. O período ainda vigente permanece válido.</p>}
    <div className={styles.actions}><Link className="product-button" href={view.kind === "pending" ? href("cobrancas") : publicPlansHref}>{copy.cta} <span aria-hidden="true">↗</span></Link></div>
  </section>;
}

export default function SubscriptionOverview({ sandboxEnabled = false, checkoutState }: { sandboxEnabled?: boolean; checkoutState?: CheckoutState }) {
  const { subscription, view, href } = useSubscriptionData();
  const plan = getPlan(subscription?.plan_code);
  const returned = checkoutState ? checkoutCopy[checkoutState] : null;
  return <div className={styles.stack}>
    {sandboxEnabled && returned && <section className={styles.card} role="status">
      <h2>{returned.title}</h2>
      <p>{returned.text}</p>
      {checkoutState === "retorno"
        ? <button className="product-button secondary" onClick={() => window.location.reload()}>{returned.action}</button>
        : <Link className="product-button secondary" href={href("planos")}>{returned.action}</Link>}
    </section>}
    <SubscriptionStateCard />
    {sandboxEnabled && (view.kind !== "active" && view.kind !== "pending" || Boolean(view.cancellationScheduled)) && <section className={styles.card}>
      <h2>{view.cancellationScheduled ? "Contratar nova assinatura" : "Contrate seu plano"}</h2>
      <p>{view.cancellationScheduled ? "Sua assinatura atual não será renovada ao término do ciclo. Escolha um novo plano para manter seu acesso sem interrupções." : "Escolha seu ciclo e continue para o pagamento seguro no Asaas."}</p>
      <Link className="product-button bronze" href={href("planos")}>Escolher plano</Link>
    </section>}
    {sandboxEnabled && (view.kind === "active" || view.kind === "pending") && !view.cancellationScheduled && <section className={styles.card}>
      <h2>{view.kind === "active" ? (view.trialRemainingDays ? "Assinatura contratada com período de teste ativo" : "Sua assinatura já está ativa") : "Sua contratação já está em andamento"}</h2>
      <p>{view.kind === "active" ? (view.trialRemainingDays ? `Seu plano ${plan?.name || ""} está confirmado e garantido. Você continua utilizando seus dias gratuitos de teste normalmente até ${subscriptionDate(view.trialEndsAt)}.` : "Não é possível iniciar outra contratação para o mesmo período. A opção Alterar plano ficará disponível em uma ação separada.") : "Conclua ou acompanhe o pedido atual antes de iniciar outra contratação."}</p>
      {view.kind === "pending" && <Link className="product-button secondary" href={href("cobrancas")}>Acompanhar pagamento</Link>}
    </section>}
    {view.kind !== "trial" && <div className={styles.metrics}>
      <div className={styles.metric}>
        <small>{view.trialRemainingDays ? "Assinatura contratada" : "Assinatura atual"}</small>
        <strong>{plan?.name || "Não informado"}</strong>
      </div>
      <div className={styles.metric}>
        <small>Vencimento da assinatura</small>
        <strong>
          {view.endsAt
            ? subscriptionDate(view.endsAt)
            : "Não informado"}
        </strong>
      </div>
    </div>}
    <section className={styles.nextSteps} aria-labelledby="subscription-next-steps">
      <div><p className="product-eyebrow">Central da assinatura</p><h2 id="subscription-next-steps">Gerencie sua assinatura</h2><p>Abra uma seção para consultar ou solicitar o que precisa.</p></div>
      <div className={styles.links}>
        {subscriptionSections.map((section) => <Link className={styles.linkCard} href={href(section.page)} key={section.page}><div><b>{section.title}</b><small>{section.description}</small></div><span aria-hidden="true">›</span></Link>)}
      </div>
    </section>
    <p className={styles.note}>Para conhecer outros planos ou condições comerciais, acesse a página principal do BarbeariaSP.</p>
  </div>;
}
