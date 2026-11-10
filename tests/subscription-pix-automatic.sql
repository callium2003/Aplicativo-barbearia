-- Fictitious Pix Automático contract. The fixture is rolled back and proves
-- the financial grant is per provider payment, not per original order.
begin;
insert into auth.users (id,aud,role,email,created_at,updated_at) values
 ('b3000000-0000-4000-8000-000000000001','authenticated','authenticated','pix-recurring@example.test',now(),now());
insert into public.barbershops (id,owner_id,name,slug,active) values
 ('b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','Pix fixture','pix-recurring-fixture',true);
do $$
declare
  o uuid; first_job jsonb; second_job jsonb; first_ends timestamptz; second_ends timestamptz;
  first_payment jsonb; second_payment jsonb;
begin
  o := public.create_subscription_order(
    'b4000000-0000-4000-8000-000000000001',
    'b3000000-0000-4000-8000-000000000001',
    gen_random_uuid(),'simple-mensal','Simple',1,4990,1,3,'fixture-v1'
  );
  perform public.bind_subscription_sandbox_account(o,'b3000000-0000-4000-8000-000000000001','account_pix_fixture');
  update public.subscription_orders
    set billing_mode='PIX_AUTOMATIC', recurring_state='READY', provider_pix_authorization_id='aut_pix_fixture'
    where id=o;
  perform public.persist_asaas_recurring_subscription_event(
    'account_pix_fixture','evt_pix_authorization_active','PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
    '', 'aut_pix_fixture', '', o, 'ACTIVE'
  );
  if (select recurring_state from public.subscription_orders where id=o) <> 'ACTIVE' then
    raise exception 'Pix Automatic authorization did not become active';
  end if;

  insert into public.asaas_recurring_subscription_events
    (provider_account_id,provider_event_id,event_type,provider_pix_authorization_id,provider_payment_id,resource_status)
  values ('account_pix_fixture','evt_pix_first','PIX_AUTOMATIC_PAYMENT_RECEIVED','aut_pix_fixture','pay_pix_first','RECEIVED');

  first_job := public.claim_pix_automatic_reconciliation('account_pix_fixture');
  if first_job->>'orderId' is distinct from o::text or first_job->>'paymentId' is distinct from 'pay_pix_first'
     or coalesce(first_job->>'lease','')='' or coalesce(first_job->>'eventId','')='' then
    raise exception 'Pix Automatic event was not durably claimed';
  end if;
  if public.claim_pix_automatic_reconciliation('account_pix_fixture') is not null then
    raise exception 'Pix Automatic event was double claimed';
  end if;

  first_payment := jsonb_build_object('id','pay_pix_first','status','RECEIVED','valueCents','4990',
    'authorizationId','aut_pix_fixture','eventId',first_job->>'eventId','lease',first_job->>'lease');
  if public.finish_pix_automatic_reconciliation(o,'account_pix_fixture',first_payment,'CONFIRMED') <> 'CONFIRMED' then
    raise exception 'first Pix Automatic payment was not confirmed';
  end if;
  select current_period_ends_at into first_ends from public.barbershop_subscriptions
    where barbershop_id='b4000000-0000-4000-8000-000000000001';
  if (select count(*) from public.subscription_paid_periods where order_id=o) <> 1 then
    raise exception 'first Pix Automatic payment did not create exactly one period';
  end if;

  begin
    perform public.finish_pix_automatic_reconciliation(o,'account_pix_fixture',first_payment,'CONFIRMED');
    raise exception 'replayed Pix Automatic payment was accepted';
  exception when sqlstate '55000' then null;
  end;
  if (select current_period_ends_at from public.barbershop_subscriptions where barbershop_id='b4000000-0000-4000-8000-000000000001') is distinct from first_ends then
    raise exception 'replayed Pix Automatic payment extended access';
  end if;

  insert into public.asaas_recurring_subscription_events
    (provider_account_id,provider_event_id,event_type,provider_pix_authorization_id,provider_payment_id,resource_status)
  values ('account_pix_fixture','evt_pix_second','PIX_AUTOMATIC_PAYMENT_RECEIVED','aut_pix_fixture','pay_pix_second','RECEIVED');
  second_job := public.claim_pix_automatic_reconciliation('account_pix_fixture');
  if second_job->>'paymentId' is distinct from 'pay_pix_second' then
    raise exception 'second monthly Pix payment was not claimed';
  end if;
  second_payment := jsonb_build_object('id','pay_pix_second','status','RECEIVED','valueCents','4990',
    'authorizationId','aut_pix_fixture','eventId',second_job->>'eventId','lease',second_job->>'lease');
  if public.finish_pix_automatic_reconciliation(o,'account_pix_fixture',second_payment,'CONFIRMED') <> 'CONFIRMED' then
    raise exception 'second Pix Automatic payment was not confirmed';
  end if;
  select current_period_ends_at into second_ends from public.barbershop_subscriptions
    where barbershop_id='b4000000-0000-4000-8000-000000000001';
  if (select count(*) from public.subscription_paid_periods where order_id=o) <> 2 or second_ends <= first_ends then
    raise exception 'second valid Pix payment did not append one period';
  end if;
end $$;
rollback;
