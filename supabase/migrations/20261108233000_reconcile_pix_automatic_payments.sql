-- Conciliação específica do Pix Automático: autorização ACTIVE e pagamento são
-- fatos distintos; somente o pagamento financeiro confirmado concede vigência.
create table public.subscription_recurring_payment_evidence (
  provider_environment text not null default 'sandbox' check (provider_environment='sandbox'),
  provider_account_id text not null,
  provider_payment_id text not null,
  order_id uuid not null references public.subscription_orders(id),
  provider_pix_authorization_id text not null,
  value_cents bigint not null check(value_cents>0),
  provider_status text not null check(provider_status in ('CONFIRMED','RECEIVED')),
  confirmed_at timestamptz not null default now(),
  primary key(provider_environment,provider_account_id,provider_payment_id),
  unique(order_id,provider_payment_id)
);
alter table public.subscription_recurring_payment_evidence enable row level security;
revoke all on table public.subscription_recurring_payment_evidence from public,anon,authenticated,service_role;

create function public.claim_pix_automatic_reconciliation(p_account text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype; e public.asaas_recurring_subscription_events%rowtype;
begin
  select o.* into o from public.subscription_orders o
   where o.provider_environment='sandbox' and o.provider_account_id=p_account and o.billing_mode='PIX_AUTOMATIC'
    and o.recurring_state in ('READY','ACTIVE') and o.status in ('PENDING_PAYMENT','REVIEW_REQUIRED')
    and exists(select 1 from public.asaas_recurring_subscription_events e
      where e.provider_account_id=p_account and e.provider_pix_authorization_id=o.provider_pix_authorization_id
        and e.provider_payment_id is not null and e.processing_state='PENDING')
   order by o.updated_at for update skip locked limit 1;
  if not found then return null; end if;
  select * into e from public.asaas_recurring_subscription_events
   where provider_account_id=p_account and provider_pix_authorization_id=o.provider_pix_authorization_id
    and provider_payment_id is not null and processing_state='PENDING' order by id limit 1 for update;
  return jsonb_build_object('orderId',o.id,'account',p_account,'paymentId',e.provider_payment_id,
    'authorizationId',o.provider_pix_authorization_id,'priceCents',o.price_cents);
end;
$$;

create function public.finish_pix_automatic_reconciliation(p_order_id uuid,p_account text,p_payment jsonb,p_outcome text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype; s public.barbershop_subscriptions%rowtype;
 payment_id text; status text; value_cents bigint; authorization_id text; start_at timestamptz; end_at timestamptz;
begin
 select * into o from public.subscription_orders where id=p_order_id for update;
 if not found or o.provider_environment<>'sandbox' or o.provider_account_id is distinct from p_account or o.billing_mode<>'PIX_AUTOMATIC' then
  raise exception 'Pix Automatic order unavailable' using errcode='55000'; end if;
 if p_outcome not in ('CONFIRMED','RETRY','REVIEW_REQUIRED') then raise exception 'Invalid reconciliation' using errcode='22023'; end if;
 if p_outcome='CONFIRMED' then
  if jsonb_typeof(p_payment)<>'object' then raise exception 'Invalid payment' using errcode='22023'; end if;
  payment_id:=p_payment->>'id'; status:=p_payment->>'status'; authorization_id:=p_payment->>'authorizationId';
  if payment_id !~ '^[A-Za-z0-9_-]{1,128}$' or status not in ('CONFIRMED','RECEIVED') or authorization_id is distinct from o.provider_pix_authorization_id
   or coalesce(p_payment->>'valueCents','') !~ '^[1-9][0-9]{0,12}$' then raise exception 'Invalid Pix Automatic evidence' using errcode='22023'; end if;
  value_cents:=(p_payment->>'valueCents')::bigint;
  if value_cents<>o.price_cents then raise exception 'Pix Automatic value mismatch' using errcode='22023'; end if;
  if exists(select 1 from public.subscription_recurring_payment_evidence e where e.provider_environment='sandbox' and e.provider_account_id=p_account and e.provider_payment_id=payment_id and e.order_id<>o.id) then
   raise exception 'Payment already associated' using errcode='23505'; end if;
  select * into s from public.barbershop_subscriptions where barbershop_id=o.barbershop_id for update;
  if not found or not exists(select 1 from public.barbershops where id=o.barbershop_id and active and owner_id is not null) then
   p_outcome:='REVIEW_REQUIRED';
  else
   start_at:=greatest(clock_timestamp(),s.trial_ends_at,s.current_period_ends_at);
   end_at:=((start_at at time zone 'America/Sao_Paulo')+interval '1 month') at time zone 'America/Sao_Paulo';
   insert into public.subscription_paid_periods(order_id,barbershop_id,subscription_id,provider_environment,provider_account_id,plan_code,user_limit,starts_at,ends_at)
    values(o.id,o.barbershop_id,s.id,'sandbox',p_account,o.plan_code,o.user_limit,start_at,end_at) on conflict(order_id) do nothing;
   update public.barbershop_subscriptions set status='active',plan_code=o.plan_code,provider='asaas',current_period_ends_at=end_at,updated_at=now() where id=s.id;
   insert into public.subscription_recurring_payment_evidence(provider_account_id,provider_payment_id,order_id,provider_pix_authorization_id,value_cents,provider_status)
    values(p_account,payment_id,o.id,o.provider_pix_authorization_id,value_cents,status) on conflict do nothing;
   update public.subscription_orders set status='CONFIRMED',reconciliation_state='CONFIRMED',recurring_state='ACTIVE',updated_at=now() where id=o.id;
  end if;
 elsif p_outcome='REVIEW_REQUIRED' then update public.subscription_orders set status='REVIEW_REQUIRED',reconciliation_state='REVIEW_REQUIRED',updated_at=now() where id=o.id;
 end if;
 update public.asaas_recurring_subscription_events set processing_state=case when p_outcome='RETRY' then 'PENDING' when p_outcome='CONFIRMED' then 'PROCESSED' else 'REVIEW_REQUIRED' end
  where provider_account_id=p_account and provider_pix_authorization_id=o.provider_pix_authorization_id and processing_state='PENDING';
 return p_outcome;
end;
$$;
revoke all on function public.claim_pix_automatic_reconciliation(text) from public,anon,authenticated,service_role;
revoke all on function public.finish_pix_automatic_reconciliation(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_pix_automatic_reconciliation(text) to service_role;
grant execute on function public.finish_pix_automatic_reconciliation(uuid,text,jsonb,text) to service_role;
