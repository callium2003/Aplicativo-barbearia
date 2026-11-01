import crypto from "node:crypto";
import {
  validateInfraWebhookPayload,
  ingestPlatformInfraWebhook,
} from "./platform-administration.mjs";

/**
 * Validação de segredo em tempo constante utilizando crypto.timingSafeEqual no servidor.
 * Ambos os segredos são convertidos em digests SHA-256 de 32 bytes fixos,
 * eliminando variações de tempo associadas à diferença de comprimento das strings
 * e garantindo execução determinística e segura contra ataques de temporização.
 *
 * @param {string} provided Segredo fornecido na requisição
 * @param {string} configured Segredo configurado no ambiente
 * @returns {boolean}
 */
export function validateInfraWebhookSecret(provided, configured) {
  if (typeof provided !== "string" || typeof configured !== "string") return false;
  if (provided.length === 0 || configured.length === 0) return false;
  try {
    const hashProvided = crypto.createHash("sha256").update(provided).digest();
    const hashConfigured = crypto.createHash("sha256").update(configured).digest();
    return crypto.timingSafeEqual(hashProvided, hashConfigured);
  } catch {
    return false;
  }
}

/**
 * Processa a ingestão de webhook de infraestrutura no servidor com autenticação timing-safe via crypto.timingSafeEqual.
 */
export async function processInfraWebhookPayload({ providedSecret, configuredSecret, rawBody, client }) {
  if (!configuredSecret) {
    return { status: 503, error: "Receptor de webhooks não configurado no servidor." };
  }

  if (!providedSecret || !validateInfraWebhookSecret(providedSecret, configuredSecret)) {
    return { status: 401, error: "Não autorizado." };
  }

  if (!rawBody) {
    return { status: 400, error: "Corpo da requisição deve ser um JSON válido." };
  }

  let validated;
  try {
    validated = validateInfraWebhookPayload(rawBody);
  } catch (err) {
    return { status: 400, error: err instanceof Error ? err.message : "Payload inválido." };
  }

  if (!client) {
    return { status: 500, error: "Configuração do Supabase indisponível no servidor." };
  }

  try {
    const data = await ingestPlatformInfraWebhook(client, {
      provider: validated.provider,
      serviceName: validated.service,
      status: validated.status,
      title: validated.title,
      description: validated.description,
      metadata: validated.metadata,
    });
    return { status: 200, ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gravar webhook.";
    return { status: 500, error: `Falha ao processar webhook no banco: ${message}` };
  }
}

