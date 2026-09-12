-- A professional may select only the source of their own schedule. The saved
-- custom week is retained when returning to the barbershop's shared schedule.
create or replace function public.set_my_professional_schedule_mode(p_schedule_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional_id uuid;
  v_barbershop_id uuid;
  v_current_mode text;
begin
  if auth.uid() is null or p_schedule_mode not in ('barbershop', 'custom') then
    raise exception 'Modo de agenda inválido.' using errcode = '22023';
  end if;

  select p.id, p.barbershop_id, p.schedule_mode
  into v_professional_id, v_barbershop_id, v_current_mode
  from public.professionals p
  where p.id = private.current_barber_professional_id(p.barbershop_id)
    and p.active = true;

  if v_professional_id is null then
    raise exception 'Profissional não autorizado.' using errcode = '42501';
  end if;
  if p_schedule_mode = v_current_mode then return; end if;

  if p_schedule_mode = 'barbershop' then
    insert into public.professional_saved_custom_hours (professional_id, weekday, opens_at, closes_at, is_closed, updated_at)
    select professional_id, weekday, opens_at, closes_at, is_closed, now()
    from public.professional_hours where professional_id = v_professional_id
    on conflict (professional_id, weekday) do update
      set opens_at = excluded.opens_at, closes_at = excluded.closes_at, is_closed = excluded.is_closed, updated_at = now();

    delete from public.professional_hours where professional_id = v_professional_id;
    insert into public.professional_hours (professional_id, weekday, opens_at, closes_at, is_closed)
    select v_professional_id, weekday, opens_at, closes_at, is_closed
    from public.business_hours where barbershop_id = v_barbershop_id;
  elsif (select count(*) from public.professional_saved_custom_hours where professional_id = v_professional_id) = 7 then
    delete from public.professional_hours where professional_id = v_professional_id;
    insert into public.professional_hours (professional_id, weekday, opens_at, closes_at, is_closed)
    select professional_id, weekday, opens_at, closes_at, is_closed
    from public.professional_saved_custom_hours where professional_id = v_professional_id;
  end if;

  update public.professionals set schedule_mode = p_schedule_mode where id = v_professional_id;
end;
$$;

revoke all on function public.set_my_professional_schedule_mode(text) from public, anon;
grant execute on function public.set_my_professional_schedule_mode(text) to authenticated;
