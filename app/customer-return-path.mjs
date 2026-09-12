const DEFAULT_CUSTOMER_RETURN_PATH = "/meus-agendamentos";

const ALLOWED_CUSTOMER_RETURN_PATHS = new Set([
  "/meus-agendamentos",
  "/meu-perfil",
  "/meu-perfil/privacidade",
]);

function hasUnsafeRepresentation(value) {
  let candidate = value;
  for (let index = 0; index < 3; index += 1) {
    if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/u.test(candidate)) return true;
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) return false;
      candidate = decoded;
    } catch {
      return true;
    }
  }
  return candidate.includes("\\") || /[\u0000-\u001f\u007f]/u.test(candidate);
}

export function safeCustomerReturnPath(value, origin) {
  if (typeof value !== "string" || !value || typeof origin !== "string") return DEFAULT_CUSTOMER_RETURN_PATH;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_CUSTOMER_RETURN_PATH;
  if (hasUnsafeRepresentation(value)) return DEFAULT_CUSTOMER_RETURN_PATH;
  try {
    const trustedOrigin = new URL(origin);
    if (!["http:", "https:"].includes(trustedOrigin.protocol)) return DEFAULT_CUSTOMER_RETURN_PATH;
    const destination = new URL(value, trustedOrigin);
    if (destination.origin !== trustedOrigin.origin) return DEFAULT_CUSTOMER_RETURN_PATH;
    if (!ALLOWED_CUSTOMER_RETURN_PATHS.has(destination.pathname)) return DEFAULT_CUSTOMER_RETURN_PATH;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_CUSTOMER_RETURN_PATH;
  }
}
