-- Libera o ambiente 'production' do Asaas nas tabelas de assinatura,
-- URLs de checkout e RPCs de criação/conciliação/visão administrativa,
-- mantendo compatibilidade retroativa com 'sandbox'.

-- 1. Atualizar constraints CHECK de provider_environment nas 6 tabelas do fluxo Asaas
do $$
declare
  v_table text;
  v_con text;
begin
  foreach v_table in array array[
    'subscription_orders',
    'asaas_checkout_events',
    'subscription_paid_periods',
    'subscription_payment_evidence',
    'asaas_recurring_subscription_events',
    'subscription_recurring_payment_evidence'
  ] loop
    for v_con in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = v_table
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%provider_environment%'
    loop
      execute format('alter table public.%I drop constraint if exists %I', v_table, v_con);
    end loop;

    execute format(
      'alter table public.%I add constraint %I check (provider_environment in (''sandbox'', ''production''))',
      v_table,
      v_table || '_provider_environment_check'
    );
  end loop;
end $$;

-- 2. Permitir URL de checkout de produção (https://www.asaas.com/...) além de sandbox
alter table public.subscription_orders
  drop constraint if exists subscription_checkout_id_matches_state;

alter table public.subscription_orders
  add constraint subscription_checkout_id_matches_state check (
    (
      checkout_state = 'READY'
      and provider_checkout_id is not null
      and provider_checkout_url is not null
      and (
        provider_checkout_url like 'https://sandbox.asaas.com/%'
        or provider_checkout_url like 'https://www.asaas.com/%'
      )
    )
    or (
      checkout_state <> 'READY'
      and provider_checkout_id is null
      and provider_checkout_url is null
    )
  );

-- 3. create_subscription_order com overload para p_environment (preservando assinatura de 10 args)
create or replace function public.create_subscription_order(
  p_barbershop_id uuid, p_requester_id uuid, p_idempotency_key uuid,
  p_plan_code text, p_plan_name text, p_months integer, p_price_cents bigint,
  p_max_installments integer, p_user_limit integer, p_terms_version text,
  p_environment text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_order public.subscription_orders%rowtype;
  v_env text := coalesce(nullif(trim(p_environment), ''), 'sandbox');
begin
  if v_env not in ('sandbox', 'production') then
    raise exception 'Invalid provider environment' using errcode = '22023';
  end if;

  select b.owner_id into v_owner from public.barbershops b where b.id=p_barbershop_id for update;
  if v_owner is null or p_requester_id is null or v_owner<>p_requester_id then
    raise exception 'Unauthorized subscription order' using errcode='42501';
  end if;

  select * into v_order from public.subscription_orders o
    where o.barbershop_id=p_barbershop_id and o.idempotency_key=p_idempotency_key;
  if found then
    if (v_order.requester_id,v_order.plan_code,v_order.plan_name,v_order.months,v_order.price_cents,
        v_order.max_installments,v_order.user_limit,v_order.terms_version)
       is distinct from (p_requester_id,p_plan_code,p_plan_name,p_months,p_price_cents,
                         p_max_installments,p_user_limit,p_terms_version) then
      raise exception 'Idempotency key conflicts with order' using errcode='23505';
    end if;
    return v_order.id;
  end if;

  if exists(select 1 from public.barbershop_subscriptions s where s.barbershop_id=p_barbershop_id
      and s.status='active' and (s.current_period_ends_at is null or s.current_period_ends_at>clock_timestamp())
      and not exists(
        select 1 from public.subscription_orders o
        where o.barbershop_id=p_barbershop_id
          and o.status='CONFIRMED'
          and o.recurring_state='CANCELED'
      )) then
    raise exception 'Active subscription requires a plan change' using errcode='55000';
  end if;

  select * into v_order from public.subscription_orders o
    where o.barbershop_id=p_barbershop_id and o.status in ('PENDING_PAYMENT','REVIEW_REQUIRED')
    order by o.updated_at desc limit 1;
  if found then
    if v_order.status='REVIEW_REQUIRED' then
      raise exception 'Subscription order requires review' using errcode='55000';
    end if;
    if (v_order.requester_id,v_order.plan_code,v_order.plan_name,v_order.months,v_order.price_cents,
        v_order.max_installments,v_order.user_limit,v_order.terms_version)
       is distinct from (p_requester_id,p_plan_code,p_plan_name,p_months,p_price_cents,
                         p_max_installments,p_user_limit,p_terms_version) then
      raise exception 'Another order is pending' using errcode='23505';
    end if;
    return v_order.id;
  end if;

  insert into public.subscription_orders
    (barbershop_id,requester_id,idempotency_key,plan_code,plan_name,months,price_cents,max_installments,user_limit,terms_version,provider_environment)
  values (p_barbershop_id,p_requester_id,p_idempotency_key,p_plan_code,p_plan_name,p_months,
          p_price_cents,p_max_installments,p_user_limit,p_terms_version,v_env)
  returning id into v_order.id;
  return v_order.id;
end;
$$;

revoke all on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text,text) to service_role;

create or replace function public.create_subscription_order(
  p_barbershop_id uuid, p_requester_id uuid, p_idempotency_key uuid,
  p_plan_code text, p_plan_name text, p_months integer, p_price_cents bigint,
  p_max_installments integer, p_user_limit integer, p_terms_version text
) returns uuid language sql security definer set search_path = '' as $$
  select public.create_subscription_order(
    p_barbershop_id, p_requester_id, p_idempotency_key,
    p_plan_code, p_plan_name, p_months, p_price_cents,
    p_max_installments, p_user_limit, p_terms_version, 'sandbox'
  );
$$;

revoke all on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) to service_role;

