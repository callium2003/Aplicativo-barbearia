-- Exportação manual em massa dos clientes de uma barbearia pela CullenTech (EFS §24.10.3, §48.5.1).
-- Acesso exclusivo de platform_owner ativo, sempre por barbearia explícita e com confirmação em tela.
-- Formatos suportados: CSV e JSON.
-- Toda exportação gera registro imediato de auditoria privada com quantidade de registros e formato.
-- O download é imediato no cliente, sem envio automático por e-mail e sem retenção permanente.

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
  check (action in ('customer_data_opened', 'customer_consents_viewed', 'customer_data_exported'));

alter table private.platform_audit_events add column if not exists metadata jsonb default '{}'::jsonb;

-- Remove qualquer assinatura anterior com default para evitar ambiguidade na sobrecarga em chamadas com literais
drop function if exists private.write_platform_audit_event(uuid, text, integer, jsonb);

-- Função de auditoria com metadados explícitos (ex: formato de exportação).
create or replace function private.write_platform_audit_event(
  p_barbershop_id uuid,
  p_action text,
  p_record_count integer,
  p_metadata jsonb
)
returns void
language sql
volatile
security definer
set search_path to ''
as $$
  insert into private.platform_audit_events (actor_user_id, action, barbershop_id, record_count, metadata)
  values ((select auth.uid()), p_action, p_barbershop_id, p_record_count, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke all on function private.write_platform_audit_event(uuid, text, integer, jsonb) from public, anon, authenticated;

-- Atualiza a versão de 3 argumentos para gravar no schema atualizado, mantendo compatibilidade estrita
create or replace function private.write_platform_audit_event(
  p_barbershop_id uuid,
  p_action text,
  p_record_count integer
)
returns void
language sql
volatile
security definer
set search_path to ''
as $$
  insert into private.platform_audit_events (actor_user_id, action, barbershop_id, record_count, metadata)
  values ((select auth.uid()), p_action, p_barbershop_id, p_record_count, '{}'::jsonb);
$$;

revoke all on function private.write_platform_audit_event(uuid, text, integer) from public, anon, authenticated;

create or replace function public.export_platform_barbershop_customers(
  p_barbershop_id uuid,
  p_format text
)
returns table(
  customer_id uuid,
  name text,
  email text,
  phone text,
  related_since timestamptz,
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
  v_normalized_format text;
begin
  perform private.assert_platform_barbershop(p_barbershop_id);

  v_normalized_format := lower(trim(coalesce(p_format, '')));
  if v_normalized_format not in ('csv', 'json') then
    raise exception 'Formato de exportação inválido. Utilize csv ou json.';
  end if;

  select count(*)::integer into v_count
  from public.barbershop_customers bc
  where bc.barbershop_id = p_barbershop_id;

  perform private.write_platform_audit_event(
    p_barbershop_id,
    'customer_data_exported',
    v_count,
    jsonb_build_object('format', v_normalized_format)
  );

  return query
  select
    c.id,
    c.name,
    c.email,
    c.phone,
    bc.created_at as related_since,
    shop.granted as barbershop_marketing_granted,
    shop.consent_version as barbershop_marketing_version,
    shop.source as barbershop_marketing_source,
    coalesce(shop.granted_at, shop.revoked_at) as barbershop_marketing_changed_at,
    platform.granted as platform_marketing_granted,
    platform.consent_version as platform_marketing_version,
    platform.source as platform_marketing_source,
    coalesce(platform.granted_at, platform.revoked_at) as platform_marketing_changed_at
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

revoke all on function public.export_platform_barbershop_customers(uuid, text) from public, anon, authenticated;
grant execute on function public.export_platform_barbershop_customers(uuid, text) to authenticated;

