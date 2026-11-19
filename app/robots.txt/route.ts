import { siteOrigin } from "../../utils/agent-content";

export function GET() {
  return new Response(`User-Agent: *
Content-Signal: search=yes, ai-train=no
Allow: /
Allow: /plataforma/entrar$
Disallow: /painel$
Disallow: /painel/
Disallow: /plataforma$
Disallow: /plataforma/
Disallow: /api$
Disallow: /api/

Sitemap: ${siteOrigin}/sitemap.xml
`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
