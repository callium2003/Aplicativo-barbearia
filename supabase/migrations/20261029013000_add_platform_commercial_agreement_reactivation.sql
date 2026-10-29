-- Reativação por acordo comercial pela CullenTech (EFS §24.10.5, §48.5.1).
-- Acesso exclusivo de platform_owner ativo, sempre por barbearia explícita.
-- Preservação estrita do débito e do histórico financeiro no Asaas (não altera a assinatura para 'active' fakes).
-- Período de ativação configurável em dias (ex: 5, 6, 10, 15, 30 ou outro entre 1 e 365).
-- Motivo e condição comercial obrigatórios.
-- Estado operacional diferenciado ('commercial_agreement') durante a vigência do acordo.
-- Renovação explícita auditada; suspensão auditada.

do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'private.platform_audit_events'::regclass
      and contype = 'c'
      and conname like '%action%'
  ) loop
    execute 'alter table private.platform_audit_events drop constraint ' || quote_ident(r.conname);
  end loop;
end;
$$;

alter table private.platform_audit_events add constraint platform_audit_events_action_check
  check (action in (
    'customer_data_opened',
    'customer_consents_viewed',
    'customer_data_exported',
    'commercial_agreement_activated',
    'commercial_agreement_renewed',
    'barbershop_suspended'
  ));

create table if not exists private.platform_commercial_agreements (
  id uuid primary key default extensions.gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  activated_by uuid not null,
  reason text not null check (char_length(trim(reason)) >= 3),
  commercial_condition text not null check (char_length(trim(commercial_condition)) >= 3),
  duration_days integer not null check (duration_days >= 1 and duration_days <= 365),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_commercial_agreements_barbershop_idx
  on private.platform_commercial_agreements (barbershop_id, active, ends_at desc);

alter table private.platform_commercial_agreements enable row level security;
revoke all on table private.platform_commercial_agreements from public, anon, authenticated;

-- Atualiza helper de permissão operacional para considerar acordo comercial ativo dentro da vigência
create or replace function private.can_accept_public_booking(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    b.active and (
      exists (
        select 1
        from private.platform_commercial_agreements ca
        where ca.barbershop_id = p_barbershop_id
          and ca.active
          and ca.ends_at > now()
      ) or (
        s.status = 'trialing' and s.trial_ends_at > now()
      ) or (
        s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now())
      ) or (
        s.status in ('cancelled', 'past_due') and s.current_period_ends_at > now()
      )
    ), false)
  from public.barbershops b
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  where b.id = p_barbershop_id
  limit 1;
$$;

revoke all on function private.can_accept_public_booking(uuid) from public, anon, authenticated;

-- Atualiza resumo da plataforma para exibir 'commercial_agreement' no contrato
create or replace function public.get_platform_barbershop_overview()
returns table(
  barbershop_id uuid,
  name text,
  slug text,
  registration_status text,
  subscription_status text,
  plan_code text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  contract_status text
)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  return query
  select
    b.id,
    b.name,
    b.slug,
    case when b.active then 'active' else 'inactive' end,
    s.status,
    s.plan_code,
    s.trial_ends_at,
    s.current_period_ends_at,
    case
      when exists (
        select 1
        from private.platform_commercial_agreements ca
        where ca.barbershop_id = b.id
          and ca.active
          and ca.ends_at > now()
      ) then 'commercial_agreement'
      when s.status is null then 'unavailable'
      when s.status = 'trialing' and s.trial_ends_at > now() then 'trial'
      when s.status = 'trialing' then 'trial_ended'
      when s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now()) then 'active'
      when s.status = 'past_due' then 'payment_attention'
      when s.status = 'cancelled' then 'cancelled'
      else 'ended'
    end
  from public.barbershops b
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  order by b.created_at desc;
end;
$$;

revoke all on function public.get_platform_barbershop_overview() from public, anon, authenticated;
grant execute on function public.get_platform_barbershop_overview() to authenticated;

