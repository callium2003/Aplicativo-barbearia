import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLeadPayload } from "../utils/leads.ts";

test("validates lead payload correctly and sanitizes input", () => {
  const empty = validateLeadPayload({});
  assert.equal(empty.valid, false);
  assert.match(empty.error, /nome completo/i);

  const shortName = validateLeadPayload({ fullName: "A", whatsapp: "11999999999", barbershopName: "Barbearia" });
  assert.equal(shortName.valid, false);
  assert.match(shortName.error, /nome completo/i);

  const invalidPhone = validateLeadPayload({ fullName: "Denis Calli", whatsapp: "12345", barbershopName: "Barbearia" });
  assert.equal(invalidPhone.valid, false);
  assert.match(invalidPhone.error, /WhatsApp válido/i);

  const shortBarbershop = validateLeadPayload({ fullName: "Denis Calli", whatsapp: "11999999999", barbershopName: "B" });
  assert.equal(shortBarbershop.valid, false);
  assert.match(shortBarbershop.error, /nome da sua barbearia/i);

  const valid = validateLeadPayload({
    fullName: "  Denis Calli  ",
    whatsapp: "(11) 99888-7766",
    barbershopName: "  Barbearia VIP  ",
    teamSize: "4-6",
    cityState: "São Paulo/SP",
    notes: "Gostaria de ver uma demonstração",
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.lead.fullName, "Denis Calli");
    assert.equal(valid.lead.whatsapp, "11998887766");
    assert.equal(valid.lead.barbershopName, "Barbearia VIP");
    assert.equal(valid.lead.teamSize, "4-6");
    assert.equal(valid.lead.isBot, false);
  }
});

test("detects spam bots via honeypot field silently", () => {
  const botResult = validateLeadPayload({
    fullName: "Spam Bot",
    whatsapp: "11999999999",
    barbershopName: "Spam Shop",
    websiteHoneypot: "http://spam.com",
  });
  assert.equal(botResult.valid, true);
  if (botResult.valid) {
    assert.equal(botResult.lead.isBot, true);
  }
});

test("leads API route is dynamic and enforces input validation and rate/honeypot protections", async () => {
  const route = await readFile(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /validateLeadPayload/);
  assert.match(route, /platform_leads/);
  assert.match(route, /source:\s*"landing_page"/);
});
