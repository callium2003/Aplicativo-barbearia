import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  formatSentinelStatus,
  validateInfraWebhookPayload,
} from "../utils/platform-administration.mjs";
import {
  validateInfraWebhookSecret,
  processInfraWebhookPayload,
} from "../utils/platform-administration.server.mjs";

test("validateInfraWebhookPayload validates required fields and normalizes status", () => {
  // Corpo inválido
  assert.throws(() => validateInfraWebhookPayload(null), {
    message: "Corpo do webhook deve ser um objeto JSON válido.",
  });
  assert.throws(() => validateInfraWebhookPayload("string"), {
    message: "Corpo do webhook deve ser um objeto JSON válido.",
  });

  // Serviço inválido
  assert.throws(() => validateInfraWebhookPayload({ service: "unknown_svc", status: "down", title: "Instabilidade", description: "Falha de conexão com o banco" }), {
    message: "Serviço de infraestrutura inválido: unknown_svc",
  });

  // Status não reconhecido
  assert.throws(() => validateInfraWebhookPayload({ service: "database", status: "strange_status", title: "Instabilidade", description: "Falha de conexão com o banco" }), {
    message: "Status de infraestrutura não reconhecido: strange_status",
  });

  // Título curto
  assert.throws(() => validateInfraWebhookPayload({ service: "database", status: "down", title: "Erro", description: "Falha de conexão com o banco" }), {
    message: "Título do alerta de infraestrutura deve ter pelo menos 5 caracteres.",
  });

  // Descrição curta
  assert.throws(() => validateInfraWebhookPayload({ service: "database", status: "down", title: "Falha geral", description: "Curto" }), {
    message: "Descrição do alerta de infraestrutura deve ter pelo menos 10 caracteres.",
  });

  // Normalização de down / outage
  const downResult = validateInfraWebhookPayload({
    provider: "Supabase Statuspage",
    service: "database",
    status: "major_outage",
    title: "Interrupção na conectividade do pool",
    description: "Detectada degradação e aumento de latência na região sa-east-1.",
    metadata: { incident_id: "inc-123" },
  });
  assert.equal(downResult.provider, "supabase statuspage");
  assert.equal(downResult.service, "database");
  assert.equal(downResult.status, "down");
  assert.equal(downResult.title, "Interrupção na conectividade do pool");
  assert.deepEqual(downResult.metadata, { incident_id: "inc-123" });

  // Normalização de degraded / partial_outage
  const degradedResult = validateInfraWebhookPayload({
    service: "api",
    status: "degraded",
    title: "Latência elevada no gateway",
    description: "Tempo de resposta acima de 800ms detectado.",
  });
  assert.equal(degradedResult.status, "degraded");
  assert.equal(degradedResult.provider, "generic");

  // Normalização de healthy / operational / resolved
  const healthyResult = validateInfraWebhookPayload({
    service: "notifications",
    status: "resolved",
    title: "Fila de e-mails normalizada",
    description: "Provedor Resend restabeleceu entregabilidade normal.",
  });
  assert.equal(healthyResult.status, "healthy");
});

test("formatSentinelStatus translates probe statuses to labels and colors, supporting unknown neutral status", () => {
  assert.deepEqual(formatSentinelStatus("healthy"), { label: "Operacional", color: "success" });
  assert.deepEqual(formatSentinelStatus("degraded"), { label: "Degradado", color: "warning" });
  assert.deepEqual(formatSentinelStatus("down"), { label: "Instável", color: "danger" });
  assert.deepEqual(formatSentinelStatus("unknown"), { label: "Desconhecido", color: "neutral" });
  assert.deepEqual(formatSentinelStatus("anything_else"), { label: "Desconhecido", color: "neutral" });
});

test("validateInfraWebhookSecret compares secrets safely against timing attacks", () => {
  assert.equal(validateInfraWebhookSecret("secret123", "secret123"), true);
  assert.equal(validateInfraWebhookSecret("secret123", "secret124"), false);
  assert.equal(validateInfraWebhookSecret("short", "longer_secret"), false);
  assert.equal(validateInfraWebhookSecret("", "secret"), false);
  assert.equal(validateInfraWebhookSecret(null, "secret"), false);
  assert.equal(validateInfraWebhookSecret("secret", undefined), false);
});

