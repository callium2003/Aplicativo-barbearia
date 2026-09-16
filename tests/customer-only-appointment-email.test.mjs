import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function readCustomerEmailMigration() {
  const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
  const migrationName = (await readdir(migrationDirectory)).find((name) =>
    name.endsWith("_customer_only_appointment_emails.sql"),
  );
  assert.ok(migrationName, "a migration de e-mails transacionais exclusivos ao cliente deve existir");
  return read(`supabase/migrations/${migrationName}`);
}

test("appointment e-mails are customer-only, personalized and use the non-replyable Reply-To", async () => {
  const [sql, edgeFunction] = await Promise.all([
    readCustomerEmailMigration(),
    read("supabase/functions/process-notifications/index.ts"),
  ]);

  assert.match(sql, /notification_anchor_at/i);
  assert.match(sql, /created_at/i);
  assert.match(sql, /before update of starts_at, professional_id/i);
  assert.match(sql, /interval '26 hours'/i);
  assert.match(sql, /new.status = 'scheduled'/i);
  assert.match(sql, /old.professional_id is distinct from new.professional_id/i);
  assert.match(sql, /if p_default_email then/i);
  assert.doesNotMatch(sql, /p_event_type = 'appointment_confirmed'/i);
  assert.doesNotMatch(sql, /dispatch_appointment_event\(new,'appointment_confirmed'\)/i);

  for (const expectedCopy of [
    "Sua reserva na",
    "Seu agendamento na",
    "foi cancelado",
    "foi reagendado",
    "Lembramos que seu horário",
    "Esta é uma mensagem automática. Não responda a este e-mail.",
    "acesse sua página:",
    "BarbeariaSP",
    "https://barbeariasp.cullentech.com.br/",
  ]) {
    assert.match(sql, new RegExp(expectedCopy.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  }

  assert.match(edgeFunction, /const FROM_EMAIL = "notificacoes@barbeariasp\.cullentech\.com\.br"/);
  assert.match(edgeFunction, /const AUTOMATIC_REPLY_TO = "nao-responda@barbeariasp\.cullentech\.com\.br"/);
  assert.match(edgeFunction, /reply_to: \[AUTOMATIC_REPLY_TO\]/);
});

test("staff preferences keep only in-app appointment alerts", async () => {
  const [sql, preferences, page] = await Promise.all([
    readCustomerEmailMigration(),
    read("app/painel/configurar/NotificationPreferencesPanel.tsx"),
    read("app/painel/notificacoes/page.tsx"),
  ]);

  assert.match(sql, /save_my_notification_preference/i);
  assert.match(sql, /p_email_enabled := false/i);
  assert.match(preferences, /Dentro do sistema/);
  assert.match(preferences, /p_email_enabled: false/);
  assert.doesNotMatch(preferences, /\n\s*email_enabled:/);
  assert.doesNotMatch(preferences, /appointment_confirmed/);
  assert.doesNotMatch(preferences, /appointment_reminder_24h/);
  assert.doesNotMatch(page, /email_enabled/);
  assert.doesNotMatch(page, /appointment_confirmed/);
});
