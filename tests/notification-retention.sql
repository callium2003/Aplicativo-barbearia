-- Execute inside a transaction after the notification-retention migration.
-- It never persists rows from the local fixture database.
do $$
declare
  v_barbershop_id uuid;
  v_recipient_user_id uuid;
  v_old_notification_id uuid := gen_random_uuid();
  v_recent_notification_id uuid := gen_random_uuid();
  v_old_sent_id uuid := gen_random_uuid();
  v_old_failed_id uuid := gen_random_uuid();
  v_old_pending_id uuid := gen_random_uuid();
  v_old_processing_id uuid := gen_random_uuid();
  v_recent_sent_id uuid := gen_random_uuid();
begin
  select b.id, b.owner_id
    into v_barbershop_id, v_recipient_user_id
  from public.barbershops b
  order by b.created_at
  limit 1;

  if v_barbershop_id is null or v_recipient_user_id is null then
    raise exception 'Fixture requires one local barbershop owner';
  end if;

  insert into public.user_notifications (
    id, barbershop_id, recipient_user_id, event_type, title, body, dedupe_key, created_at
  ) values
    (v_old_notification_id, v_barbershop_id, v_recipient_user_id, 'new_appointment', 'Fixture antigo', 'Remover', 'retention-old-' || v_old_notification_id::text, now() - interval '46 days'),
    (v_recent_notification_id, v_barbershop_id, v_recipient_user_id, 'new_appointment', 'Fixture recente', 'Manter', 'retention-recent-' || v_recent_notification_id::text, now() - interval '44 days');

  insert into public.notification_outbox (
    id, barbershop_id, kind, recipient_email, status, dedupe_key, created_at
  ) values
    (v_old_sent_id, v_barbershop_id, 'new_appointment', 'retention-sent@example.test', 'sent', 'retention-sent-' || v_old_sent_id::text, now() - interval '46 days'),
    (v_old_failed_id, v_barbershop_id, 'new_appointment', 'retention-failed@example.test', 'failed', 'retention-failed-' || v_old_failed_id::text, now() - interval '46 days'),
    (v_old_pending_id, v_barbershop_id, 'new_appointment', 'retention-pending@example.test', 'pending', 'retention-pending-' || v_old_pending_id::text, now() - interval '46 days'),
    (v_old_processing_id, v_barbershop_id, 'new_appointment', 'retention-processing@example.test', 'processing', 'retention-processing-' || v_old_processing_id::text, now() - interval '46 days'),
    (v_recent_sent_id, v_barbershop_id, 'new_appointment', 'retention-recent@example.test', 'sent', 'retention-recent-' || v_recent_sent_id::text, now() - interval '44 days');

  perform private.purge_expired_notification_records();

  if exists (select 1 from public.user_notifications where id = v_old_notification_id)
     or not exists (select 1 from public.user_notifications where id = v_recent_notification_id)
     or exists (select 1 from public.notification_outbox where id in (v_old_sent_id, v_old_failed_id))
     or not exists (select 1 from public.notification_outbox where id in (v_old_pending_id, v_old_processing_id, v_recent_sent_id)) then
    raise exception 'Notification retention did not preserve the 45-day and terminal-status boundary';
  end if;
end;
$$;
