create or replace function public.save_my_customer_profile(
  p_name text,
  p_phone text
)
returns table (
  customer_id uuid,
  name text,
  email text,
  phone text,
  phone_normalized text
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_phone_normalized text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Informe seu nome completo.';
  end if;

  if char_length(v_phone_normalized) < 10 or char_length(v_phone_normalized) > 13 then
    raise exception 'Informe um celular/WhatsApp válido com DDD.';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;

  insert into public.customers (auth_user_id, name, email, phone, phone_normalized)
  values (v_user_id, v_name, v_email, v_phone, v_phone_normalized)
  on conflict (auth_user_id) where auth_user_id is not null do update
  set name = excluded.name,
      email = coalesce(excluded.email, public.customers.email),
      phone = excluded.phone,
      phone_normalized = excluded.phone_normalized,
      updated_at = now();

  return query
  select c.id, c.name, c.email, c.phone, c.phone_normalized
  from public.customers c
  where c.auth_user_id = v_user_id;
end;
$$;

revoke all on function public.save_my_customer_profile(text, text) from public;
revoke all on function public.save_my_customer_profile(text, text) from anon;
grant execute on function public.save_my_customer_profile(text, text) to authenticated;

create or replace function public.get_barbershop_management_report(
  p_barbershop_id uuid,
  p_start_date date,
  p_end_date date,
  p_professional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_barbershop_id is null or p_start_date is null or p_end_date is null then
    raise exception 'Barbearia e período são obrigatórios.';
  end if;

  if p_end_date < p_start_date or p_end_date - p_start_date > 366 then
    raise exception 'Período inválido. Consulte no máximo 367 dias por vez.';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para consultar os relatórios desta barbearia.';
  end if;

  if p_professional_id is not null and not exists (
    select 1 from public.professionals p
    where p.id = p_professional_id and p.barbershop_id = p_barbershop_id
  ) then
    raise exception 'Profissional não pertence a esta barbearia.';
  end if;

  v_start_ts := p_start_date::timestamp at time zone 'America/Sao_Paulo';
  v_end_ts := (p_end_date + 1)::timestamp at time zone 'America/Sao_Paulo';

  with
  selected_professionals as (
    select p.id, p.name, p.active
    from public.professionals p
    where p.barbershop_id = p_barbershop_id
      and (p_professional_id is null or p.id = p_professional_id)
  ),
  period_appointments as (
    select a.*
    from public.appointments a
    where a.barbershop_id = p_barbershop_id
      and a.starts_at >= v_start_ts
      and a.starts_at < v_end_ts
      and (p_professional_id is null or a.professional_id = p_professional_id)
  ),
  appointment_summary as (
    select
      count(*)::integer total_appointments,
      count(*) filter (where status = 'scheduled')::integer scheduled,
      count(*) filter (where status = 'confirmed')::integer confirmed,
      count(*) filter (where status = 'completed')::integer completed,
      count(*) filter (where status = 'cancelled')::integer cancelled,
      count(*) filter (where status = 'no_show')::integer no_show,
      coalesce(sum(service_price_snapshot) filter (where status = 'completed'), 0)::numeric(12,2) gross_revenue,
      coalesce(avg(service_price_snapshot) filter (where status = 'completed'), 0)::numeric(12,2) average_ticket,
      coalesce(sum(service_price_snapshot) filter (where status = 'cancelled'), 0)::numeric(12,2) cancelled_value,
      coalesce(sum(service_price_snapshot) filter (where status = 'no_show'), 0)::numeric(12,2) no_show_value,
      coalesce(sum(duration_minutes_snapshot) filter (where status in ('scheduled','confirmed','completed','no_show')), 0)::integer booked_minutes
    from period_appointments
  ),
  period_commissions as (
    select ac.*
    from public.appointment_commissions ac
    where ac.barbershop_id = p_barbershop_id
      and ac.appointment_starts_at >= v_start_ts
      and ac.appointment_starts_at < v_end_ts
      and (p_professional_id is null or ac.professional_id = p_professional_id)
  ),
  commission_summary as (
    select
      coalesce(sum(commission_amount), 0)::numeric(12,2) total,
      coalesce(sum(commission_amount) filter (where payment_status = 'pending'), 0)::numeric(12,2) pending,
      coalesce(sum(commission_amount) filter (where payment_status = 'paid'), 0)::numeric(12,2) paid
    from period_commissions
  ),
  customer_first as (
    select a.customer_global_id,
           min(a.starts_at) filter (where a.status not in ('cancelled','no_show')) as first_appointment
    from public.appointments a
    where a.barbershop_id = p_barbershop_id
      and a.customer_global_id is not null
    group by a.customer_global_id
  ),
  period_customers as (
    select distinct a.customer_global_id
    from period_appointments a
    where a.customer_global_id is not null
      and a.status not in ('cancelled','no_show')
  ),
  customer_summary as (
    select
      count(*)::integer total_clients,
      count(*) filter (where cf.first_appointment >= v_start_ts and cf.first_appointment < v_end_ts)::integer new_clients,
      count(*) filter (where cf.first_appointment < v_start_ts)::integer returning_clients,
      count(*) filter (where exists (
        select 1 from public.appointments future_a
        where future_a.barbershop_id = p_barbershop_id
          and future_a.customer_global_id = pc.customer_global_id
          and future_a.starts_at >= v_end_ts
          and future_a.status in ('scheduled','confirmed')
      ))::integer rebooked_clients
    from period_customers pc
    join customer_first cf on cf.customer_global_id = pc.customer_global_id
  ),
  professional_days as (
    select
      sp.id professional_id,
      d::date work_date,
      case when ph.id is not null then ph.opens_at else bh.opens_at end opens_at,
      case when ph.id is not null then ph.closes_at else bh.closes_at end closes_at,
      case when ph.id is not null then ph.is_closed else coalesce(bh.is_closed, true) end is_closed
    from selected_professionals sp
    cross join generate_series(p_start_date, p_end_date, interval '1 day') d
    left join public.professional_hours ph
      on ph.professional_id = sp.id and ph.weekday = extract(dow from d)::integer
    left join public.business_hours bh
      on bh.barbershop_id = p_barbershop_id and bh.weekday = extract(dow from d)::integer
  ),
  available_slots as (
    select pd.professional_id, (slot_local at time zone 'America/Sao_Paulo') slot_start
    from professional_days pd
    cross join lateral generate_series(
      pd.work_date::timestamp + pd.opens_at,
      pd.work_date::timestamp + pd.closes_at - interval '10 minutes',
      interval '10 minutes'
    ) slot_local
    where not pd.is_closed
      and pd.opens_at is not null
      and pd.closes_at is not null
      and pd.closes_at > pd.opens_at
      and not exists (
        select 1 from public.professional_breaks pb
        where pb.professional_id = pd.professional_id
          and pb.weekday = extract(dow from pd.work_date)::integer
          and slot_local::time < pb.ends_at
          and (slot_local + interval '10 minutes')::time > pb.starts_at
      )
      and not exists (
        select 1 from public.professional_time_blocks tb
        where tb.professional_id = pd.professional_id
          and tb.starts_at < ((slot_local + interval '10 minutes') at time zone 'America/Sao_Paulo')
          and tb.ends_at > (slot_local at time zone 'America/Sao_Paulo')
      )
  ),
  available_by_professional as (
    select professional_id, count(*)::integer * 10 available_minutes
    from available_slots
    group by professional_id
  ),
  appointments_by_professional as (
    select
      a.professional_id,
      count(*)::integer appointments,
      count(*) filter (where a.status = 'completed')::integer completed,
      count(*) filter (where a.status = 'cancelled')::integer cancelled,
      count(*) filter (where a.status = 'no_show')::integer no_show,
      coalesce(sum(a.service_price_snapshot) filter (where a.status = 'completed'), 0)::numeric(12,2) revenue,
      coalesce(avg(a.service_price_snapshot) filter (where a.status = 'completed'), 0)::numeric(12,2) average_ticket,
      coalesce(sum(a.duration_minutes_snapshot) filter (where a.status in ('scheduled','confirmed','completed','no_show')), 0)::integer booked_minutes
    from period_appointments a
    group by a.professional_id
  ),
  commissions_by_professional as (
    select
      ac.professional_id,
      coalesce(sum(ac.commission_amount), 0)::numeric(12,2) commission_total,
      coalesce(sum(ac.commission_amount) filter (where ac.payment_status = 'pending'), 0)::numeric(12,2) commission_pending,
      coalesce(sum(ac.commission_amount) filter (where ac.payment_status = 'paid'), 0)::numeric(12,2) commission_paid
    from period_commissions ac
    group by ac.professional_id
  ),
  professionals_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'professional_id', sp.id,
      'professional_name', sp.name,
      'active', sp.active,
      'appointments', coalesce(ap.appointments, 0),
      'completed', coalesce(ap.completed, 0),
      'cancelled', coalesce(ap.cancelled, 0),
      'no_show', coalesce(ap.no_show, 0),
      'revenue', coalesce(ap.revenue, 0),
      'average_ticket', coalesce(ap.average_ticket, 0),
      'booked_minutes', coalesce(ap.booked_minutes, 0),
      'available_minutes', coalesce(av.available_minutes, 0),
      'occupancy_percent', case when coalesce(av.available_minutes, 0) > 0
        then round((coalesce(ap.booked_minutes, 0)::numeric / av.available_minutes::numeric) * 100, 1)
        else 0 end,
      'commission_total', coalesce(cp.commission_total, 0),
      'commission_pending', coalesce(cp.commission_pending, 0),
      'commission_paid', coalesce(cp.commission_paid, 0)
    ) order by coalesce(ap.revenue, 0) desc, sp.name), '[]'::jsonb) value
    from selected_professionals sp
    left join appointments_by_professional ap on ap.professional_id = sp.id
    left join available_by_professional av on av.professional_id = sp.id
    left join commissions_by_professional cp on cp.professional_id = sp.id
  ),
  completed_services as (
    select aps.service_id,
           aps.service_name_snapshot,
           aps.service_price_snapshot,
           aps.duration_minutes_snapshot
    from public.appointment_services aps
    join period_appointments a on a.id = aps.appointment_id and a.status = 'completed'
  ),
  services_group as (
    select
      service_id,
      service_name_snapshot,
      count(*)::integer completed_services,
      coalesce(sum(service_price_snapshot), 0)::numeric(12,2) revenue,
      coalesce(avg(service_price_snapshot), 0)::numeric(12,2) average_price,
      coalesce(sum(duration_minutes_snapshot), 0)::integer service_minutes
    from completed_services
    group by service_id, service_name_snapshot
  ),
  services_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'service_id', service_id,
      'service_name', service_name_snapshot,
      'completed_services', completed_services,
      'revenue', revenue,
      'average_price', average_price,
      'service_minutes', service_minutes,
      'revenue_share_percent', case when sum(revenue) over () > 0 then round((revenue / sum(revenue) over ()) * 100, 1) else 0 end
    ) order by revenue desc, service_name_snapshot), '[]'::jsonb) value
    from services_group
  ),
  daily_group as (
    select
      (a.starts_at at time zone 'America/Sao_Paulo')::date report_date,
      count(*)::integer appointments,
      count(*) filter (where a.status = 'completed')::integer completed,
      count(*) filter (where a.status = 'cancelled')::integer cancelled,
      count(*) filter (where a.status = 'no_show')::integer no_show,
      coalesce(sum(a.service_price_snapshot) filter (where a.status = 'completed'), 0)::numeric(12,2) revenue
    from period_appointments a
    group by (a.starts_at at time zone 'America/Sao_Paulo')::date
  ),
  daily_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', report_date,
      'appointments', appointments,
      'completed', completed,
      'cancelled', cancelled,
      'no_show', no_show,
      'revenue', revenue
    ) order by report_date), '[]'::jsonb) value
    from daily_group
  ),
  cancel_reason_group as (
    select coalesce(nullif(btrim(a.cancel_reason), ''), 'Não informado') reason, count(*)::integer total
    from period_appointments a
    where a.status = 'cancelled'
    group by coalesce(nullif(btrim(a.cancel_reason), ''), 'Não informado')
  ),
  cancel_reasons_json as (
    select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'total', total) order by total desc, reason), '[]'::jsonb) value
    from cancel_reason_group
  ),
  customer_period_stats as (
    select
      a.customer_global_id,
      count(*) filter (where a.status = 'completed')::integer completed_visits,
      coalesce(sum(a.service_price_snapshot) filter (where a.status = 'completed'), 0)::numeric(12,2) revenue,
      max(a.starts_at) filter (where a.status not in ('cancelled','no_show')) last_period_appointment
    from period_appointments a
    where a.customer_global_id is not null
    group by a.customer_global_id
  ),
  customer_all_stats as (
    select
      a.customer_global_id,
      min(a.starts_at) filter (where a.status not in ('cancelled','no_show')) first_appointment,
      max(a.starts_at) filter (where a.status = 'completed') last_completed,
      count(*) filter (where a.status = 'completed')::integer lifetime_completed_visits,
      coalesce(sum(a.service_price_snapshot) filter (where a.status = 'completed'), 0)::numeric(12,2) lifetime_revenue,
      min(a.starts_at) filter (where a.starts_at >= now() and a.status in ('scheduled','confirmed')) next_appointment
    from public.appointments a
    where a.barbershop_id = p_barbershop_id
      and a.customer_global_id is not null
    group by a.customer_global_id
  ),
  customers_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customer_id', c.id,
      'customer_name', c.name,
      'customer_email', c.email,
      'customer_phone', c.phone,
      'completed_visits', cps.completed_visits,
      'period_revenue', cps.revenue,
      'first_appointment', cas.first_appointment,
      'last_completed', cas.last_completed,
      'next_appointment', cas.next_appointment,
      'lifetime_completed_visits', cas.lifetime_completed_visits,
      'lifetime_revenue', cas.lifetime_revenue,
      'customer_type', case when cas.first_appointment >= v_start_ts and cas.first_appointment < v_end_ts then 'new' else 'returning' end
    ) order by cps.revenue desc, c.name), '[]'::jsonb) value
    from customer_period_stats cps
    join public.customers c on c.id = cps.customer_global_id
    join customer_all_stats cas on cas.customer_global_id = cps.customer_global_id
  ),
  appointments_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'appointment_id', a.id,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'status', a.status,
      'customer_id', a.customer_global_id,
      'customer_name', a.customer_name,
      'customer_email', a.customer_email,
      'customer_phone', a.customer_phone,
      'professional_id', a.professional_id,
      'professional_name', a.professional_name_snapshot,
      'service_name', a.service_name_snapshot,
      'gross_amount', coalesce(a.service_price_snapshot, 0),
      'duration_minutes', coalesce(a.duration_minutes_snapshot, 0),
      'cancel_reason', a.cancel_reason
    ) order by a.starts_at desc), '[]'::jsonb) value
    from period_appointments a
  )
  select jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date, 'professional_id', p_professional_id),
    'summary', jsonb_build_object(
      'total_appointments', s.total_appointments,
      'scheduled', s.scheduled,
      'confirmed', s.confirmed,
      'completed', s.completed,
      'cancelled', s.cancelled,
      'no_show', s.no_show,
      'gross_revenue', s.gross_revenue,
      'average_ticket', s.average_ticket,
      'cancelled_value', s.cancelled_value,
      'no_show_value', s.no_show_value,
      'booked_minutes', s.booked_minutes,
      'commission_total', c.total,
      'commission_pending', c.pending,
      'commission_paid', c.paid,
      'net_after_commission', (s.gross_revenue - c.total)::numeric(12,2),
      'total_clients', cs.total_clients,
      'new_clients', cs.new_clients,
      'returning_clients', cs.returning_clients,
      'rebooked_clients', cs.rebooked_clients,
      'rebooking_rate_percent', case when cs.total_clients > 0 then round((cs.rebooked_clients::numeric / cs.total_clients::numeric) * 100, 1) else 0 end,
      'cancellation_rate_percent', case when s.total_appointments > 0 then round((s.cancelled::numeric / s.total_appointments::numeric) * 100, 1) else 0 end,
      'no_show_rate_percent', case when s.total_appointments > 0 then round((s.no_show::numeric / s.total_appointments::numeric) * 100, 1) else 0 end
    ),
    'professionals', pj.value,
    'services', sj.value,
    'daily', dj.value,
    'cancel_reasons', crj.value,
    'customers', cj.value,
    'appointments', aj.value
  ) into v_result
  from appointment_summary s
  cross join commission_summary c
  cross join customer_summary cs
  cross join professionals_json pj
  cross join services_json sj
  cross join daily_json dj
  cross join cancel_reasons_json crj
  cross join customers_json cj
  cross join appointments_json aj;

  return v_result;
end;
$$;

revoke all on function public.get_barbershop_management_report(uuid, date, date, uuid) from public;
revoke all on function public.get_barbershop_management_report(uuid, date, date, uuid) from anon;
grant execute on function public.get_barbershop_management_report(uuid, date, date, uuid) to authenticated;
