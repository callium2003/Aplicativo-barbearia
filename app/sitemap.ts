import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://barbeariasp.cullentech.com.br";

  // Only institutional pages; tenant pages require a separate indexability review.
  return ["/", "/termos", "/privacidade", "/regras-assinatura"].map((path) => ({
    url: `${origin}${path}`,
  }));
}
