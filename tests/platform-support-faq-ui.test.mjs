import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { moreDestinationsForRole } from "../app/painel/navigation.mjs";

test("moreDestinationsForRole exposes Suporte e Ajuda to owner and manager only", () => {
  const ownerDestinations = moreDestinationsForRole("owner");
  const managerDestinations = moreDestinationsForRole("manager");
  const barberDestinations = moreDestinationsForRole("barber");

  const ownerSupport = ownerDestinations.find((d) => d.href === "/painel/suporte");
  assert.ok(ownerSupport, "owner must have /painel/suporte");
  assert.equal(ownerSupport.label, "Suporte e Ajuda");

  const managerSupport = managerDestinations.find((d) => d.href === "/painel/suporte");
  assert.ok(managerSupport, "manager must have /painel/suporte");
  assert.equal(managerSupport.label, "Suporte e Ajuda");

  const barberSupport = barberDestinations.find((d) => d.href === "/painel/suporte");
  assert.equal(barberSupport, undefined, "barber must not have /painel/suporte");
});

test("tenant support page defines FAQ search, SLA guarantee notice, and ticket creation form", async () => {
  const source = await readFile(new URL("../app/painel/suporte/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Suporte e Ajuda/);
  assert.match(source, /Perguntas Frequentes \(FAQ\)/);
  assert.match(source, /Meus Chamados/);
  assert.match(source, /SLA garantido de 1 dia útil/);
  assert.match(source, /createPlatformSupportTicket/);
  assert.match(source, /replyPlatformSupportTicket/);
  assert.match(source, /updatePlatformSupportTicketStatus/);
});

test("platform support page defines ticket monitoring, SLA tracking, and CullenTech responses", async () => {
  const source = await readFile(new URL("../app/plataforma/suporte/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Central de Chamados & Suporte/);
  assert.match(source, /listAllPlatformSupportTickets/);
  assert.match(source, /calculateTicketSlaStatus/);
  assert.match(source, /replyPlatformSupportTicket/);
  assert.match(source, /updatePlatformSupportTicketStatus/);
  assert.match(source, /SLA crítico ou vencido/);
});
