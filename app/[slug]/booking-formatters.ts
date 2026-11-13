import type { BusinessHour } from "./types";

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

export function formatHour(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function formatBusinessHour(hour: BusinessHour) {
  if (hour.is_closed || !hour.opens_at || !hour.closes_at) return "Fechado";
  return `${hour.opens_at.slice(0, 5)} às ${hour.closes_at.slice(0, 5)}`;
}

export const weekdayLabels = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export type ServiceIconOption = {
  key: string;
  label: string;
  src: string;
};

export const SERVICE_ICON_CATALOG: ServiceIconOption[] = [
  { key: "corte", label: "Corte de Cabelo", src: "/services/corte-v2.png" },
  { key: "corte-infantil", label: "Corte Infantil", src: "/services/corte-infantil.png" },
  { key: "corte-desenhos", label: "Corte com Desenhos", src: "/services/corte-desenhos.png" },
  { key: "corte-afro", label: "Corte Afro / Cacheado", src: "/services/corte-afro.png" },
  { key: "corte-feminino", label: "Corte Feminino", src: "/services/corte-feminino.png" },
  { key: "barba", label: "Barba", src: "/services/barba-v2.png" },
  { key: "barba-express", label: "Barba Express", src: "/services/barba-express.png" },
  { key: "barboterapia", label: "Barboterapia", src: "/services/barboterapia.png" },
  { key: "bigode", label: "Bigode", src: "/services/bigode.png" },
  { key: "sobrancelha", label: "Sobrancelha", src: "/services/sobrancelha-v2.png" },
  { key: "acabamento", label: "Acabamento", src: "/services/acabamento.png" },
  { key: "lavagem", label: "Lavagem", src: "/services/lavagem.png" },
  { key: "finalizacao", label: "Finalização", src: "/services/finalizacao.png" },
  { key: "hidratacao", label: "Hidratação Capilar", src: "/services/hidratacao.png" },
  { key: "progressiva", label: "Progressiva Masculina", src: "/services/progressiva.png" },
  { key: "selagem", label: "Selagem Capilar", src: "/services/selagem.png" },
  { key: "botox", label: "Botox Capilar", src: "/services/botox.png" },
  { key: "relaxamento", label: "Relaxamento Capilar", src: "/services/relaxamento.png" },
  { key: "pigmentacao", label: "Pigmentação", src: "/services/pigmentacao.png" },
  { key: "platinado", label: "Platinado / Nevou", src: "/services/platinado.png" },
  { key: "luzes", label: "Luzes e Reflexos", src: "/services/luzes.png" },
  { key: "camuflagem", label: "Camuflagem de Fios Brancos", src: "/services/camuflagem.png" },
  { key: "limpeza-facial", label: "Limpeza Facial", src: "/services/limpeza-facial.png" },
  { key: "depilacao-nasal", label: "Depilação Nasal", src: "/services/depilacao-nasal.png" },
  { key: "depilacao-orelhas", label: "Depilação de Orelhas", src: "/services/depilacao-orelhas.png" },
  { key: "manicure-masculina", label: "Manicure Masculina", src: "/services/manicure-masculina.png" },
  { key: "pedicure-masculina", label: "Pedicure Masculina", src: "/services/pedicure-masculina.png" },
  { key: "manicure-feminina", label: "Manicure Feminina", src: "/services/manicure-feminina.png" },
  { key: "pedicure-feminina", label: "Pedicure Feminina", src: "/services/pedicure-feminina.png" },
  { key: "generico", label: "Combo / Outro serviço", src: "/services/generico.png" },
];

function normalizeServiceText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Ordem importa: serviços específicos antes das categorias gerais.
const SERVICE_RULES: Array<[RegExp, string]> = [
  [/\b(manicure|unhas?\s+(?:das\s+)?maos?)\b.*\b(feminin|mulher)|\b(feminin\w*|mulher)\b.*\bmanicure/, "/services/manicure-feminina.png"],
  [/\b(pedicure|unhas?\s+(?:dos\s+)?pes?)\b.*\b(feminin|mulher)|\b(feminin\w*|mulher)\b.*\bpedicure/, "/services/pedicure-feminina.png"],
  [/\bmanicure|\bunhas?\s+(?:das\s+)?maos?\b/, "/services/manicure-masculina.png"],
  [/\bpedicure|\bunhas?\s+(?:dos\s+)?pes?\b|\bpodolog/, "/services/pedicure-masculina.png"],
  [/\b(depila\w*|cera)\b.*\b(nariz|nasal)|\b(nariz|nasal)\b/, "/services/depilacao-nasal.png"],
  [/\b(depila\w*|cera)\b.*\b(orelha|ouvido)|\b(orelha|ouvido)s?\b/, "/services/depilacao-orelhas.png"],
  [/\b(barboterapia|barbaterapia|toalha\s+quente)/, "/services/barboterapia.png"],
  [/\bbarba\b.*\b(express|rapida)|\b(express)\b.*\bbarba\b/, "/services/barba-express.png"],
  [/\b(platinad|nevou|nevad|descolor)/, "/services/platinado.png"],
  [/\b(luzes|reflexo|mechas)/, "/services/luzes.png"],
  [/\b(camufla|grisalh|fios\s+brancos|cabelos?\s+brancos)/, "/services/camuflagem.png"],
  [/\bprogressiva/, "/services/progressiva.png"],
  [/\bselagem/, "/services/selagem.png"],
  [/\bbotox/, "/services/botox.png"],
  [/\b(relaxamento|alisamento)/, "/services/relaxamento.png"],
  [/\b(limpeza|facial|pele|esfolia|mascara|skincare)/, "/services/limpeza-facial.png"],
  [/\b(pigmenta|tintura|colora)/, "/services/pigmentacao.png"],
  [/\b(hidrata|nutri|reconstru|cauteriza|tratamento\s+capilar)/, "/services/hidratacao.png"],
  [/\b(lavagem|lavar|shampoo|higieniza)/, "/services/lavagem.png"],
  [/\b(finaliza|escova|pomada|modela|penteado|secagem|styling)/, "/services/finalizacao.png"],
  [/\b(acabamento|pezinho|contorno|maquina|disfarce|aparar)/, "/services/acabamento.png"],
  [/\b(sobrancelha|pinca)/, "/services/sobrancelha-v2.png"],
  [/\b(bigode|cavanhaque)/, "/services/bigode.png"],
  [/\b(infantil|kids|crianca|baby|bebe|menino)/, "/services/corte-infantil.png"],
  [/\b(desenho|risco|freestyle|hair\s*tattoo|navalhad)/, "/services/corte-desenhos.png"],
  [/\b(afro|cachead|cacho|crespo|black\s+power|twist|dread)/, "/services/corte-afro.png"],
  [/\b(feminin|mulher|chanel|repicad)/, "/services/corte-feminino.png"],
];

export function serviceImage(name: string) {
  const lower = normalizeServiceText(name);
  if (!lower.trim()) return "/services/generico.png";

  const hasHair = /\b(corte|cabelo|social|degrade|fade|undercut|tesoura|infantil|kids|masculino|raspad)/.test(lower);
  const hasBeard = /\b(barba|barbaterapia|barboterapia)/.test(lower);

  if ((hasHair && hasBeard) || /\b(combo|pacote|noivo)/.test(lower)) {
    return "/services/generico.png";
  }
  for (const [pattern, src] of SERVICE_RULES) {
    if (pattern.test(lower)) return src;
  }
  if (hasBeard || /\bnavalha/.test(lower)) return "/services/barba-v2.png";
  if (hasHair) return "/services/corte-v2.png";
  return "/services/generico.png";
}
