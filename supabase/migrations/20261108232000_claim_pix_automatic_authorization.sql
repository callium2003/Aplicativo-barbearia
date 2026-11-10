-- Reserva uma única criação de recorrência antes de qualquer escrita no provedor.
create function public.claim_subscription_recurring_operation(
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
  if o.months <> 1 then raise exception 'Recurring operation requires monthly order' using errcode='22023'; end if;
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

create function public.finish_subscription_recurring_operation(
  p_order_id uuid, p_customer_id text, p_subscription_id text, p_authorization_id text
) returns void language plpgsql security definer set search_path = '' as $$
declare o public.subscription_orders%rowtype;
begin
  select * into o from public.subscription_orders where id=p_order_id for update;
  if not found or o.recurring_state <> 'REQUESTING' then
    raise exception 'Recurring operation is not claimed' using errcode='55000';
  end if;
  if p_customer_id !~ '^[A-Za-z0-9_-]{1,128}$' then raise exception 'Invalid provider customer' using errcode='22023'; end if;
  if o.billing_mode='CARD_RECURRING' and (p_subscription_id is null or p_subscription_id !~ '^[A-Za-z0-9_-]{1,128}$' or p_authorization_id is not null) then
    raise exception 'Invalid recurring card result' using errcode='22023';
  end if;
  if o.billing_mode='PIX_AUTOMATIC' and (p_authorization_id is null or p_authorization_id !~ '^[A-Za-z0-9_-]{1,128}$' or p_subscription_id is not null) then
    raise exception 'Invalid Pix Automatic result' using errcode='22023';
  end if;
  update public.subscription_orders set provider_customer_id=p_customer_id,
    provider_subscription_id=p_subscription_id, provider_pix_authorization_id=p_authorization_id,
    recurring_state='READY', updated_at=now() where id=o.id;
end;
$$;

revoke all on function public.claim_subscription_recurring_operation(uuid,uuid,text) from public, anon, authenticated, service_role;
revoke all on function public.finish_subscription_recurring_operation(uuid,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.claim_subscription_recurring_operation(uuid,uuid,text) to service_role;
grant execute on function public.finish_subscription_recurring_operation(uuid,text,text,text) to service_role;
