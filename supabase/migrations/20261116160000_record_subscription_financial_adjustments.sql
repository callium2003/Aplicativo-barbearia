-- EFS §§44.3/48.5.40: financial facts only. Never changes access or contracts.
create sequence private.subscription_financial_version;
revoke all on sequence private.subscription_financial_version from public,anon,authenticated,service_role;

create table private.subscription_financial_events (
 id bigint generated always as identity primary key,
 environment text not null check(environment in ('sandbox','production')),
 account_id text not null check(account_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 event_id text not null check(length(event_id) between 1 and 256 and event_id !~ '\s'),
 event_type text not null check(event_type ~ '^[A-Z][A-Z0-9_]{0,99}$'),
 payment_id text not null check(payment_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 external_reference uuid,
 order_id uuid references public.subscription_orders(id) on delete set null,
 state text not null default 'PENDING' check(state in ('PENDING','PROCESSED','REVIEW_REQUIRED')),
 version bigint not null default 0,
 attempts integer not null default 0,
 review_code text,
 snapshot jsonb,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(environment,account_id,event_id)
);
create index subscription_financial_pending on private.subscription_financial_events(environment,account_id,created_at) where state='PENDING';
create index subscription_financial_event_payment on private.subscription_financial_events(environment,account_id,payment_id);
create table private.subscription_financial_payments (
 environment text not null check(environment in ('sandbox','production')),
 account_id text not null,
 payment_id text not null,
 order_id uuid references public.subscription_orders(id) on delete set null,
 amount_cents bigint not null check(amount_cents>0),
 refunded_cents bigint not null check(refunded_cents>=0),
 pending_refund_cents bigint not null check(pending_refund_cents>=0),
 payment_status text not null,
 chargeback_status text,
 chargeback_reason text,
 version bigint not null,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(environment,account_id,payment_id),
 check(refunded_cents+pending_refund_cents<=amount_cents)
);
alter table private.subscription_financial_events enable row level security;
alter table private.subscription_financial_payments enable row level security;
revoke all on private.subscription_financial_events,private.subscription_financial_payments from public,anon,authenticated,service_role;
revoke all on sequence private.subscription_financial_events_id_seq from public,anon,authenticated,service_role;

create function public.persist_asaas_financial_event(p_environment text,p_account text,p_event_id text,p_event_type text,
 p_payment_id text,p_external_reference uuid,p_recovery_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e private.subscription_financial_events%rowtype;
begin
 if not private.is_service_role() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_environment is null or p_environment not in ('sandbox','production') or p_account is null or p_account !~ '^[A-Za-z0-9_-]{1,128}$'
  or p_event_id is null or length(p_event_id) not between 1 and 256 or p_event_id ~ '\s'
  or p_event_type is null or p_event_type !~ '^[A-Z][A-Z0-9_]{0,99}$'
  or p_payment_id is null or p_payment_id !~ '^[A-Za-z0-9_-]{1,128}$' or p_recovery_only is null then
  raise exception 'Invalid financial event' using errcode='22023';
 end if;
 if p_recovery_only and not exists(select 1 from private.subscription_financial_events where
  environment=p_environment and account_id=p_account and payment_id=p_payment_id) then
  return jsonb_build_object('state','IGNORED');
 end if;
 insert into private.subscription_financial_events(environment,account_id,event_id,event_type,payment_id,external_reference)
 values(p_environment,p_account,p_event_id,p_event_type,p_payment_id,p_external_reference) on conflict do nothing;
 select * into e from private.subscription_financial_events where environment=p_environment and account_id=p_account and event_id=p_event_id for update;
 if (e.event_type,e.payment_id,e.external_reference) is distinct from (p_event_type,p_payment_id,p_external_reference) then
  raise exception 'Financial event conflict' using errcode='22023';
 end if;
 if e.state<>'PENDING' then return jsonb_build_object('state',e.state); end if;
 update private.subscription_financial_events set version=nextval('private.subscription_financial_version'),attempts=attempts+1,updated_at=clock_timestamp()
 where id=e.id returning * into e;
 return jsonb_build_object('state',e.state,'version',e.version);
end $$;

create function public.finish_asaas_financial_event(p_environment text,p_account text,p_event_id text,p_version bigint,p_snapshot jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare e private.subscription_financial_events%rowtype; o public.subscription_orders%rowtype;
 candidates uuid[]; matched uuid; review text; amount bigint; refunded bigint; pending bigint; existing_version bigint;
begin
 if not private.is_service_role() then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into e from private.subscription_financial_events where environment=p_environment and account_id=p_account and event_id=p_event_id for update;
 if not found then raise exception 'Unknown financial event' using errcode='55000'; end if;
 if e.state<>'PENDING' or e.version is distinct from p_version then return true; end if;
 if p_snapshot is null then
  update private.subscription_financial_events set state='REVIEW_REQUIRED',review_code='INVALID_PROVIDER_RESPONSE',updated_at=clock_timestamp() where id=e.id;
  return true;
 end if;
 if jsonb_typeof(p_snapshot)<>'object' or p_snapshot->>'paymentId' is distinct from e.payment_id
  or coalesce(p_snapshot->>'amountCents','') !~ '^[1-9][0-9]{0,14}$'
  or coalesce(p_snapshot->>'refundedCents','') !~ '^[0-9]{1,15}$'
  or coalesce(p_snapshot->>'pendingRefundCents','') !~ '^[0-9]{1,15}$'
  or coalesce(p_snapshot->>'paymentStatus','') !~ '^[A-Z][A-Z0-9_]{0,99}$'
  or jsonb_typeof(p_snapshot->'refunds') is distinct from 'array'
  or jsonb_typeof(p_snapshot->'reviewRequired') is distinct from 'boolean'
  or (p_snapshot-array['paymentId','paymentStatus','amountCents','refundedCents','pendingRefundCents','refunds','chargebackStatus',
    'chargebackReason','reviewRequired','externalReference','subscriptionId','checkoutId'])<>'{}'::jsonb then
  raise exception 'Invalid financial snapshot' using errcode='22023';
 end if;
 amount:=(p_snapshot->>'amountCents')::bigint; refunded:=(p_snapshot->>'refundedCents')::bigint; pending:=(p_snapshot->>'pendingRefundCents')::bigint;
 if refunded+pending>amount or jsonb_array_length(p_snapshot->'refunds')>1000 or exists(
  select 1 from jsonb_array_elements(p_snapshot->'refunds') r where jsonb_typeof(r)<>'object'
   or coalesce(r->>'status','') !~ '^[A-Z][A-Z0-9_]{0,99}$' or coalesce(r->>'valueCents','') !~ '^[1-9][0-9]{0,14}$'
   or (r-array['status','valueCents'])<>'{}'::jsonb) then raise exception 'Invalid refunds' using errcode='22023'; end if;
 if refunded is distinct from (select coalesce(sum((r->>'valueCents')::bigint),0) from jsonb_array_elements(p_snapshot->'refunds') r where r->>'status'='DONE')
  or pending is distinct from (select coalesce(sum((r->>'valueCents')::bigint),0) from jsonb_array_elements(p_snapshot->'refunds') r where r->>'status'='PENDING') then
  raise exception 'Refund totals mismatch' using errcode='22023';
 end if;
 if (p_snapshot->>'externalReference') is not null and (p_snapshot->>'externalReference') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or (p_snapshot->>'checkoutId') is not null and (p_snapshot->>'checkoutId') !~ '^[A-Za-z0-9_-]{1,128}$'
  or (p_snapshot->>'subscriptionId') is not null and (p_snapshot->>'subscriptionId') !~ '^[A-Za-z0-9_-]{1,128}$'
  or (p_snapshot->>'chargebackStatus') is not null and (p_snapshot->>'chargebackStatus') !~ '^[A-Z][A-Z0-9_]{0,99}$'
  or (p_snapshot->>'chargebackReason') is not null and (p_snapshot->>'chargebackReason') !~ '^[A-Z][A-Z0-9_]{0,99}$' then
  raise exception 'Invalid financial references' using errcode='22023';
 end if;
 select array_agg(distinct order_id) into candidates from (
  select order_id from public.subscription_payment_evidence where provider_environment=p_environment and provider_account_id=p_account and provider_payment_id=e.payment_id
  union select order_id from public.subscription_recurring_payment_evidence where provider_environment=p_environment and provider_account_id=p_account and provider_payment_id=e.payment_id
  union select order_id from public.subscription_paid_periods where provider_environment=p_environment and provider_account_id=p_account and provider_payment_id=e.payment_id
 ) linked;
 if coalesce(cardinality(candidates),0)=1 then matched:=candidates[1];
 elsif coalesce(cardinality(candidates),0)>1 then review:='LINK_MISMATCH';
 else
  select id into matched from public.subscription_orders where id=(p_snapshot->>'externalReference')::uuid
   and provider_environment=p_environment and provider_account_id=p_account
   and ((provider_checkout_id is not null and provider_checkout_id=p_snapshot->>'checkoutId')
    or (provider_subscription_id is not null and provider_subscription_id=p_snapshot->>'subscriptionId'));
 end if;
 if matched is not null then
  select * into o from public.subscription_orders where id=matched and provider_environment=p_environment and provider_account_id=p_account;
  if not found or (e.external_reference is not null and e.external_reference<>o.id)
   or (p_snapshot->>'externalReference' is not null and (p_snapshot->>'externalReference')::uuid<>o.id)
   or (p_snapshot->>'checkoutId' is not null and o.provider_checkout_id is not null and p_snapshot->>'checkoutId'<>o.provider_checkout_id)
   or (p_snapshot->>'subscriptionId' is not null and o.provider_subscription_id is not null and p_snapshot->>'subscriptionId'<>o.provider_subscription_id) then
   matched:=null; review:='LINK_MISMATCH';
  end if;
 end if;
 if matched is null then review:='LINK_MISMATCH'; end if;
 if (p_snapshot->>'reviewRequired')::boolean and review is null then review:='UNKNOWN_PROVIDER_STATE'; end if;
 -- A database-issued generation, allocated BEFORE the provider GET, orders concurrent snapshots.
 insert into private.subscription_financial_payments(environment,account_id,payment_id,order_id,amount_cents,refunded_cents,pending_refund_cents,
  payment_status,chargeback_status,chargeback_reason,version)
 values(p_environment,p_account,e.payment_id,matched,amount,refunded,pending,p_snapshot->>'paymentStatus',p_snapshot->>'chargebackStatus',p_snapshot->>'chargebackReason',p_version)
 on conflict(environment,account_id,payment_id) do update set order_id=excluded.order_id,amount_cents=excluded.amount_cents,
  refunded_cents=excluded.refunded_cents,pending_refund_cents=excluded.pending_refund_cents,payment_status=excluded.payment_status,
  chargeback_status=excluded.chargeback_status,chargeback_reason=excluded.chargeback_reason,version=excluded.version,updated_at=clock_timestamp()
 where private.subscription_financial_payments.version<excluded.version;
 update private.subscription_financial_events set state=case when review is null then 'PROCESSED' else 'REVIEW_REQUIRED' end,
  review_code=review,order_id=matched,snapshot=p_snapshot,updated_at=clock_timestamp() where id=e.id;
 if matched is not null then
  perform private.write_audit_log(o.barbershop_id,'subscription.financial_event_recorded','subscription_orders',o.id,
   jsonb_build_object('environment',p_environment,'event',e.event_type,'payment_id',e.payment_id,'refunded_cents',refunded,'pending_refund_cents',pending));
 end if;
 return true;
end $$;

create function public.list_platform_financial_events(p_limit integer default 30,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.is_active_platform_owner() then raise exception 'Acesso interno não autorizado' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid pagination' using errcode='22023'; end if;
 select jsonb_build_object('events',coalesce(jsonb_agg(row_to_json(rows)),'[]'::jsonb),
  'total',(select count(*) from private.subscription_financial_events),
  'pendingCount',(select count(*) from private.subscription_financial_events where state='PENDING')) into result from (
  select e.id,e.environment,e.event_type,e.payment_id,e.state,e.review_code,e.created_at,e.updated_at,e.attempts,
   s.name as barbershop_name,e.order_id,e.snapshot,
   p.amount_cents,p.refunded_cents,p.pending_refund_cents,p.chargeback_status,p.chargeback_reason
  from private.subscription_financial_events e left join public.subscription_orders o on o.id=e.order_id
  left join public.barbershops s on s.id=o.barbershop_id
  left join private.subscription_financial_payments p on p.environment=e.environment and p.account_id=e.account_id and p.payment_id=e.payment_id
  order by e.created_at desc,e.id desc limit p_limit offset p_offset
 ) rows;
 return result;
end $$;

create function public.list_pending_asaas_financial_events(p_environment text,p_account text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_service_role() then raise exception 'Forbidden' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(row_to_json(rows)),'[]'::jsonb) from (
  select event_id,event_type,payment_id,external_reference from private.subscription_financial_events
  where environment=p_environment and account_id=p_account and state='PENDING' order by updated_at limit 5
 ) rows);
end $$;

-- Exact payment projection. A cancelled checkout is not evidence of a refund.
create function public.get_subscription_financial_states(p_order_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_service_role() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_order_ids is null or cardinality(p_order_ids)>1000 then raise exception 'Invalid order selection' using errcode='22023'; end if;
 return (select coalesce(jsonb_agg(row_to_json(rows)),'[]'::jsonb) from (
  select order_id,payment_id,amount_cents,refunded_cents,pending_refund_cents,chargeback_status
  from private.subscription_financial_payments where order_id=any(p_order_ids)
 ) rows);
end $$;

revoke all on function public.persist_asaas_financial_event(text,text,text,text,text,uuid,boolean) from public,anon,authenticated,service_role;
revoke all on function public.finish_asaas_financial_event(text,text,text,bigint,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.list_pending_asaas_financial_events(text,text) from public,anon,authenticated,service_role;
revoke all on function public.get_subscription_financial_states(uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.list_platform_financial_events(integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_financial_event(text,text,text,text,text,uuid,boolean) to service_role;
grant execute on function public.finish_asaas_financial_event(text,text,text,bigint,jsonb) to service_role;
grant execute on function public.list_pending_asaas_financial_events(text,text) to service_role;
grant execute on function public.get_subscription_financial_states(uuid[]) to service_role;
grant execute on function public.list_platform_financial_events(integer,integer) to authenticated;
notify pgrst,'reload schema';