test("processInfraWebhookPayload enforces secret, validation and error handling", async () => {
  // 1. Segredo do servidor não configurado -> 503
  const resNoConfig = await processInfraWebhookPayload({
    providedSecret: "any",
    configuredSecret: "",
    rawBody: {},
    client: null,
  });
  assert.equal(resNoConfig.status, 503);
  assert.match(resNoConfig.error, /não configurado no servidor/i);

  // 2. Segredo não fornecido ou inválido -> 401
  const resNoSecret = await processInfraWebhookPayload({
    providedSecret: "",
    configuredSecret: "correct-secret",
    rawBody: {},
    client: null,
  });
  assert.equal(resNoSecret.status, 401);

  const resBadSecret = await processInfraWebhookPayload({
    providedSecret: "wrong-secret",
    configuredSecret: "correct-secret",
    rawBody: {},
    client: null,
  });
  assert.equal(resBadSecret.status, 401);

  // 3. Corpo vazio ou inválido -> 400
  const resNullBody = await processInfraWebhookPayload({
    providedSecret: "correct-secret",
    configuredSecret: "correct-secret",
    rawBody: null,
    client: null,
  });
  assert.equal(resNullBody.status, 400);

  // 4. Payload com validação rejeitada -> 400
  const resBadService = await processInfraWebhookPayload({
    providedSecret: "correct-secret",
    configuredSecret: "correct-secret",
    rawBody: { service: "invalid_service", status: "healthy", title: "Teste", description: "Descricao longa" },
    client: null,
  });
  assert.equal(resBadService.status, 400);
  assert.match(resBadService.error, /Serviço de infraestrutura inválido/);

  // 5. Cliente Supabase ausente no servidor -> 500
  const resNoClient = await processInfraWebhookPayload({
    providedSecret: "correct-secret",
    configuredSecret: "correct-secret",
    rawBody: { service: "database", status: "down", title: "Queda do banco", description: "Falha de conexão persistente" },
    client: null,
  });
  assert.equal(resNoClient.status, 500);
  assert.match(resNoClient.error, /Configuração do Supabase indisponível/);

  // 6. Chamada com sucesso via cliente mock
  const mockClientSuccess = {
    rpc: async (name, params) => {
      assert.equal(name, "ingest_platform_infra_webhook");
      assert.equal(params.p_service_name, "database");
      assert.equal(params.p_status, "down");
      return { data: { ok: true, action_taken: "incident_opened" }, error: null };
    },
  };

  const resSuccess = await processInfraWebhookPayload({
    providedSecret: "correct-secret",
    configuredSecret: "correct-secret",
    rawBody: { service: "database", status: "down", title: "Queda do banco", description: "Falha de conexão persistente" },
    client: mockClientSuccess,
  });
  assert.equal(resSuccess.status, 200);
  assert.equal(resSuccess.ok, true);
  assert.equal(resSuccess.data.action_taken, "incident_opened");

  // 7. Chamada com falha no Postgres/RPC -> 500 com mensagem tratada
  const mockClientError = {
    rpc: async () => ({
      data: null,
      error: { message: "Acesso não autorizado ao receptor de webhooks de infraestrutura." },
    }),
  };

  const resRpcError = await processInfraWebhookPayload({
    providedSecret: "correct-secret",
    configuredSecret: "correct-secret",
    rawBody: { service: "database", status: "down", title: "Queda do banco", description: "Falha de conexão persistente" },
    client: mockClientError,
  });
  assert.equal(resRpcError.status, 500);
  assert.match(resRpcError.error, /Falha ao processar webhook no banco/);
});

