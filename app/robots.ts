import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Public login must be crawlable so Google can read its noindex header.
      allow: ["/", "/plataforma/entrar$"],
      disallow: ["/painel$", "/painel/", "/plataforma$", "/plataforma/", "/api$", "/api/"],
    },
    sitemap: "https://barbeariasp.cullentech.com.br/sitemap.xml",
  };
}
