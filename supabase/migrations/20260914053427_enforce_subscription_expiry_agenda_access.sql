-- Subscription expiry is enforced in the database so that public booking and
-- staff agenda access cannot be restored by an old browser tab or direct RPC.

create or replace function private.barbershop_subscription_effective_end(p_barbershop_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.status = 'trialing' then s.trial_ends_at
    when s.status in ('active', 'cancelled', 'past_due') then s.current_period_ends_at
    else null
  end
  from public.barbershop_subscriptions s
  where s.barbershop_id = p_barbershop_id
  limit 1;
$$;

revoke all on function private.barbershop_subscription_effective_end(uuid) from public, anon, authenticated;

create or replace function private.can_accept_public_booking(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    s.status = 'trialing' and s.trial_ends_at > now()
  ) or (
    s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now())
  ) or (
    s.status in ('cancelled', 'past_due') and s.current_period_ends_at > now()
  ), false)
  from public.barbershop_subscriptions s
  where s.barbershop_id = p_barbershop_id
  limit 1;
$$;

revoke all on function private.can_accept_public_booking(uuid) from public, anon, authenticated;

create or replace function private.barbershop_agenda_operational_until(p_barbershop_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.can_accept_public_booking(p_barbershop_id) then 'infinity'::timestamptz
    when private.barbershop_subscription_effective_end(p_barbershop_id) is not null
      then private.barbershop_subscription_effective_end(p_barbershop_id) + interval '5 days'
    else '-infinity'::timestamptz
  end;
$$;

revoke all on function private.barbershop_agenda_operational_until(uuid) from public, anon, authenticated;

create or replace function private.can_operate_barbershop_agenda(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.barbershop_agenda_operational_until(p_barbershop_id) > now();
$$;

revoke all on function private.can_operate_barbershop_agenda(uuid) from public, anon, authenticated;

create or replace function private.is_barbershop_booking_configured(p_barbershop_id uuid)
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

revoke all on function private.is_barbershop_booking_configured(uuid) from public, anon, authenticated;

create or replace function private.is_barbershop_booking_ready(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_barbershop_booking_configured(p_barbershop_id)
    and private.can_accept_public_booking(p_barbershop_id);
$$;

revoke all on function private.is_barbershop_booking_ready(uuid) from public, anon, authenticated;

create or replace function public.get_public_booking_availability(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_barbershop_id uuid;
begin
  select b.id into v_barbershop_id
  from public.barbershops b
  where b.slug = p_slug and b.active
  limit 1;

  if v_barbershop_id is null then
    return 'unavailable';
  end if;
  if not private.is_barbershop_booking_configured(v_barbershop_id) then
    return 'setup';
  end if;
  if not private.can_accept_public_booking(v_barbershop_id) then
    return 'subscription';
  end if;
  return 'available';
end;
$$;

revoke all on function public.get_public_booking_availability(text) from public, anon, authenticated;
grant execute on function public.get_public_booking_availability(text) to anon, authenticated;

create or replace function public.get_public_booking_status(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_booking_availability(p_slug) = 'available';
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
  if not private.is_barbershop_booking_configured(new.barbershop_id) then
    raise exception using
      errcode = 'P0001',
      message = 'O agendamento online desta barbearia ainda não está disponível.';
  end if;
  if not private.can_accept_public_booking(new.barbershop_id) then
    raise exception using
      errcode = 'P0001',
      message = 'Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP.';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_booking_when_barbershop_is_not_ready() from public, anon, authenticated;

create or replace function public.get_my_barbershop_agenda_access(p_barbershop_id uuid)
returns table(can_operate boolean, can_accept_public_bookings boolean, operational_until timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if private.current_barbershop_role(p_barbershop_id) not in ('owner', 'manager', 'barber') then
    raise exception 'Access denied';
  end if;

  return query select
    private.can_operate_barbershop_agenda(p_barbershop_id),
    private.can_accept_public_booking(p_barbershop_id),
    private.barbershop_agenda_operational_until(p_barbershop_id);
end;
$$;

revoke all on function public.get_my_barbershop_agenda_access(uuid) from public, anon;
grant execute on function public.get_my_barbershop_agenda_access(uuid) to authenticated;

create or replace function public.get_my_restricted_agenda_slots(
  p_barbershop_id uuid,
  p_starts_from timestamptz,
  p_starts_to timestamptz
)
returns table(starts_at timestamptz, ends_at timestamptz, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_operational_until timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if private.current_barbershop_role(p_barbershop_id) not in ('owner', 'manager', 'barber') then
    raise exception 'Access denied';
  end if;

  v_operational_until := private.barbershop_agenda_operational_until(p_barbershop_id);
  if private.can_accept_public_booking(p_barbershop_id) then
    return;
  end if;

  return query
  select a.starts_at, a.ends_at, a.status
  from public.appointments a
  where a.barbershop_id = p_barbershop_id
    and a.starts_at > v_operational_until
    and a.starts_at >= p_starts_from
    and a.starts_at <= p_starts_to
  order by a.starts_at;
end;
$$;

revoke all on function public.get_my_restricted_agenda_slots(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_my_restricted_agenda_slots(uuid, timestamptz, timestamptz) to authenticated;

drop policy if exists "Authenticated can read allowed appointments" on public.appointments;
create policy "Authenticated can read allowed appointments"
on public.appointments
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or (
    (
      professional_id = private.current_barber_professional_id(barbershop_id)
      or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
    )
    and private.can_operate_barbershop_agenda(barbershop_id)
    and starts_at <= private.barbershop_agenda_operational_until(barbershop_id)
  )
);

drop policy if exists "Authenticated can update allowed appointments" on public.appointments;
create policy "Authenticated can update allowed appointments"
on public.appointments
for update
to authenticated
using (
  (
    customer_id = (select auth.uid())
    and status in ('scheduled', 'confirmed')
    and starts_at > now()
  )
  or (
    (
      professional_id = private.current_barber_professional_id(barbershop_id)
      or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
    )
    and private.can_operate_barbershop_agenda(barbershop_id)
    and starts_at <= private.barbershop_agenda_operational_until(barbershop_id)
  )
)
with check (
  (
    customer_id = (select auth.uid())
    and status = 'cancelled'
  )
  or (
    (
      professional_id = private.current_barber_professional_id(barbershop_id)
      or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
    )
    and private.can_operate_barbershop_agenda(barbershop_id)
    and starts_at <= private.barbershop_agenda_operational_until(barbershop_id)
  )
);

create or replace function public.set_appointment_status(
  p_appointment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_role text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if p_status not in ('completed', 'no_show', 'cancelled') then
    raise exception 'Status transition not allowed';
  end if;

  select appointment.* into v_appointment
  from public.appointments appointment
  where appointment.id = p_appointment_id
  for update;

  if not found or v_appointment.status <> 'scheduled' then
    raise exception 'Status transition not allowed';
  end if;

  v_role := private.current_barbershop_role(v_appointment.barbershop_id);
  if v_role not in ('owner', 'manager', 'barber') then
    raise exception 'Access denied';
  end if;
  if not private.can_operate_barbershop_agenda(v_appointment.barbershop_id)
     or v_appointment.starts_at > private.barbershop_agenda_operational_until(v_appointment.barbershop_id) then
    raise exception 'Agenda access is unavailable after the operational window';
  end if;
  if v_role = 'barber' and (
    p_status = 'cancelled'
    or v_appointment.professional_id is distinct from private.current_barber_professional_id(v_appointment.barbershop_id)
  ) then
    raise exception 'Access denied';
  end if;

  update public.appointments
  set status = p_status,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      cancelled_by = case when p_status = 'cancelled' then (select auth.uid()) else cancelled_by end
  where id = v_appointment.id;
end;
$$;

revoke all on function public.set_appointment_status(uuid, text) from public, anon;
grant execute on function public.set_appointment_status(uuid, text) to authenticated, service_role;
