-- Restore only the public booking-readiness contract absent from the remote
-- test project. Notification retention remains intentionally untouched.
create or replace function private.is_barbershop_booking_ready(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_barbershop_id is not null
    and exists (
      select 1
      from public.barbershops b
      where b.id = p_barbershop_id
        and b.active
        and exists (
          select 1 from public.services s
          where s.barbershop_id = b.id and s.active
        )
        and exists (
          select 1 from public.business_hours bh
          where bh.barbershop_id = b.id
            and not bh.is_closed
            and bh.opens_at is not null
            and bh.closes_at is not null
        )
        and exists (
          select 1 from public.professionals p
          where p.barbershop_id = b.id and p.active
        )
        and not exists (
          select 1
          from public.professionals p
          where p.barbershop_id = b.id
            and p.active
            and not exists (
              select 1 from public.professional_hours ph
              where ph.professional_id = p.id
                and not ph.is_closed
                and ph.opens_at is not null
                and ph.closes_at is not null
            )
        )
    );
$$;

revoke all on function private.is_barbershop_booking_ready(uuid) from public, anon, authenticated;

create or replace function public.get_public_booking_status(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.is_barbershop_booking_ready(b.id), false)
  from public.barbershops b
  where b.slug = p_slug and b.active
  limit 1;
$$;

revoke all on function public.get_public_booking_status(text) from public, anon;
grant execute on function public.get_public_booking_status(text) to anon, authenticated;

create or replace function private.reject_booking_when_barbershop_is_not_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_barbershop_booking_ready(new.barbershop_id) then
    raise exception using
      errcode = 'P0001',
      message = 'O agendamento online desta barbearia ainda não está disponível.';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_booking_when_barbershop_is_not_ready() from public, anon, authenticated;

drop trigger if exists a_reject_booking_when_barbershop_is_not_ready on public.appointments;
create trigger a_reject_booking_when_barbershop_is_not_ready
  before insert on public.appointments
  for each row execute function private.reject_booking_when_barbershop_is_not_ready();

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
  where b.slug = p_slug and b.active
  group by b.id
  limit 1;

  if v_barbershop_id is null
     or v_service_count <> cardinality(p_service_ids)
     or v_duration < 1
     or not private.is_barbershop_booking_ready(v_barbershop_id) then
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
      interval '10 minutes'
    ) generated_slot
  )
  select s.id, s.name, s.starts_at, s.ends_at
  from slots s
  where s.starts_at > now()
    and exists (
      select 1 from public.business_hours bh
      where bh.barbershop_id = v_barbershop_id
        and bh.weekday = v_weekday
        and not bh.is_closed
        and (s.starts_at at time zone 'America/Sao_Paulo')::time >= bh.opens_at
        and (s.ends_at at time zone 'America/Sao_Paulo')::time <= bh.closes_at
    )
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = s.id
        and a.status <> 'cancelled'
        and a.starts_at < s.ends_at
        and a.ends_at > s.starts_at
    )
    and not exists (
      select 1 from public.professional_breaks pb
      where pb.professional_id = s.id
        and pb.weekday = v_weekday
        and (p_date + pb.starts_at) < (s.ends_at at time zone 'America/Sao_Paulo')
        and (p_date + pb.ends_at) > (s.starts_at at time zone 'America/Sao_Paulo')
    )
    and not exists (
      select 1 from public.professional_time_blocks ptb
      where ptb.professional_id = s.id
        and ptb.starts_at < s.ends_at
        and ptb.ends_at > s.starts_at
    )
  order by s.name, s.starts_at;
end;
$$;

revoke all on function public.get_public_availability(text, date, uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_availability(text, date, uuid[]) to anon, authenticated;
