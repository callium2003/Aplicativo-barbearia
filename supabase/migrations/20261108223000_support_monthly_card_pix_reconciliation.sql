-- Adds monthly card/Pix reconciliation without rewriting the applied migration.
-- Remote application remains separately authorized and is not performed by this file.
create or replace function public.finish_subscription_reconciliation(p_order_id uuid,p_token uuid,p_account text,p_outcome text,p_payments jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare
 o public.subscription_orders%rowtype; s public.barbershop_subscriptions%rowtype;
 shop uuid; p jsonb; n integer; total bigint:=0; start_at timestamptz; end_at timestamptz;
 outcome text:=p_outcome; existing_period public.subscription_paid_periods%rowtype;
begin
 select barbershop_id into shop from public.subscription_orders where id=p_order_id;
 perform 1 from public.barbershops where id=shop for update;
 select * into o from public.subscription_orders where id=p_order_id for update;
 if not found or p_token is null or p_account is null or o.provider_account_id is distinct from p_account
  or o.reconciliation_token is distinct from p_token or o.reconciliation_locked_until<=clock_timestamp()
  or o.reconciliation_locked_until is null or o.checkout_state<>'READY' then
  raise exception 'Reconciliation lease unavailable' using errcode='55000';
 end if;
 if outcome is null or outcome not in ('CONFIRMED','RETRY','REVIEW_REQUIRED') then
  raise exception 'Invalid reconciliation' using errcode='22023';
 end if;
 if exists(select 1 from public.asaas_checkout_events e where e.provider_account_id=p_account and e.checkout_id=o.provider_checkout_id
  and e.id<=o.reconciliation_event_watermark and e.processing_state='PENDING'
  and e.event_type not in ('CHECKOUT_CREATED','CHECKOUT_PAID','CHECKOUT_CANCELED','CHECKOUT_EXPIRED')) then
  outcome:='REVIEW_REQUIRED';
 end if;
 select * into s from public.barbershop_subscriptions where barbershop_id=o.barbershop_id for update;
 if not found then raise exception 'Subscription unavailable' using errcode='55000'; end if;
 if outcome='CONFIRMED' and (
   not exists(select 1 from public.barbershops where id=o.barbershop_id and active and owner_id is not null)
   or (s.status='active' and s.current_period_ends_at is null)
   or (s.current_period_ends_at>clock_timestamp() and s.plan_code is distinct from o.plan_code)
 ) then outcome:='REVIEW_REQUIRED'; end if;
 if outcome='RETRY' and o.status='PENDING_PAYMENT' and exists(
  select 1 from public.asaas_checkout_events e where e.provider_account_id=p_account and e.checkout_id=o.provider_checkout_id
   and e.id<=o.reconciliation_event_watermark and e.processing_state='PENDING'
   and ((e.event_type='CHECKOUT_EXPIRED' and e.checkout_status='EXPIRED') or (e.event_type='CHECKOUT_CANCELED' and e.checkout_status='CANCELED'))
 ) then update public.subscription_orders set status='CANCELED' where id=o.id; end if;
 if outcome='CONFIRMED' then
  if jsonb_typeof(p_payments) is distinct from 'array' then raise exception 'Invalid payments' using errcode='22023'; end if;
  n:=jsonb_array_length(p_payments);
  if n<1 or n>o.max_installments or o.months not in (1,12) then raise exception 'Invalid installments' using errcode='22023'; end if;
  for p in select value from jsonb_array_elements(p_payments) loop
   if jsonb_typeof(p)<>'object' or coalesce(p->>'id','') !~ '^[A-Za-z0-9_-]{1,128}$'
    or (p->>'checkoutId') is distinct from o.provider_checkout_id
    or (p->>'status') is null or p->>'status' not in ('CONFIRMED','RECEIVED')
    or (o.months=12 and (p->>'billingType') is distinct from 'CREDIT_CARD')
    or (o.months=1 and ((p->>'billingType') is null or (p->>'billingType') not in ('CREDIT_CARD','PIX')))
    or jsonb_typeof(p->'valueCents') is distinct from 'number'
    or coalesce(p->>'valueCents','') !~ '^[1-9][0-9]{0,12}$' then
    raise exception 'Invalid financial evidence' using errcode='22023';
   end if;
   total:=total+(p->>'valueCents')::bigint;
   if n>1 and (coalesce(p->>'installment','') !~ '^[A-Za-z0-9_-]{1,128}$'
    or coalesce(p->>'installmentNumber','') !~ '^[1-3]$'
    or (p->>'installmentNumber')::integer>n) then raise exception 'Invalid installment' using errcode='22023'; end if;
  end loop;
  if total<>o.price_cents or (select count(distinct value->>'id') from jsonb_array_elements(p_payments))<>n
   or (n>1 and ((select count(distinct value->>'installment') from jsonb_array_elements(p_payments))<>1
    or (select count(distinct value->>'installmentNumber') from jsonb_array_elements(p_payments))<>n)) then
   raise exception 'Payment mismatch' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_payments) as payment_row(value) join public.subscription_payment_evidence e
   on e.provider_payment_id=payment_row.value->>'id' and e.provider_account_id=p_account and e.provider_environment='sandbox'
   where e.order_id<>o.id or e.provider_checkout_id<>o.provider_checkout_id or e.value_cents<>(payment_row.value->>'valueCents')::bigint) then
   raise exception 'Payment already associated' using errcode='22023';
  end if;
  select * into existing_period from public.subscription_paid_periods where order_id=o.id;
  if not found then
   start_at:=greatest(clock_timestamp(),s.trial_ends_at,s.current_period_ends_at);
   end_at:=((start_at at time zone 'America/Sao_Paulo')+make_interval(months=>o.months)) at time zone 'America/Sao_Paulo';
   insert into public.subscription_paid_periods(order_id,barbershop_id,subscription_id,provider_environment,provider_account_id,plan_code,user_limit,starts_at,ends_at)
    values(o.id,o.barbershop_id,s.id,'sandbox',p_account,o.plan_code,o.user_limit,start_at,end_at);
   update public.barbershop_subscriptions set status='active',plan_code=o.plan_code,provider='asaas',
    current_period_ends_at=end_at,updated_at=now() where id=s.id;
  end if;
  insert into public.subscription_payment_evidence(provider_environment,provider_account_id,provider_payment_id,order_id,provider_checkout_id,value_cents,provider_status,installment_id,installment_number)
   select 'sandbox',p_account,value->>'id',o.id,o.provider_checkout_id,(value->>'valueCents')::bigint,value->>'status',value->>'installment',(value->>'installmentNumber')::integer
   from jsonb_array_elements(p_payments) on conflict(provider_environment,provider_account_id,provider_payment_id) do nothing;
  update public.subscription_orders set status='CONFIRMED',reconciliation_state='CONFIRMED' where id=o.id;
 elsif outcome='REVIEW_REQUIRED' then
  update public.subscription_orders set reconciliation_state='REVIEW_REQUIRED',
   status=case when status='CONFIRMED' then status else 'REVIEW_REQUIRED' end where id=o.id;
 end if;
 update public.asaas_checkout_events set processing_state=case when outcome='REVIEW_REQUIRED' then 'REVIEW_REQUIRED' else 'PROCESSED' end
  where provider_account_id=p_account and checkout_id=o.provider_checkout_id and id<=o.reconciliation_event_watermark and processing_state='PENDING';
 update public.subscription_orders set reconciliation_token=null,reconciliation_locked_until=null,
  reconciliation_next_at=clock_timestamp()+case when outcome='CONFIRMED' then interval '1 day'
   else least(3600,30*power(2,least(reconciliation_attempts,7))) * interval '1 second' end,updated_at=now()
  where id=o.id;
 if outcome<>'RETRY' then
  perform private.write_audit_log(o.barbershop_id,'subscription.reconciled','subscription_orders',o.id,
   jsonb_build_object('outcome',outcome,'attempt',o.reconciliation_attempts,'environment','sandbox'));
 end if;
 return outcome;
end $$;

revoke all on function public.finish_subscription_reconciliation(uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finish_subscription_reconciliation(uuid,uuid,text,text,jsonb) to service_role;
