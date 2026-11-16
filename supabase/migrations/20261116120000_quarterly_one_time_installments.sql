-- EFS §§24,44,48.5.37: quarterly purchases without recurrence.
-- Preserve historical monthly/quarterly/annual recurring contracts, snapshots, RLS and ACLs.
begin;

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
          and o.recurring_state='CANCELED'          and o.id=(            select latest.id from public.subscription_orders latest            where latest.barbershop_id=p_barbershop_id and latest.status='CONFIRMED'            order by latest.created_at desc,latest.id desc limit 1          )
      )
      and not (
        p_months=3 and p_max_installments=2 and s.plan_code=p_plan_code
        and s.current_period_ends_at is not null
        and exists (
          select 1 from public.subscription_orders o
          where o.barbershop_id=p_barbershop_id and o.status='CONFIRMED'
            and o.plan_code=s.plan_code and o.months=3 and o.max_installments=2
            and o.billing_mode='ONE_TIME' and o.provider_subscription_id is null
            and o.provider_pix_authorization_id is null
        )
        and not exists (
          select 1 from public.subscription_orders o
          where o.barbershop_id=p_barbershop_id
            and o.billing_mode in ('CARD_RECURRING','PIX_AUTOMATIC')
            and o.recurring_state in ('REQUESTING','READY','ACTIVE','UNKNOWN','REVIEW_REQUIRED')
        )
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

create or replace function public.claim_subscription_recurring_operation(
  p_order_id uuid, p_requester_id uuid, p_billing_mode text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.subscription_orders%rowtype; v_owner uuid;
begin
  if p_billing_mode not in ('CARD_RECURRING','PIX_AUTOMATIC') then
    raise exception 'Invalid recurring billing mode' using errcode='22023';
  end if;
  select * into o from public.subscription_orders where id=p_order_id for update;
  if not found then raise exception 'Unknown subscription order' using errcode='P0002'; end if;
  select owner_id into v_owner from public.barbershops where id=o.barbershop_id;
  if v_owner is null or v_owner <> p_requester_id then
    raise exception 'Unauthorized subscription order' using errcode='42501';
  end if;
  if o.months=3 and o.max_installments=2 and o.billing_mode='ONE_TIME' then
    raise exception 'Quarterly purchase cannot create recurrence' using errcode='22023';
  end if;
  if p_billing_mode = 'PIX_AUTOMATIC' and o.months <> 1 then
    raise exception 'Pix Automatic requires monthly order' using errcode='22023';
  end if;
  if p_billing_mode = 'CARD_RECURRING' and o.months not in (1, 3, 12) then
    raise exception 'Card recurrence requires monthly, quarterly or historical annual order' using errcode='22023';
  end if;
  if o.recurring_state in ('REQUESTING','UNKNOWN','REVIEW_REQUIRED') then
    return jsonb_build_object('state',o.recurring_state,'orderId',o.id,'barbershopId',o.barbershop_id);
  end if;
  if o.recurring_state in ('READY','ACTIVE') then
    return jsonb_build_object('state',o.recurring_state,'orderId',o.id,'barbershopId',o.barbershop_id,
      'billingMode',o.billing_mode,'customerId',o.provider_customer_id,'subscriptionId',o.provider_subscription_id,
      'authorizationId',o.provider_pix_authorization_id);
  end if;
  update public.subscription_orders set billing_mode=p_billing_mode, recurring_state='REQUESTING',
    provider_contract_id=replace(o.id::text,'-',''), updated_at=now() where id=o.id;
  return jsonb_build_object('state','CLAIMED','orderId',o.id,'barbershopId',o.barbershop_id,
    'planCode',o.plan_code,'planName',o.plan_name,'priceCents',o.price_cents,'contractId',replace(o.id::text,'-',''));
end;
$$;

revoke all on function public.claim_subscription_recurring_operation(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_subscription_recurring_operation(uuid,uuid,text) to service_role;

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
  and e.event_type not in ('CHECKOUT_CREATED','CHECKOUT_PAID','CHECKOUT_CANCELED','CHECKOUT_EXPIRED')
  and not (o.billing_mode='ONE_TIME' and o.months=3 and e.event_type in ('PAYMENT_CONFIRMED','PAYMENT_RECEIVED'))) then
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
  if n<1 or n>o.max_installments or o.months not in (1,3,12) then raise exception 'Invalid installments' using errcode='22023'; end if;
  for p in select value from jsonb_array_elements(p_payments) loop
   if jsonb_typeof(p)<>'object' or coalesce(p->>'id','') !~ '^[A-Za-z0-9_-]{1,128}$'
    or (p->>'checkoutId') is distinct from o.provider_checkout_id
    or (p->>'status') is null or p->>'status' not in ('CONFIRMED','RECEIVED')
    or (n>1 and (p->>'billingType') is distinct from 'CREDIT_CARD')
    or (o.billing_mode='ONE_TIME' and nullif(p->>'subscriptionId','') is not null)
    or (o.months=12 and (p->>'billingType') is distinct from 'CREDIT_CARD')
    or (o.months in (1,3) and ((p->>'billingType') is null or (p->>'billingType') not in ('CREDIT_CARD','PIX')))
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

create or replace function public.persist_asaas_recurring_subscription_event(
  p_account text,
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_pix_authorization_id text,
  p_payment_id text,
  p_external_reference uuid,
  p_resource_status text,
  p_value_cents bigint default null,
  p_cycle text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inserted integer;
  v_existing public.asaas_recurring_subscription_events%rowtype;
  v_order public.subscription_orders%rowtype;
  v_sub public.barbershop_subscriptions%rowtype;
  v_scheduled public.subscription_scheduled_plan_changes%rowtype;
  v_is_old_payment boolean := false;
  v_granted_plan_code text;
  v_granted_months integer;
  v_granted_user_limit integer;
  v_granted_price_cents bigint;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_env text;
  v_status_upper text := upper(coalesce(p_resource_status, ''));
  v_event_upper text := upper(coalesce(p_event_type, ''));
begin
  -- Resolve ambiente do pedido ou default para sandbox
  select provider_environment into v_env from public.subscription_orders
  where (p_external_reference is not null and id = p_external_reference)
     or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
  limit 1;
  v_env := coalesce(v_env, 'sandbox');

  insert into public.asaas_recurring_subscription_events
    (provider_environment, provider_account_id, provider_event_id, event_type, provider_subscription_id,
     provider_pix_authorization_id, provider_payment_id, external_reference, resource_status)
  values (v_env, p_account, p_event_id, p_event_type, nullif(p_subscription_id,''),
          nullif(p_pix_authorization_id,''), nullif(p_payment_id,''), p_external_reference, nullif(p_resource_status,''))
  on conflict (provider_environment, provider_account_id, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    -- A one-time quarterly payment is evidence for the checkout worker, never
    -- a renewal. Two installment webhooks must not grant two paid periods.
    select * into v_order from public.subscription_orders
      where id=p_external_reference and provider_account_id=p_account
        and billing_mode='ONE_TIME' and months=3 for update;
    if found then
      if v_order.provider_checkout_id is not null then
        perform public.persist_asaas_checkout_event(p_account,p_event_id,p_event_type,
          v_order.provider_checkout_id,coalesce(nullif(p_resource_status,''),'UNKNOWN'),v_order.provider_environment);
      end if;
      update public.subscription_orders set reconciliation_next_at=clock_timestamp(),updated_at=now()
        where id=v_order.id;
      update public.asaas_recurring_subscription_events set processing_state='PROCESSED'
        where provider_environment=v_order.provider_environment and provider_account_id=p_account and provider_event_id=p_event_id;
      return true;
    end if;
    -- 1. Vinculos de assinatura cartao recorrente
    if p_subscription_id is not null and p_external_reference is not null then
      update public.subscription_orders set provider_subscription_id=p_subscription_id,
        recurring_state=case when recurring_state in ('REQUESTING','READY') then 'ACTIVE' else recurring_state end,
        updated_at=now()
      where id=p_external_reference and billing_mode='CARD_RECURRING';

      update public.asaas_recurring_subscription_events
      set processing_state = 'PROCESSED'
      where provider_account_id = p_account and provider_event_id = p_event_id;
    end if;

    -- 2. Vinculos de autorizacao Pix Automatico
    if nullif(p_pix_authorization_id,'') is not null then
      update public.subscription_orders set recurring_state=case v_status_upper
          when 'ACTIVE' then 'ACTIVE'
          when 'REFUSED' then 'REFUSED'
          when 'CANCELLED' then 'CANCELED'
          when 'EXPIRED' then 'CANCELED'
          else recurring_state
        end,
        updated_at=now()
      where billing_mode='PIX_AUTOMATIC'
        and provider_account_id=p_account and provider_pix_authorization_id=p_pix_authorization_id
        and (p_external_reference is null or id=p_external_reference);
    end if;

    -- 3. Conciliacao instantanea para pagamento recebido / confirmado
    if v_event_upper in ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_RECEIVED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED')
       or v_status_upper in ('RECEIVED', 'CONFIRMED') then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
          or (nullif(p_payment_id, '') is not null and provider_checkout_id = p_payment_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        -- Deduplicacao unificada: verifica paid_periods, payment_evidence (checkout) e recurring_payment_evidence
        if nullif(p_payment_id, '') is not null and (
          exists (
            select 1 from public.subscription_paid_periods
            where provider_account_id = p_account and provider_payment_id = p_payment_id
          )
          or exists (
            select 1 from public.subscription_payment_evidence
            where provider_account_id = p_account and provider_payment_id = p_payment_id
          )
          or exists (
            select 1 from public.subscription_recurring_payment_evidence
            where provider_account_id = p_account and provider_payment_id = p_payment_id
          )
        ) then
          -- Pagamento ja concedido anteriormente. Atualiza status para CONFIRMED se aplicavel, sem duplicar vigencia
          if v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED' then
            update public.subscription_recurring_payment_evidence
            set provider_status = 'CONFIRMED',
                confirmed_at = now()
            where provider_account_id = p_account
              and provider_payment_id = p_payment_id;

            -- Preserva cancelamento contra reativacao indevida
            update public.subscription_orders
            set status = 'CONFIRMED',
                reconciliation_state = 'CONFIRMED',
                recurring_state = case
                  when recurring_state = 'CANCELED' then 'CANCELED'
                  when billing_mode in ('CARD_RECURRING', 'PIX_AUTOMATIC') then 'ACTIVE'
                  else recurring_state
                end,
                updated_at = now()
            where id = v_order.id;
          end if;

          update public.asaas_recurring_subscription_events
          set processing_state = 'PROCESSED'
          where provider_account_id = p_account and provider_event_id = p_event_id;

          perform private.write_audit_log(
            v_order.barbershop_id,
            case when v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED'
                 then 'subscription.payment_confirmed' else 'subscription.payment_received' end,
            'subscription_orders',
            v_order.id,
            jsonb_build_object(
              'event', p_event_type,
              'payment_id', p_payment_id,
              'subscription_id', p_subscription_id,
              'environment', v_order.provider_environment
            )
          );
        else
          select * into v_sub from public.barbershop_subscriptions
          where barbershop_id = v_order.barbershop_id for update;

          if found and exists (select 1 from public.barbershops where id = v_order.barbershop_id and active and owner_id is not null) then
            -- Consumo ou preservacao de contrato agendado/aplicado para mudanca de plano
            select * into v_scheduled
            from public.subscription_scheduled_plan_changes
            where barbershop_id = v_order.barbershop_id
              and (
                (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
                or (v_order.provider_subscription_id is not null and provider_subscription_id = v_order.provider_subscription_id)
              )
              and status in ('SCHEDULED', 'APPLIED')
            order by updated_at desc
            limit 1 for update;

            v_is_old_payment := false;
            if found then
              -- 1. Identidade: se o payment_id consta explicitamente na fronteira de pagamentos anteriores, conserva termos anteriores
              if nullif(p_payment_id, '') is not null and (
                (v_scheduled.boundary_payment_id is not null and v_scheduled.boundary_payment_id = p_payment_id)
                or (v_scheduled.boundary_payment_ids is not null and p_payment_id = any(v_scheduled.boundary_payment_ids))
              ) then
                v_is_old_payment := true;
              end if;

              -- 2. Valor: verifica se o valor pago Ã© inferior ao esperado para o novo contrato
              if not v_is_old_payment and p_value_cents is not null and p_value_cents < coalesce(v_scheduled.expected_price_cents, v_scheduled.price_cents) then
                v_is_old_payment := true;
              end if;

              -- Se houve downgrade de valor e o pagamento corresponde ao valor do plano anterior mais caro (ou excede o novo contrato em downgrade)
              if not v_is_old_payment and p_value_cents is not null and (
                (coalesce(v_scheduled.previous_price_cents, v_order.price_cents) is not null
                 and p_value_cents = coalesce(v_scheduled.previous_price_cents, v_order.price_cents)
                 and coalesce(v_scheduled.expected_price_cents, v_scheduled.price_cents) <> coalesce(v_scheduled.previous_price_cents, v_order.price_cents))
                or (p_value_cents > coalesce(v_scheduled.expected_price_cents, v_scheduled.price_cents)
                    and coalesce(v_scheduled.previous_price_cents, v_order.price_cents, p_value_cents) > coalesce(v_scheduled.expected_price_cents, v_scheduled.price_cents))
              ) then
                v_is_old_payment := true;
              end if;

              -- 3. Ciclo: verifica se a periodicidade do pagamento difere do ciclo esperado
              if not v_is_old_payment and p_cycle is not null and v_scheduled.expected_cycle is not null
                 and upper(p_cycle) <> upper(v_scheduled.expected_cycle) then
                v_is_old_payment := true;
              end if;

              -- 4. VigÃªncia temporal: pagamento recebido antes do marco de vigÃªncia com valor do plano antigo
              if not v_is_old_payment and v_scheduled.status = 'SCHEDULED' and v_scheduled.effective_after is not null
                 and clock_timestamp() < v_scheduled.effective_after then
                if p_value_cents is not null and (
                  (v_order.price_cents is not null and p_value_cents <= v_order.price_cents and v_order.price_cents < v_scheduled.price_cents)
                  or (v_scheduled.previous_price_cents is not null and p_value_cents = v_scheduled.previous_price_cents and v_scheduled.previous_price_cents <> v_scheduled.price_cents)
                ) then
                  v_is_old_payment := true;
                end if;
              end if;
            end if;

            v_start_at := greatest(
              clock_timestamp(),
              case when v_sub.status = 'trialing' then coalesce(v_sub.trial_ends_at, clock_timestamp()) else clock_timestamp() end,
              coalesce(v_sub.current_period_ends_at, clock_timestamp())
            );

            if found and not v_is_old_payment then
              v_granted_plan_code := v_scheduled.plan_code;
              v_granted_months := v_scheduled.months;
              v_granted_user_limit := v_scheduled.user_limit;
              v_granted_price_cents := coalesce(p_value_cents, v_scheduled.price_cents);

              if v_scheduled.status = 'SCHEDULED' and clock_timestamp() >= v_start_at then
                update public.subscription_scheduled_plan_changes
                set status = 'APPLIED', applied_at = now(), updated_at = now()
                where id = v_scheduled.id;
              elsif v_scheduled.status = 'SCHEDULED' then
                update public.subscription_scheduled_plan_changes
                set effective_after = v_start_at, updated_at = now()
                where id = v_scheduled.id;
              end if;
            else
              v_granted_plan_code := coalesce(v_scheduled.previous_plan_code, v_order.plan_code);
              v_granted_months := coalesce(v_scheduled.previous_months, v_order.months);
              v_granted_user_limit := coalesce(v_scheduled.previous_user_limit, v_order.user_limit);
              v_granted_price_cents := coalesce(p_value_cents, v_scheduled.previous_price_cents, v_order.price_cents);
            end if;
            if v_granted_months not in (1, 3, 12) then
              raise exception 'Invalid recurring cycle' using errcode = '22023';
            end if;
            v_end_at := ((v_start_at at time zone 'America/Sao_Paulo')
              + make_interval(months => v_granted_months)) at time zone 'America/Sao_Paulo';

            insert into public.subscription_paid_periods
              (order_id, barbershop_id, subscription_id, provider_environment, provider_account_id, provider_payment_id, plan_code, user_limit, starts_at, ends_at)
            values
              (v_order.id, v_order.barbershop_id, v_sub.id, v_order.provider_environment, p_account, nullif(p_payment_id, ''), v_granted_plan_code, v_granted_user_limit, v_start_at, v_end_at)
            on conflict do nothing;

            if nullif(p_payment_id, '') is not null then
              insert into public.subscription_recurring_payment_evidence
                (provider_account_id, provider_payment_id, order_id, provider_pix_authorization_id, value_cents, provider_status)
              values
                (p_account, p_payment_id, v_order.id, coalesce(p_pix_authorization_id, ''), v_granted_price_cents,
                 case when v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED' then 'CONFIRMED' else 'RECEIVED' end)
              on conflict do nothing;
            end if;

            -- Preserva cancelamento da assinatura se este pedido cancelou renovacao, a menos que haja contrato substituto ativo
            update public.barbershop_subscriptions
            set status = case
                  when v_order.recurring_state = 'CANCELED' and exists (
                    select 1 from public.subscription_orders
                    where barbershop_id = v_order.barbershop_id
                      and id <> v_order.id
                      and created_at > v_order.created_at
                      and recurring_state = 'ACTIVE'
                  ) then 'active'
                  when v_order.recurring_state = 'CANCELED' then 'cancelled'
                  else 'active'
                end,
                plan_code = case
                  when v_order.recurring_state = 'CANCELED' and exists (
                    select 1 from public.subscription_orders
                    where barbershop_id = v_order.barbershop_id
                      and id <> v_order.id
                      and created_at > v_order.created_at
                      and recurring_state = 'ACTIVE'
                  ) then plan_code
                  when v_is_old_payment and exists (
                    select 1 from public.subscription_scheduled_plan_changes
                    where barbershop_id = v_order.barbershop_id
                      and status = 'APPLIED'
                  ) then plan_code
                  when v_start_at > clock_timestamp() and v_sub.current_period_ends_at is not null and clock_timestamp() < v_sub.current_period_ends_at then plan_code
                  else v_granted_plan_code
                end,
                provider = 'asaas',
                current_period_ends_at = greatest(coalesce(current_period_ends_at, v_end_at), v_end_at),
                trial_ends_at = null,
                updated_at = now()
            where id = v_sub.id;

            -- Preserva cancelamento da ordem se cancelada
            update public.subscription_orders
            set status = 'CONFIRMED',
                reconciliation_state = 'CONFIRMED',
                recurring_state = case
                  when recurring_state = 'CANCELED' then 'CANCELED'
                  when billing_mode in ('CARD_RECURRING', 'PIX_AUTOMATIC') then 'ACTIVE'
                  else recurring_state
                end,
                updated_at = now()
            where id = v_order.id;

            update public.asaas_recurring_subscription_events
            set processing_state = 'PROCESSED'
            where provider_account_id = p_account and provider_event_id = p_event_id;

            perform private.write_audit_log(
              v_order.barbershop_id,
              'subscription.payment_received',
              'subscription_orders',
              v_order.id,
              jsonb_build_object(
                'event', p_event_type,
                'payment_id', p_payment_id,
                'subscription_id', p_subscription_id,
                'environment', v_order.provider_environment,
                'plan_code', v_granted_plan_code,
                'months', v_granted_months
              )
            );
          end if;
        end if;
      end if;

    -- 4. Estorno ou remocao de pagamento (processado antes do cancelamento de assinatura para nao cancelar indevidamente por PAYMENT_DELETED)
    elsif v_event_upper in ('PAYMENT_REFUNDED', 'PAYMENT_DELETED') or (v_status_upper in ('REFUNDED', 'DELETED') and v_event_upper like 'PAYMENT_%') then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set status = 'CANCELED',
            updated_at = now()
        where id = v_order.id;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_refunded',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'environment', v_order.provider_environment)
        );
      end if;

    -- 5. Cancelamento de assinatura
    elsif v_event_upper in ('SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVE', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_CANCELLED', 'PIX_AUTOMATIC_AUTHORIZATION_CANCELLED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED')
          or (v_status_upper in ('INACTIVE', 'CANCELED', 'CANCELLED', 'EXPIRED') and v_event_upper not like 'PAYMENT_%') then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set recurring_state = 'CANCELED',
            updated_at = now()
        where id = v_order.id;

        if not exists (
          select 1 from public.subscription_orders
          where barbershop_id = v_order.barbershop_id
            and id <> v_order.id
            and created_at > v_order.created_at
            and recurring_state = 'ACTIVE'
        ) then
          update public.barbershop_subscriptions
          set status = 'cancelled',
              updated_at = now()
          where barbershop_id = v_order.barbershop_id;
        end if;

        -- Cancela tambem qualquer mudanca de plano agendada pendente vinculada ao contrato cancelado
        update public.subscription_scheduled_plan_changes
        set status = 'CANCELED', updated_at = now()
        where barbershop_id = v_order.barbershop_id
          and status = 'SCHEDULED'
          and provider_subscription_id = coalesce(nullif(p_subscription_id, ''), v_order.provider_subscription_id);

        -- Abertura automatica de chamado para atuacao de retencao
        if not exists (
          select 1 from public.platform_support_tickets
          where barbershop_id = v_order.barbershop_id
            and category_id = 'billing'
            and status in ('open', 'in_progress', 'waiting_client')
            and subject like '[Alerta de RetenÃ§Ã£o]%'
        ) and coalesce(v_order.requester_id, (select owner_id from public.barbershops where id = v_order.barbershop_id)) is not null then
          begin
            insert into public.platform_support_tickets (
              barbershop_id, created_by, created_by_role, category_id,
              subject, description, priority, status, faq_consulted
            ) values (
              v_order.barbershop_id,
              coalesce(v_order.requester_id, (select owner_id from public.barbershops where id = v_order.barbershop_id)),
              'owner',
              'billing',
              '[Alerta de RetenÃ§Ã£o] Cancelamento Asaas: ' || coalesce(v_order.plan_name, 'Plano'),
              'O provedor Asaas notificou o cancelamento da assinatura. Contatar o proprietÃ¡rio para retenÃ§Ã£o preventiva antes do fim do perÃ­odo de vigÃªncia.',
              'high',
              'open',
              true
            );
          exception when others then
            null;
          end;
        end if;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.cancelled',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'subscription_id', p_subscription_id, 'environment', v_order.provider_environment)
        );
      end if;

    -- 5. Notificacao de pagamento em atraso
    elsif v_event_upper in ('PAYMENT_OVERDUE', 'PAYMENT_DUNNING_REQUESTED') or v_status_upper = 'OVERDUE' then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set status = case when status = 'CONFIRMED' then status else 'REVIEW_REQUIRED' end,
            reconciliation_state = 'REVIEW_REQUIRED',
            updated_at = now()
        where id = v_order.id;

        select * into v_sub from public.barbershop_subscriptions
        where barbershop_id = v_order.barbershop_id for update;

        if found and (v_sub.current_period_ends_at is null or v_sub.current_period_ends_at <= clock_timestamp()) then
          update public.barbershop_subscriptions
          set status = 'past_due', updated_at = now()
          where id = v_sub.id;
        end if;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_overdue',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'subscription_id', p_subscription_id, 'environment', v_order.provider_environment)
        );
      end if;

    -- 6. Pagamento restaurado
    elsif v_event_upper = 'PAYMENT_RESTORED' or v_status_upper = 'RESTORED' then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set status = case when status = 'REVIEW_REQUIRED' then 'PENDING_PAYMENT' else status end,
            reconciliation_state = case when reconciliation_state = 'REVIEW_REQUIRED' then 'PENDING' else reconciliation_state end,
            updated_at = now()
        where id = v_order.id;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_restored',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'subscription_id', p_subscription_id, 'environment', v_order.provider_environment)
        );
      end if;
    end if;

    return true;
  end if;

  select * into v_existing from public.asaas_recurring_subscription_events
    where provider_account_id=p_account and provider_event_id=p_event_id;
  if (v_existing.event_type, coalesce(v_existing.provider_subscription_id,''), coalesce(v_existing.provider_pix_authorization_id,''),
      coalesce(v_existing.provider_payment_id,''), v_existing.external_reference, coalesce(v_existing.resource_status,''))
     is distinct from (p_event_type, coalesce(p_subscription_id,''), coalesce(p_pix_authorization_id,''),
      coalesce(p_payment_id,''), p_external_reference, coalesce(p_resource_status,'')) then
    raise exception 'Conflicting recurring provider event' using errcode='23505';
  end if;
  return false;
end;
$$;

revoke all on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text,bigint,text) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text,bigint,text) to service_role;

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
   'priceCents',o.price_cents,'maxInstallments',o.max_installments,'months',o.months,'billingMode',o.billing_mode,'lease',token);
end $$;

revoke all on function public.claim_subscription_reconciliation(text,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_subscription_reconciliation(text,text) to service_role;

commit;
