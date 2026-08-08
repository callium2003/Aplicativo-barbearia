import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification center is wired into the management shell and preferences live in settings", async () => {
  const [shell, bell, page, preferences, settingsLayout, css] = await Promise.all([
    read("app/painel/PanelShell.tsx"),
    read("app/painel/NotificationBell.tsx"),
    read("app/painel/notificacoes/page.tsx"),
    read("app/painel/configurar/NotificationPreferencesPanel.tsx"),
    read("app/painel/configurar/layout.tsx"),
    read("app/notification-ui.css"),
  ]);

  assert.match(shell, /NotificationBell/);
  assert.match(shell, /\/painel\/notificacoes/);
  assert.match(shell, /\/painel\/configurar#notificacoes/);
  assert.match(bell, /user_notifications/);
  assert.match(bell, /postgres_changes/);
  assert.match(bell, /recipient_user_id=eq\./);

  assert.match(page, /user_notifications/);
  assert.match(page, /Histórico/);
  assert.match(page, /Não lidas/);
  assert.match(page, /Marcar todas como lidas/);
  assert.match(page, /get_notification_delivery_monitor/);
  assert.doesNotMatch(page, /save_my_notification_preference/);
  assert.doesNotMatch(page, /Minhas preferências/);

  assert.match(settingsLayout, /NotificationPreferencesPanel/);
  assert.match(settingsLayout, /product-shell/);
  assert.match(settingsLayout, /Configurações/);
  assert.match(preferences, /get_my_notification_preferences|initialPreferences/);
  assert.match(preferences, /save_my_notification_preference/);
  assert.match(preferences, /Dentro do sistema/);
  assert.match(preferences, /E-mail/);
  assert.match(preferences, /id="notificacoes"/);
  assert.match(css, /notification-popover/);
});

test("notification migration keeps delivery and authorization server-side", async () => {
  const sql = await read("supabase/migrations/20260808093323_add_notification_center_preferences_and_delivery_queue.sql");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /recipient_user_id/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /private\.dispatch_appointment_event/);
  assert.match(sql, /appointment_cancelled/);
  assert.match(sql, /appointment_rescheduled/);
  assert.match(sql, /appointment_reminder_24h/);
  assert.match(sql, /claim_notification_outbox/);
  assert.match(sql, /complete_notification_outbox/);
  assert.match(sql, /revoke all on function public\.claim_notification_outbox\(integer\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.claim_notification_outbox\(integer\) to service_role/i);
});

test("notification worker requires server secrets and uses the verified sender fallback", async () => {
  const worker = await read("scripts/process-notifications.mjs");
  assert.match(worker, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(worker, /const resendApiKey = process\.env\.RESEND_API_KEY;/);
  assert.match(worker, /const fromEmail = process\.env\.NOTIFICATION_FROM_EMAIL \|\| "notificacoes@barbeariasp\.cullentech\.com\.br";/);
  assert.match(worker, /enqueue_due_appointment_reminders/);
  assert.match(worker, /claim_notification_outbox/);
  assert.match(worker, /complete_notification_outbox/);
  assert.doesNotMatch(worker, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(worker, /resendApiKey\s*=\s*["'`]/);
  assert.doesNotMatch(worker, /Bearer\s+re_[A-Za-z0-9_-]+/);
});

test("notification Edge Function and cron runtime are reproducible without hardcoded secrets", async () => {
  const [edgeFunction, runtimeMigration, deployGuide] = await Promise.all([
    read("supabase/functions/process-notifications/index.ts"),
    read("supabase/migrations/20260808183718_version_notification_worker_runtime.sql"),
    read("supabase/functions/process-notifications/README.md"),
  ]);

  assert.match(edgeFunction, /@supabase\/supabase-js@2\.97\.0/);
  assert.match(edgeFunction, /get_notification_worker_secrets/);
  assert.match(edgeFunction, /x-cron-secret/);
  assert.match(edgeFunction, /enqueue_due_appointment_reminders/);
  assert.match(edgeFunction, /claim_notification_outbox/);
  assert.match(edgeFunction, /complete_notification_outbox/);
  assert.match(edgeFunction, /notificacoes@barbeariasp\.cullentech\.com\.br/);
  assert.doesNotMatch(edgeFunction, /Bearer\s+re_[A-Za-z0-9_-]+/);

  assert.match(runtimeMigration, /barbeariasp_project_url/);
  assert.match(runtimeMigration, /barbeariasp_resend_api_key/);
  assert.match(runtimeMigration, /barbeariasp_notification_cron_secret/);
  assert.match(runtimeMigration, /private\.configure_notification_worker_cron/);
  assert.match(runtimeMigration, /cron\.schedule/);
  assert.match(runtimeMigration, /net\.http_post/);
  assert.match(runtimeMigration, /revoke all on function public\.get_notification_worker_secrets\(\) from public, anon, authenticated/i);
  assert.doesNotMatch(runtimeMigration, /irszgnkzqseljowckrgz/);
  assert.doesNotMatch(runtimeMigration, /re_[A-Za-z0-9_-]+/);

  assert.match(deployGuide, /--no-verify-jwt/);
  assert.match(deployGuide, /select private\.configure_notification_worker_cron\(\)/);
});
