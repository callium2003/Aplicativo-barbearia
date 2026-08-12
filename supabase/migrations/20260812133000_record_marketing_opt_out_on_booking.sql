-- Record both outcomes of the explicit marketing choices.  A checked
-- "NÃ£o quero receber" box must revoke a previous consent instead of merely
-- skipping a new opt-in event.
create or replace function public.book_customer_appointment(
  p_barbershop_id uuid,
  p_service_ids uuid[],
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_barbershop_marketing boolean default false,
  p_platform_marketing boolean default false,
  p_consent_version text default '2026-08-02',
  p_consent_source text default 'booking_form'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment_id uuid;
  v_customer_id uuid;
  v_consent_version constant text := '1.0';
begin
  if (select auth.uid()) is null then
    raise exception 'Cliente nÃ£o autenticado.';
  end if;

  if private.current_barbershop_role(p_barbershop_id) is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Use uma conta de cliente separada para agendar na sua prÃ³pria barbearia.';
  end if;

  insert into public.appointments (
    barbershop_id, service_id, service_ids, professional_id, starts_at, ends_at,
    status, customer_id, customer_name, customer_phone, customer_email
  )
  values (
    p_barbershop_id, p_service_ids[1], p_service_ids, p_professional_id,
    p_starts_at, p_starts_at, 'scheduled', (select auth.uid()),
    btrim(p_customer_name), btrim(p_customer_phone), null
  )
  returning id, customer_global_id into v_appointment_id, v_customer_id;

  perform set_config(
    'app.crm_consent_write',
    case when p_barbershop_marketing then 'booking' else 'revocation' end,
    true
  );
  insert into public.customer_consents (
    customer_id, barbershop_id, consent_type, granted, consent_version,
    source, granted_at, revoked_at
  ) values (
    v_customer_id, p_barbershop_id, 'BARBERSHOP_MARKETING', p_barbershop_marketing,
    v_consent_version,
    case when p_barbershop_marketing then 'booking_form' else 'customer_settings' end,
    case when p_barbershop_marketing then now() else null end,
    case when p_barbershop_marketing then null else now() end
  );
  perform set_config(
    'app.crm_consent_write',
    case when p_platform_marketing then 'booking' else 'revocation' end,
    true
  );
  insert into public.customer_consents (
    customer_id, consent_type, granted, consent_version,
    source, granted_at, revoked_at
  ) values (
    v_customer_id, 'PLATFORM_MARKETING', p_platform_marketing,
    v_consent_version,
    case when p_platform_marketing then 'booking_form' else 'customer_settings' end,
    case when p_platform_marketing then now() else null end,
    case when p_platform_marketing then null else now() end
  );
  perform set_config('app.crm_consent_write', '', true);

  return v_appointment_id;
end;
$$;

revoke execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text) from public;
revoke execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text) from anon;
grant execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text) to authenticated;
