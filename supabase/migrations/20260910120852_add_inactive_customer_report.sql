-- Clientes com última conclusão há mais de 45 dias e sem reserva ativa futura.
create index if not exists appointments_barbershop_customer_completed_starts_at_idx
  on public.appointments (barbershop_id, customer_global_id, starts_at desc)
  where status = 'completed' and customer_global_id is not null;

create or replace function public.get_barbershop_inactive_customers(
  p_barbershop_id uuid,
  p_reference_date date,
  p_professional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role text;
  v_reference_start timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;
  if p_barbershop_id is null or p_reference_date is null then
    raise exception 'Barbearia e data de referência são obrigatórias.' using errcode = '22023';
  end if;
  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para consultar os relatórios desta barbearia.' using errcode = '42501';
  end if;
  if p_professional_id is not null and not exists (
    select 1 from public.professionals professional
    where professional.id = p_professional_id and professional.barbershop_id = p_barbershop_id
  ) then
    raise exception 'Profissional inválido para esta barbearia.' using errcode = '22023';
  end if;
  v_reference_start := p_reference_date::timestamp at time zone 'America/Sao_Paulo';
  return jsonb_build_object(
    'reference_date', p_reference_date,
    'customers', coalesce((
      with completed as (
        select appointment.customer_global_id as customer_id, max(appointment.starts_at) as last_completed,
          count(*)::int as completed_visits, coalesce(sum(appointment.service_price_snapshot), 0)::numeric(14,2) as lifetime_revenue
        from public.appointments appointment
        where appointment.barbershop_id = p_barbershop_id and appointment.status = 'completed'
          and appointment.customer_global_id is not null and (p_professional_id is null or appointment.professional_id = p_professional_id)
        group by appointment.customer_global_id
      ), eligible as (
        select completed.* from completed
        where (completed.last_completed at time zone 'America/Sao_Paulo')::date < p_reference_date - 45
          and not exists (
            select 1 from public.appointments future_appointment
            where future_appointment.barbershop_id = p_barbershop_id and future_appointment.customer_global_id = completed.customer_id
              and future_appointment.starts_at >= v_reference_start and future_appointment.status in ('scheduled', 'confirmed')
          )
      )
      select jsonb_agg(jsonb_build_object(
        'customer_id', eligible.customer_id, 'customer_name', customer.name, 'customer_email', customer.email,
        'customer_phone', customer.phone, 'last_completed', eligible.last_completed,
        'days_without_return', p_reference_date - (eligible.last_completed at time zone 'America/Sao_Paulo')::date,
        'completed_visits', eligible.completed_visits, 'lifetime_revenue', eligible.lifetime_revenue,
        'service_types', coalesce((
          select jsonb_agg(service_name order by service_name) from (
            select distinct coalesce(service_item.service_name_snapshot, service_appointment.service_name_snapshot) as service_name
            from public.appointments service_appointment
            left join public.appointment_services service_item on service_item.appointment_id = service_appointment.id
            where service_appointment.barbershop_id = p_barbershop_id and service_appointment.customer_global_id = eligible.customer_id
              and service_appointment.status = 'completed' and (p_professional_id is null or service_appointment.professional_id = p_professional_id)
              and coalesce(service_item.service_name_snapshot, service_appointment.service_name_snapshot) is not null
          ) service_names
        ), '[]'::jsonb)
      ) order by eligible.last_completed asc, customer.name)
      from eligible join public.customers customer on customer.id = eligible.customer_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_barbershop_inactive_customers(uuid, date, uuid) from public;
revoke all on function public.get_barbershop_inactive_customers(uuid, date, uuid) from anon;
revoke all on function public.get_barbershop_inactive_customers(uuid, date, uuid) from authenticated;
grant execute on function public.get_barbershop_inactive_customers(uuid, date, uuid) to authenticated;
