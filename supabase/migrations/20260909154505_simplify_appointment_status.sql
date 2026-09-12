-- A booking is definitive as soon as it is created. Operational confirmation
-- is removed; staff can only move a scheduled booking to a terminal status.

update public.appointments
set status = 'scheduled'
where status = 'confirmed';

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('scheduled', 'completed', 'cancelled', 'no_show'));

delete from public.notification_preferences
where event_type = 'appointment_confirmed';

create or replace function public.get_my_notification_preferences(p_barbershop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not private.is_notification_staff(v_user,p_barbershop_id) then raise exception 'Access denied'; end if;

  select jsonb_agg(jsonb_build_object(
    'event_type',event.event_type,
    'in_app_enabled',coalesce(preference.in_app_enabled,true),
    'email_enabled',coalesce(preference.email_enabled,false)
  ) order by event.ord)
  into v_result
  from (values
    (1,'new_appointment'),
    (2,'appointment_cancelled'),
    (3,'appointment_rescheduled'),
    (4,'appointment_reminder_24h')
  ) event(ord,event_type)
  left join public.notification_preferences preference
    on preference.barbershop_id=p_barbershop_id
    and preference.user_id=v_user
    and preference.event_type=event.event_type;

  return coalesce(v_result,'[]'::jsonb);
end;
$$;

create or replace function public.save_my_notification_preference(
  p_barbershop_id uuid,
  p_event_type text,
  p_in_app_enabled boolean,
  p_email_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not private.is_notification_staff(v_user,p_barbershop_id) then raise exception 'Access denied'; end if;
  if p_event_type not in ('new_appointment','appointment_cancelled','appointment_rescheduled','appointment_reminder_24h') then
    raise exception 'Invalid notification event';
  end if;

  insert into public.notification_preferences(barbershop_id,user_id,event_type,in_app_enabled,email_enabled,updated_at)
  values(p_barbershop_id,v_user,p_event_type,p_in_app_enabled,p_email_enabled,now())
  on conflict(barbershop_id,user_id,event_type) do update
  set in_app_enabled=excluded.in_app_enabled,
      email_enabled=excluded.email_enabled,
      updated_at=now();
end;
$$;

revoke all on function public.get_my_notification_preferences(uuid) from public, anon;
grant execute on function public.get_my_notification_preferences(uuid) to authenticated, service_role;
revoke all on function public.save_my_notification_preference(uuid,text,boolean,boolean) from public, anon;
grant execute on function public.save_my_notification_preference(uuid,text,boolean,boolean) to authenticated, service_role;

drop policy if exists "Barber can update own appointments" on public.appointments;
drop policy if exists "Owner or manager can update appointments" on public.appointments;

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

  select appointment.*
  into v_appointment
  from public.appointments appointment
  where appointment.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  if v_appointment.status <> 'scheduled' then
    raise exception 'Status transition not allowed';
  end if;

  v_role := private.current_barbershop_role(v_appointment.barbershop_id);

  if v_role not in ('owner', 'manager', 'barber') then
    raise exception 'Access denied';
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

revoke all on function public.set_appointment_status(uuid,text) from public, anon;
grant execute on function public.set_appointment_status(uuid,text) to authenticated, service_role;
