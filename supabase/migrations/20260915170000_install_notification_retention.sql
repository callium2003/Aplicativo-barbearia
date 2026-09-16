-- Retém somente 45 dias de histórico interno e de entregas já finalizadas.
-- Registros pendentes ou em processamento não são removidos por esta rotina.
create index if not exists user_notifications_created_at_idx
  on public.user_notifications (created_at);

create index if not exists notification_outbox_terminal_created_at_idx
  on public.notification_outbox (created_at)
  where status in ('sent', 'failed');

create or replace function private.purge_expired_notification_records()
returns table(
  user_notifications_deleted integer,
  notification_outbox_deleted integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_notifications_deleted integer := 0;
  v_notification_outbox_deleted integer := 0;
begin
  delete from public.user_notifications
  where created_at < now() - interval '45 days';
  get diagnostics v_user_notifications_deleted = row_count;

  delete from public.notification_outbox
  where status in ('sent', 'failed')
    and created_at < now() - interval '45 days';
  get diagnostics v_notification_outbox_deleted = row_count;

  return query
  select v_user_notifications_deleted, v_notification_outbox_deleted;
end;
$$;

revoke all on function private.purge_expired_notification_records() from public, anon, authenticated;

create or replace function private.configure_notification_retention_cron()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'barbeariasp-purge-expired-notifications'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'barbeariasp-purge-expired-notifications',
    '17 3 * * *',
    $job$select private.purge_expired_notification_records();$job$
  );
end;
$$;

revoke all on function private.configure_notification_retention_cron() from public, anon, authenticated;

select private.configure_notification_retention_cron();
