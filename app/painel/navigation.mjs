export const managementLinks = [
  { key: "home", href: "/painel", label: "Início", icon: "⌂" },
  { key: "agenda", href: "/painel/agenda", label: "Agenda", icon: "▣" },
  { key: "clients", href: "/painel/clientes", label: "Clientes", icon: "◉" },
  { key: "professionals", href: "/painel/profissionais", label: "Equipe", icon: "♧" },
  { key: "more", href: "/painel/mais", label: "Mais", icon: "•••" },
];

export const managementMobileKeys = ["home", "agenda", "clients", "professionals", "more"];

const commonMoreDestinations = [
  {
    href: "/painel/dados-da-barbearia",
    label: "Dados da barbearia",
    description: "Perfil público, contatos, endereço e foto.",
    icon: "▤",
  },
  {
    href: "/painel/servicos",
    label: "Serviços",
    description: "Catálogo, preços, duração e disponibilidade.",
    icon: "✂",
  },
  {
    href: "/painel/horarios",
    label: "Horários",
    description: "Funcionamento semanal da barbearia.",
    icon: "◷",
  },
  {
    href: "/painel/notificacoes",
    label: "Notificações",
    description: "Central, histórico e preferências de comunicação.",
    icon: "●",
  },
];

const reportsDestination = {
  href: "/painel/relatorios",
  label: "Relatórios",
  description: "Resultados, operação e comissões da barbearia.",
  icon: "◫",
};

const accountDestination = {
  href: "/painel/minha-conta",
  label: "Minha conta",
  description: "Dados do responsável e informações da operação.",
  icon: "◎",
};

const subscriptionDestination = {
  href: "/painel/assinatura",
  label: "Assinatura",
  description: "Plano, vigência e cobranças da plataforma.",
  icon: "◇",
};

export function moreDestinationsForRole(role) {
  if (role === "owner") {
    return [
      ...commonMoreDestinations,
      reportsDestination,
      subscriptionDestination,
      accountDestination,
    ];
  }
  if (role === "manager") {
    return [...commonMoreDestinations, reportsDestination, accountDestination];
  }
  return [];
}
