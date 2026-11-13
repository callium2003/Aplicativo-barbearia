const ID = /^[a-zA-Z0-9_-]{1,128}$/;

export function safeSandboxCheckoutUrl(value: unknown, checkoutId: unknown): string {
  if (typeof checkoutId !== "string" || !ID.test(checkoutId) || typeof value !== "string" || value.length > 2048) throw new Error("Invalid provider link");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid provider link"); }
  const pathForm = /^\/[0-9]+\/checkoutSession\/show\/[a-zA-Z0-9_-]+$/.test(url.pathname)
    && url.pathname.endsWith(`/${checkoutId}`) && !url.search;
  const queryForm = url.pathname === "/checkoutSession/show" && url.searchParams.size === 1 && url.searchParams.get("id") === checkoutId;
  if (url.origin !== "https://sandbox.asaas.com" || url.username || url.password || url.hash || (!pathForm && !queryForm)) throw new Error("Invalid provider link");
  return url.href;
}

export function safeSandboxInvoiceUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) throw new Error("Invalid provider link");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid provider link"); }
  const validInvoicePath = /^\/i\/[a-zA-Z0-9_-]+$/.test(url.pathname) && !url.search;
  if (url.origin !== "https://sandbox.asaas.com" || url.username || url.password || url.hash || !validInvoicePath) {
    throw new Error("Invalid provider link");
  }
  return url.href;
}
