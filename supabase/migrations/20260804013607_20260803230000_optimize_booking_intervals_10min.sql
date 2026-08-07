-- Optimize booking availability intervals to 10-minute steps.
-- Allows exact sum of service durations (e.g., 20, 30, 50, 70 minutes)
-- without forcing 30-minute idle gaps between appointments.

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
      interval '10 minutes'
    ) generated_slot
  )
  select s.id, s.name, s.starts_at, s.ends_at
  from slots s
  where s.starts_at > now()
    and exists (
      select 1
      from public.business_hours bh
      where bh.barbershop_id = v_barbershop_id
        and bh.weekday = v_weekday
        and not bh.is_closed
        and (s.starts_at at time zone 'America/Sao_Paulo')::time >= bh.opens_at
        and (s.ends_at at time zone 'America/Sao_Paulo')::time <= bh.closes_at
    )
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

create or replace function public.set_and_validate_customer_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_total_duration integer;
  v_total_price numeric;
  v_service_names text;
  v_professional record;
  v_professional_hours record;
  v_business_hours record;
  v_customer_email text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday integer;
begin
  if new.customer_id is null or new.customer_id <> (select auth.uid()) then
    raise exception 'Cliente não autenticado.';
  end if;

  if new.service_ids is null or cardinality(new.service_ids) = 0 then
    new.service_ids := array[new.service_id];
  end if;

  if (select count(*) from unnest(new.service_ids) x) <> (select count(distinct x) from unnest(new.service_ids) x) then
    raise exception 'Um serviço não pode ser selecionado duas vezes.';
  end if;

  if new.starts_at <= now() or new.starts_at > now() + interval '90 days' then
    raise exception 'O horário escolhido não é válido.';
  end if;

  if not exists (select 1 from public.barbershops b where b.id = new.barbershop_id and b.active) then
    raise exception 'Esta barbearia não está aceitando agendamentos.';
  end if;

  select count(*), coalesce(sum(s.duration_minutes), 0), coalesce(sum(s.price), 0), string_agg(s.name, ' + ' order by array_position(new.service_ids, s.id))
    into v_count, v_total_duration, v_total_price, v_service_names
  from public.services s
  where s.id = any(new.service_ids)
    and s.barbershop_id = new.barbershop_id
    and s.active;

  if v_count <> cardinality(new.service_ids) or v_total_duration < 1 then
    raise exception 'Um ou mais serviços estão indisponíveis.';
  end if;

  new.service_id := new.service_ids[1];

  select p.id, p.name
    into v_professional
  from public.professionals p
  where p.id = new.professional_id
    and p.barbershop_id = new.barbershop_id
    and p.active;

  if v_professional.id is null then
    raise exception 'Profissional indisponível.';
  end if;

  v_local_start := new.starts_at at time zone 'America/Sao_Paulo';
  v_weekday := extract(dow from v_local_start)::integer;

  if extract(second from v_local_start) <> 0 or mod(extract(minute from v_local_start)::integer, 10) <> 0 then
    raise exception 'O horário deve começar em intervalos de 10 minutos.';
  end if;

  select opens_at, closes_at
    into v_professional_hours
  from public.professional_hours
  where professional_id = new.professional_id
    and weekday = v_weekday
    and is_closed = false;

  select opens_at, closes_at
    into v_business_hours
  from public.business_hours
  where barbershop_id = new.barbershop_id
    and weekday = v_weekday
    and is_closed = false;

  if v_professional_hours.opens_at is null or v_business_hours.opens_at is null then
    raise exception 'Não há agenda para esse horário.';
  end if;

  v_local_end := v_local_start + make_interval(mins => v_total_duration);

  if v_local_start::time < v_professional_hours.opens_at
     or v_local_end::time > v_professional_hours.closes_at
     or v_local_start::time < v_business_hours.opens_at
     or v_local_end::time > v_business_hours.closes_at then
    raise exception 'O conjunto de serviços não cabe nesse horário.';
  end if;

  if exists (
    select 1
    from public.professional_breaks pb
    where pb.professional_id = new.professional_id
      and pb.weekday = v_weekday
      and (v_local_start::time < pb.ends_at and v_local_end::time > pb.starts_at)
  ) then
    raise exception 'O horário escolhido coincide com uma pausa.';
  end if;

  if exists (
    select 1
    from public.professional_time_blocks tb
    where tb.professional_id = new.professional_id
      and tb.starts_at < new.starts_at + make_interval(mins => v_total_duration)
      and tb.ends_at > new.starts_at
  ) then
    raise exception 'O horário escolhido está bloqueado.';
  end if;

  select email into v_customer_email from auth.users where id = new.customer_id;

  new.ends_at := new.starts_at + make_interval(mins => v_total_duration);
  new.status := 'scheduled';
  new.customer_email := v_customer_email;
  new.service_name_snapshot := v_service_names;
  new.service_price_snapshot := v_total_price;
  new.duration_minutes_snapshot := v_total_duration;
  new.professional_name_snapshot := v_professional.name;

  return new;
end;
$$;
