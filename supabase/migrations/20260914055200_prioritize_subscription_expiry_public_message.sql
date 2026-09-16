-- A subscription boundary is customer-facing and must take precedence over
-- setup guidance. Setup copy is reserved for barbershops that are still valid.

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
  if not private.can_accept_public_booking(v_barbershop_id) then
    return 'subscription';
  end if;
  if not private.is_barbershop_booking_configured(v_barbershop_id) then
    return 'setup';
  end if;
  return 'available';
end;
$$;

revoke all on function public.get_public_booking_availability(text) from public, anon, authenticated;
grant execute on function public.get_public_booking_availability(text) to anon, authenticated;

create or replace function private.reject_booking_when_barbershop_is_not_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_accept_public_booking(new.barbershop_id) then
    raise exception using
      errcode = 'P0001',
      message = 'Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP.';
  end if;
  if not private.is_barbershop_booking_configured(new.barbershop_id) then
    raise exception using
      errcode = 'P0001',
      message = 'O agendamento online desta barbearia ainda não está disponível.';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_booking_when_barbershop_is_not_ready() from public, anon, authenticated;
