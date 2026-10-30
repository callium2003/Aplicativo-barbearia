import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("migration 20261029033000 defines contact_channel, attachment_url and resolution_summary", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261029033000_refine_platform_support_ticket_flow.sql", import.meta.url),
    "utf-8"
  );

  assert.match(content, /add column if not exists contact_channel text/i);
  assert.match(content, /add column if not exists attachment_url text/i);
  assert.match(content, /add column if not exists resolution_summary text/i);
  assert.match(content, /bucket_id = 'support-attachments'/i);
});

test("migration updates user_notifications event_type check constraint for support events", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261029033000_refine_platform_support_ticket_flow.sql", import.meta.url),
    "utf-8"
  );

  assert.match(content, /user_notifications_event_type_check/);
  assert.match(content, /'support_ticket_opened'/);
  assert.match(content, /'support_ticket_replied'/);
  assert.match(content, /'support_ticket_resolved'/);
});

test("migration defines close_platform_support_ticket with SECURITY DEFINER and audit", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261029033000_refine_platform_support_ticket_flow.sql", import.meta.url),
    "utf-8"
  );

  assert.match(content, /create or replace function public\.close_platform_support_ticket/);
  assert.match(content, /security definer/i);
  assert.match(content, /set search_path to ''/i);
  assert.match(content, /private\.write_platform_audit_event/);
  assert.match(content, /revoke all on function public\.close_platform_support_ticket/i);
  assert.match(content, /grant execute on function public\.close_platform_support_ticket/i);
});

test("migration ensures reply_platform_support_ticket defaults to in_progress and notifies tenant", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261029033000_refine_platform_support_ticket_flow.sql", import.meta.url),
    "utf-8"
  );

  assert.match(content, /v_target_status := 'in_progress'/i);
  assert.match(content, /insert into public\.user_notifications/);
  assert.match(content, /'support_ticket_replied'/);
});

test("client utilities pass contact_channel and attachment_url to support RPCs", async () => {
  const { createPlatformSupportTicket, replyPlatformSupportTicket, closePlatformSupportTicket } = await import(
    "../utils/platform-administration.mjs"
  );

  let capturedRpc = null;
  let capturedArgs = null;
  const mockClient = {
    rpc: async (name, args) => {
      capturedRpc = name;
      capturedArgs = args;
      return { data: "mock-id", error: null };
    },
  };

  await createPlatformSupportTicket(mockClient, {
    barbershopId: "b0000000-0000-0000-0000-000000000001",
    categoryId: "agenda",
    subject: "Problema com agendamento",
    description: "Não consigo salvar os horários de sábado.",
    contactChannel: "email: gestor@barbearia.com",
    attachmentUrl: "https://mock.storage/print.webp",
  });
  assert.equal(capturedRpc, "create_platform_support_ticket");
  assert.equal(capturedArgs.p_contact_channel, "email: gestor@barbearia.com");
  assert.equal(capturedArgs.p_attachment_url, "https://mock.storage/print.webp");

  await replyPlatformSupportTicket(mockClient, {
    ticketId: "t0000000-0000-0000-0000-000000000001",
    message: "Estamos analisando o caso.",
    attachmentUrl: "https://mock.storage/log.webp",
    status: "in_progress",
  });
  assert.equal(capturedRpc, "reply_platform_support_ticket");
  assert.equal(capturedArgs.p_attachment_url, "https://mock.storage/log.webp");
  assert.equal(capturedArgs.p_status, "in_progress");

  await closePlatformSupportTicket(mockClient, {
    ticketId: "t0000000-0000-0000-0000-000000000001",
    resolutionSummary: "Ajuste de configuração concluído e testado.",
    status: "resolved",
  });
  assert.equal(capturedRpc, "close_platform_support_ticket");
  assert.equal(capturedArgs.p_resolution_summary, "Ajuste de configuração concluído e testado.");
  assert.equal(capturedArgs.p_status, "resolved");
});

