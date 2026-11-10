-- A recepção de webhook continua sendo o caminho normal. Esta recuperação existe
-- somente para um checkout antigo cuja inatividade e ausência de pagamento foram
-- verificadas pelo reconciliador confiável antes desta RPC ser chamada.
create function public.close_verified_inactive_subscription_checkout(
  p_order_id uuid, p_account text, p_provider_status text
) returns boolean language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype;
begin
  if p_account is null or p_account !~ '^[A-Za-z0-9_-]{1,128}$'
    or p_provider_status not in ('CANCELED','EXPIRED') then
    raise exception 'Invalid inactive checkout evidence' using errcode='22023';
  end if;
  select * into o from public.subscription_orders where id=p_order_id for update;
  if not found or o.provider_environment<>'sandbox' or o.provider_account_id is distinct from p_account
    or o.status<>'PENDING_PAYMENT' or o.checkout_state<>'READY' then
    raise exception 'Inactive checkout is unavailable' using errcode='55000';
  end if;
  if exists(select 1 from public.subscription_payment_evidence e where e.order_id=o.id)
    or exists(select 1 from public.subscription_recurring_payment_evidence e where e.order_id=o.id)
    or exists(select 1 from public.subscription_paid_periods p where p.order_id=o.id) then
    raise exception 'Inactive checkout has financial evidence' using errcode='55000';
  end if;
  update public.subscription_orders
     set status='CANCELED', reconciliation_state='PENDING', reconciliation_token=null,
         reconciliation_locked_until=null, updated_at=now()
   where id=o.id;
  perform private.write_audit_log(o.barbershop_id,'subscription.checkout_closed_after_verified_inactivity',
    'subscription_orders',o.id,jsonb_build_object('environment','sandbox','providerStatus',p_provider_status));
  return true;
end;
$$;

revoke all on function public.close_verified_inactive_subscription_checkout(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.close_verified_inactive_subscription_checkout(uuid,text,text) to service_role;

-- Dados cadastrais insuficientes são detectados antes de qualquer chamada ao
-- provedor. A reserva vazia pode ser liberada sem afetar uma autorização criada.
create function public.release_unstarted_pix_automatic_operation(
  p_order_id uuid, p_requester_id uuid
) returns boolean language plpgsql security definer set search_path='' as $$
declare o public.subscription_orders%rowtype; v_owner uuid;
begin
  select * into o from public.subscription_orders where id=p_order_id for update;
  if not found then raise exception 'Unknown subscription order' using errcode='P0002'; end if;
  select owner_id into v_owner from public.barbershops where id=o.barbershop_id;
  if v_owner is null or v_owner<>p_requester_id or o.requester_id<>p_requester_id then
    raise exception 'Unauthorized subscription order' using errcode='42501';
  end if;
  if o.billing_mode<>'PIX_AUTOMATIC' or o.recurring_state<>'REQUESTING'
    or o.provider_customer_id is not null or o.provider_subscription_id is not null
    or o.provider_pix_authorization_id is not null then
    raise exception 'Pix Automatic operation cannot be released' using errcode='55000';
  end if;
  update public.subscription_orders set billing_mode='ONE_TIME',recurring_state='NOT_STARTED',
    provider_contract_id=null,updated_at=now() where id=o.id;
  return true;
end;
$$;

revoke all on function public.release_unstarted_pix_automatic_operation(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.release_unstarted_pix_automatic_operation(uuid,uuid) to service_role;

-- A análise manual é uma pendência financeira, não uma licença para cobrar de novo.
create or replace function public.create_subscription_order(
  p_barbershop_id uuid, p_requester_id uuid, p_idempotency_key uuid,
  p_plan_code text, p_plan_name text, p_months integer, p_price_cents bigint,
  p_max_installments integer, p_user_limit integer, p_terms_version text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_order public.subscription_orders%rowtype;
begin
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
      and s.status='active' and (s.current_period_ends_at is null or s.current_period_ends_at>clock_timestamp())) then
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
    (barbershop_id,requester_id,idempotency_key,plan_code,plan_name,months,price_cents,max_installments,user_limit,terms_version)
  values (p_barbershop_id,p_requester_id,p_idempotency_key,p_plan_code,p_plan_name,p_months,
          p_price_cents,p_max_installments,p_user_limit,p_terms_version)
  returning id into v_order.id;
  return v_order.id;
end;
$$;

revoke all on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) to service_role;
