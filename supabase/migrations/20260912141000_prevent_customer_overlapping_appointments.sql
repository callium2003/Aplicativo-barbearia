-- A customer may not hold two active overlapping appointments at the same
-- barbershop, even when each appointment selects a different professional.
create or replace function public.prevent_customer_overlapping_appointments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.customer_id is null or new.status <> 'scheduled' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text || ':' || new.barbershop_id::text, 0));

  if exists (
    select 1
    from public.appointments appointment
    where appointment.id is distinct from new.id
      and appointment.barbershop_id = new.barbershop_id
      and appointment.customer_id = new.customer_id
      and appointment.status = 'scheduled'
      and appointment.starts_at < new.ends_at
      and appointment.ends_at > new.starts_at
  ) then
    raise exception 'Você já possui um agendamento nesse horário nesta barbearia.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_prevent_customer_overlapping_appointments on public.appointments;
create trigger zz_prevent_customer_overlapping_appointments
before insert or update of customer_id, barbershop_id, starts_at, ends_at, status
on public.appointments
for each row execute function public.prevent_customer_overlapping_appointments();
