/**
 * @file app/customer-return-path.mjs
 * Módulo isomórfico compartilhado de sanitização e proteção contra open-redirect na área do cliente.
 * Desenvolvido em ESM nativo (.mjs) para execução direta pelo Node.js test runner
 * e importação no Next.js (App Router) sem gerar rotas adicionais.
 */

const DEFAULT_CUSTOMER_RETURN_PATH = "/meus-agendamentos";

const ALLOWED_CUSTOMER_RETURN_PATHS = new Set([
  "/",
  "/meus-agendamentos",
  "/meu-perfil",
  "/meu-perfil/privacidade",
]);

const RESERVED_PUBLIC_PATHS = new Set([
  "entrar", "painel", "cliente", "cadastro-inicial", "convite", "encerramento-conta",
  "api", "auth", "design", "privacidade", "termos", "regras-assinatura", "meu-perfil", "meus-agendamentos",
]);

export function isPublicBarbershopPath(pathname) {
  const slug = pathname.slice(1);
  return pathname.startsWith("/") && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_PUBLIC_PATHS.has(slug);
}

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
    if (!ALLOWED_CUSTOMER_RETURN_PATHS.has(destination.pathname) && !isPublicBarbershopPath(destination.pathname)) return DEFAULT_CUSTOMER_RETURN_PATH;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_CUSTOMER_RETURN_PATH;
  }
}

export function customerAuthRedirect(origin, returnTo) {
  const destination = safeCustomerReturnPath(returnTo, origin);
  return `${origin}/cliente/entrar?returnTo=${encodeURIComponent(destination)}`;
}
