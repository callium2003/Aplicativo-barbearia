-- Consulta ampliada de uma barbearia pela CullenTech (EFS §24.10.3, §48.5.1).
-- Somente leitura. Acesso exclusivo de platform_owner ativo, sempre por
-- barbearia explícita. Abertura de clientes e de consentimentos é auditada em
-- trilha privada e minimizada; leituras simples não são auditadas.

create or replace function private.is_active_platform_owner()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from private.platform_administrators administrator
    where administrator.user_id = (select auth.uid())
      and administrator.role = 'platform_owner'
      and administrator.active
  );
$$;

revoke all on function private.is_active_platform_owner() from public, anon, authenticated;

create or replace function private.assert_platform_barbershop(p_barbershop_id uuid)
returns void
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;
  if p_barbershop_id is null
     or not exists (select 1 from public.barbershops b where b.id = p_barbershop_id) then
    raise exception 'Barbearia não encontrada';
  end if;
end;
$$;

revoke all on function private.assert_platform_barbershop(uuid) from public, anon, authenticated;

create table if not exists private.platform_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid not null,
  action text not null check (action in ('customer_data_opened', 'customer_consents_viewed')),
  barbershop_id uuid not null,
  record_count integer not null check (record_count >= 0),
  occurred_at timestamptz not null default now()
);

create index if not exists platform_audit_events_barbershop_occurred_idx
  on private.platform_audit_events (barbershop_id, occurred_at desc);

alter table private.platform_audit_events enable row level security;
revoke all on table private.platform_audit_events from public, anon, authenticated;

create or replace function private.write_platform_audit_event(p_barbershop_id uuid, p_action text, p_record_count integer)
returns void
language sql
volatile
security definer
set search_path to ''
as $$
  insert into private.platform_audit_events (actor_user_id, action, barbershop_id, record_count)
  values ((select auth.uid()), p_action, p_barbershop_id, p_record_count);
$$;

revoke all on function private.write_platform_audit_event(uuid, text, integer) from public, anon, authenticated;

create or replace function public.get_platform_barbershop_detail(p_barbershop_id uuid)
returns table(
  barbershop_id uuid,
  name text,
  slug text,
  registration_status text,
  created_at timestamptz,
  phone text,
  whatsapp text,
  notification_email text,
  address text,
  initial_registration_completed boolean,
  responsible_name text,
  responsible_phone text,
  tax_document text,
  postal_code text,
  address_number text,
  neighborhood text,
  city text,
  state text,
  subscription_status text,
  plan_code text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  contract_status text,
  customer_count integer,
  active_professional_count integer,
  active_service_count integer
)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  return query
  select
    b.id,
    b.name,
    b.slug,
    case when b.active then 'active' else 'inactive' end,
    b.created_at,
    b.phone,
    b.whatsapp,
    b.notification_email,
    b.address,
    b.initial_registration_completed,
    r.responsible_name,
    r.responsible_phone,
    r.tax_document,
    r.postal_code,
    r.address_number,
    r.neighborhood,
    r.city,
    r.state,
    s.status,
    s.plan_code,
    s.trial_ends_at,
    s.current_period_ends_at,
    case
      when s.status is null then 'unavailable'
      when s.status = 'trialing' and s.trial_ends_at > now() then 'trial'
      when s.status = 'trialing' then 'trial_ended'
      when s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now()) then 'active'
      when s.status = 'past_due' then 'payment_attention'
      when s.status = 'cancelled' then 'cancelled'
      else 'ended'
    end,
    (select count(*)::integer from public.barbershop_customers bc where bc.barbershop_id = b.id),
    (select count(*)::integer from public.professionals p where p.barbershop_id = b.id and p.active),
    (select count(*)::integer from public.services sv where sv.barbershop_id = b.id and sv.active)
  from public.barbershops b
  left join public.barbershop_registration_details r on r.barbershop_id = b.id
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  where b.id = p_barbershop_id;
end;
$$;

revoke all on function public.get_platform_barbershop_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_platform_barbershop_detail(uuid) to authenticated;