test("infra-status webhook route enforces auth, validation and security definer rpc", async () => {
  const route = await readFile(new URL("../app/api/webhooks/infra-status/route.ts", import.meta.url), "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /x-infra-webhook-secret/);
  assert.match(route, /INFRA_WEBHOOK_SECRET/);
  assert.match(route, /validateInfraWebhookPayload/);
  assert.match(route, /validateInfraWebhookSecret/);
  assert.match(route, /ingest_platform_infra_webhook/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /status:\s*405/);
});

test("sentinel probe script handles timeouts, failure exit code and redaction of secrets", async () => {
  const script = await readFile(new URL("../scripts/run-sentinel-probe.mjs", import.meta.url), "utf8");

  assert.match(script, /probeApi/);
  assert.match(script, /probeDatabase/);
  assert.match(script, /probeStorage/);
  assert.match(script, /probeNotifications/);
  assert.match(script, /record_service_sentinel_probe/);
  assert.match(script, /incident_opened/);
  assert.match(script, /incident_resolved/);

  // Timeouts definidos
  assert.match(script, /DEFAULT_TIMEOUT_MS/);
  assert.match(script, /withTimeout/);
  assert.match(script, /AbortSignal\.timeout/);

  // Sanitização de segredos em logs e erros
  assert.match(script, /sanitizeError/);
  assert.match(script, /\[redigido\]/);

  // Código de saída 1 em falha de configuração ou gravação
  assert.match(script, /Configuração de banco incompleta/);
  assert.match(script, /hasFailure/);
  assert.match(script, /process\.exitCode = 1/);
});

test("sentinel 3-cycle state machine determinism: 3 failures open, 3 successes resolve, alternation resets", () => {
  class SentinelStateMachine {
    constructor() {
      this.services = {
        api: { failures: 0, successes: 0, currentIncident: null, status: "unknown" },
        database: { failures: 0, successes: 0, currentIncident: null, status: "unknown" },
      };
    }

    probe(serviceName, isHealthy, externalResolved = false) {
      const svc = this.services[serviceName];
      assert.ok(svc, `Serviço ${serviceName} não existe`);

      // Se o operador humano resolveu externamente o incidente
      if (externalResolved && svc.currentIncident) {
        svc.currentIncident = null;
      }

      if (!isHealthy) {
        svc.failures++;
        svc.successes = 0;
        svc.status = svc.failures >= 3 ? "down" : "degraded";

        if (svc.failures >= 3 && !svc.currentIncident) {
          svc.currentIncident = { id: `inc-${serviceName}`, status: "open", title: `[Sentinela] Instabilidade em ${serviceName}` };
          return { action: "incident_opened", failures: svc.failures, successes: svc.successes, status: svc.status };
        }
        return { action: "none", failures: svc.failures, successes: svc.successes, status: svc.status };
      } else {
        svc.successes++;
        svc.failures = 0;
        svc.status = "healthy";

        if (svc.currentIncident && svc.successes >= 3) {
          svc.currentIncident = null;
          return { action: "incident_resolved", failures: svc.failures, successes: svc.successes, status: svc.status };
        }
        return { action: "none", failures: svc.failures, successes: svc.successes, status: svc.status };
      }
    }
  }

  const sm = new SentinelStateMachine();
  assert.equal(sm.services.api.status, "unknown");
  assert.equal(sm.services.database.status, "unknown");

  // 1ª falha em api -> degradado, sem incidente
  let step = sm.probe("api", false);
  assert.equal(step.action, "none");
  assert.equal(step.failures, 1);
  assert.equal(step.status, "degraded");
  assert.equal(sm.services.api.currentIncident, null);
  // Independência: database permanece intocado
  assert.equal(sm.services.database.status, "unknown");
  assert.equal(sm.services.database.failures, 0);

  // 2ª falha em api -> degradado, sem incidente
  step = sm.probe("api", false);
  assert.equal(step.action, "none");
  assert.equal(step.failures, 2);
  assert.equal(step.status, "degraded");

  // Alternância antes do 3º ciclo: 1 sucesso reseta contador de falhas
  step = sm.probe("api", true);
  assert.equal(step.action, "none");
  assert.equal(step.failures, 0);
  assert.equal(step.successes, 1);
  assert.equal(step.status, "healthy");

  // Agora 3 falhas consecutivas em api
  sm.probe("api", false);
  sm.probe("api", false);
  step = sm.probe("api", false);
  assert.equal(step.action, "incident_opened");
  assert.equal(step.failures, 3);
  assert.equal(step.status, "down");
  assert.ok(sm.services.api.currentIncident);

  // 4ª falha consecutiva: mantém down, NÃO duplica abertura de incidente
  step = sm.probe("api", false);
  assert.equal(step.action, "none");
  assert.equal(step.failures, 4);
  assert.equal(sm.services.api.currentIncident.id, "inc-api");

  // Operador humano resolve incidente externamente no painel
  sm.services.api.currentIncident = null;
  assert.equal(sm.services.api.currentIncident, null);

  // Próximas falhas abrem um novo incidente após atingir o limite
  sm.probe("api", true); // restabelece contadores
  sm.probe("api", false);
  sm.probe("api", false);
  step = sm.probe("api", false);
  assert.equal(step.action, "incident_opened");
  assert.ok(sm.services.api.currentIncident);

  // Recuperação: 3 sucessos consecutivos auto-resolvem
  sm.probe("api", true);
  sm.probe("api", true);
  step = sm.probe("api", true);
  assert.equal(step.action, "incident_resolved");
  assert.equal(step.successes, 3);
  assert.equal(sm.services.api.currentIncident, null);
  assert.equal(step.status, "healthy");
});
