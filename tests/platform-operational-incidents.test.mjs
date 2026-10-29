import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIncidentSeverity,
  formatIncidentStatus,
  formatServiceName,
  validateIncidentInput,
  validateIncidentNote,
} from "../utils/platform-administration.mjs";

test("validateIncidentInput enforces required fields and valid enums", () => {
  // Erros de campos vazios ou curtos
  assert.throws(() => validateIncidentInput({ serviceName: "database", severity: "high", title: "DB", description: "Long enough description" }), {
    message: "Título do incidente deve ter pelo menos 5 caracteres.",
  });

  assert.throws(() => validateIncidentInput({ serviceName: "database", severity: "high", title: "Falha geral", description: "Curto" }), {
    message: "Descrição do incidente deve ter pelo menos 10 caracteres.",
  });

  assert.throws(() => validateIncidentInput({ serviceName: "invalid_service", severity: "high", title: "Falha geral", description: "Descrição detalhada do incidente" }), {
    message: "Serviço monitorado inválido.",
  });

  // Válido
  const validated = validateIncidentInput({
    serviceName: "database",
    severity: "critical",
    title: "Latência elevada no pool de conexões",
    description: "Detectada fila de espera acima de 20 conexões simultâneas.",
  });
  assert.equal(validated.serviceName, "database");
  assert.equal(validated.severity, "critical");
  assert.equal(validated.title, "Latência elevada no pool de conexões");
});

test("validateIncidentNote rejects empty or too short notes", () => {
  assert.throws(() => validateIncidentNote(""), {
    message: "Observação deve ter pelo menos 2 caracteres.",
  });
  assert.throws(() => validateIncidentNote(" a "), {
    message: "Observação deve ter pelo menos 2 caracteres.",
  });
  assert.equal(validateIncidentNote("Investigando logs no CloudWatch"), "Investigando logs no CloudWatch");
});

test("formatIncidentSeverity translates severity codes to PT-BR labels and colors", () => {
  assert.deepEqual(formatIncidentSeverity("critical"), { label: "Crítica", color: "danger" });
  assert.deepEqual(formatIncidentSeverity("high"), { label: "Alta", color: "warning" });
  assert.deepEqual(formatIncidentSeverity("medium"), { label: "Média", color: "bronze" });
  assert.deepEqual(formatIncidentSeverity("low"), { label: "Baixa", color: "info" });
  assert.deepEqual(formatIncidentSeverity("info"), { label: "Informativa", color: "neutral" });
  assert.deepEqual(formatIncidentSeverity("unknown"), { label: "Média", color: "bronze" });
});

test("formatIncidentStatus translates internal status codes to PT-BR", () => {
  assert.equal(formatIncidentStatus("open"), "Aberto");
  assert.equal(formatIncidentStatus("acknowledged"), "Reconhecido");
  assert.equal(formatIncidentStatus("investigating"), "Em Investigação");
  assert.equal(formatIncidentStatus("resolved"), "Resolvido");
  assert.equal(formatIncidentStatus("closed"), "Encerrado");
  assert.equal(formatIncidentStatus("unknown"), "Aberto");
});

test("formatServiceName translates service codes to clear human names", () => {
  assert.equal(formatServiceName("api"), "API Principal");
  assert.equal(formatServiceName("database"), "Banco de Dados Postgres");
  assert.equal(formatServiceName("auth"), "Autenticação GoTrue");
  assert.equal(formatServiceName("storage"), "Armazenamento Storage");
  assert.equal(formatServiceName("notifications"), "Fila de Notificações (Outbox)");
  assert.equal(formatServiceName("booking_gateway"), "Gateway de Agendamento");
  assert.equal(formatServiceName("cron_jobs"), "Tarefas Agendadas (Cron)");
});
