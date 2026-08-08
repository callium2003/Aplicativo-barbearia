import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification center is wired into the management shell", async () => {
  const [shell, bell, page, css] = await Promise.all([
    read("app/painel/PanelShell.tsx"),
    read("app/painel/NotificationBell.tsx"),
    read("app/painel/notificacoes/page.tsx"),
    read("app/notification-ui.css"),
  ]);
  assert.match(shell, /NotificationBell/);
  assert.match(shell, /\/painel\/notificacoes/);
  assert.match(bell, /user_notifications/);
  assert.match(bell, /postgres_changes/);
  assert.match(bell, /recipient_user_id=eq\./);
  assert.match(page, /get_my_notification_preferences/);
  assert.match(page, /save_my_notification_preference/);
  assert.match(page, /get_notification_delivery_monitor/);
  assert.match(page, /Dentro do sistema/);
  assert.match(page, /E-mail/);
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
