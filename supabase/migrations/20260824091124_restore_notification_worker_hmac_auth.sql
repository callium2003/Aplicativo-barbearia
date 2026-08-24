create or replace function private.configure_notification_worker_cron()
returns boolean
language plpgsql
security definer
set search_path = ''
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
    select jobid from cron.job where jobname = 'barbeariasp-process-notifications'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'barbeariasp-process-notifications',
    '* * * * *',
    $job$
      with request as (
        select
          floor(extract(epoch from clock_timestamp()))::bigint::text as request_timestamp,
          extensions.gen_random_uuid()::text as request_nonce,
          (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_project_url' limit 1) as project_url,
          (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_notification_cron_secret' limit 1) as cron_secret
      )
      select net.http_post(
        url := project_url || '/functions/v1/process-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-timestamp', request_timestamp,
          'x-cron-nonce', request_nonce,
          'x-cron-signature', encode(
            extensions.hmac(
              request_timestamp || '.' || request_nonce || '.POST./functions/v1/process-notifications',
              cron_secret,
              'sha256'
            ),
            'hex'
          )
        ),
        body := jsonb_build_object('source', 'pg_cron')
      )
      from request;
    $job$
  );

  return true;
end;
$$;

revoke all on function private.configure_notification_worker_cron() from public, anon, authenticated;

select private.configure_notification_worker_cron();
