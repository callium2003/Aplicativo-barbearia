-- Forward-only fix: reject the expiry boundary before cleaning consumed nonces.
-- Preserves already-applied migrations and service-role-only authorization.
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
  if p_nonce is null or p_issued_at is null or abs(v_now_epoch - p_issued_at) >= 300 then
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
