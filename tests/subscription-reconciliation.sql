-- Fictitious tenants, transaction rolled back. Real schema and service-role RPCs.
begin;
insert into auth.users (id,aud,role,email,created_at,updated_at) values
 ('b1000000-0000-4000-8000-000000000001','authenticated','authenticated','reconcile@example.test',now(),now());
insert into public.barbershops (id,owner_id,name,slug,active) values
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Reconcile fixture','reconcile-fixture',true);
do $$
declare
 o uuid; second_order uuid; job jsonb; old_job jsonb; result text; ending timestamptz; starting timestamptz; i integer;
 evidence jsonb := '[{"id":"pay_fixture_1","checkoutId":"checkout_fixture_1","status":"CONFIRMED","billingType":"CREDIT_CARD","valueCents":49900,"installment":null,"installmentNumber":null}]';
begin
 if has_function_privilege('authenticated','public.claim_subscription_reconciliation(text)','execute')
   or has_function_privilege('anon','public.finish_subscription_reconciliation(uuid,uuid,text,text,jsonb)','execute') then
   raise exception 'financial processing exposed';
 end if;
 o := public.create_subscription_order('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',gen_random_uuid(),'simple-anual','Simple',12,49900,3,3,'fixture-v1');
 perform public.bind_subscription_sandbox_account(o,'b1000000-0000-4000-8000-000000000001','account_fixture');
 perform public.claim_subscription_checkout(o,'b1000000-0000-4000-8000-000000000001');
 perform public.finish_subscription_checkout(o,'READY','checkout_fixture_1','https://sandbox.asaas.com/000/checkoutSession/show/checkout_fixture_1');
 perform public.persist_asaas_checkout_event('account_fixture','evt_paid','CHECKOUT_PAID','checkout_fixture_1','PAID');
 job := public.claim_subscription_reconciliation('account_fixture');
 if job->>'id' is distinct from o::text then raise exception 'order not claimed'; end if;
 if public.claim_subscription_reconciliation('account_fixture') is not null then raise exception 'lease double claimed'; end if;
 begin
   perform public.finish_subscription_reconciliation(o,gen_random_uuid(),'account_fixture','CONFIRMED',evidence);
   raise exception 'invalid lease accepted';
 exception when sqlstate '55000' then null; end;
 begin
   perform public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'other','CONFIRMED',evidence);
   raise exception 'other account accepted';
 exception when sqlstate '55000' then null; end;
 -- Invalid total must not grant access or consume the lease.
 begin
   perform public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','CONFIRMED',jsonb_set(evidence,'{0,valueCents}','1'));
   raise exception 'wrong amount accepted';
 exception when sqlstate '22023' then null; end;
 if exists(select 1 from public.subscription_paid_periods where order_id=o) then raise exception 'invalid payment granted period'; end if;
 select trial_ends_at into starting from public.barbershop_subscriptions where barbershop_id='b2000000-0000-4000-8000-000000000001';
 result := public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','CONFIRMED',evidence);
 if result <> 'CONFIRMED' then raise exception 'payment not confirmed'; end if;
 if not exists(select 1 from public.audit_logs where entity_id=o and action='subscription.reconciled' and metadata->>'outcome'='CONFIRMED') then raise exception 'financial reconciliation unaudited'; end if;
 select ends_at into ending from public.subscription_paid_periods where order_id=o;
 if ending is distinct from ((starting at time zone 'America/Sao_Paulo') + interval '12 months') at time zone 'America/Sao_Paulo' then raise exception 'trial not preserved'; end if;
 if (select status from public.barbershop_subscriptions where barbershop_id='b2000000-0000-4000-8000-000000000001') <> 'active' then raise exception 'subscription not active'; end if;
 -- Different event for same purchase, and replay of the same event.
 perform public.persist_asaas_checkout_event('account_fixture','evt_paid_again','CHECKOUT_PAID','checkout_fixture_1','PAID');
 perform public.persist_asaas_checkout_event('account_fixture','evt_paid_again','CHECKOUT_PAID','checkout_fixture_1','PAID');
 job := public.claim_subscription_reconciliation('account_fixture');
 perform public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','CONFIRMED',evidence);
 if (select count(*) from public.subscription_paid_periods where order_id=o) <> 1 then raise exception 'duplicate period'; end if;
 if (select current_period_ends_at from public.barbershop_subscriptions where barbershop_id='b2000000-0000-4000-8000-000000000001') is distinct from ending then raise exception 'replay extended access'; end if;
 -- Reversal triggers review; never invents a suspension policy or erases paid access.
 perform public.persist_asaas_checkout_event('account_fixture','evt_refund','CHECKOUT_PAID','checkout_fixture_1','PAID');
 job := public.claim_subscription_reconciliation('account_fixture');
 perform public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','REVIEW_REQUIRED','[]');
 if (select current_period_ends_at from public.barbershop_subscriptions where barbershop_id='b2000000-0000-4000-8000-000000000001') is distinct from ending then raise exception 'review removed paid access'; end if;
 -- A subsequent purchase appends to paid access; expired leases cannot commit.
 second_order := public.create_subscription_order('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',gen_random_uuid(),'simple-anual','Simple',12,49900,3,3,'fixture-v1');
 perform public.bind_subscription_sandbox_account(second_order,'b1000000-0000-4000-8000-000000000001','account_fixture');
 perform public.claim_subscription_checkout(second_order,'b1000000-0000-4000-8000-000000000001');
 perform public.finish_subscription_checkout(second_order,'READY','checkout_fixture_2','https://sandbox.asaas.com/000/checkoutSession/show/checkout_fixture_2');
 old_job := public.claim_subscription_reconciliation('account_fixture');
 update public.subscription_orders set reconciliation_locked_until=clock_timestamp()-interval '1 second' where id=second_order;
 begin
  perform public.finish_subscription_reconciliation(second_order,(old_job->>'lease')::uuid,'account_fixture','RETRY','[]');
  raise exception 'expired lease accepted';
 exception when sqlstate '55000' then null; end;
 job := public.claim_subscription_reconciliation('account_fixture');
 begin
  perform public.finish_subscription_reconciliation(second_order,(old_job->>'lease')::uuid,'account_fixture','RETRY','[]');
  raise exception 'old claimant accepted';
 exception when sqlstate '55000' then null; end;
 evidence := jsonb_set(evidence,'{0,checkoutId}','"checkout_fixture_2"');
 begin
  perform public.finish_subscription_reconciliation(second_order,(job->>'lease')::uuid,'account_fixture','CONFIRMED',evidence);
  raise exception 'payment reused for another purchase';
 exception when sqlstate '22023' then null; end;
 evidence := '[{"id":"pay_fixture_2","checkoutId":"checkout_fixture_2","status":"CONFIRMED","billingType":"CREDIT_CARD","valueCents":24950,"installment":"inst_fixture","installmentNumber":1},{"id":"pay_fixture_3","checkoutId":"checkout_fixture_2","status":"RECEIVED","billingType":"CREDIT_CARD","valueCents":24950,"installment":"inst_fixture","installmentNumber":2}]';
 begin
  perform public.finish_subscription_reconciliation(second_order,(job->>'lease')::uuid,'account_fixture','CONFIRMED',jsonb_set(evidence,'{1,installmentNumber}','1'));
  raise exception 'duplicate installment accepted';
 exception when sqlstate '22023' then null; end;
 -- Arrives after claim, must remain pending after this transaction.
 perform public.persist_asaas_checkout_event('account_fixture','evt_arrived_during_lookup','CHECKOUT_PAID','checkout_fixture_2','PAID');
 perform public.finish_subscription_reconciliation(second_order,(job->>'lease')::uuid,'account_fixture','CONFIRMED',evidence);
 if (select starts_at from public.subscription_paid_periods where order_id=second_order) is distinct from ending then raise exception 'paid period lost'; end if;
 if (select processing_state from public.asaas_checkout_events where provider_event_id='evt_arrived_during_lookup')<>'PENDING' then raise exception 'unseen event acknowledged'; end if;
 if (select count(*) from public.subscription_paid_periods where barbershop_id='b2000000-0000-4000-8000-000000000001')<>2 then raise exception 'incorrect period count'; end if;
 -- A missing event never silently ends retries, even after eight attempts.
 job := public.claim_subscription_reconciliation('account_fixture');
 perform public.finish_subscription_reconciliation(second_order,(job->>'lease')::uuid,'account_fixture','RETRY','[]');
 for i in 1..9 loop
  update public.subscription_orders set reconciliation_next_at=clock_timestamp()-interval '1 second' where id=second_order;
  job := public.claim_subscription_reconciliation('account_fixture');
  if job is null then raise exception 'late settlement no longer reconciles'; end if;
  perform public.finish_subscription_reconciliation(second_order,(job->>'lease')::uuid,'account_fixture','RETRY','[]');
 end loop;
 -- Separate uncertain/closed attempt. No valid financial confirmation is invented.
 o := public.create_subscription_order('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',gen_random_uuid(),'simple-anual','Simple',12,49900,3,3,'fixture-v1');
 perform public.bind_subscription_sandbox_account(o,'b1000000-0000-4000-8000-000000000001','account_fixture');
 perform public.claim_subscription_checkout(o,'b1000000-0000-4000-8000-000000000001');
 perform public.finish_subscription_checkout(o,'READY','checkout_fixture_3','https://sandbox.asaas.com/000/checkoutSession/show/checkout_fixture_3');
 perform public.persist_asaas_checkout_event('account_fixture','evt_expired','CHECKOUT_EXPIRED','checkout_fixture_3','EXPIRED');
 job:=public.claim_subscription_reconciliation('account_fixture');
 perform public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','RETRY','[]');
 if (select status from public.subscription_orders where id=o)<>'CANCELED' then raise exception 'expired checkout trapped owner'; end if;
 -- Indefinite legacy access must remain indefinite and go to review.
 update public.barbershop_subscriptions set current_period_ends_at=null where barbershop_id='b2000000-0000-4000-8000-000000000001';
 perform public.persist_asaas_checkout_event('account_fixture','evt_paid_late','CHECKOUT_PAID','checkout_fixture_3','PAID');
 job:=public.claim_subscription_reconciliation('account_fixture');
 evidence := '[{"id":"pay_fixture_4","checkoutId":"checkout_fixture_3","status":"CONFIRMED","billingType":"CREDIT_CARD","valueCents":49900,"installment":null,"installmentNumber":null}]';
 result:=public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','CONFIRMED',evidence);
 if result<>'REVIEW_REQUIRED' or exists(select 1 from public.subscription_paid_periods where order_id=o) then raise exception 'indefinite access shortened'; end if;
 if (select current_period_ends_at from public.barbershop_subscriptions where barbershop_id='b2000000-0000-4000-8000-000000000001') is not null then raise exception 'indefinite legacy period changed'; end if;
 update public.barbershop_subscriptions set current_period_ends_at=now()+interval '20 days' where barbershop_id='b2000000-0000-4000-8000-000000000001';
 update public.barbershops set active=false where id='b2000000-0000-4000-8000-000000000001';
 perform public.persist_asaas_checkout_event('account_fixture','evt_inactive','CHECKOUT_PAID','checkout_fixture_3','PAID');
 job:=public.claim_subscription_reconciliation('account_fixture');
 result:=public.finish_subscription_reconciliation(o,(job->>'lease')::uuid,'account_fixture','CONFIRMED',evidence);
 if result<>'REVIEW_REQUIRED' or exists(select 1 from public.subscription_paid_periods where order_id=o) then raise exception 'inactive tenant received automatic grant'; end if;
 perform public.persist_asaas_checkout_event('account_fixture','evt_orphan','CHECKOUT_PAID','checkout_unknown','PAID');
 update public.asaas_checkout_events set received_at=clock_timestamp()-interval '11 minutes' where provider_event_id='evt_orphan';
 perform public.claim_subscription_reconciliation('account_fixture');
 if (select processing_state from public.asaas_checkout_events where provider_event_id='evt_orphan')<>'REVIEW_REQUIRED' then raise exception 'orphan event not sent to review'; end if;
end $$;
rollback;