-- 4. finish_subscription_checkout aceitando URL de produção ou sandbox
create or replace function public.finish_subscription_checkout(p_order_id uuid, p_state text, p_checkout_id text, p_checkout_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_state not in ('READY','UNKNOWN') or p_state is null
    or (p_state='READY' and (
      p_checkout_id is null
      or p_checkout_id !~ '^[a-zA-Z0-9_-]{1,128}$'
      or p_checkout_url is null
      or length(p_checkout_url)>2048
      or (p_checkout_url not like 'https://sandbox.asaas.com/%' and p_checkout_url not like 'https://www.asaas.com/%')
    ))
    or (p_state='UNKNOWN' and (p_checkout_id is not null or p_checkout_url is not null)) then
    raise exception 'Invalid checkout outcome' using errcode='22023';
  end if;
  update public.subscription_orders set checkout_state=p_state, provider_checkout_id=p_checkout_id, provider_checkout_url=p_checkout_url, updated_at=now()
    where id=p_order_id and checkout_state='REQUESTING' and status='PENDING_PAYMENT';
  if not found then raise exception 'Checkout state conflict' using errcode='55000'; end if;
end;
$$;

revoke all on function public.finish_subscription_checkout(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.finish_subscription_checkout(uuid,text,text,text) to service_role;

-- 5. persist_asaas_checkout_event com overload para p_environment (preservando assinatura de 5 args)
create or replace function public.persist_asaas_checkout_event(
  p_account text, p_event_id text, p_event_type text, p_checkout_id text, p_checkout_status text,
  p_environment text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inserted integer;
  v_existing public.asaas_checkout_events%rowtype;
  v_env text := coalesce(nullif(trim(p_environment), ''), 'sandbox');
begin
  if v_env not in ('sandbox', 'production') then
    raise exception 'Invalid provider environment' using errcode = '22023';
  end if;

  insert into public.asaas_checkout_events (provider_environment, provider_account_id, provider_event_id, event_type, checkout_id, checkout_status)
  values (v_env, p_account, p_event_id, p_event_type, p_checkout_id, p_checkout_status)
  on conflict (provider_environment, provider_account_id, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then return true; end if;

  select * into v_existing from public.asaas_checkout_events
    where provider_environment=v_env and provider_account_id=p_account and provider_event_id=p_event_id;
  if (v_existing.event_type, v_existing.checkout_id, v_existing.checkout_status)
    is distinct from (p_event_type, p_checkout_id, p_checkout_status) then
    raise exception 'Conflicting provider event' using errcode='23505';
  end if;
  return false;
end;
$$;

revoke all on function public.persist_asaas_checkout_event(text,text,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_checkout_event(text,text,text,text,text,text) to service_role;

create or replace function public.persist_asaas_checkout_event(
  p_account text, p_event_id text, p_event_type text, p_checkout_id text, p_checkout_status text
) returns boolean language sql security definer set search_path = '' as $$
  select public.persist_asaas_checkout_event(p_account, p_event_id, p_event_type, p_checkout_id, p_checkout_status, 'sandbox');
$$;

revoke all on function public.persist_asaas_checkout_event(text,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_checkout_event(text,text,text,text,text) to service_role;

-- 6. claim_subscription_reconciliation com overload para p_environment (preservando assinatura de 1 arg)
create or replace function public.claim_subscription_reconciliation(p_account text, p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  o public.subscription_orders%rowtype;
  token uuid;
  watermark bigint;
  v_env text := coalesce(nullif(trim(p_environment), ''), 'sandbox');
begin
  if p_account is null or p_account !~ '^[A-Za-z0-9_-]{1,128}$' then raise exception 'Invalid account' using errcode='22023'; end if;
  if v_env not in ('sandbox', 'production') then raise exception 'Invalid provider environment' using errcode='22023'; end if;

  update public.asaas_checkout_events e set processing_state='REVIEW_REQUIRED'
   where e.provider_environment=v_env and e.provider_account_id=p_account and e.processing_state='PENDING'
    and e.received_at<clock_timestamp()-interval '10 minutes'
    and not exists(select 1 from public.subscription_orders s where s.provider_environment=v_env and s.provider_account_id=p_account and s.provider_checkout_id=e.checkout_id);

  select s.* into o from public.subscription_orders s
  where s.provider_account_id=p_account and s.provider_environment=v_env and s.checkout_state='READY'
  and s.status in ('PENDING_PAYMENT','CONFIRMED','REVIEW_REQUIRED','CANCELED')
  and (s.reconciliation_locked_until is null or s.reconciliation_locked_until<=clock_timestamp())
  and ((s.reconciliation_state<>'REVIEW_REQUIRED' and s.reconciliation_next_at<=clock_timestamp())
   or exists(select 1 from public.asaas_checkout_events e where e.provider_environment=v_env and e.provider_account_id=p_account
    and e.checkout_id=s.provider_checkout_id and e.processing_state='PENDING'))
  order by s.reconciliation_next_at,s.id for update skip locked limit 1;

  if not found then return null; end if;

  select max(e.id) into watermark from public.asaas_checkout_events e
   where e.provider_environment=v_env and e.provider_account_id=p_account and e.checkout_id=o.provider_checkout_id and e.processing_state='PENDING';
  token:=gen_random_uuid();
  update public.subscription_orders set reconciliation_token=token,
   reconciliation_locked_until=clock_timestamp()+interval '5 minutes',reconciliation_attempts=reconciliation_attempts+1,
   reconciliation_event_watermark=watermark where id=o.id;
  return jsonb_build_object('id',o.id,'checkoutId',o.provider_checkout_id,'account',p_account,
   'priceCents',o.price_cents,'maxInstallments',o.max_installments,'lease',token);
end $$;

revoke all on function public.claim_subscription_reconciliation(text,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_subscription_reconciliation(text,text) to service_role;

create or replace function public.claim_subscription_reconciliation(p_account text)
returns jsonb language sql security definer set search_path='' as $$
  select public.claim_subscription_reconciliation(p_account, 'sandbox');
$$;

revoke all on function public.claim_subscription_reconciliation(text) from public,anon,authenticated,service_role;
grant execute on function public.claim_subscription_reconciliation(text) to service_role;

-- 7. finish_subscription_reconciliation usando o.provider_environment
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
 if exists(select 1 from public.asaas_checkout_events e where e.provider_environment=o.provider_environment and e.provider_account_id=p_account and e.checkout_id=o.provider_checkout_id
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
  select 1 from public.asaas_checkout_events e where e.provider_environment=o.provider_environment and e.provider_account_id=p_account and e.checkout_id=o.provider_checkout_id
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
   on e.provider_payment_id=payment_row.value->>'id' and e.provider_account_id=p_account and e.provider_environment=o.provider_environment
   where e.order_id<>o.id or e.provider_checkout_id<>o.provider_checkout_id or e.value_cents<>(payment_row.value->>'valueCents')::bigint) then
   raise exception 'Payment already associated' using errcode='22023';
  end if;
  select * into existing_period from public.subscription_paid_periods where order_id=o.id;
  if not found then
   start_at:=greatest(clock_timestamp(),s.trial_ends_at,s.current_period_ends_at);
   end_at:=((start_at at time zone 'America/Sao_Paulo')+make_interval(months=>o.months)) at time zone 'America/Sao_Paulo';
   insert into public.subscription_paid_periods(order_id,barbershop_id,subscription_id,provider_environment,provider_account_id,plan_code,user_limit,starts_at,ends_at)
    values(o.id,o.barbershop_id,s.id,o.provider_environment,p_account,o.plan_code,o.user_limit,start_at,end_at);
   update public.barbershop_subscriptions set status='active',plan_code=o.plan_code,provider='asaas',
    current_period_ends_at=end_at,updated_at=now() where id=s.id;
  end if;
  insert into public.subscription_payment_evidence(provider_environment,provider_account_id,provider_payment_id,order_id,provider_checkout_id,value_cents,provider_status,installment_id,installment_number)
   select o.provider_environment,p_account,value->>'id',o.id,o.provider_checkout_id,(value->>'valueCents')::bigint,value->>'status',value->>'installment',(value->>'installmentNumber')::integer
   from jsonb_array_elements(p_payments) on conflict(provider_environment,provider_account_id,provider_payment_id) do nothing;
  update public.subscription_orders set status='CONFIRMED',reconciliation_state='CONFIRMED' where id=o.id;
 elsif outcome='REVIEW_REQUIRED' then
  update public.subscription_orders set reconciliation_state='REVIEW_REQUIRED',
   status=case when status='CONFIRMED' then status else 'REVIEW_REQUIRED' end where id=o.id;
 end if;
 update public.asaas_checkout_events set processing_state=case when outcome='REVIEW_REQUIRED' then 'REVIEW_REQUIRED' else 'PROCESSED' end
  where provider_environment=o.provider_environment and provider_account_id=p_account and checkout_id=o.provider_checkout_id and id<=o.reconciliation_event_watermark and processing_state='PENDING';
 update public.subscription_orders set reconciliation_token=null,reconciliation_locked_until=null,
  reconciliation_next_at=clock_timestamp()+case when outcome='CONFIRMED' then interval '1 day'
   else least(3600,30*power(2,least(reconciliation_attempts,7))) * interval '1 second' end,updated_at=now()
  where id=o.id;
 if outcome<>'RETRY' then
  perform private.write_audit_log(o.barbershop_id,'subscription.reconciled','subscription_orders',o.id,
   jsonb_build_object('outcome',outcome,'attempt',o.reconciliation_attempts,'environment',o.provider_environment));
 end if;
 return outcome;
end $$;

revoke all on function public.finish_subscription_reconciliation(uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finish_subscription_reconciliation(uuid,uuid,text,text,jsonb) to service_role;

-- 8. Pix Automático: claim (preservando assinatura de 1 arg) e finish para sandbox e production
create or replace function public.claim_pix_automatic_reconciliation(p_account text, p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_order public.subscription_orders%rowtype;
  v_event public.asaas_recurring_subscription_events%rowtype;
  v_env text := coalesce(nullif(trim(p_environment), ''), 'sandbox');
begin
  if v_env not in ('sandbox', 'production') then
    raise exception 'Invalid provider environment' using errcode = '22023';
  end if;

  select o.* into v_order from public.subscription_orders o
   where o.provider_environment=v_env and o.provider_account_id=p_account and o.billing_mode='PIX_AUTOMATIC'
    and o.recurring_state in ('READY','ACTIVE') and o.status in ('PENDING_PAYMENT','REVIEW_REQUIRED')
    and exists(select 1 from public.asaas_recurring_subscription_events e
      where e.provider_environment=v_env and e.provider_account_id=p_account and e.provider_pix_authorization_id=o.provider_pix_authorization_id
        and e.provider_payment_id is not null and e.processing_state='PENDING')
   order by o.updated_at for update skip locked limit 1;
  if not found then return null; end if;
  select e.* into v_event from public.asaas_recurring_subscription_events e
   where e.provider_environment=v_env and e.provider_account_id=p_account and e.provider_pix_authorization_id=v_order.provider_pix_authorization_id
    and e.provider_payment_id is not null and e.processing_state='PENDING' order by e.id limit 1 for update;
  return jsonb_build_object('orderId',v_order.id,'account',p_account,'paymentId',v_event.provider_payment_id,
    'authorizationId',v_order.provider_pix_authorization_id,'priceCents',v_order.price_cents);
end;
$$;

revoke all on function public.claim_pix_automatic_reconciliation(text,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_pix_automatic_reconciliation(text,text) to service_role;

create or replace function public.claim_pix_automatic_reconciliation(p_account text)
returns jsonb language sql security definer set search_path='' as $$
  select public.claim_pix_automatic_reconciliation(p_account, 'sandbox');
$$;

revoke all on function public.claim_pix_automatic_reconciliation(text) from public,anon,authenticated,service_role;
grant execute on function public.claim_pix_automatic_reconciliation(text) to service_role;

create or replace function public.finish_pix_automatic_reconciliation(p_order_id uuid,p_account text,p_payment jsonb,p_outcome text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype; s public.barbershop_subscriptions%rowtype;
 payment_id text; status text; value_cents bigint; authorization_id text; start_at timestamptz; end_at timestamptz;
begin
 select * into o from public.subscription_orders where id=p_order_id for update;
 if not found or o.provider_environment not in ('sandbox','production') or o.provider_account_id is distinct from p_account or o.billing_mode<>'PIX_AUTOMATIC' then
  raise exception 'Pix Automatic order unavailable' using errcode='55000'; end if;
 if p_outcome not in ('CONFIRMED','RETRY','REVIEW_REQUIRED') then raise exception 'Invalid reconciliation' using errcode='22023'; end if;
 if p_outcome='CONFIRMED' then
  if jsonb_typeof(p_payment)<>'object' then raise exception 'Invalid payment' using errcode='22023'; end if;
  payment_id:=p_payment->>'id'; status:=p_payment->>'status'; authorization_id:=p_payment->>'authorizationId';
  if payment_id !~ '^[A-Za-z0-9_-]{1,128}$' or status not in ('CONFIRMED','RECEIVED') or authorization_id is distinct from o.provider_pix_authorization_id
   or coalesce(p_payment->>'valueCents','') !~ '^[1-9][0-9]{0,12}$' then raise exception 'Invalid Pix Automatic evidence' using errcode='22023'; end if;
  value_cents:=(p_payment->>'valueCents')::bigint;
  if value_cents<>o.price_cents then raise exception 'Pix Automatic value mismatch' using errcode='22023'; end if;
  if exists(select 1 from public.subscription_recurring_payment_evidence e where e.provider_environment=o.provider_environment and e.provider_account_id=p_account and e.provider_payment_id=payment_id and e.order_id<>o.id) then
   raise exception 'Payment already associated' using errcode='23505'; end if;
  select * into s from public.barbershop_subscriptions where barbershop_id=o.barbershop_id for update;
  if not found or not exists(select 1 from public.barbershops where id=o.barbershop_id and active and owner_id is not null) then
   p_outcome:='REVIEW_REQUIRED';
  else
   start_at:=greatest(clock_timestamp(),s.trial_ends_at,s.current_period_ends_at);
   end_at:=((start_at at time zone 'America/Sao_Paulo')+interval '1 month') at time zone 'America/Sao_Paulo';
   insert into public.subscription_paid_periods(order_id,barbershop_id,subscription_id,provider_environment,provider_account_id,plan_code,user_limit,starts_at,ends_at)
    values(o.id,o.barbershop_id,s.id,o.provider_environment,p_account,o.plan_code,o.user_limit,start_at,end_at) on conflict(order_id) do nothing;
   update public.barbershop_subscriptions set status='active',plan_code=o.plan_code,provider='asaas',current_period_ends_at=end_at,updated_at=now() where id=s.id;
   insert into public.subscription_recurring_payment_evidence(provider_environment,provider_account_id,provider_payment_id,order_id,provider_pix_authorization_id,value_cents,provider_status)
    values(o.provider_environment,p_account,payment_id,o.id,o.provider_pix_authorization_id,value_cents,status) on conflict do nothing;
   update public.subscription_orders set status='CONFIRMED',reconciliation_state='CONFIRMED',recurring_state='ACTIVE',updated_at=now() where id=o.id;
  end if;
 elsif p_outcome='REVIEW_REQUIRED' then update public.subscription_orders set status='REVIEW_REQUIRED',reconciliation_state='REVIEW_REQUIRED',updated_at=now() where id=o.id;
 end if;
 update public.asaas_recurring_subscription_events set processing_state=case when p_outcome='RETRY' then 'PENDING' when p_outcome='CONFIRMED' then 'PROCESSED' else 'REVIEW_REQUIRED' end
  where provider_environment=o.provider_environment and provider_account_id=p_account and provider_pix_authorization_id=o.provider_pix_authorization_id and processing_state='PENDING';
 return p_outcome;
end;
$$;

revoke all on function public.finish_pix_automatic_reconciliation(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.finish_pix_automatic_reconciliation(uuid,text,jsonb,text) to service_role;

-- 9. get_platform_barbershop_overview considerando ordens de sandbox e production
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
  contract_status text,
  billing_mode text,
  billing_cycle text,
  cancellation_scheduled boolean,
  invoices_paid bigint,
  invoices_pending bigint,
  invoices_overdue bigint,
  asaas_status text,
  responsible_name text,
  contact_phone text,
  notification_email text
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
  with latest_orders as (
    select distinct on (o.barbershop_id)
      o.barbershop_id,
      o.billing_mode,
      case when o.months = 12 then 'anual' when o.months = 1 then 'mensal' else 'avulso' end as billing_cycle,
      o.recurring_state,
      o.status as order_status
    from public.subscription_orders o
    order by o.barbershop_id, o.created_at desc
  ),
  order_counts as (
    select
      o.barbershop_id,
      count(*) filter (where o.status = 'CONFIRMED') as count_paid,
      count(*) filter (where o.status = 'PENDING_PAYMENT') as count_pending,
      count(*) filter (where o.status = 'REVIEW_REQUIRED') as count_overdue
    from public.subscription_orders o
    group by o.barbershop_id
  )
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
      when (s.current_period_ends_at is not null and s.current_period_ends_at > now())
           and (s.status = 'cancelled' or coalesce(lo.recurring_state, '') = 'CANCELED') then 'cancelled'
      when s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now()) then 'active'
      when s.status = 'past_due' or coalesce(oc.count_overdue, 0) > 0 then 'payment_attention'
      when s.status = 'cancelled' then 'cancelled'
      else 'ended'
    end as contract_status,
    lo.billing_mode,
    lo.billing_cycle,
    (
      (s.current_period_ends_at is not null and s.current_period_ends_at > clock_timestamp())
      and (
        s.status = 'cancelled'
        or lo.recurring_state = 'CANCELED'
      )
    ) as cancellation_scheduled,
    coalesce(oc.count_paid, 0)::bigint,
    coalesce(oc.count_pending, 0)::bigint,
    coalesce(oc.count_overdue, 0)::bigint,
    case
      when (s.current_period_ends_at is not null and s.current_period_ends_at > clock_timestamp())
           and (s.status = 'cancelled' or lo.recurring_state = 'CANCELED') then 'Cancelamento agendado'
      when lo.recurring_state = 'ACTIVE' then 'Recorrência ativa'
      when s.status = 'active' then 'Ativa'
      when s.status = 'past_due' or coalesce(oc.count_overdue, 0) > 0 then 'Inadimplente'
      when s.status = 'cancelled' then 'Cancelada'
      when s.status = 'trialing' then 'Em teste'
      else coalesce(s.status, 'Não configurado')
    end as asaas_status,
    coalesce(nullif(trim(rd.responsible_name), ''), 'Não informado') as responsible_name,
    coalesce(nullif(trim(rd.responsible_phone), ''), nullif(trim(b.whatsapp), ''), nullif(trim(b.phone), ''), 'Não informado') as contact_phone,
    coalesce(nullif(trim(b.notification_email), ''), 'Não informado') as notification_email
  from public.barbershops b
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  left join latest_orders lo on lo.barbershop_id = b.id
  left join order_counts oc on oc.barbershop_id = b.id
  left join public.barbershop_registration_details rd on rd.barbershop_id = b.id
  order by b.created_at desc;
end;
$$;

revoke all on function public.get_platform_barbershop_overview() from public, anon, authenticated;
grant execute on function public.get_platform_barbershop_overview() to authenticated;
