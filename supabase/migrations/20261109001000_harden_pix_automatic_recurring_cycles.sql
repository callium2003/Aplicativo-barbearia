-- Pix Automático is a recurring contract: every confirmed provider payment
-- receives one period. A durable event lease prevents a replay or a second
-- worker from granting the same period twice.
alter table public.subscription_paid_periods
  drop constraint if exists subscription_paid_periods_order_id_key;

alter table public.subscription_paid_periods
  add column if not exists provider_payment_id text;

create unique index if not exists subscription_paid_periods_provider_payment
  on public.subscription_paid_periods(provider_environment, provider_account_id, provider_payment_id)
  where provider_payment_id is not null;

alter table public.asaas_recurring_subscription_events
  add column if not exists reconciliation_lease uuid,
  add column if not exists reconciliation_locked_until timestamptz,
  add column if not exists reconciliation_attempts integer not null default 0 check (reconciliation_attempts >= 0);

create index if not exists asaas_recurring_subscription_events_pix_pending
  on public.asaas_recurring_subscription_events(provider_account_id, provider_pix_authorization_id, received_at, id)
  where processing_state='PENDING' and provider_payment_id is not null;

-- Authorization state is a separate financial fact. A received payment never
-- makes a Pix Automatic authorization ACTIVE by itself.
create or replace function public.persist_asaas_recurring_subscription_event(
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
    if nullif(p_pix_authorization_id,'') is not null then
      update public.subscription_orders set recurring_state=case upper(coalesce(p_resource_status,''))
          when 'ACTIVE' then 'ACTIVE'
          when 'REFUSED' then 'REFUSED'
          when 'CANCELLED' then 'CANCELED'
          when 'EXPIRED' then 'CANCELED'
          else recurring_state
        end,
        updated_at=now()
      where billing_mode='PIX_AUTOMATIC' and provider_environment='sandbox'
        and provider_account_id=p_account and provider_pix_authorization_id=p_pix_authorization_id
        and (p_external_reference is null or id=p_external_reference);
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

create or replace function public.claim_pix_automatic_reconciliation(p_account text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype; e public.asaas_recurring_subscription_events%rowtype;
begin
  select evt.* into e from public.asaas_recurring_subscription_events as evt
    join public.subscription_orders as ord on ord.provider_environment='sandbox'
      and ord.provider_account_id=p_account and ord.billing_mode='PIX_AUTOMATIC'
      and ord.provider_pix_authorization_id=evt.provider_pix_authorization_id
   where evt.provider_environment='sandbox' and evt.provider_account_id=p_account
     and evt.provider_payment_id is not null and evt.processing_state='PENDING'
     and (evt.reconciliation_locked_until is null or evt.reconciliation_locked_until < clock_timestamp())
     and ord.recurring_state='ACTIVE' and ord.status in ('PENDING_PAYMENT','CONFIRMED','REVIEW_REQUIRED')
   order by evt.received_at,evt.id for update of evt skip locked limit 1;
  if not found then return null; end if;
  select * into o from public.subscription_orders where id=(
    select id from public.subscription_orders
     where provider_environment='sandbox' and provider_account_id=p_account and billing_mode='PIX_AUTOMATIC'
       and provider_pix_authorization_id=e.provider_pix_authorization_id
     limit 1
  ) for update;
  update public.asaas_recurring_subscription_events
     set reconciliation_lease=gen_random_uuid(), reconciliation_locked_until=clock_timestamp()+interval '5 minutes',
         reconciliation_attempts=reconciliation_attempts+1
   where id=e.id
   returning * into e;
  return jsonb_build_object('orderId',o.id,'account',p_account,'eventId',e.id,'lease',e.reconciliation_lease,
    'paymentId',e.provider_payment_id,'authorizationId',o.provider_pix_authorization_id,'priceCents',o.price_cents);
end;
$$;

create or replace function public.finish_pix_automatic_reconciliation(p_order_id uuid,p_account text,p_payment jsonb,p_outcome text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype; s public.barbershop_subscriptions%rowtype;
  e public.asaas_recurring_subscription_events%rowtype;
  payment_id text; status text; value_cents bigint; authorization_id text; event_id uuid; lease uuid;
  start_at timestamptz; end_at timestamptz; evidence_inserted text;
begin
  select * into o from public.subscription_orders where id=p_order_id for update;
  if not found or o.provider_environment<>'sandbox' or o.provider_account_id is distinct from p_account or o.billing_mode<>'PIX_AUTOMATIC' then
    raise exception 'Pix Automatic order unavailable' using errcode='55000'; end if;
  if p_outcome not in ('CONFIRMED','RETRY','REVIEW_REQUIRED') or jsonb_typeof(p_payment)<>'object' then
    raise exception 'Invalid reconciliation' using errcode='22023'; end if;
  event_id:=nullif(p_payment->>'eventId','')::uuid; lease:=nullif(p_payment->>'lease','')::uuid;
  if event_id is null or lease is null then raise exception 'Pix Automatic event lease required' using errcode='22023'; end if;
  select * into e from public.asaas_recurring_subscription_events where id=event_id for update;
  if not found or e.provider_account_id is distinct from p_account or e.provider_pix_authorization_id is distinct from o.provider_pix_authorization_id
     or e.processing_state<>'PENDING' or e.reconciliation_lease is distinct from lease
     or e.reconciliation_locked_until is null or e.reconciliation_locked_until < clock_timestamp() then
    raise exception 'Pix Automatic event is not claimed' using errcode='55000'; end if;
  if p_outcome='CONFIRMED' then
    payment_id:=p_payment->>'id'; status:=p_payment->>'status'; authorization_id:=p_payment->>'authorizationId';
    if payment_id !~ '^[A-Za-z0-9_-]{1,128}$' or payment_id is distinct from e.provider_payment_id
       or status not in ('CONFIRMED','RECEIVED') or authorization_id is distinct from o.provider_pix_authorization_id
       or coalesce(p_payment->>'valueCents','') !~ '^[1-9][0-9]{0,12}$' then
      raise exception 'Invalid Pix Automatic evidence' using errcode='22023'; end if;
    value_cents:=(p_payment->>'valueCents')::bigint;
    if value_cents<>o.price_cents then raise exception 'Pix Automatic value mismatch' using errcode='22023'; end if;
    select * into s from public.barbershop_subscriptions where barbershop_id=o.barbershop_id for update;
    if not found or not exists(select 1 from public.barbershops where id=o.barbershop_id and active and owner_id is not null) then
      p_outcome:='REVIEW_REQUIRED';
    else
      insert into public.subscription_recurring_payment_evidence(provider_account_id,provider_payment_id,order_id,provider_pix_authorization_id,value_cents,provider_status)
        values(p_account,payment_id,o.id,o.provider_pix_authorization_id,value_cents,status)
        on conflict do nothing returning provider_payment_id into evidence_inserted;
      if evidence_inserted is not null then
        start_at:=greatest(clock_timestamp(),s.trial_ends_at,s.current_period_ends_at);
        end_at:=((start_at at time zone 'America/Sao_Paulo')+interval '1 month') at time zone 'America/Sao_Paulo';
        insert into public.subscription_paid_periods(order_id,barbershop_id,subscription_id,provider_environment,provider_account_id,provider_payment_id,plan_code,user_limit,starts_at,ends_at)
          values(o.id,o.barbershop_id,s.id,'sandbox',p_account,payment_id,o.plan_code,o.user_limit,start_at,end_at);
        update public.barbershop_subscriptions set status='active',plan_code=o.plan_code,provider='asaas',current_period_ends_at=end_at,updated_at=now() where id=s.id;
      end if;
      update public.subscription_orders set status='CONFIRMED',reconciliation_state='CONFIRMED',recurring_state='ACTIVE',updated_at=now() where id=o.id;
    end if;
  elsif p_outcome='REVIEW_REQUIRED' then
    update public.subscription_orders set status='REVIEW_REQUIRED',reconciliation_state='REVIEW_REQUIRED',updated_at=now() where id=o.id;
  end if;
  update public.asaas_recurring_subscription_events
     set processing_state=case when p_outcome='RETRY' then 'PENDING' when p_outcome='CONFIRMED' then 'PROCESSED' else 'REVIEW_REQUIRED' end,
         reconciliation_lease=null, reconciliation_locked_until=null
   where id=e.id;
  return p_outcome;
end;
$$;

revoke all on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.claim_pix_automatic_reconciliation(text) from public,anon,authenticated,service_role;
revoke all on function public.finish_pix_automatic_reconciliation(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text) to service_role;
grant execute on function public.claim_pix_automatic_reconciliation(text) to service_role;
grant execute on function public.finish_pix_automatic_reconciliation(uuid,text,jsonb,text) to service_role;
