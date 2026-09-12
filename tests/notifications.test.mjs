import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification center keeps only the user's internal history and channel preferences", async () => {
  const [shell, bell, page, preferences, settingsLayout, css, eslintConfig] = await Promise.all([
    read("app/painel/PanelShell.tsx"),
    read("app/painel/NotificationBell.tsx"),
    read("app/painel/notificacoes/page.tsx"),
    read("app/painel/configurar/NotificationPreferencesPanel.tsx"),
    read("app/painel/configurar/layout.tsx"),
    read("app/notification-ui.css"),
    read("eslint.config.mjs"),
  ]);

  assert.match(shell, /NotificationBell/);
  assert.match(shell, /\/painel\/notificacoes/);
  assert.match(shell, /\/painel\/notificacoes/);
  assert.match(bell, /user_notifications/);
  assert.match(bell, /postgres_changes/);
  assert.match(bell, /recipient_user_id=eq\./);

  assert.match(page, /user_notifications/);
  assert.match(page, /Histórico/);
  assert.match(page, /Não lidas/);
  assert.match(page, /Preferências/);
  assert.match(page, /Marcar todas como lidas/);
  assert.match(page, /notificationRetentionStart/);
  assert.match(page, /\.gte\("created_at", notificationRetentionStart(?:\.current)?\)/);
  assert.match(page, /\.limit\(100\)/);
  assert.doesNotMatch(page, /Date\.now\(\)/);
  assert.match(eslintConfig, /"\.next-v2\/\*\*"/);
  assert.match(eslintConfig, /"\.next-team-v2\/\*\*"/);
  assert.doesNotMatch(page, /get_notification_delivery_monitor/);
  assert.doesNotMatch(page, /Histórico de e-mails/);
  assert.match(page, /NotificationPreferencesPanel/);
  assert.match(page, /get_my_notification_preferences/);

  assert.doesNotMatch(settingsLayout, /NotificationPreferencesPanel/);
  assert.match(settingsLayout, /product-shell/);
  assert.match(settingsLayout, /Configurações/);
  assert.match(preferences, /get_my_notification_preferences|initialPreferences/);
  assert.match(preferences, /save_my_notification_preference/);
  assert.match(preferences, /Dentro do sistema/);
  assert.match(preferences, /E-mail/);
  assert.match(preferences, /id="notificacoes"/);
  assert.match(css, /notification-popover/);
});