create or replace function public.list_platform_barbershop_professionals(p_barbershop_id uuid)
returns table(professional_id uuid, name text, active boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  return query
  select p.id, p.name, p.active, p.created_at
  from public.professionals p
  where p.barbershop_id = p_barbershop_id
  order by p.active desc, p.name;
end;
$$;

revoke all on function public.list_platform_barbershop_professionals(uuid) from public, anon, authenticated;
grant execute on function public.list_platform_barbershop_professionals(uuid) to authenticated;

create or replace function public.list_platform_barbershop_services(p_barbershop_id uuid)
returns table(service_id uuid, name text, active boolean, duration_minutes integer, price numeric)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  return query
  select sv.id, sv.name, sv.active, sv.duration_minutes, sv.price
  from public.services sv
  where sv.barbershop_id = p_barbershop_id
  order by sv.active desc, sv.name;
end;
$$;

revoke all on function public.list_platform_barbershop_services(uuid) from public, anon, authenticated;
grant execute on function public.list_platform_barbershop_services(uuid) to authenticated;

-- Clientes que encerraram a conta perdem o vínculo em barbershop_customers e,
-- portanto, não aparecem nesta lista.
create or replace function public.list_platform_barbershop_customers(p_barbershop_id uuid)
returns table(customer_id uuid, name text, email text, phone text, related_since timestamptz)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_count integer;
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  select count(*)::integer into v_count
  from public.barbershop_customers bc
  where bc.barbershop_id = p_barbershop_id;

  perform private.write_platform_audit_event(p_barbershop_id, 'customer_data_opened', v_count);

  return query
  select c.id, c.name, c.email, c.phone, bc.created_at
  from public.barbershop_customers bc
  join public.customers c on c.id = bc.customer_id
  where bc.barbershop_id = p_barbershop_id
  order by c.name, c.id;
end;
$$;

revoke all on function public.list_platform_barbershop_customers(uuid) from public, anon, authenticated;
grant execute on function public.list_platform_barbershop_customers(uuid) to authenticated;

create or replace function public.list_platform_barbershop_customer_consents(p_barbershop_id uuid)
returns table(
  customer_id uuid,
  customer_name text,
  barbershop_marketing_granted boolean,
  barbershop_marketing_version text,
  barbershop_marketing_source text,
  barbershop_marketing_changed_at timestamptz,
  platform_marketing_granted boolean,
  platform_marketing_version text,
  platform_marketing_source text,
  platform_marketing_changed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_count integer;
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  select count(*)::integer into v_count
  from public.barbershop_customers bc
  where bc.barbershop_id = p_barbershop_id;

  perform private.write_platform_audit_event(p_barbershop_id, 'customer_consents_viewed', v_count);

  return query
  select
    c.id,
    c.name,
    shop.granted,
    shop.consent_version,
    shop.source,
    coalesce(shop.granted_at, shop.revoked_at),
    platform.granted,
    platform.consent_version,
    platform.source,
    coalesce(platform.granted_at, platform.revoked_at)
  from public.barbershop_customers bc
  join public.customers c on c.id = bc.customer_id
  left join lateral (
    select cc.granted, cc.consent_version, cc.source, cc.granted_at, cc.revoked_at
    from public.customer_consents cc
    where cc.customer_id = c.id
      and cc.consent_type = 'BARBERSHOP_MARKETING'
      and cc.barbershop_id = p_barbershop_id
    order by cc.created_at desc, cc.id desc
    limit 1
  ) shop on true
  left join lateral (
    select cc.granted, cc.consent_version, cc.source, cc.granted_at, cc.revoked_at
    from public.customer_consents cc
    where cc.customer_id = c.id
      and cc.consent_type = 'PLATFORM_MARKETING'
      and cc.barbershop_id is null
    order by cc.created_at desc, cc.id desc
    limit 1
  ) platform on true
  where bc.barbershop_id = p_barbershop_id
  order by c.name, c.id;
end;
$$;

revoke all on function public.list_platform_barbershop_customer_consents(uuid) from public, anon, authenticated;
grant execute on function public.list_platform_barbershop_customer_consents(uuid) to authenticated;
