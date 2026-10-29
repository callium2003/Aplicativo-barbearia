import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTicketSlaStatus,
  formatTicketStatus,
  formatTicketPriority,
  validateTicketInput,
} from "../utils/platform-administration.mjs";

test("validateTicketInput rejects missing or too short subject and description", () => {
  assert.throws(
    () => validateTicketInput({ subject: "oi", description: "descrição longa de teste", categoryId: "billing" }),
    /Assunto do chamado deve ter pelo menos 5 caracteres/,
  );

  assert.throws(
    () => validateTicketInput({ subject: "Assunto válido", description: "curta", categoryId: "billing" }),
    /Descrição do chamado deve ter pelo menos 10 caracteres/,
  );

  assert.throws(
    () => validateTicketInput({ subject: "Assunto válido", description: "Descrição válida completa", categoryId: "" }),
    /Categoria é obrigatória/,
  );

  assert.doesNotThrow(() =>
    validateTicketInput({
      subject: "Dúvida sobre fatura",
      description: "Gostaria de entender a cobrança do mês",
      categoryId: "billing",
      priority: "normal",
    }),
  );
});

test("formatTicketStatus translates internal statuses to user-friendly PT-BR labels", () => {
  assert.equal(formatTicketStatus("open"), "Aberto");
  assert.equal(formatTicketStatus("in_progress"), "Em atendimento");
  assert.equal(formatTicketStatus("waiting_client"), "Aguardando barbearia");
  assert.equal(formatTicketStatus("resolved"), "Resolvido");
  assert.equal(formatTicketStatus("closed"), "Encerrado");
  assert.equal(formatTicketStatus("unknown"), "unknown");
});

test("formatTicketPriority translates internal priorities to user-friendly PT-BR labels", () => {
  assert.equal(formatTicketPriority("low"), "Baixa");
  assert.equal(formatTicketPriority("normal"), "Normal");
  assert.equal(formatTicketPriority("high"), "Alta");
  assert.equal(formatTicketPriority("urgent"), "Urgente");
  assert.equal(formatTicketPriority("unknown"), "unknown");
});

test("calculateTicketSlaStatus correctly identifies breached, due soon and on-time SLAs", () => {
  const now = new Date();

  // Caso 1: Respondido dentro do prazo
  const pastDue = new Date(now.getTime() + 10 * 3600 * 1000).toISOString();
  const answeredAt = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  const answeredSla = calculateTicketSlaStatus(pastDue, answeredAt, "in_progress");
  assert.equal(answeredSla.state, "responded_on_time");
  assert.equal(answeredSla.label, "Respondido no prazo");

  // Caso 2: Não respondido e prazo vencido (Breached)
  const expiredDue = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const breachedSla = calculateTicketSlaStatus(expiredDue, null, "open");
  assert.equal(breachedSla.state, "breached");
  assert.equal(breachedSla.label, "SLA de 1 dia útil expirado");

  // Caso 3: Não respondido e vence em menos de 4 horas (Due soon)
  const soonDue = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  const soonSla = calculateTicketSlaStatus(soonDue, null, "open");
  assert.equal(soonSla.state, "due_soon");
  assert.match(soonSla.label, /Vence em/);

  // Caso 4: Não respondido com bastante tempo restante (On time)
  const comfortableDue = new Date(now.getTime() + 20 * 3600 * 1000).toISOString();
  const onTimeSla = calculateTicketSlaStatus(comfortableDue, null, "open");
  assert.equal(onTimeSla.state, "on_time");
  assert.match(onTimeSla.label, /Prazo: até 1 dia útil/);
});
