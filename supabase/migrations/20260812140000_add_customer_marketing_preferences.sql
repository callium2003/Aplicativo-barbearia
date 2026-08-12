-- Customer-facing marketing preferences. Operational appointment notices are
-- intentionally not controlled by this RPC.
drop policy if exists "Customer can record own consent events" on public.customer_consents;
create policy "Customer can record own consent events"
on public.customer_consents for insert to authenticated
with check (
  exists (
    select 1 from public.customers c
    where c.id = customer_consents.customer_id
      and c.auth_user_id = (select auth.uid())
  )
  and (
    (consent_type = 'PLATFORM_MARKETING' and barbershop_id is null)
    or (
      consent_type = 'BARBERSHOP_MARKETING'
      and exists (
        select 1 from public.barbershop_customers bc
        where bc.customer_id = customer_consents.customer_id
          and bc.barbershop_id = customer_consents.barbershop_id
      )
    )
  )
  and consent_version = '1.0'
  and source = 'customer_settings'
  and current_setting('app.crm_consent_write', true) = 'customer_settings'
);

create or replace function public.get_my_customer_marketing_preferences()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_platform boolean;
  v_barbershops jsonb;
begin
  select c.id into v_customer_id
  from public.customers c
  where c.auth_user_id = (select auth.uid());
  if v_customer_id is null then raise exception 'Cliente nÃ£o encontrado.'; end if;

  select coalesce(cc.granted, true) into v_platform
  from public.customer_consents cc
  where cc.customer_id = v_customer_id
    and cc.consent_type = 'PLATFORM_MARKETING'
    and cc.barbershop_id is null
  order by cc.created_at desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'barbershop_id', x.barbershop_id,
    'barbershop_name', x.barbershop_name,
    'barbershop_marketing', x.barbershop_marketing
  ) order by x.barbershop_name), '[]'::jsonb)
  into v_barbershops
  from (
    select bc.barbershop_id,
      b.name as barbershop_name,
      coalesce((
        select cc.granted
        from public.customer_consents cc
        where cc.customer_id = v_customer_id
          and cc.barbershop_id = bc.barbershop_id
          and cc.consent_type = 'BARBERSHOP_MARKETING'
        order by cc.created_at desc
        limit 1
      ), true) as barbershop_marketing
    from public.barbershop_customers bc
    join public.barbershops b on b.id = bc.barbershop_id
    where bc.customer_id = v_customer_id
  ) x;

  return jsonb_build_object(
    'platform_marketing', coalesce(v_platform, true),
    'barbershops', v_barbershops
  );
end;
$$;

create or replace function public.save_my_customer_marketing_preferences(
  p_barbershop_id uuid default null,
  p_barbershop_marketing boolean default true,
  p_platform_marketing boolean default true
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  select c.id into v_customer_id
  from public.customers c
  where c.auth_user_id = (select auth.uid());
  if v_customer_id is null then raise exception 'Cliente nÃ£o encontrado.'; end if;
  if p_barbershop_id is not null and not exists (
    select 1 from public.barbershop_customers bc
    where bc.customer_id = v_customer_id and bc.barbershop_id = p_barbershop_id
  ) then raise exception 'Cliente nÃ£o relacionado Ã  barbearia.'; end if;

  perform set_config('app.crm_consent_write', 'customer_settings', true);
  if p_barbershop_id is not null then
    insert into public.customer_consents (
      customer_id, barbershop_id, consent_type, granted, consent_version,
      source, granted_at, revoked_at
    ) values (
      v_customer_id, p_barbershop_id, 'BARBERSHOP_MARKETING', p_barbershop_marketing,
      '1.0', 'customer_settings',
      case when p_barbershop_marketing then now() else null end,
      case when p_barbershop_marketing then null else now() end
    );
  end if;
  insert into public.customer_consents (
    customer_id, consent_type, granted, consent_version,
    source, granted_at, revoked_at
  ) values (
    v_customer_id, 'PLATFORM_MARKETING', p_platform_marketing,
    '1.0', 'customer_settings',
    case when p_platform_marketing then now() else null end,
    case when p_platform_marketing then null else now() end
  );
  perform set_config('app.crm_consent_write', '', true);
end;
$$;

revoke all on function public.get_my_customer_marketing_preferences() from public;
grant execute on function public.get_my_customer_marketing_preferences() to authenticated;
revoke all on function public.save_my_customer_marketing_preferences(uuid, boolean, boolean) from public;
grant execute on function public.save_my_customer_marketing_preferences(uuid, boolean, boolean) to authenticated;
