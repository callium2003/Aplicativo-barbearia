-- Block administrative members from booking as a customer at the barbershop
-- where they have a role. This trigger also covers a direct table insert,
-- so the rule cannot be bypassed outside the booking RPC.
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

  if private.current_barbershop_role(new.barbershop_id) is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Use uma conta de cliente separada para agendar na sua própria barbearia.';
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

  select p.id, p.name into v_professional
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

  select opens_at, closes_at into v_professional_hours
  from public.professional_hours
  where professional_id = new.professional_id and weekday = v_weekday and is_closed = false;

  select opens_at, closes_at into v_business_hours
  from public.business_hours
  where barbershop_id = new.barbershop_id and weekday = v_weekday and is_closed = false;

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
    select 1 from public.professional_breaks pb
    where pb.professional_id = new.professional_id
      and pb.weekday = v_weekday
      and (v_local_start::time < pb.ends_at and v_local_end::time > pb.starts_at)
  ) then
    raise exception 'O horário escolhido coincide com uma pausa.';
  end if;

  if exists (
    select 1 from public.professional_time_blocks tb
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
