import { subscriptionPlans } from "./subscription-plans.ts";
import { demoScreenGroups } from "../app/marketing-demo-screens.mjs";

export const siteOrigin = "https://barbeariasp.cullentech.com.br";
export const supportEmail = "contato@cullentech.com.br";
export const instagramUrl = "https://www.instagram.com/barbeariasp.app/";
export const productDescription = "Sistema web de agendamento online e gestão para barbearias, com agenda, clientes, equipe, serviços, comissões e relatórios. Funciona pelo navegador em todo o Brasil.";
// Content dates, not request/build dates. Update when the corresponding page changes.
export const institutionalPages = [
  { path: "/", label: "Produto e planos", lastModified: "2026-11-19" },
  { path: "/termos", label: "Termos de Uso", lastModified: "2026-11-16" },
  { path: "/privacidade", label: "Política de Privacidade", lastModified: "2026-11-13" },
  { path: "/regras-assinatura", label: "Regras de assinatura", lastModified: "2026-11-16" },
  { path: "/sobre", label: "Sobre o BarbeariaSP", lastModified: "2026-11-19" },
  { path: "/contato", label: "Contato e suporte", lastModified: "2026-11-19" },
] as const;

export const discoveryLinks = `<${siteOrigin}/llms.txt>; rel="describedby"; type="text/plain", <${siteOrigin}/index.md>; rel="alternate"; type="text/markdown", <${siteOrigin}/.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"`;

export const publicScreenshots = demoScreenGroups.flatMap(group => group.screens).map(screen => ({
  "@type": "ImageObject", "@id": `${siteOrigin}${screen.src}#image`, name: screen.title,
  contentUrl: `${siteOrigin}${screen.src}`, url: `${siteOrigin}${screen.src}`,
  caption: `${screen.text} Captura real do aplicativo com dados fictícios de demonstração.`,
  width: screen.width, height: screen.height,
}));
export const publicVideo = {
  "@type": "VideoObject", "@id": `${siteOrigin}/#video`, name: "Demonstração do aplicativo BarbeariaSP",
  description: "Apresentação em vídeo do aplicativo web BarbeariaSP, exibida na página inicial.",
  contentUrl: `${siteOrigin}/videos/barbeariasp-apresentacao.mp4`,
  thumbnailUrl: `${siteOrigin}/videos/barbeariasp-apresentacao-poster.jpg`,
  uploadDate: "2026-11-06", duration: "PT1M", inLanguage: "pt-BR",
};

export function publicGraph(faqs: readonly (readonly string[])[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteOrigin}/#organization`, name: "BarbeariaSP", url: siteOrigin,
        description: productDescription, email: supportEmail, sameAs: [instagramUrl],
        parentOrganization: { "@type": "Organization", name: "Cullentech", url: "https://cullentech.com.br" },
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: supportEmail, availableLanguage: "pt-BR", url: `${siteOrigin}/contato` } },
      { "@type": "WebSite", "@id": `${siteOrigin}/#website`, name: "BarbeariaSP", url: siteOrigin, inLanguage: "pt-BR", publisher: { "@id": `${siteOrigin}/#organization` }, video: { "@id": publicVideo["@id"] } },
      { "@type": "SoftwareApplication", "@id": `${siteOrigin}/#application`, name: "BarbeariaSP", url: siteOrigin,
        applicationCategory: "BusinessApplication", operatingSystem: "Web", description: productDescription,
        provider: { "@id": `${siteOrigin}/#organization` }, screenshot: publicScreenshots.map(image => ({ "@id": image["@id"] })),
        offers: subscriptionPlans.map(plan => ({ "@type": "Offer", name: plan.name, price: (plan.priceCents / 100).toFixed(2), priceCurrency: "BRL", url: `${siteOrigin}/#planos`, description: `Preço total por ${plan.months} mês(es). Até ${plan.userLimit} usuários, incluindo o proprietário.` })) },
      { "@type": "FAQPage", "@id": `${siteOrigin}/#faq`, mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
      publicVideo,
      ...publicScreenshots,
    ],
  };
}

export const publicProduct = { name: "BarbeariaSP", description: productDescription, url: siteOrigin,
  operator: "Cullentech", email: supportEmail, sameAs: [instagramUrl], trialDays: 30, trialRequiresCard: false,
  aboutUrl: `${siteOrigin}/sobre`, contactUrl: `${siteOrigin}/contato`, termsUrl: `${siteOrigin}/termos`,
  video: publicVideo, screenshots: publicScreenshots };

