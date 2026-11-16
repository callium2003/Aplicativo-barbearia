-- Isolated fixtures only; no remote data or access changes.
begin;
insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','financial-owner@example.test',now(),now()),
 ('f1000000-0000-4000-8000-000000000002','authenticated','authenticated','financial-admin@example.test',now(),now());
insert into public.barbershops(id,owner_id,name,slug,active) values
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Financial fixture','financial-fixture',true);
insert into private.platform_administrators(user_id,role) values ('f1000000-0000-4000-8000-000000000002','platform_owner');

do $$
declare o uuid; a jsonb; b jsonb; ending timestamptz; snapshot jsonb;
begin
 o:=public.create_subscription_order('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001',gen_random_uuid(),
   'simple-trimestral','Simple',3,21990,2,3,'financial-fixture');
 update public.subscription_orders set provider_account_id='financial_account',provider_checkout_id='checkout_financial',status='CONFIRMED' where id=o;
 select current_period_ends_at into ending from public.barbershop_subscriptions where barbershop_id='f2000000-0000-4000-8000-000000000001';
 a:=public.persist_asaas_financial_event('sandbox','financial_account','evt_refund','PAYMENT_PARTIALLY_REFUNDED','pay_financial',o,false);
 snapshot:=jsonb_build_object('paymentId','pay_financial','paymentStatus','PARTIALLY_REFUNDED','amountCents',10995,
  'refundedCents',3000,'pendingRefundCents',500,'refunds','[{"status":"DONE","valueCents":3000},{"status":"PENDING","valueCents":500}]'::jsonb,
  'chargebackStatus',null,'chargebackReason',null,'reviewRequired',false,'externalReference',o,'subscriptionId',null,'checkoutId','checkout_financial');
 perform public.finish_asaas_financial_event('sandbox','financial_account','evt_refund',(a->>'version')::bigint,snapshot);
 if (select refunded_cents from private.subscription_financial_payments where payment_id='pay_financial')<>3000 then raise exception 'refund missing'; end if;
 if (public.persist_asaas_financial_event('sandbox','financial_account','evt_refund','PAYMENT_PARTIALLY_REFUNDED','pay_financial',o,false)->>'state')<>'PROCESSED' then raise exception 'replay not deduplicated'; end if;
 begin
  perform public.persist_asaas_financial_event('sandbox','financial_account','evt_refund','PAYMENT_REFUNDED','pay_other',o,false);
  raise exception 'conflicting event accepted';
 exception when sqlstate '22023' then null; end;
 a:=public.persist_asaas_financial_event('sandbox','financial_account','evt_old','PAYMENT_REFUND_IN_PROGRESS','pay_financial',o,false);
 b:=public.persist_asaas_financial_event('sandbox','financial_account','evt_new','PAYMENT_REFUNDED','pay_financial',o,false);
 snapshot:=snapshot||'{"refundedCents":10995,"pendingRefundCents":0,"refunds":[{"status":"DONE","valueCents":10995}],"paymentStatus":"REFUNDED"}'::jsonb;
 perform public.finish_asaas_financial_event('sandbox','financial_account','evt_new',(b->>'version')::bigint,snapshot);
 perform public.finish_asaas_financial_event('sandbox','financial_account','evt_old',(a->>'version')::bigint,snapshot||'{"refundedCents":100,"refunds":[{"status":"DONE","valueCents":100}]}'::jsonb);
 if (select refunded_cents from private.subscription_financial_payments where payment_id='pay_financial')<>10995 then raise exception 'stale observation regressed refund'; end if;
 -- Same external payment ID in another account/environment cannot overwrite it.
 a:=public.persist_asaas_financial_event('production','other_account','evt_refund','PAYMENT_REFUNDED','pay_financial',o,false);
 perform public.finish_asaas_financial_event('production','other_account','evt_refund',(a->>'version')::bigint,snapshot);
 if exists(select 1 from private.subscription_financial_payments where environment='production' and order_id=o) then raise exception 'foreign account linked to order'; end if;
 if (select count(*) from private.subscription_financial_events where environment='sandbox' and event_id='evt_refund')<>1 then raise exception 'event duplicated'; end if;
 if (select status from public.subscription_orders where id=o)<>'CONFIRMED' then raise exception 'financial observation changed order'; end if;
 if (select current_period_ends_at from public.barbershop_subscriptions where barbershop_id='f2000000-0000-4000-8000-000000000001') is distinct from ending then raise exception 'paid access changed'; end if;
 if exists(select 1 from public.subscription_paid_periods where order_id=o) then raise exception 'financial event granted access'; end if;
 if has_table_privilege('authenticated','private.subscription_financial_events','select')
   or has_function_privilege('authenticated','public.persist_asaas_financial_event(text,text,text,text,text,uuid,boolean)','execute') then raise exception 'financial data exposed'; end if;
end $$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
 begin
  perform public.list_platform_financial_events(30,0);
  raise exception 'tenant read platform finances';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 if jsonb_array_length(public.list_platform_financial_events(30,0)->'events')<>4 then raise exception 'admin financial history missing'; end if;
end $$;
reset role;
rollback;
