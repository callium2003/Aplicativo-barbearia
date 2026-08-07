-- Keep the customer synchronisation trigger internal. Triggers keep invoking
-- their function as part of the appointment INSERT; these revocations only
-- prevent it from being exposed as a public Data API RPC.
revoke execute on function public.sync_customer_for_appointment() from public;
revoke execute on function public.sync_customer_for_appointment() from anon;
revoke execute on function public.sync_customer_for_appointment() from authenticated;

-- These views are the public catalogue interface. They stay security_invoker,
-- so base-table RLS still restricts rows to active barbershops and records.
revoke all on table public.public_barbershop_pages from public, anon, authenticated;
grant select on table public.public_barbershop_pages to anon, authenticated;

revoke all on table public.public_barbershop_services from public, anon, authenticated;
grant select on table public.public_barbershop_services to anon, authenticated;

-- The active flag is required only to evaluate the existing public RLS policy
-- and is intentionally the sole additional base-table column exposed to anon.
grant select (active) on table public.barbershops to anon;

-- Availability is the explicit public interface for active professionals and
-- their free slots. It has the same public signature, but performs its own
-- active-barbershop validation because SECURITY DEFINER does not inherit RLS.
create or replace function public.get_public_availability(
  p_slug text,
  p_date date,
  p_service_ids uuid[]
)
returns table(
  professional_id uuid,
  professional_name text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barbershop_id uuid;
  v_duration integer;
  v_service_count integer;
  v_weekday integer;
begin
  if p_service_ids is null
     or cardinality(p_service_ids) = 0
     or p_date < (now() at time zone 'America/Sao_Paulo')::date
     or p_date > ((now() at time zone 'America/Sao_Paulo')::date + 90) then
    return;
  end if;

  select b.id, coalesce(sum(s.duration_minutes), 0), count(*)
    into v_barbershop_id, v_duration, v_service_count
  from public.barbershops b
  join public.services s
    on s.barbershop_id = b.id
   and s.id = any(p_service_ids)
   and s.active
  where b.slug = p_slug
    and b.active
  group by b.id
  limit 1;

  if v_barbershop_id is null
     or v_service_count <> cardinality(p_service_ids)
     or v_duration < 1 then
    return;
  end if;

  v_weekday := extract(dow from p_date)::integer;

  return query
  with available_professionals as (
    select p.id, p.name, h.opens_at, h.closes_at
    from public.professionals p
    join public.professional_hours h
      on h.professional_id = p.id
     and h.weekday = v_weekday
     and not h.is_closed
    where p.barbershop_id = v_barbershop_id
      and p.active
      and h.opens_at is not null
      and h.closes_at is not null
  ), slots as (
    select ap.id,
           ap.name,
           generated_slot at time zone 'America/Sao_Paulo' as starts_at,
           (generated_slot + make_interval(mins => v_duration)) at time zone 'America/Sao_Paulo' as ends_at
    from available_professionals ap
    cross join lateral generate_series(
      p_date + ap.opens_at,
      p_date + ap.closes_at - make_interval(mins => v_duration),
      interval '30 minutes'
    ) generated_slot
  )
  select s.id, s.name, s.starts_at, s.ends_at
  from slots s
  where s.starts_at > now()
    and not exists (
      select 1
      from public.appointments a
      where a.professional_id = s.id
        and a.status <> 'cancelled'
        and a.starts_at < s.ends_at
        and a.ends_at > s.starts_at
    )
    and not exists (
      select 1
      from public.professional_breaks pb
      where pb.professional_id = s.id
        and pb.weekday = v_weekday
        and (p_date + pb.starts_at) < (s.ends_at at time zone 'America/Sao_Paulo')
        and (p_date + pb.ends_at) > (s.starts_at at time zone 'America/Sao_Paulo')
    )
    and not exists (
      select 1
      from public.professional_time_blocks ptb
      where ptb.professional_id = s.id
        and ptb.starts_at < s.ends_at
        and ptb.ends_at > s.starts_at
    )
  order by s.name, s.starts_at;
end;
$$;

revoke all on function public.get_public_availability(text, date, uuid[]) from public;
revoke all on function public.get_public_availability(text, date, uuid[]) from anon;
revoke all on function public.get_public_availability(text, date, uuid[]) from authenticated;
grant execute on function public.get_public_availability(text, date, uuid[]) to anon, authenticated;

-- Availability is exposed only by the narrowly-scoped RPC above. These tables
-- are operational data and must not be browsable directly by anonymous users.
revoke all on table public.business_hours from anon;
revoke all on table public.professional_hours from anon;
revoke all on table public.professional_breaks from anon;
revoke all on table public.professional_time_blocks from anon;
revoke all on table public.team_members from anon;