export const publicTools = [
  { name: "get_product_information", description: "Consulta informações públicas, contato e links oficiais do BarbeariaSP. Não acessa contas ou dados de barbearias.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
  { name: "list_subscription_plans", description: "Consulta os seis planos vigentes, preços em centavos BRL, meses de vigência, limites de usuários e parcelamento. Não contrata nem altera assinaturas.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
] as const;

export function executePublicTool(name: string, args: unknown) {
  if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length) throw new Error("Argumentos inválidos: esta ferramenta recebe um objeto vazio.");
  if (!publicTools.some(tool => tool.name === name)) throw new Error("Ferramenta desconhecida.");
  const data = name === "get_product_information" ? publicProduct : { currency: "BRL", plans: subscriptionPlans, conditions: "Proprietário incluído no limite. Mensal: renovação automática no cartão; Pix exige pagamento da fatura. Trimestral: nova compra para renovar, cartão em até 2x sem juros ou Pix à vista; parcelas não ampliam a vigência. Para 8 ou mais usuários, sob consulta." };
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export const llmsText = `# BarbeariaSP

> ${productDescription}

Operado por Cullentech. Teste grátis de 30 dias sem cartão. Suporte: ${supportEmail}.

## Páginas públicas
${institutionalPages.map(page => `- [${page.label}](${siteOrigin}${page.path})`).join("\n")}

## Recursos para agentes
- [Página inicial em Markdown](${siteOrigin}/index.md)
- [Sitemap](${siteOrigin}/sitemap.xml)
- [Cartão MCP: ferramentas públicas somente leitura](${siteOrigin}/.well-known/mcp/server-card.json)

## Perfil oficial
- [Instagram BarbeariaSP](${instagramUrl})

## Mídias oficiais
- [Vídeo de apresentação](${publicVideo.contentUrl})
- [Miniatura do vídeo](${publicVideo.thumbnailUrl})
${publicScreenshots.map(image => `- [${image.name} — captura com dados fictícios](${image.contentUrl})`).join("\n")}

Áreas autenticadas e dados de clientes não fazem parte destes recursos. Consulte as regras de assinatura para condições comerciais completas.
`;

export const homepageMarkdown = `# BarbeariaSP — sistema para barbearia com agenda online

> ${productDescription}

Operado por Cullentech. [Começar teste grátis de 30 dias sem cartão](${siteOrigin}/entrar).

## Como funciona
O cliente acessa a página da barbearia pelo navegador, escolhe serviço, profissional e horário. A equipe acompanha a agenda e o gestor organiza clientes, serviços, comissões e relatórios.

## Planos
Valores totais em reais (BRL); o proprietário está incluído no limite de usuários.
${subscriptionPlans.map(plan => `- ${plan.name}: R$ ${(plan.priceCents / 100).toFixed(2)} por ${plan.months} mês(es), até ${plan.userLimit} usuários; cartão em até ${plan.maxInstallments}x${plan.maxInstallments > 1 ? " sem juros" : ""}.`).join("\n")}

Mensal com renovação automática no cartão; Pix mensal exige pagamento da fatura. Trimestral sem renovação automática: nova compra para renovar; Pix à vista ou cartão em até 2x sem juros. Parcelas não ampliam a vigência. Para 8 ou mais usuários, sob consulta.

## Demonstrações do aplicativo
- [Vídeo de apresentação — 1 minuto](${publicVideo.contentUrl})
${publicScreenshots.map(image => `- [${image.name}](${image.contentUrl}): ${image.caption}`).join("\n")}

## Contato e informações institucionais
${institutionalPages.filter(page => page.path !== "/").map(page => `- [${page.label}](${siteOrigin}${page.path})`).join("\n")}
- [E-mail de suporte](mailto:${supportEmail})
- [Instagram oficial](${instagramUrl})
- [Área do Cliente](${siteOrigin}/cliente/entrar)
- [Área da Barbearia](${siteOrigin}/entrar)
`;

export function prefersMarkdown(accept: string | null) {
  const ranges = (accept ?? "").toLowerCase().split(",").map(item => {
    const [type, ...params] = item.trim().split(";");
    const quality = params.find(param => param.trim().startsWith("q="))?.trim().slice(2);
    const q = quality === undefined ? 1 : Number(quality);
    return { type: type.trim(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  });
  const markdown = ranges.find(range => range.type === "text/markdown")?.q ?? 0;
  const html = ranges.find(range => range.type === "text/html")?.q ?? ranges.find(range => range.type === "text/*")?.q ?? ranges.find(range => range.type === "*/*")?.q ?? 0;
  return markdown > 0 && markdown >= html;
}
