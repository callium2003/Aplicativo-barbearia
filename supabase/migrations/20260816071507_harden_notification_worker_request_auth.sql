-- Authenticate each scheduled worker request with a short-lived HMAC signature
-- and an atomically claimed nonce. A captured request cannot be replayed.
create table if not exists private.notification_worker_request_replays (
  nonce uuid primary key,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists notification_worker_request_replays_expires_at_idx
  on private.notification_worker_request_replays (expires_at);

revoke all on table private.notification_worker_request_replays from public, anon, authenticated;

create or replace function public.claim_notification_worker_request(
  p_nonce uuid,
  p_issued_at bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now_epoch bigint := extract(epoch from now())::bigint;
begin
  if abs(v_now_epoch - p_issued_at) > 300 then
    return false;
  end if;

  delete from private.notification_worker_request_replays
  where expires_at <= now();

  insert into private.notification_worker_request_replays (nonce, issued_at, expires_at)
  values (p_nonce, to_timestamp(p_issued_at), to_timestamp(p_issued_at) + interval '5 minutes')
  on conflict (nonce) do nothing;

  return found;
end;
$$;

revoke all on function public.claim_notification_worker_request(uuid, bigint) from public, anon, authenticated;
grant execute on function public.claim_notification_worker_request(uuid, bigint) to service_role;

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
