create index if not exists notification_outbox_processing_lock_idx
  on public.notification_outbox (locked_at)
  where status = 'processing';

create or replace function public.claim_notification_outbox(
  p_limit integer default 50
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_outbox
  set status = 'failed',
      locked_at = null,
      last_error = 'lock_expired',
      next_attempt_at = now()
  where status = 'processing'
    and (
      locked_at is null
      or locked_at <= now() - interval '10 minutes'
    );

  return query
  with picked as (
    select id
    from public.notification_outbox
    where status in ('pending', 'failed')
      and attempts < 5
      and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  )
  update public.notification_outbox as outbox
  set status = 'processing',
      attempts = outbox.attempts + 1,
      locked_at = now(),
      last_error = null
  from picked
  where outbox.id = picked.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_notification_outbox(integer)
  from public, anon, authenticated;

grant execute on function public.claim_notification_outbox(integer)
  to service_role;
