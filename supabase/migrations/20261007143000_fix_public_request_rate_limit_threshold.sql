-- Mantém um sentinela acima do limite: saturar no próprio limite permitia
-- indefinidamente novas chamadas porque allowed usa request_count <= p_limit.
create or replace function public.consume_public_request_rate_limit(
  p_action text, p_origin_hash text, p_subject_hash text,
  p_window_seconds integer, p_limit integer
)
returns table(allowed boolean, remaining integer)
language plpgsql security definer set search_path = ''
as $$
declare v_bucket timestamptz; v_count integer;
begin
  if p_action not in ('invitation','booking_status','availability','monthly_availability','booking') or p_window_seconds not in (60,900) or p_limit < 1 or p_limit > 60 or length(p_origin_hash) <> 64 or length(p_subject_hash) > 128 then
    raise exception 'Parâmetros de limite inválidos.';
  end if;
  v_bucket := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.public_request_rate_limits as r (bucket_start,action,origin_hash,subject_hash)
  values (v_bucket,p_action,p_origin_hash,coalesce(p_subject_hash,''))
  on conflict (bucket_start,action,origin_hash,subject_hash) do update
  set request_count = case when r.request_count <= p_limit then r.request_count + 1 else r.request_count end, updated_at=now()
  returning request_count into v_count;
  return query select v_count <= p_limit, greatest(p_limit-v_count,0);
end; $$;

revoke all on function public.consume_public_request_rate_limit(text,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_public_request_rate_limit(text,text,text,integer,integer) to service_role;
