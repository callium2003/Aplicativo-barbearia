-- Apenas no banco isolado criado pelo runner; transação revertida ao final.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
 ('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','billing-owner-a@example.test',now(),now()),
 ('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','billing-owner-b@example.test',now(),now());
insert into public.barbershops (id, owner_id, name, slug, active) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Fixture A','billing-fixture-a',true),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Fixture B','billing-fixture-b',true);

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.subscription_orders'::regclass) then
    raise exception 'pedidos sem RLS';
  end if;
  if has_table_privilege('anon','public.subscription_orders','select,insert,update,delete')
    or has_table_privilege('authenticated','public.subscription_orders','select,insert,update,delete') then
    raise exception 'acesso direto aos pedidos concedido indevidamente';
  end if;
end $$;

insert into public.subscription_orders
 (id, barbershop_id, requester_id, idempotency_key, plan_code, plan_name, months, price_cents, max_installments, user_limit, terms_version)
values ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
 'a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',
 'simple-anual','Plano Simple (Anual)',12,49900,3,3,'fixture-v1');

do $$
begin
  if (select status from public.subscription_orders where id='a3000000-0000-4000-8000-000000000001') <> 'PENDING_PAYMENT' then
    raise exception 'pedido novo não está pendente';
  end if;
  if (select status from public.barbershop_subscriptions where barbershop_id='a2000000-0000-4000-8000-000000000001') <> 'trialing' then
    raise exception 'pedido alterou assinatura';
  end if;
  begin
    update public.subscription_orders set price_cents=1 where id='a3000000-0000-4000-8000-000000000001';
    raise exception 'snapshot foi alterado';
  exception when raise_exception then
    if sqlerrm = 'snapshot foi alterado' then raise; end if;
  end;
  begin
    insert into public.subscription_orders
     (barbershop_id,requester_id,idempotency_key,plan_code,plan_name,months,price_cents,max_installments,user_limit,terms_version)
    values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',
     'a4000000-0000-4000-8000-000000000001','simple-anual','Simple',12,49900,3,3,'fixture-v1');
    raise exception 'chave de idempotência duplicada foi aceita';
  exception when unique_violation then null;
  end;
  begin
    insert into public.subscription_orders
     (barbershop_id,requester_id,idempotency_key,plan_code,plan_name,months,price_cents,max_installments,user_limit,terms_version)
    values ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
     'a4000000-0000-4000-8000-000000000002','simple-anual','Simple',12,0,3,3,'fixture-v1');
    raise exception 'preço zero foi aceito';
  exception when check_violation then null;
  end;
end $$;

-- A função é exclusiva do backend e confirma a propriedade no próprio banco.
do $$
declare
  created uuid;
  repeated uuid;
begin
  if has_function_privilege('authenticated', 'public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text)', 'execute')
     or has_function_privilege('anon', 'public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text)', 'execute')
     or has_function_privilege('authenticated', 'public.claim_subscription_checkout(uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.finish_subscription_checkout(uuid,text,text,text)', 'execute') then
    raise exception 'criação de pedido exposta diretamente';
  end if;
  created := public.create_subscription_order(
    'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
    'a4000000-0000-4000-8000-000000000003','simple-anual','Simple',12,49900,3,3,'fixture-v1');
  repeated := public.create_subscription_order(
    'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
    'a4000000-0000-4000-8000-000000000003','simple-anual','Simple',12,49900,3,3,'fixture-v1');
  if created is distinct from repeated then raise exception 'repetição gerou outro pedido'; end if;
  repeated := public.create_subscription_order(
    'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
    'a4000000-0000-4000-8000-000000000006','simple-anual','Simple',12,49900,3,3,'fixture-v1');
  if repeated is distinct from created then raise exception 'pedido pendente não foi reutilizado'; end if;
  begin
    perform public.create_subscription_order(
      'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
      'a4000000-0000-4000-8000-000000000007','simple-anual','Simple',12,59900,3,3,'fixture-v1');
    raise exception 'outro preço substituiu pedido pendente';
  exception when unique_violation then null;
  end;
  begin
    perform public.create_subscription_order(
      'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000004','simple-anual','Simple',12,49900,3,3,'fixture-v1');
    raise exception 'outro proprietário criou pedido';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_subscription_order(
      'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
      'a4000000-0000-4000-8000-000000000003','simple-anual','Simple',12,59900,3,3,'fixture-v1');
    raise exception 'chave repetida com oferta diferente foi aceita';
  exception when unique_violation then null;
  end;
end $$;
set local role service_role;
select public.create_subscription_order(
  'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
  'a4000000-0000-4000-8000-000000000003','simple-anual','Simple',12,49900,3,3,'fixture-v1');
do $$
declare
  order_id uuid;
  first_attempt jsonb;
  retry_attempt jsonb;
begin
  order_id := public.create_subscription_order(
    'a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',
    'a4000000-0000-4000-8000-000000000003','simple-anual','Simple',12,49900,3,3,'fixture-v1');
  first_attempt := public.claim_subscription_checkout(order_id,'a1000000-0000-4000-8000-000000000002');
  retry_attempt := public.claim_subscription_checkout(order_id,'a1000000-0000-4000-8000-000000000002');
  if first_attempt->>'state' <> 'CLAIMED' or (first_attempt->'offer'->>'priceCents')::bigint <> 49900 then
    raise exception 'reserva não retornou oferta persistida';
  end if;
  if retry_attempt->>'state' <> 'IN_PROGRESS' then raise exception 'repetição autorizou novo envio'; end if;
  begin
    perform public.claim_subscription_checkout(order_id,'a1000000-0000-4000-8000-000000000001');
    raise exception 'outro dono acessou checkout';
  exception when insufficient_privilege then null;
  end;
  perform public.finish_subscription_checkout(order_id,'UNKNOWN',null,null);
  if (public.claim_subscription_checkout(order_id,'a1000000-0000-4000-8000-000000000002'))->>'state' <> 'REVIEW_REQUIRED' then
    raise exception 'resultado incerto autorizou nova tentativa';
  end if;
  order_id := public.create_subscription_order(
    'a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',
    'a4000000-0000-4000-8000-000000000001','simple-anual','Plano Simple (Anual)',12,49900,3,3,'fixture-v1');
  perform public.claim_subscription_checkout(order_id,'a1000000-0000-4000-8000-000000000001');
  perform public.finish_subscription_checkout(order_id,'READY','checkout-test-1','https://sandbox.asaas.com/000/checkoutSession/show/checkout-test-1');
  if (public.claim_subscription_checkout(order_id,'a1000000-0000-4000-8000-000000000001'))->>'checkoutId' <> 'checkout-test-1' then
    raise exception 'checkout existente não foi reutilizado';
  end if;
end $$;
do $$
declare inserted boolean;
begin
  inserted := public.persist_asaas_checkout_event('sandbox-account-fixture','evt-fixture-1','CHECKOUT_PAID','checkout-test-1','PAID');
  if inserted is not true then raise exception 'evento não foi persistido'; end if;
  inserted := public.persist_asaas_checkout_event('sandbox-account-fixture','evt-fixture-1','CHECKOUT_PAID','checkout-test-1','PAID');
  if inserted is not false then raise exception 'evento duplicado não foi reconhecido'; end if;
  begin
    perform public.persist_asaas_checkout_event('sandbox-account-fixture','evt-fixture-1','CHECKOUT_CANCELED','checkout-test-1','CANCELED');
    raise exception 'evento conflitante aceito';
  exception when unique_violation then null;
  end;
end $$;
reset role;
rollback;
