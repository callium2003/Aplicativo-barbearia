begin;

-- Operational status is intentionally separate from subscription status.
alter table public.barbershops
  add column if not exists active boolean not null default true;

alter table public.appointments
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists cancel_reason text;

alter table public.appointments
  drop constraint if exists appointments_status_check;
alter table public.appointments
  add constraint appointments_status_check
  check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));

alter table public.team_members
  add column if not exists status text not null default 'active';
update public.team_members set role = 'barber' where role = 'professional';
alter table public.team_members
  drop constraint if exists team_members_role_check;
alter table public.team_members
  add constraint team_members_role_check check (role in ('manager', 'barber'));
alter table public.team_members
  add constraint team_members_status_check check (status in ('active', 'inactive'));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 100),
  entity_type text not null check (char_length(entity_type) between 3 and 100),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create index if not exists audit_logs_barbershop_created_at_idx
  on public.audit_logs (barbershop_id, created_at desc);

-- These helpers live outside the exposed API schema. Browser roles receive
-- EXECUTE only so RLS can evaluate policies; they cannot call private-schema
-- functions through Supabase RPC.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.current_barbershop_role(p_barbershop_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.barbershops b
      where b.id = p_barbershop_id and b.owner_id = (select auth.uid())
    ) then 'owner'
    else (
      select tm.role from public.team_members tm
      where tm.barbershop_id = p_barbershop_id
        and tm.user_id = (select auth.uid())
        and tm.status = 'active'
      limit 1
    )
  end;
$$;

