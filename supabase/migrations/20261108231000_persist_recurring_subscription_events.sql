-- Caixa de entrada exclusiva para eventos de assinatura e Pix Automático.
-- Ela não altera vigência; o processador financeiro continua responsável pela concessão.
create table public.asaas_recurring_subscription_events (
  id uuid primary key default gen_random_uuid(),
  provider_environment text not null default 'sandbox' check (provider_environment = 'sandbox'),
  provider_account_id text not null check (length(provider_account_id) between 1 and 128),
  provider_event_id text not null check (length(provider_event_id) between 1 and 256),
  event_type text not null check (event_type ~ '^[A-Z][A-Z0-9_]{0,99}$'),
  provider_subscription_id text,
  provider_pix_authorization_id text,
  provider_payment_id text,
  external_reference uuid,
  resource_status text,
  processing_state text not null default 'PENDING' check (processing_state in ('PENDING','PROCESSED','REVIEW_REQUIRED')),
  received_at timestamptz not null default now(),
  unique (provider_environment, provider_account_id, provider_event_id)
);
alter table public.asaas_recurring_subscription_events enable row level security;
revoke all on table public.asaas_recurring_subscription_events from public, anon, authenticated, service_role;

create function public.persist_asaas_recurring_subscription_event(
  p_account text, p_event_id text, p_event_type text, p_subscription_id text,
  p_pix_authorization_id text, p_payment_id text, p_external_reference uuid, p_resource_status text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserted integer; v_existing public.asaas_recurring_subscription_events%rowtype;
begin
  insert into public.asaas_recurring_subscription_events
    (provider_account_id, provider_event_id, event_type, provider_subscription_id,
     provider_pix_authorization_id, provider_payment_id, external_reference, resource_status)
  values (p_account, p_event_id, p_event_type, nullif(p_subscription_id,''),
          nullif(p_pix_authorization_id,''), nullif(p_payment_id,''), p_external_reference, nullif(p_resource_status,''))
  on conflict (provider_environment, provider_account_id, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    if p_subscription_id is not null and p_external_reference is not null then
      update public.subscription_orders set provider_subscription_id=p_subscription_id,
        recurring_state=case when recurring_state in ('REQUESTING','READY') then 'ACTIVE' else recurring_state end,
        updated_at=now()
      where id=p_external_reference and billing_mode='CARD_RECURRING' and provider_environment='sandbox';
    end if;
    return true;
  end if;
  select * into v_existing from public.asaas_recurring_subscription_events
    where provider_environment='sandbox' and provider_account_id=p_account and provider_event_id=p_event_id;
  if (v_existing.event_type, coalesce(v_existing.provider_subscription_id,''), coalesce(v_existing.provider_pix_authorization_id,''),
      coalesce(v_existing.provider_payment_id,''), v_existing.external_reference, coalesce(v_existing.resource_status,''))
     is distinct from (p_event_type, coalesce(p_subscription_id,''), coalesce(p_pix_authorization_id,''),
      coalesce(p_payment_id,''), p_external_reference, coalesce(p_resource_status,'')) then
    raise exception 'Conflicting recurring provider event' using errcode='23505';
  end if;
  return false;
end;
$$;
revoke all on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text) to service_role;
