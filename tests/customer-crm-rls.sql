-- Run against the local Supabase PostgreSQL after the CRM migration.
-- All fixtures are inside a transaction and are discarded by ROLLBACK.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'customer-a@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'customer-b@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'customer-c@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'owner-a@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'owner-b@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'manager-a@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'barber-a@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated', 'owner-hidden@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Shop A', 'crm-test-shop-a', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'Shop B', 'crm-test-shop-b', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000105', 'Hidden Shop', 'crm-test-shop-hidden', false);
insert into public.professionals (id, barbershop_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Barber A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Barber B'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Hidden Barber');
insert into public.services (id, barbershop_id, name, price, duration_minutes) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Corte A', 50, 30),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Corte B', 60, 30),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Hidden Corte', 70, 30);
insert into public.business_hours (barbershop_id, weekday, opens_at, closes_at)
select shop_id, days.weekday::smallint, '08:00', '20:00'
from (values ('10000000-0000-0000-0000-000000000001'::uuid), ('10000000-0000-0000-0000-000000000002'::uuid)) shops(shop_id)
cross join generate_series(0, 6) as days(weekday);
insert into public.professional_hours (professional_id, weekday, opens_at, closes_at)
select professional_id, days.weekday::smallint, '08:00', '20:00'
from (values ('20000000-0000-0000-0000-000000000001'::uuid), ('20000000-0000-0000-0000-000000000002'::uuid), ('20000000-0000-0000-0000-000000000003'::uuid)) professionals(professional_id)
cross join generate_series(0, 6) as days(weekday);
insert into public.team_members (barbershop_id, user_id, professional_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', null, 'manager'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000001', 'barber');
insert into public.customers (id, auth_user_id, name, email, phone, phone_normalized) values
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Cliente C', 'customer-c@example.test', '(11) 99999-0003', '11999990003');

-- A customer books Shop A without marketing, then Shop B with both opt-ins.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  if has_function_privilege('authenticated', 'public.sync_customer_for_appointment()'::regprocedure, 'execute') then
    raise exception 'authenticated can execute the internal customer trigger';
  end if;
end $$;
select public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 2 + time '12:00') at time zone 'America/Sao_Paulo', 'Cliente A', '(11) 99999-0001', false, false);
select public.book_customer_appointment('10000000-0000-0000-0000-000000000002', array['30000000-0000-0000-0000-000000000002'::uuid], '20000000-0000-0000-0000-000000000002', ((now() at time zone 'America/Sao_Paulo')::date + 3 + time '12:00') at time zone 'America/Sao_Paulo', 'Cliente A', '(11) 99999-0001', true, true, 'forged-version', 'forged-source');
reset role;

-- Owners, managers and barbers cannot make a customer booking at their own
-- barbershop. This must hold in the database, not only in the page UI.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$ begin
  perform public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 7 + time '12:00') at time zone 'America/Sao_Paulo', 'Owner A', '(11) 99999-0101');
  raise exception 'owner self-booking unexpectedly succeeded';
exception when sqlstate 'P0001' then null;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
do $$ begin
  perform public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 7 + time '13:00') at time zone 'America/Sao_Paulo', 'Manager A', '(11) 99999-0103');
  raise exception 'manager self-booking unexpectedly succeeded';
exception when sqlstate 'P0001' then null;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
do $$ begin
  perform public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 7 + time '14:00') at time zone 'America/Sao_Paulo', 'Barber A', '(11) 99999-0104');
  raise exception 'barber self-booking unexpectedly succeeded';
exception when sqlstate 'P0001' then null;
end $$;
reset role;

