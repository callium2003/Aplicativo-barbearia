import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  formatSentinelStatus,
  validateInfraWebhookPayload,
} from "../utils/platform-administration.mjs";

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

test("formatSentinelStatus translates probe statuses to labels and colors", () => {
  assert.deepEqual(formatSentinelStatus("healthy"), { label: "Operacional", color: "success" });
  assert.deepEqual(formatSentinelStatus("degraded"), { label: "Degradado", color: "warning" });
  assert.deepEqual(formatSentinelStatus("down"), { label: "Instável", color: "danger" });
  assert.deepEqual(formatSentinelStatus("unknown"), { label: "Desconhecido", color: "neutral" });
});

test("infra-status webhook route enforces auth, validation and security definer rpc", async () => {
  const route = await readFile(new URL("../app/api/webhooks/infra-status/route.ts", import.meta.url), "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /x-infra-webhook-secret/);
  assert.match(route, /INFRA_WEBHOOK_SECRET/);
  assert.match(route, /validateInfraWebhookPayload/);
  assert.match(route, /ingest_platform_infra_webhook/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /status:\s*405/);
});

test("sentinel probe script executes multi-service checks with autonomous incident recording", async () => {
  const script = await readFile(new URL("../scripts/run-sentinel-probe.mjs", import.meta.url), "utf8");

  assert.match(script, /probeApi/);
  assert.match(script, /probeDatabase/);
  assert.match(script, /probeStorage/);
  assert.match(script, /probeNotifications/);
  assert.match(script, /record_service_sentinel_probe/);
  assert.match(script, /incident_opened/);
  assert.match(script, /incident_resolved/);
});
