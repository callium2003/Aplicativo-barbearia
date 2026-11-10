-- Suporte a recorrência anual no cartão de crédito.
-- O Asaas exige cobrança anual à vista (sem parcelamento) para assinaturas recorrentes.

alter table public.subscription_orders
  drop constraint if exists subscription_recurring_monthly_only;

alter table public.subscription_orders
  add constraint subscription_recurring_valid_periods check (
    billing_mode = 'ONE_TIME'
    or (billing_mode = 'PIX_AUTOMATIC' and months = 1)
    or (billing_mode = 'CARD_RECURRING' and months in (1, 12))
  );

-- Atualiza a RPC claim_subscription_recurring_operation para permitir cartão recorrente anual
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
  if p_billing_mode = 'PIX_AUTOMATIC' and o.months <> 1 then
    raise exception 'Pix Automatic requires monthly order' using errcode='22023';
  end if;
  if p_billing_mode = 'CARD_RECURRING' and o.months not in (1, 12) then
    raise exception 'Card recurrence requires monthly or annual order' using errcode='22023';
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

revoke all on function public.claim_subscription_recurring_operation(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.claim_subscription_recurring_operation(uuid,uuid,text) to service_role;
