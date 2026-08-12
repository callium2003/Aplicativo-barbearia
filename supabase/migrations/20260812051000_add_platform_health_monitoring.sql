drop function if exists public.get_notification_worker_secrets();

create function public.get_notification_worker_secrets()
returns table(resend_api_key text, cron_secret text, platform_alert_recipient text)
language sql
security definer
set search_path to ''
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_resend_api_key' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_notification_cron_secret' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_platform_alert_recipient' limit 1);
$$;

revoke all on function public.get_notification_worker_secrets() from public, anon, authenticated;
grant execute on function public.get_notification_worker_secrets() to service_role;

create table if not exists private.platform_health_state (
  singleton boolean primary key default true check (singleton),
  is_healthy boolean not null default true,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_checked_at timestamptz,
  last_error text,
  last_alerted_at timestamptz
);

insert into private.platform_health_state (singleton)
values (true)
on conflict (singleton) do nothing;

create or replace function public.record_platform_health_check(
  p_is_healthy boolean,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_state private.platform_health_state;
  v_event text := 'none';
begin
  select * into v_state
  from private.platform_health_state
  where singleton = true
  for update;

  if p_is_healthy then
    if not v_state.is_healthy then
      v_event := 'recovered';
    end if;

    update private.platform_health_state
    set is_healthy = true,
        consecutive_failures = 0,
        last_checked_at = now(),
        last_error = null,
        last_alerted_at = case when v_event = 'recovered' then now() else last_alerted_at end
    where singleton = true;
  else
    if v_state.is_healthy then
      v_event := 'failed';
    end if;

    update private.platform_health_state
    set is_healthy = false,
        consecutive_failures = consecutive_failures + 1,
        last_checked_at = now(),
        last_error = left(coalesce(nullif(btrim(p_error), ''), 'Falha desconhecida.'), 1000),
        last_alerted_at = case when v_event = 'failed' then now() else last_alerted_at end
    where singleton = true;
  end if;

  return v_event;
end;
$$;

revoke all on function public.record_platform_health_check(boolean, text) from public, anon, authenticated;
grant execute on function public.record_platform_health_check(boolean, text) to service_role;

create or replace function private.configure_platform_health_monitor_cron()
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
    'barbeariasp_notification_cron_secret',
    'barbeariasp_platform_alert_recipient'
  )
    and nullif(btrim(decrypted_secret), '') is not null;

  if not v_ready then
    raise notice 'Platform health monitor cron not scheduled: required Vault configuration is incomplete.';
    return false;
  end if;

  for v_job_id in
    select jobid from cron.job where jobname = 'barbeariasp-monitor-platform-health'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'barbeariasp-monitor-platform-health',
    '*/7 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'barbeariasp_project_url' limit 1) || '/functions/v1/monitor-platform-health',
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

revoke all on function private.configure_platform_health_monitor_cron() from public, anon, authenticated;

select private.configure_platform_health_monitor_cron();
