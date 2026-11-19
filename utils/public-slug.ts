type Config = { url: string; publishableKey: string };

/** Uses the same anonymous, public projection as the booking page. Never admin credentials. */
export async function publicSlugExists(slug: string, config: Config, fetcher: typeof fetch = fetch) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  const url = new URL("/rest/v1/public_barbershop_pages", config.url);
  url.searchParams.set("select", "slug");
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("limit", "1");
  const response = await fetcher(url, { headers: { apikey: config.publishableKey }, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Catálogo público indisponível.");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error("Catálogo público indisponível.");
  return rows.some(row => row && typeof row === "object" && "slug" in row && row.slug === slug);
}