create or replace function private.current_barber_professional_id(p_barbershop_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.professional_id
  from public.team_members tm
  where tm.barbershop_id = p_barbershop_id
    and tm.user_id = (select auth.uid())
    and tm.status = 'active'
    and tm.role = 'barber'
  limit 1;
$$;

revoke all on function private.current_barbershop_role(uuid) from public, anon;
revoke all on function private.current_barber_professional_id(uuid) from public, anon;
grant execute on function private.current_barbershop_role(uuid) to authenticated;
grant execute on function private.current_barber_professional_id(uuid) to authenticated;

-- The trial creator must remain privileged because it is a trigger that creates
-- a protected subscription row. It is never a browser-callable function.
create or replace function public.create_trial_subscription_for_barbershop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.barbershop_subscriptions (
    barbershop_id, status, plan_code, trial_started_at, trial_ends_at
  ) values (
    new.id, 'trialing', 'trial_30_days', now(), now() + interval '30 days'
  ) on conflict (barbershop_id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_trial_subscription_for_barbershop() from public, anon, authenticated;

-- This is an internal eligibility helper, not a public billing endpoint.
create or replace function public.has_active_barbershop_access(p_barbershop_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.barbershop_subscriptions s
    where s.barbershop_id = p_barbershop_id
      and (s.status = 'active' or (s.status = 'trialing' and s.trial_ends_at > now()))
  );
$$;
revoke all on function public.has_active_barbershop_access(uuid) from public, anon, authenticated;

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
  if (select count(*) from unnest(new.service_ids) as item) <>
     (select count(distinct item) from unnest(new.service_ids) as item) then
    raise exception 'Um serviço não pode ser selecionado duas vezes.';
  end if;
  if new.starts_at <= now() or new.starts_at > now() + interval '90 days' then
    raise exception 'O horário escolhido não é válido.';
  end if;
  if not exists (select 1 from public.barbershops b where b.id = new.barbershop_id and b.active) then
    raise exception 'Esta barbearia não está aceitando agendamentos.';
  end if;

  select count(*), coalesce(sum(s.duration_minutes), 0), coalesce(sum(s.price), 0),
         string_agg(s.name, ' + ' order by array_position(new.service_ids, s.id))
    into v_count, v_total_duration, v_total_price, v_service_names
  from public.services s
  where s.id = any(new.service_ids) and s.barbershop_id = new.barbershop_id and s.active;
  if v_count <> cardinality(new.service_ids) or v_total_duration < 1 then
    raise exception 'Um ou mais serviços estão indisponíveis.';
  end if;
  new.service_id := new.service_ids[1];

  select p.id, p.name into v_professional
  from public.professionals p
  where p.id = new.professional_id and p.barbershop_id = new.barbershop_id and p.active;
  if v_professional.id is null then
    raise exception 'Profissional indisponível.';
  end if;

  v_local_start := new.starts_at at time zone 'America/Sao_Paulo';
  v_weekday := extract(dow from v_local_start)::integer;
  if extract(second from v_local_start) <> 0 or mod(extract(minute from v_local_start)::integer, 30) <> 0 then
    raise exception 'O horário deve começar em intervalos de 30 minutos.';
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
    where pb.professional_id = new.professional_id and pb.weekday = v_weekday
      and (v_local_start::time < pb.ends_at and v_local_end::time > pb.starts_at)
  ) then raise exception 'O horário escolhido coincide com uma pausa.'; end if;
  if exists (
    select 1 from public.professional_time_blocks tb
    where tb.professional_id = new.professional_id
      and tb.starts_at < new.starts_at + make_interval(mins => v_total_duration)
      and tb.ends_at > new.starts_at
  ) then raise exception 'O horário escolhido está bloqueado.'; end if;

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
revoke all on function public.set_and_validate_customer_appointment() from public, anon, authenticated;

create or replace function public.protect_customer_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.customer_id = (select auth.uid()) then
    if old.status not in ('scheduled', 'confirmed') or old.starts_at <= now() then
      raise exception 'Este agendamento não pode mais ser cancelado pelo cliente.';
    end if;
    if new.status <> 'cancelled'
       or (to_jsonb(new) - array['status','cancelled_at','cancelled_by','cancel_reason'])
          is distinct from
          (to_jsonb(old) - array['status','cancelled_at','cancelled_by','cancel_reason']) then
      raise exception 'O cliente pode apenas cancelar o próprio agendamento.';
    end if;
    new.cancelled_at := now();
    new.cancelled_by := (select auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.protect_customer_appointment_update() from public, anon, authenticated;
drop trigger if exists protect_customer_appointment_update on public.appointments;
create trigger protect_customer_appointment_update
before update on public.appointments
for each row execute function public.protect_customer_appointment_update();

create or replace function public.validate_team_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.professional_id is not null and not exists (
    select 1 from public.professionals p
    where p.id = new.professional_id and p.barbershop_id = new.barbershop_id
  ) then
    raise exception 'O profissional deve pertencer à mesma barbearia.';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_team_member_scope() from public, anon, authenticated;
drop trigger if exists validate_team_member_scope on public.team_members;
create trigger validate_team_member_scope before insert or update on public.team_members
for each row execute function public.validate_team_member_scope();

create or replace function public.audit_team_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(barbershop_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (new.barbershop_id, (select auth.uid()), 'team_member_created', 'team_member', new.id,
      jsonb_build_object('role', new.role, 'status', new.status));
  elsif old.role is distinct from new.role or old.status is distinct from new.status then
    insert into public.audit_logs(barbershop_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (new.barbershop_id, (select auth.uid()), 'team_member_access_changed', 'team_member', new.id,
      jsonb_build_object('old_role', old.role, 'new_role', new.role, 'old_status', old.status, 'new_status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function public.audit_team_member_change() from public, anon, authenticated;
drop trigger if exists audit_team_member_change on public.team_members;
create trigger audit_team_member_change after insert or update on public.team_members
for each row execute function public.audit_team_member_change();

-- RLS: public means explicitly public operational data only; all tenant access
-- is checked with the role helper, never merely with TO authenticated.
drop policy if exists "Anon can view public barbershops" on public.barbershops;
create policy "Public can read active barbershops" on public.barbershops for select
to anon, authenticated using (active = true);

drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Anon can view public services" on public.services;
create policy "Public can read active services of active barbershops" on public.services for select
to anon, authenticated using (active and exists (select 1 from public.barbershops b where b.id = services.barbershop_id and b.active));

drop policy if exists "Public can read active professionals" on public.professionals;
drop policy if exists "Anon can view public professionals" on public.professionals;
create policy "Public can read active professionals of active barbershops" on public.professionals for select
to anon, authenticated using (active and exists (select 1 from public.barbershops b where b.id = professionals.barbershop_id and b.active));

drop policy if exists "Public can read business hours" on public.business_hours;
create policy "Public can read hours of active barbershops" on public.business_hours for select
to anon, authenticated using (exists (select 1 from public.barbershops b where b.id = business_hours.barbershop_id and b.active));

drop policy if exists "Anon can view public professional hours" on public.professional_hours;
create policy "Public can read hours of active professionals" on public.professional_hours for select
to anon, authenticated using (exists (
  select 1 from public.professionals p join public.barbershops b on b.id = p.barbershop_id
  where p.id = professional_hours.professional_id and p.active and b.active
));

drop policy if exists "Anon can view busy time data" on public.appointments;
drop policy if exists "Team can read own barbershop appointments" on public.appointments;
drop policy if exists "Team can create appointments for own barbershop" on public.appointments;
drop policy if exists "Team can update appointments for own barbershop" on public.appointments;
drop policy if exists "Team can cancel appointments for own barbershop" on public.appointments;
drop policy if exists "Customer can read own appointments" on public.appointments;
drop policy if exists "Customer can create own appointments" on public.appointments;
create policy "Customer can read own appointments" on public.appointments for select to authenticated
using (customer_id = (select auth.uid()));
create policy "Customer can create own valid appointment" on public.appointments for insert to authenticated
with check (customer_id = (select auth.uid()));
create policy "Customer can cancel own future appointment" on public.appointments for update to authenticated
using (customer_id = (select auth.uid()) and status in ('scheduled','confirmed') and starts_at > now())
with check (customer_id = (select auth.uid()) and status = 'cancelled');
create policy "Owner or manager can read appointments" on public.appointments for select to authenticated
using (private.current_barbershop_role(barbershop_id) in ('owner','manager'));
create policy "Barber can read own appointments" on public.appointments for select to authenticated
using (professional_id = private.current_barber_professional_id(barbershop_id));
create policy "Owner or manager can update appointments" on public.appointments for update to authenticated
using (private.current_barbershop_role(barbershop_id) in ('owner','manager'))
with check (private.current_barbershop_role(barbershop_id) in ('owner','manager'));
create policy "Barber can update own appointments" on public.appointments for update to authenticated
using (professional_id = private.current_barber_professional_id(barbershop_id))
with check (professional_id = private.current_barber_professional_id(barbershop_id));

drop policy if exists "Owner can manage professional hours" on public.professional_hours;
create policy "Owner or manager can manage professional hours" on public.professional_hours for all to authenticated
using (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_hours.professional_id)) in ('owner','manager'))
with check (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_hours.professional_id)) in ('owner','manager'));
drop policy if exists "owners manage professional breaks" on public.professional_breaks;
create policy "Owner or manager can manage professional breaks" on public.professional_breaks for all to authenticated
using (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_breaks.professional_id)) in ('owner','manager'))
with check (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_breaks.professional_id)) in ('owner','manager'));
drop policy if exists "owners manage professional time blocks" on public.professional_time_blocks;
create policy "Owner or manager can manage professional blocks" on public.professional_time_blocks for all to authenticated
using (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_time_blocks.professional_id)) in ('owner','manager'))
with check (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_time_blocks.professional_id)) in ('owner','manager'));

create policy "Owner can read audit logs" on public.audit_logs for select to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner');

commit;