do $$
begin
  if (select count(*) from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') <> 1 then raise exception 'expected one global customer'; end if;
  if (select count(*) from public.barbershop_customers where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001')) < 2 then raise exception 'expected the customer in two barbershops'; end if;
  if exists (select 1 from public.customer_consents where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') and granted = false) then raise exception 'unchecked marketing must not create a denial event'; end if;
  if (select count(*) from public.customer_consents where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') and granted) <> 2 then raise exception 'barbershop and platform consent must be separate'; end if;
  if exists (select 1 from public.customer_consents where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') and (consent_version <> '1.0' or source <> 'booking_form')) then raise exception 'booking consent provenance was supplied by the client'; end if;
  if not exists (select 1 from public.appointment_services aps join public.appointments a on a.id = aps.appointment_id where a.customer_id = '00000000-0000-0000-0000-000000000001') then raise exception 'service snapshot missing'; end if;
end $$;

-- Explicit unauthorized DML: the customer cannot transfer identity, delete
-- CRM data, change immutable consent events, or link another customer.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  update public.customers set auth_user_id = '00000000-0000-0000-0000-000000000002'
  where auth_user_id = '00000000-0000-0000-0000-000000000001';
  raise exception 'customer identity transfer unexpectedly succeeded';
exception when others then null;
end $$;
do $$ begin
  insert into public.barbershop_customers (barbershop_id, customer_id)
  values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003');
  raise exception 'arbitrary customer relationship unexpectedly succeeded';
exception when others then null;
end $$;
do $$
declare
  v_inserted boolean := false;
begin
  begin
    insert into public.customer_consents (customer_id, barbershop_id, consent_type, granted, consent_version, source, granted_at)
    values ((select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001'), '10000000-0000-0000-0000-000000000001', 'BARBERSHOP_MARKETING', true, '1.0', 'booking_form', now());
    v_inserted := true;
  exception when others then null;
  end;
  if v_inserted then raise exception 'direct consent event unexpectedly succeeded'; end if;
end $$;
do $$
begin
  delete from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001';
  if found then raise exception 'customer delete unexpectedly succeeded'; end if;
  delete from public.barbershop_customers where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001');
  if found then raise exception 'relationship delete unexpectedly succeeded'; end if;
  update public.customer_consents set source = 'tampered' where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001');
  if found then raise exception 'consent update unexpectedly succeeded'; end if;
  delete from public.customer_consents where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001');
  if found then raise exception 'consent delete unexpectedly succeeded'; end if;
end $$;
reset role;
do $$ begin
  if (select auth_user_id from public.customers where id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001')) <> '00000000-0000-0000-0000-000000000001'::uuid then raise exception 'customer identity changed'; end if;
  if exists (select 1 from public.barbershop_customers where customer_id = '40000000-0000-0000-0000-000000000003') then raise exception 'arbitrary relationship persisted'; end if;
end $$;

-- The pre-existing exclusion constraint still rejects a competing reservation.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  perform public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 2 + time '12:00') at time zone 'America/Sao_Paulo', 'Cliente A', '(11) 99999-0001');
  raise exception 'expected competing appointment to fail';
exception when others then null;
end $$;
reset role;
do $$ begin if (select count(*) from public.appointments where barbershop_id = '10000000-0000-0000-0000-000000000001' and starts_at::date = ((now() at time zone 'America/Sao_Paulo')::date + 2)) <> 1 then raise exception 'booking conflict protection changed'; end if; end $$;

-- A failed appointment validates after the CRM trigger and must leave no customer behind.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ begin
  perform public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000002', ((now() at time zone 'America/Sao_Paulo')::date + 4 + time '12:00') at time zone 'America/Sao_Paulo', 'Cliente B', '(11) 99999-0002');
  raise exception 'expected invalid professional to fail';
exception when others then
  null;
end $$;
reset role;

do $$ begin
  if exists (select 1 from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000002') then raise exception 'failed booking left a partial customer'; end if;
end $$;

-- Complete the first booking.  Add cancelled and no-show bookings; neither may affect revenue.
update public.appointments set status = 'completed' where barbershop_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 5 + time '12:00') at time zone 'America/Sao_Paulo', 'Cliente A', '(11) 99999-0001');
select public.book_customer_appointment('10000000-0000-0000-0000-000000000001', array['30000000-0000-0000-0000-000000000001'::uuid], '20000000-0000-0000-0000-000000000001', ((now() at time zone 'America/Sao_Paulo')::date + 6 + time '12:00') at time zone 'America/Sao_Paulo', 'Cliente A', '(11) 99999-0001');
select public.revoke_customer_marketing_consent('BARBERSHOP_MARKETING', '10000000-0000-0000-0000-000000000002', 'forged-version', 'forged-source');
select public.revoke_customer_marketing_consent('PLATFORM_MARKETING', null, 'forged-version', 'forged-source');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
update public.appointments set status = 'no_show' where starts_at::date = ((now() at time zone 'America/Sao_Paulo')::date + 5);
update public.appointments set status = 'cancelled' where starts_at::date = ((now() at time zone 'America/Sao_Paulo')::date + 6);

do $$
begin
  if (select count(*) from public.customer_consents where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') and not granted) <> 2 then raise exception 'each consent must revoke independently'; end if;
  if exists (select 1 from public.customer_consents where customer_id = (select id from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') and not granted and (consent_version <> '1.0' or source <> 'customer_settings')) then raise exception 'revocation provenance was supplied by the client'; end if;
  if (select completed_revenue_total from public.barbershop_customer_history where barbershop_id = '10000000-0000-0000-0000-000000000001' limit 1) <> 50 then raise exception 'only completed revenue belongs in history'; end if;
  if (select first_appointment_at from public.barbershop_customer_history where barbershop_id = '10000000-0000-0000-0000-000000000001' limit 1) <> (((now() at time zone 'America/Sao_Paulo')::date + 2 + time '12:00') at time zone 'America/Sao_Paulo') then raise exception 'first appointment date is incorrect'; end if;
  if (select last_appointment_at from public.barbershop_customer_history where barbershop_id = '10000000-0000-0000-0000-000000000001' limit 1) <> (((now() at time zone 'America/Sao_Paulo')::date + 6 + time '12:00') at time zone 'America/Sao_Paulo') then raise exception 'last appointment date is incorrect'; end if;
  if exists (select 1 from public.barbershop_customer_history where customer_id = '40000000-0000-0000-0000-000000000003') then raise exception 'customer without appointments appeared in history'; end if;
end $$;

-- Tenant and role isolation: Owner/manager A can read A only; barber and anon cannot read CRM.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$ begin if exists (select 1 from public.barbershop_customers where barbershop_id = '10000000-0000-0000-0000-000000000002') then raise exception 'owner A accessed shop B'; end if; end $$;
do $$ begin if exists (select 1 from public.customer_consents where consent_type = 'PLATFORM_MARKETING') then raise exception 'owner A accessed platform consent'; end if; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
do $$ begin if not exists (select 1 from public.barbershop_customers where barbershop_id = '10000000-0000-0000-0000-000000000001') then raise exception 'manager A cannot read shop A'; end if; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
do $$ begin if exists (select 1 from public.barbershop_customers) then raise exception 'barber accessed CRM'; end if; end $$;
do $$ begin if exists (select 1 from public.customer_consents) or exists (select 1 from public.barbershop_customer_history) then raise exception 'barber accessed consent or history'; end if; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ begin if exists (select 1 from public.customers where auth_user_id = '00000000-0000-0000-0000-000000000001') then raise exception 'customer B accessed customer A'; end if; end $$;
reset role;

set local role anon;
do $$
begin
  if not exists (select 1 from public.public_barbershop_pages where slug = 'crm-test-shop-a') then raise exception 'anon cannot locate active barbershop by slug'; end if;
  if exists (select 1 from public.public_barbershop_pages where slug = 'crm-test-shop-hidden') then raise exception 'anon accessed inactive barbershop'; end if;
  if exists (select 1 from public.public_barbershop_pages where slug = 'crm-test-shop-missing') then raise exception 'anon accessed nonexistent barbershop'; end if;
  if not exists (select 1 from public.public_barbershop_services where barbershop_id = '10000000-0000-0000-0000-000000000001') then raise exception 'anon cannot read active services'; end if;
  if exists (select 1 from public.public_barbershop_services where barbershop_id = '10000000-0000-0000-0000-000000000003') then raise exception 'anon accessed inactive services'; end if;
  if not exists (
    select 1 from public.get_public_availability(
      'crm-test-shop-a',
      (now() at time zone 'America/Sao_Paulo')::date + 7,
      array['30000000-0000-0000-0000-000000000001'::uuid]
    )
  ) then raise exception 'anon cannot read active professional availability'; end if;
  if exists (
    select 1 from public.get_public_availability(
      'crm-test-shop-hidden',
      (now() at time zone 'America/Sao_Paulo')::date + 7,
      array['30000000-0000-0000-0000-000000000003'::uuid]
    )
  ) then raise exception 'anon accessed inactive barbershop availability'; end if;
  if exists (
    select 1 from public.get_public_availability(
      'crm-test-shop-missing',
      (now() at time zone 'America/Sao_Paulo')::date + 7,
      array['30000000-0000-0000-0000-000000000001'::uuid]
    )
  ) then raise exception 'anon accessed nonexistent barbershop availability'; end if;
  if has_table_privilege('anon', 'public.business_hours', 'select')
     or has_table_privilege('anon', 'public.professional_hours', 'select')
     or has_table_privilege('anon', 'public.professional_breaks', 'select')
     or has_table_privilege('anon', 'public.professional_time_blocks', 'select')
     or has_table_privilege('anon', 'public.team_members', 'select') then
    raise exception 'anon can browse operational catalogue inputs';
  end if;
  if has_function_privilege('anon', 'public.sync_customer_for_appointment()'::regprocedure, 'execute') then raise exception 'anon can execute the internal customer trigger'; end if;
end $$;
do $$
begin
  perform public.sync_customer_for_appointment();
  raise exception 'anon invoked the internal customer trigger';
exception
  when insufficient_privilege then null;
end $$;
do $$ begin if exists (select 1 from public.customers) then raise exception 'anon accessed customers'; end if; end $$;
do $$
begin
  if exists (select 1 from public.barbershop_customers) or exists (select 1 from public.customer_consents) then
    raise exception 'anon accessed private CRM data';
  end if;
  begin
    perform 1 from public.barbershop_customer_history limit 1;
    raise exception 'anon accessed private CRM history';
  exception
    when insufficient_privilege then null;
  end;
end $$;
do $$
begin
  if has_function_privilege('anon', 'public.book_customer_appointment(uuid,uuid[],uuid,timestamp with time zone,text,text,boolean,boolean,text,text)'::regprocedure, 'execute') then raise exception 'anon can execute booking RPC'; end if;
  if has_function_privilege('anon', 'public.revoke_customer_marketing_consent(public.customer_consent_type,uuid,text,text)'::regprocedure, 'execute') then raise exception 'anon can execute revoke RPC'; end if;
end $$;
do $$
begin
  perform public.book_customer_appointment(null::uuid, array[]::uuid[], null::uuid, now(), 'Anon', '11999990009', false, false, 'forged-version', 'forged-source');
  raise exception 'anon booking RPC body executed';
exception
  when insufficient_privilege then null;
  when others then raise;
end $$;
do $$
begin
  perform public.revoke_customer_marketing_consent('PLATFORM_MARKETING', null, 'forged-version', 'forged-source');
  raise exception 'anon revoke RPC body executed';
exception
  when insufficient_privilege then null;
  when others then raise;
end $$;
reset role;

rollback;
