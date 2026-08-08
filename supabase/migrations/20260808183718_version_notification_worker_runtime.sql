create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.get_notification_worker_secrets()
returns table(resend_api_key text, cron_secret text)
language sql
security definer
set search_path to ''
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_resend_api_key' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_notification_cron_secret' limit 1);
$$;

revoke all on function public.get_notification_worker_secrets() from public, anon, authenticated;
grant execute on function public.get_notification_worker_secrets() to service_role;

create or replace function private.configure_notification_worker_cron()
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_job_id bigint;
  v_ready boolean;
begin
  select count(*) = 3
    into v_ready
  from vault.decrypted_secrets
  where name in (
    'barbeariasp_project_url',
    'barbeariasp_resend_api_key',
    'barbeariasp_notification_cron_secret'
  )
    and nullif(btrim(decrypted_secret), '') is not null;

  if not v_ready then
    raise notice 'Notification worker cron not scheduled: required Vault configuration is incomplete.';
    return false;
  end if;

  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'barbeariasp-process-notifications'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'barbeariasp-process-notifications',
    '* * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_project_url' limit 1) || '/functions/v1/process-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_notification_cron_secret' limit 1)
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
    $job$
  );

  return true;
end;
$$;

revoke all on function private.configure_notification_worker_cron() from public, anon, authenticated;

select private.configure_notification_worker_cron();