-- Atualiza detalhe da barbearia com projeção do acordo comercial
drop function if exists public.get_platform_barbershop_detail(uuid);
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
  active_service_count integer,
  commercial_agreement_active boolean,
  commercial_agreement_ends_at timestamptz,
  commercial_agreement_reason text,
  commercial_agreement_condition text,
  commercial_agreement_duration_days integer
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_agreement record;
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  select
    ca.active,
    ca.ends_at,
    ca.reason,
    ca.commercial_condition,
    ca.duration_days
  into v_agreement
  from private.platform_commercial_agreements ca
  where ca.barbershop_id = p_barbershop_id
    and ca.active
    and ca.ends_at > now()
  order by ca.ends_at desc
  limit 1;

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
      when v_agreement.active is true then 'commercial_agreement'
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
    (select count(*)::integer from public.services sv where sv.barbershop_id = b.id and sv.active),
    coalesce(v_agreement.active, false),
    v_agreement.ends_at,
    v_agreement.reason,
    v_agreement.commercial_condition,
    v_agreement.duration_days
  from public.barbershops b
  left join public.barbershop_registration_details r on r.barbershop_id = b.id
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  where b.id = p_barbershop_id;
end;
$$;

revoke all on function public.get_platform_barbershop_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_platform_barbershop_detail(uuid) to authenticated;

-- RPC para reativação por acordo comercial (ou renovação explícita)
create or replace function public.reactivate_platform_barbershop_by_agreement(
  p_barbershop_id uuid,
  p_duration_days integer,
  p_reason text,
  p_condition text
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_normalized_reason text;
  v_normalized_condition text;
  v_ends_at timestamptz;
  v_had_active_agreement boolean;
  v_action text;
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 365 then
    raise exception 'Período de ativação inválido. Informe entre 1 e 365 dias.';
  end if;

  v_normalized_reason := trim(coalesce(p_reason, ''));
  if char_length(v_normalized_reason) < 3 then
    raise exception 'Motivo da reativação é obrigatório.';
  end if;

  v_normalized_condition := trim(coalesce(p_condition, ''));
  if char_length(v_normalized_condition) < 3 then
    raise exception 'Condição comercial é obrigatória.';
  end if;

  select exists (
    select 1
    from private.platform_commercial_agreements ca
    where ca.barbershop_id = p_barbershop_id
      and ca.active
  ) into v_had_active_agreement;

  if v_had_active_agreement then
    v_action := 'commercial_agreement_renewed';
    update private.platform_commercial_agreements
    set active = false, updated_at = now()
    where barbershop_id = p_barbershop_id and active;
  else
    v_action := 'commercial_agreement_activated';
  end if;

  v_ends_at := now() + (p_duration_days || ' days')::interval;

  insert into private.platform_commercial_agreements (
    barbershop_id,
    activated_by,
    reason,
    commercial_condition,
    duration_days,
    starts_at,
    ends_at,
    active
  ) values (
    p_barbershop_id,
    (select auth.uid()),
    v_normalized_reason,
    v_normalized_condition,
    p_duration_days,
    now(),
    v_ends_at,
    true
  );

  update public.barbershops
  set active = true
  where id = p_barbershop_id;

  perform private.write_platform_audit_event(
    p_barbershop_id,
    v_action,
    1,
    jsonb_build_object(
      'duration_days', p_duration_days,
      'reason', v_normalized_reason,
      'condition', v_normalized_condition,
      'ends_at', v_ends_at
    )
  );
end;
$$;

revoke all on function public.reactivate_platform_barbershop_by_agreement(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.reactivate_platform_barbershop_by_agreement(uuid, integer, text, text) to authenticated;

-- RPC para suspensão de barbearia
create or replace function public.suspend_platform_barbershop(
  p_barbershop_id uuid,
  p_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_normalized_reason text;
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  v_normalized_reason := trim(coalesce(p_reason, ''));
  if char_length(v_normalized_reason) < 3 then
    raise exception 'Motivo da suspensão é obrigatório.';
  end if;

  update private.platform_commercial_agreements
  set active = false, updated_at = now()
  where barbershop_id = p_barbershop_id and active;

  update public.barbershops
  set active = false
  where id = p_barbershop_id;

  perform private.write_platform_audit_event(
    p_barbershop_id,
    'barbershop_suspended',
    1,
    jsonb_build_object('reason', v_normalized_reason)
  );
end;
$$;

revoke all on function public.suspend_platform_barbershop(uuid, text) from public, anon, authenticated;
grant execute on function public.suspend_platform_barbershop(uuid, text) to authenticated;

