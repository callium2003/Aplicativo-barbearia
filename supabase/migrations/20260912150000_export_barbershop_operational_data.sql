-- Owner-only operational export. The browser receives one tenant-scoped payload
-- and immediately creates the downloadable archive; this function retains no file.

create or replace function private.has_recent_barbershop_authentication()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'iat'), '') ~ '^[0-9]{10}$'
    and to_timestamp((select auth.jwt() ->> 'iat')::bigint) >= now() - interval '15 minutes'
    and exists (
      select 1
      from jsonb_array_elements(coalesce((select auth.jwt() -> 'amr'), '[]'::jsonb)) as method
      where coalesce(method ->> 'method', '') <> 'token_refresh'
    );
$$;

revoke all on function private.has_recent_barbershop_authentication() from public, anon, authenticated;

create or replace function public.export_my_barbershop_operational_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barbershop_id uuid;
  v_barbershop jsonb;
  v_registration jsonb;
  v_appointments jsonb;
  v_customers jsonb;
  v_customer_consents jsonb;
  v_services jsonb;
  v_professionals jsonb;
  v_commissions jsonb;
  v_business_hours jsonb;
  v_professional_hours jsonb;
  v_professional_breaks jsonb;
  v_professional_time_blocks jsonb;
  v_team_members jsonb;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  if not private.has_recent_barbershop_authentication() then
    raise exception 'Autenticação recente obrigatória.' using errcode = 'P0001';
  end if;

  select barbershop.id
  into v_barbershop_id
  from public.barbershops barbershop
  where barbershop.owner_id = (select auth.uid())
  order by barbershop.created_at
  limit 1;

  if v_barbershop_id is null
     or private.current_barbershop_role(v_barbershop_id) <> 'owner' then
    raise exception 'Sem permissão para exportar os dados desta barbearia.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'name', barbershop.name,
    'slug', barbershop.slug,
    'whatsapp', barbershop.whatsapp,
    'address', barbershop.address,
    'description', barbershop.description,
    'phone', barbershop.phone,
    'notification_email', barbershop.notification_email,
    'active', barbershop.active,
    'created_at', barbershop.created_at,
    'initial_registration_completed', barbershop.initial_registration_completed
  ) into v_barbershop
  from public.barbershops barbershop
  where barbershop.id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'responsible_name', registration.responsible_name,
    'responsible_phone', registration.responsible_phone,
    'tax_document', registration.tax_document,
    'postal_code', registration.postal_code,
    'address_number', registration.address_number,
    'neighborhood', registration.neighborhood,
    'city', registration.city,
    'state', registration.state,
    'total_people', registration.total_people,
    'attending_professionals', registration.attending_professionals,
    'service_positions', registration.service_positions,
    'created_at', registration.created_at,
    'updated_at', registration.updated_at
  )), '[]'::jsonb) into v_registration
  from public.barbershop_registration_details registration
  where registration.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', appointment.id,
    'customer_name', appointment.customer_name,
    'customer_phone', appointment.customer_phone,
    'customer_email', appointment.customer_email,
    'starts_at', appointment.starts_at,
    'ends_at', appointment.ends_at,
    'status', appointment.status,
    'service_name', appointment.service_name_snapshot,
    'service_price', appointment.service_price_snapshot,
    'duration_minutes', appointment.duration_minutes_snapshot,
    'professional_name', appointment.professional_name_snapshot,
    'services', coalesce((select jsonb_agg(jsonb_build_object(
      'name', appointment_service.service_name_snapshot,
      'price', appointment_service.service_price_snapshot,
      'duration_minutes', appointment_service.duration_minutes_snapshot
    ) order by appointment_service.created_at)
    from public.appointment_services appointment_service
    where appointment_service.appointment_id = appointment.id), '[]'::jsonb),
    'created_at', appointment.created_at,
    'cancelled_at', appointment.cancelled_at
  ) order by appointment.starts_at desc), '[]'::jsonb) into v_appointments
  from public.appointments appointment
  where appointment.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', customer.id,
    'name', customer.name,
    'email', customer.email,
    'phone', customer.phone,
    'related_since', relation.created_at,
    'updated_at', relation.updated_at
  ) order by customer.name), '[]'::jsonb) into v_customers
  from public.barbershop_customers relation
  join public.customers customer on customer.id = relation.customer_id
  where relation.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'customer_id', consent.customer_id,
    'consent_type', consent.consent_type,
    'granted', consent.granted,
    'consent_version', consent.consent_version,
    'source', consent.source,
    'granted_at', consent.granted_at,
    'revoked_at', consent.revoked_at,
    'created_at', consent.created_at,
    'updated_at', consent.updated_at
  ) order by consent.created_at desc), '[]'::jsonb) into v_customer_consents
  from public.customer_consents consent
  where consent.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', service.id,
    'name', service.name,
    'price', service.price,
    'duration_minutes', service.duration_minutes,
    'active', service.active,
    'created_at', service.created_at
  ) order by service.created_at), '[]'::jsonb) into v_services
  from public.services service
  where service.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', professional.id,
    'name', professional.name,
    'phone', professional.phone,
    'active', professional.active,
    'created_at', professional.created_at,
    'commission_rate_percent', commission_setting.commission_rate_percent
  ) order by professional.created_at), '[]'::jsonb) into v_professionals
  from public.professionals professional
  left join public.professional_commission_settings commission_setting on commission_setting.professional_id = professional.id
  where professional.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'appointment_id', commission.appointment_id,
    'professional_id', commission.professional_id,
    'professional_name', commission.professional_name_snapshot,
    'service_name', commission.service_name_snapshot,
    'appointment_starts_at', commission.appointment_starts_at,
    'gross_amount', commission.gross_amount,
    'commission_rate_percent', commission.commission_rate_percent,
    'commission_amount', commission.commission_amount,
    'payment_status', commission.payment_status,
    'completed_at', commission.completed_at,
    'paid_at', commission.paid_at,
    'created_at', commission.created_at,
    'updated_at', commission.updated_at
  ) order by commission.appointment_starts_at desc), '[]'::jsonb) into v_commissions
  from public.appointment_commissions commission
  where commission.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'weekday', business_hour.weekday,
    'opens_at', business_hour.opens_at,
    'closes_at', business_hour.closes_at,
    'is_closed', business_hour.is_closed,
    'created_at', business_hour.created_at
  ) order by business_hour.weekday), '[]'::jsonb) into v_business_hours
  from public.business_hours business_hour
  where business_hour.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'professional_id', professional_hour.professional_id,
    'professional_name', professional.name,
    'weekday', professional_hour.weekday,
    'opens_at', professional_hour.opens_at,
    'closes_at', professional_hour.closes_at,
    'is_closed', professional_hour.is_closed,
    'created_at', professional_hour.created_at
  ) order by professional.name, professional_hour.weekday), '[]'::jsonb) into v_professional_hours
  from public.professional_hours professional_hour
  join public.professionals professional on professional.id = professional_hour.professional_id
  where professional.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'professional_id', professional_break.professional_id,
    'professional_name', professional.name,
    'weekday', professional_break.weekday,
    'starts_at', professional_break.starts_at,
    'ends_at', professional_break.ends_at
  ) order by professional.name, professional_break.weekday, professional_break.starts_at), '[]'::jsonb) into v_professional_breaks
  from public.professional_breaks professional_break
  join public.professionals professional on professional.id = professional_break.professional_id
  where professional.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'professional_id', time_block.professional_id,
    'professional_name', professional.name,
    'starts_at', time_block.starts_at,
    'ends_at', time_block.ends_at,
    'reason', time_block.reason
  ) order by time_block.starts_at desc), '[]'::jsonb) into v_professional_time_blocks
  from public.professional_time_blocks time_block
  join public.professionals professional on professional.id = time_block.professional_id
  where professional.barbershop_id = v_barbershop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'professional_id', member.professional_id,
    'professional_name', professional.name,
    'role', member.role,
    'status', member.status,
    'created_at', member.created_at
  ) order by member.created_at), '[]'::jsonb) into v_team_members
  from public.team_members member
  left join public.professionals professional on professional.id = member.professional_id
  where member.barbershop_id = v_barbershop_id;

  perform private.write_audit_log(
    v_barbershop_id,
    'barbershop_operational_export',
    'barbershop',
    v_barbershop_id,
    jsonb_build_object('delivery', 'direct_download', 'format', 'xlsx_json')
  );

  return jsonb_build_object(
    'schema_version', '1.0',
    'generated_at', now(),
    'barbershop', coalesce(v_barbershop, '{}'::jsonb),
    'registration', v_registration,
    'appointments', v_appointments,
    'customers', v_customers,
    'customer_consents', v_customer_consents,
    'services', v_services,
    'professionals', v_professionals,
    'commissions', v_commissions,
    'business_hours', v_business_hours,
    'professional_hours', v_professional_hours,
    'professional_breaks', v_professional_breaks,
    'professional_time_blocks', v_professional_time_blocks,
    'team_members', v_team_members
  );
end;
$$;

revoke all on function public.export_my_barbershop_operational_data() from public, anon, authenticated;
grant execute on function public.export_my_barbershop_operational_data() to authenticated;
