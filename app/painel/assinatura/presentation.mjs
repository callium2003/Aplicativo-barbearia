export const subscriptionSections = [
  { page: "cobrancas", title: "Cobranças", description: "Consulte apenas cobranças confirmadas e sua situação." },
  { page: "dados", title: "Meus dados", description: "Solicite um arquivo dos dados operacionais da sua barbearia." },
  { page: "cancelar", title: "Cancelamento", description: "Entenda a vigência antes de solicitar o cancelamento." },
];

export const publicPlansHref = "/#planos";

export const subscriptionCancellationOptions = [
  {
    id: "renew",
    title: "Renovar automaticamente",
    description: "A renovação seguirá a configuração da assinatura quando a cobrança estiver integrada.",
    defaultSelected: true,
  },
  {
    id: "end",
    title: "Não renovar ao final",
    description: "O acesso permanece até o fim do período já contratado.",
    defaultSelected: false,
  },
];