test("notification retention deletes only expired internal records and terminal delivery records", async () => {
  const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
  const migrationName = (await readdir(migrationDirectory)).find((name) =>
    name.endsWith("_retain_notifications_for_45_days.sql"),
  );

  assert.ok(migrationName, "a migration de retenção de notificações deve existir");
  const sql = await read(`supabase/migrations/${migrationName}`);

  assert.match(sql, /delete from public\.user_notifications[\s\S]*created_at < now\(\) - interval '45 days'/i);
  assert.match(sql, /delete from public\.notification_outbox[\s\S]*status in \('sent', 'failed'\)[\s\S]*created_at < now\(\) - interval '45 days'/i);
  assert.match(sql, /revoke all on function private\.purge_expired_notification_records\(\) from public, anon, authenticated/i);
  assert.match(sql, /cron\.schedule\([\s\S]*?barbeariasp-purge-expired-notifications/i);
  assert.doesNotMatch(sql, /delete from public\.notification_outbox[\s\S]*status in \('pending', 'processing'\)/i);
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
  const [edgeFunction, runtimeMigration, hmacMigration, deployGuide] = await Promise.all([
    read("supabase/functions/process-notifications/index.ts"),
    read("supabase/migrations/20260808183718_version_notification_worker_runtime.sql"),
    read("supabase/migrations/20260824091124_restore_notification_worker_hmac_auth.sql"),
    read("supabase/functions/process-notifications/README.md"),
  ]);

  assert.match(edgeFunction, /npm:postgres@3\.4\.3/);
  assert.match(edgeFunction, /SUPABASE_DB_URL/);
  assert.match(edgeFunction, /get_notification_worker_secrets/);
  assert.match(edgeFunction, /x-cron-timestamp/);
  assert.match(edgeFunction, /x-cron-nonce/);
  assert.match(edgeFunction, /x-cron-signature/);
  assert.match(edgeFunction, /crypto\.subtle\.sign/);
  assert.match(edgeFunction, /constantTimeEqual/);
  assert.doesNotMatch(edgeFunction, /req\.headers\.get\("x-cron-secret"\)/);
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
  assert.doesNotMatch(runtimeMigration, /\bre_[A-Za-z0-9_-]+/);

  assert.match(hmacMigration, /x-cron-timestamp/);
  assert.match(hmacMigration, /x-cron-nonce/);
  assert.match(hmacMigration, /x-cron-signature/);
  assert.match(hmacMigration, /extensions\.hmac/);
  assert.doesNotMatch(hmacMigration, /'x-cron-secret'/);

  assert.match(deployGuide, /--no-verify-jwt/);
  assert.match(deployGuide, /select private\.configure_notification_worker_cron\(\)/);
});

test("notification worker rejects replayed scheduled requests before claiming email work", async () => {
  const [edgeFunction, migration, queueMigration] = await Promise.all([
    read("supabase/functions/process-notifications/index.ts"),
    read("supabase/migrations/20260816071507_harden_notification_worker_request_auth.sql"),
    read("supabase/migrations/20260808093323_add_notification_center_preferences_and_delivery_queue.sql"),
  ]);

  assert.match(edgeFunction, /x-cron-timestamp/);
  assert.match(edgeFunction, /x-cron-nonce/);
  assert.match(edgeFunction, /x-cron-signature/);
  assert.match(edgeFunction, /REQUEST_MAX_AGE_SECONDS = 300/);
  assert.match(edgeFunction, /constantTimeEqual/);
  assert.match(edgeFunction, /claim_notification_worker_request/);
  assert.match(edgeFunction, /claim_notification_worker_request[\s\S]*?enqueue_due_appointment_reminders/);
  assert.doesNotMatch(edgeFunction, /x-cron-secret/);

  assert.match(migration, /notification_worker_request_replays/);
  assert.match(migration, /on conflict \(nonce\) do nothing/i);
  assert.match(migration, /abs\(v_now_epoch - p_issued_at\) > 300/);
  assert.match(migration, /extensions\.hmac/);
  assert.match(migration, /extensions\.gen_random_uuid\(\)/);
  assert.match(migration, /x-cron-signature/);
  assert.match(queueMigration, /for update skip locked/i);
  assert.match(edgeFunction, /async function sendEmail\(resendApiKey: string, item: NotificationOutboxItem\)/);
  assert.match(edgeFunction, /const payload = item\.payload \|\| \{\}/);
});

test("platform health monitor alerts only through the protected scheduled worker", async () => {
  const [edgeFunction, migration, guide] = await Promise.all([
    read("supabase/functions/monitor-platform-health/index.ts"),
    read("supabase/migrations/20260812051000_add_platform_health_monitoring.sql"),
    read("supabase/functions/monitor-platform-health/README.md"),
  ]);

  assert.match(edgeFunction, /https:\/\/barbeariasp\.cullentech\.com\.br\/api\/health/);
  assert.match(edgeFunction, /AbortSignal\.timeout\(10_000\)/);
  assert.match(edgeFunction, /x-cron-secret/);
  assert.match(edgeFunction, /platform_alert_recipient/);
  assert.match(edgeFunction, /notificacoes@barbeariasp\.cullentech\.com\.br/);
  assert.doesNotMatch(edgeFunction, /denis\.cullen@/i);
  assert.doesNotMatch(edgeFunction, /Bearer\s+re_[A-Za-z0-9_-]+/);

  assert.match(migration, /\*\/7 \* \* \* \*?/);
  assert.match(migration, /private\.platform_health_state/);
  assert.match(migration, /revoke all on function public\.record_platform_health_check\(boolean, text\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.record_platform_health_check\(boolean, text\) to service_role/i);
  assert.match(migration, /barbeariasp_platform_alert_recipient/);
  assert.doesNotMatch(migration, /denis\.cullen@/i);

  assert.match(guide, /sete minutos|\*\/7 \* \* \* \*/i);
  assert.match(guide, /Vault/i);
});
