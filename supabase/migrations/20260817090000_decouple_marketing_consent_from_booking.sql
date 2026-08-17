-- Marketing consent is a customer relationship preference, not appointment data.
-- This migration preserves append-only events and makes the absence of an event
-- non-authorizing.

drop function if exists public.book_customer_appointment(
  uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text
);

create function public.book_customer_appointment(
  p_barbershop_id uuid,
  p_service_ids uuid[],
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Cliente não autenticado.';
  end if;

  if private.current_barbershop_role(p_barbershop_id) is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Use uma conta de cliente separada para agendar na sua própria barbearia.';
  end if;

  insert into public.appointments (
    barbershop_id, service_id, service_ids, professional_id, starts_at, ends_at,
    status, customer_id, customer_name, customer_phone, customer_email
  ) values (
    p_barbershop_id, p_service_ids[1], p_service_ids, p_professional_id,
    p_starts_at, p_starts_at, 'scheduled', (select auth.uid()),
    btrim(p_customer_name), btrim(p_customer_phone), null
  )
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

create or replace function public.get_my_customer_marketing_preferences()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_platform boolean;
  v_platform_recorded boolean := false;
  v_barbershops jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Cliente não autenticado.';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.auth_user_id = (select auth.uid());

  if v_customer_id is null then
    raise exception 'Cliente não encontrado.';
  end if;

  select cc.granted, true
  into v_platform, v_platform_recorded
  from public.customer_consents cc
  where cc.customer_id = v_customer_id
    and cc.consent_type = 'PLATFORM_MARKETING'
    and cc.barbershop_id is null
  order by cc.created_at desc, cc.id desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'barbershop_id', x.barbershop_id,
    'barbershop_name', x.barbershop_name,
    'barbershop_marketing', x.barbershop_marketing,
    'barbershop_choice_recorded', x.barbershop_choice_recorded
  ) order by x.barbershop_name), '[]'::jsonb)
  into v_barbershops
  from (
    select
      bc.barbershop_id,
      b.name as barbershop_name,
      coalesce(latest.granted, false) as barbershop_marketing,
      (latest.id is not null) as barbershop_choice_recorded
    from public.barbershop_customers bc
    join public.barbershops b on b.id = bc.barbershop_id
    left join lateral (
      select cc.id, cc.granted
      from public.customer_consents cc
      where cc.customer_id = v_customer_id
        and cc.barbershop_id = bc.barbershop_id
        and cc.consent_type = 'BARBERSHOP_MARKETING'
      order by cc.created_at desc, cc.id desc
      limit 1
    ) latest on true
    where bc.customer_id = v_customer_id
  ) x;

  return jsonb_build_object(
    'platform_marketing', coalesce(v_platform, false),
    'platform_choice_recorded', v_platform_recorded,
    'barbershops', v_barbershops
  );
end;
$$;

create or replace function public.save_my_customer_marketing_preferences(
  p_barbershop_id uuid default null,
  p_barbershop_marketing boolean default false,
  p_platform_marketing boolean default false,
  p_save_barbershop boolean default false,
  p_save_platform boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_platform boolean;
  v_platform_recorded boolean := false;
  v_barbershop boolean;
  v_barbershop_recorded boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'Cliente não autenticado.';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.auth_user_id = (select auth.uid());

  if v_customer_id is null then
    raise exception 'Cliente não encontrado.';
  end if;

  if not p_save_platform and not p_save_barbershop then
    raise exception 'Nenhuma preferência foi selecionada.';
  end if;

  if p_save_barbershop then
    if p_barbershop_id is null or not exists (
      select 1
      from public.barbershop_customers bc
      where bc.customer_id = v_customer_id and bc.barbershop_id = p_barbershop_id
    ) then
      raise exception 'Cliente não relacionado à barbearia.';
    end if;

    select cc.granted, true
    into v_barbershop, v_barbershop_recorded
    from public.customer_consents cc
    where cc.customer_id = v_customer_id
      and cc.barbershop_id = p_barbershop_id
      and cc.consent_type = 'BARBERSHOP_MARKETING'
    order by cc.created_at desc, cc.id desc
    limit 1;
  end if;

  if p_save_platform then
    select cc.granted, true
    into v_platform, v_platform_recorded
    from public.customer_consents cc
    where cc.customer_id = v_customer_id
      and cc.barbershop_id is null
      and cc.consent_type = 'PLATFORM_MARKETING'
    order by cc.created_at desc, cc.id desc
    limit 1;
  end if;

  perform set_config('app.crm_consent_write', 'customer_preferences', true);

  if p_save_barbershop
    and (not v_barbershop_recorded or v_barbershop is distinct from p_barbershop_marketing) then
    insert into public.customer_consents (
      customer_id, barbershop_id, consent_type, granted, consent_version,
      source, granted_at, revoked_at
    ) values (
      v_customer_id, p_barbershop_id, 'BARBERSHOP_MARKETING', p_barbershop_marketing,
      '1.0', 'customer_preferences',
      case when p_barbershop_marketing then now() else null end,
      case when p_barbershop_marketing then null else now() end
    );
  end if;

  if p_save_platform
    and (not v_platform_recorded or v_platform is distinct from p_platform_marketing) then
    insert into public.customer_consents (
      customer_id, consent_type, granted, consent_version,
      source, granted_at, revoked_at
    ) values (
      v_customer_id, 'PLATFORM_MARKETING', p_platform_marketing,
      '1.0', 'customer_preferences',
      case when p_platform_marketing then now() else null end,
      case when p_platform_marketing then null else now() end
    );
  end if;
end;
$$;

drop policy if exists "Customer can record own consent events" on public.customer_consents;
create policy "Customer can record own consent events"
on public.customer_consents for insert to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_consents.customer_id
      and c.auth_user_id = (select auth.uid())
  )
  and (
    (customer_consents.consent_type = 'PLATFORM_MARKETING' and customer_consents.barbershop_id is null)
    or (
      customer_consents.consent_type = 'BARBERSHOP_MARKETING'
      and exists (
        select 1
        from public.barbershop_customers bc
        where bc.customer_id = customer_consents.customer_id
          and bc.barbershop_id = customer_consents.barbershop_id
      )
    )
  )
  and customer_consents.consent_version = '1.0'
  and customer_consents.source = 'customer_preferences'
  and current_setting('app.crm_consent_write', true) = 'customer_preferences'
);

revoke all on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text) from public;
revoke all on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text) from anon;
grant execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text) to authenticated;

revoke all on function public.get_my_customer_marketing_preferences() from public;
revoke all on function public.get_my_customer_marketing_preferences() from anon;
grant execute on function public.get_my_customer_marketing_preferences() to authenticated;

revoke all on function public.save_my_customer_marketing_preferences(uuid, boolean, boolean, boolean, boolean) from public;
revoke all on function public.save_my_customer_marketing_preferences(uuid, boolean, boolean, boolean, boolean) from anon;
grant execute on function public.save_my_customer_marketing_preferences(uuid, boolean, boolean, boolean, boolean) to authenticated;
