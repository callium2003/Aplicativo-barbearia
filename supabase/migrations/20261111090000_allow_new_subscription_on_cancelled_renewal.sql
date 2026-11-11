-- Permite nova contratação de assinatura caso a renovação da assinatura anterior tenha sido cancelada
-- ou o período vigente esteja expirado.

-- 1. Sincroniza o status de assinaturas cujo pedido confirmado mais recente já teve a renovação cancelada
update public.barbershop_subscriptions s
set status = 'cancelled', updated_at = now()
where s.status = 'active'
  and exists (
    select 1 from public.subscription_orders o
    where o.barbershop_id = s.barbershop_id
      and o.status = 'CONFIRMED'
      and o.recurring_state = 'CANCELED'
  );

-- 2. Atualiza create_subscription_order para verificar se há assinatura ativa com renovação ainda ativa
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
    (barbershop_id,requester_id,idempotency_key,plan_code,plan_name,months,price_cents,max_installments,user_limit,terms_version)
  values (p_barbershop_id,p_requester_id,p_idempotency_key,p_plan_code,p_plan_name,p_months,
          p_price_cents,p_max_installments,p_user_limit,p_terms_version)
  returning id into v_order.id;
  return v_order.id;
end;
$$;

revoke all on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) to service_role;
