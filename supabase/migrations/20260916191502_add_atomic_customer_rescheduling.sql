-- The enclosing RPC transaction restores the original appointment if booking the replacement fails.
create function public.reschedule_customer_appointment(
  p_appointment_id uuid, p_barbershop_id uuid, p_service_ids uuid[],
  p_professional_id uuid, p_starts_at timestamptz, p_customer_name text, p_customer_phone text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_original public.appointments; v_replacement_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Cliente não autenticado.'; end if;
  select appointment.* into v_original from public.appointments appointment
  where appointment.id = p_appointment_id and appointment.customer_id = (select auth.uid()) for update;
  if v_original.id is null then raise exception using errcode = 'P0001', message = 'Agendamento não encontrado.'; end if;
  if v_original.barbershop_id <> p_barbershop_id then raise exception using errcode = 'P0001', message = 'A nova reserva deve pertencer à mesma barbearia.'; end if;
  if v_original.status <> 'scheduled' or v_original.starts_at < now() + interval '2 hours' then
    raise exception using errcode = 'P0001', message = 'Este agendamento não pode mais ser reagendado online.';
  end if;
  update public.appointments set status = 'cancelled' where id = v_original.id;
  select public.book_customer_appointment(p_barbershop_id, p_service_ids, p_professional_id, p_starts_at, p_customer_name, p_customer_phone)
    into v_replacement_id;
  return v_replacement_id;
end;
$$;
revoke all on function public.reschedule_customer_appointment(uuid, uuid, uuid[], uuid, timestamptz, text, text) from public;
revoke all on function public.reschedule_customer_appointment(uuid, uuid, uuid[], uuid, timestamptz, text, text) from anon;
grant execute on function public.reschedule_customer_appointment(uuid, uuid, uuid[], uuid, timestamptz, text, text) to authenticated;
