import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLeadPayload, handleLeadFormSubmissionResult } from "../utils/leads.ts";

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

test("leads API route is dynamic and enforces input validation, service_role insert and error propagation", async () => {
  const route = await readFile(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /validateLeadPayload/);
  assert.match(route, /platform_leads/);
  assert.match(route, /source:\s*"landing_page"/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);

  // Garante que falhas de persistência propagam erro HTTP 500 sem falso positivo
  assert.match(route, /if\s*\(error\)\s*\{[\s\S]*status:\s*500/);
  assert.match(route, /success:\s*false/);
});

test("leads migration enforces least privilege, service_role insert and blocks anon direct write", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261106220000_restrict_platform_leads_service_role.sql", import.meta.url),
    "utf8"
  );

  assert.match(migration, /revoke all on public\.platform_leads from public, anon, authenticated/);
  assert.match(migration, /drop policy if exists "allow_public_lead_submission" on public\.platform_leads/);
  assert.match(migration, /grant insert on public\.platform_leads to service_role/);
  assert.doesNotMatch(migration, /grant insert on public\.platform_leads to anon/);
  assert.doesNotMatch(migration, /grant insert on public\.platform_leads to authenticated/);
  assert.match(migration, /create policy "allow_service_role_insert" on public\.platform_leads/);
});

test("lead capture form preserves visitor inputs on failure and displays clear error", async () => {
  const form = await readFile(new URL("../app/components/LeadCaptureForm.tsx", import.meta.url), "utf8");

  // Garante que o estado de erro exibe mensagem sem limpar os inputs
  assert.match(form, /status === "error"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /setStatus\("error"\)/);
  assert.match(form, /handleLeadFormSubmissionResult\(/);
  assert.match(form, /setMessage\(next\.message\)/);

  // Garante que a limpeza de campos só ocorre na confirmação inequívoca de sucesso
  const current = { fullName: "Visitante", whatsapp: "11999999999", barbershopName: "Exemplo", cityState: "São Paulo/SP", notes: "Contato", status: "submitting", message: "" };
  const rejected = handleLeadFormSubmissionResult(current, false, { success: true });
  assert.equal(rejected.status, "error");
  for (const field of ["fullName", "whatsapp", "barbershopName", "cityState", "notes"]) assert.equal(rejected[field], current[field]);
  const accepted = handleLeadFormSubmissionResult(current, true, { success: true });
  assert.equal(accepted.status, "success");
  for (const field of ["fullName", "whatsapp", "barbershopName", "cityState", "notes"]) assert.equal(accepted[field], "");
});

test("leads API route ensures strict error handling and preserves visitor input on failures", async () => {
  const route = await readFile(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");

  // Rejeição estrita de bad JSON
  assert.match(route, /catch\s*\{[\s\S]*Formato de requisição inválido[\s\S]*status:\s*400/);

  // Rejeição estrita de dados inválidos de negócio
  assert.match(route, /if\s*\(!validation\.valid\)\s*\{[\s\S]*status:\s*400/);

  // Honeypot responde 200 com mensagem sem gravar no banco
  assert.match(route, /if\s*\(validation\.lead\.isBot\)\s*\{[\s\S]*status:\s*200/);

  // Persistência com service_role e falha de banco retornando 500 sem falso positivo
  assert.match(route, /client\.from\("platform_leads"\)\.insert/);
  assert.match(route, /if\s*\(error\)\s*\{[\s\S]*status:\s*500/);
  assert.match(route, /success:\s*false/);
});
