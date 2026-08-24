-- Execute only against the isolated local privacy_rights_test database.
-- The fixture is completely rolled back so it never persists customer data.
begin;

do $$
declare
  user_a uuid := '10000000-0000-4000-8000-000000000001';
  user_b uuid := '10000000-0000-4000-8000-000000000002';
  owner_a uuid := '10000000-0000-4000-8000-000000000003';
  owner_b uuid := '10000000-0000-4000-8000-000000000004';
  customer_a uuid := '20000000-0000-4000-8000-000000000001';
  customer_b uuid := '20000000-0000-4000-8000-000000000002';
  barbershop_a uuid := '30000000-0000-4000-8000-000000000001';
  barbershop_b uuid := '30000000-0000-4000-8000-000000000002';
  service_a uuid := '40000000-0000-4000-8000-000000000001';
  service_b uuid := '40000000-0000-4000-8000-000000000002';
  professional_a uuid := '50000000-0000-4000-8000-000000000001';
  professional_b uuid := '50000000-0000-4000-8000-000000000002';
  appointment_a uuid := '60000000-0000-4000-8000-000000000001';
  appointment_b uuid := '60000000-0000-4000-8000-000000000002';
  deletion_protocol text;
  repeated_protocol text;
  export_payload jsonb;
  old_claims text;
  fresh_claims text;
  rejected boolean := false;
begin
  if to_regclass('public.customer_privacy_requests') is null then
    raise exception 'customer_privacy_requests must exist before privacy requests can be handled';
  end if;

  if pg_get_function_arguments('public.export_my_customer_data()'::regprocedure) <> ''
     or pg_get_function_arguments('public.anonymize_my_customer_account()'::regprocedure) <> '' then
    raise exception 'privacy RPCs must not receive customer_id or another caller-supplied subject';
  end if;

  if has_function_privilege('anon', 'public.export_my_customer_data()', 'execute')
     or has_function_privilege('anon', 'public.anonymize_my_customer_account()', 'execute') then
    raise exception 'anon must not execute customer privacy RPCs';
  end if;

  if not has_function_privilege('authenticated', 'public.export_my_customer_data()', 'execute')
     or not has_function_privilege('authenticated', 'public.anonymize_my_customer_account()', 'execute')
     or not has_table_privilege('authenticated', 'public.customer_privacy_requests', 'select') then
    raise exception 'authenticated grants are incomplete';
  end if;

  if has_table_privilege('authenticated', 'public.customer_privacy_requests', 'insert')
     or has_table_privilege('authenticated', 'public.customer_privacy_requests', 'update')
     or has_table_privilege('authenticated', 'public.customer_privacy_requests', 'delete') then
    raise exception 'authenticated must have read-only access to customer privacy protocols';
  end if;

  alter table public.barbershops disable trigger user;
  alter table public.appointments disable trigger user;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (user_a, 'authenticated', 'authenticated', 'privacy-fixture-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    (user_b, 'authenticated', 'authenticated', 'privacy-fixture-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    (owner_a, 'authenticated', 'authenticated', 'privacy-owner-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    (owner_b, 'authenticated', 'authenticated', 'privacy-owner-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

  insert into public.customers (id, auth_user_id, name, email, phone, phone_normalized)
  values
    (customer_a, user_a, 'Fixture Customer A', 'privacy-fixture-a@example.test', '11999990001', '11999990001'),
    (customer_b, user_b, 'Fixture Customer B', 'privacy-fixture-b@example.test', '11999990002', '11999990002');

  insert into public.barbershops (id, owner_id, name, slug)
  values
    (barbershop_a, owner_a, 'Fixture Shop A', 'privacy-fixture-shop-a'),
    (barbershop_b, owner_b, 'Fixture Shop B', 'privacy-fixture-shop-b');

  insert into public.services (id, barbershop_id, name, price, duration_minutes)
  values
    (service_a, barbershop_a, 'Fixture service A', 65.00, 30),
    (service_b, barbershop_b, 'Fixture service B', 75.00, 45);

  insert into public.professionals (id, barbershop_id, name)
  values
    (professional_a, barbershop_a, 'Fixture professional A'),
    (professional_b, barbershop_b, 'Fixture professional B');

  insert into public.barbershop_customers (barbershop_id, customer_id)
  values (barbershop_a, customer_a), (barbershop_b, customer_b);

  insert into public.appointments (
    id, barbershop_id, professional_id, service_id, service_ids,
    customer_id, customer_global_id, customer_name, customer_phone, customer_email,
    starts_at, ends_at, status, notes,
    service_name_snapshot, service_price_snapshot, duration_minutes_snapshot, professional_name_snapshot
  ) values
    (appointment_a, barbershop_a, professional_a, service_a, array[service_a],
      user_a, customer_a, 'Fixture Customer A', '11999990001', 'privacy-fixture-a@example.test',
      now() - interval '2 days', now() - interval '2 days' + interval '30 minutes', 'completed', null,
      'Fixture service A', 65.00, 30, 'Fixture professional A'),
    (appointment_b, barbershop_b, professional_b, service_b, array[service_b],
      user_b, customer_b, 'Fixture Customer B', '11999990002', 'privacy-fixture-b@example.test',
      now() - interval '1 day', now() - interval '1 day' + interval '45 minutes', 'completed', null,
      'Fixture service B', 75.00, 45, 'Fixture professional B');

  alter table public.appointments enable trigger user;
  alter table public.barbershops enable trigger user;

  insert into public.notification_outbox (
    barbershop_id, appointment_id, kind, recipient_email, recipient_user_id, payload, dedupe_key
  ) values
    (barbershop_a, appointment_a, 'new_appointment', 'privacy-fixture-a@example.test', user_a, '{"email":"privacy-fixture-a@example.test"}'::jsonb, 'privacy-fixture-a'),
    (barbershop_b, appointment_b, 'new_appointment', 'privacy-fixture-b@example.test', user_b, '{"email":"privacy-fixture-b@example.test"}'::jsonb, 'privacy-fixture-b');

  insert into public.audit_logs (barbershop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (barbershop_a, user_a, 'privacy_fixture', 'customer', customer_a, '{"email":"privacy-fixture-a@example.test"}'::jsonb);

  insert into public.customer_privacy_requests (customer_id, request_type, status, completed_at, metadata)
  values
    (customer_a, 'DATA_EXPORT', 'COMPLETED', now(), '{"source":"fixture"}'::jsonb),
    (customer_b, 'DATA_EXPORT', 'COMPLETED', now(), '{"source":"fixture"}'::jsonb),
    (customer_b, 'ACCOUNT_DELETION', 'PENDING', null, '{"source":"fixture"}'::jsonb);

  begin
    insert into public.customer_privacy_requests (customer_id, request_type, status, metadata)
    values (customer_b, 'ACCOUNT_DELETION', 'PENDING', '{"source":"fixture"}'::jsonb);
  exception when unique_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'privacy protocol must reject a second open request of the same type';
  end if;

  rejected := false;
  begin
    insert into public.customer_privacy_requests (customer_id, request_type, metadata)
    values (customer_b, 'DATA_EXPORT', '{"email":"privacy-fixture-b@example.test"}'::jsonb);
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'privacy protocol metadata must reject PII-like keys';
  end if;

  old_claims := jsonb_build_object(
    'sub', user_a::text,
    'role', 'authenticated',
    'iat', extract(epoch from now() - interval '20 minutes')::bigint,
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now() - interval '20 minutes')::bigint))
  )::text;
  fresh_claims := jsonb_build_object(
    'sub', user_a::text,
    'role', 'authenticated',
    'iat', extract(epoch from now())::bigint,
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint))
  )::text;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', fresh_claims, true);

  if exists (select 1 from public.customer_privacy_requests where customer_id = customer_b) then
    raise exception 'customer A must not read customer B privacy protocols';
  end if;

  select public.export_my_customer_data() into export_payload;
  if export_payload::text like '%Fixture Customer B%' then
    raise exception 'customer export contains another customer name';
  end if;
  if export_payload::text like '%privacy-fixture-b@example.test%' then
    raise exception 'customer export contains another customer email';
  end if;
  if export_payload::text like '%11999990002%' then
    raise exception 'customer export contains another customer phone';
  end if;
  if export_payload ? 'audit_logs' or export_payload ? 'commissions'
     or export_payload ? 'staff' or export_payload ? 'employee_data' then
    raise exception 'customer export contains restricted internal data';
  end if;
  if export_payload #>> '{profile,email}' <> 'privacy-fixture-a@example.test'
     or export_payload #>> '{appointments,0,price}' <> '65.00' then
    raise exception 'customer export is missing the authenticated customer data or its own financial snapshot';
  end if;

  perform set_config('request.jwt.claims', old_claims, true);
  rejected := false;
  begin
    perform public.anonymize_my_customer_account();
  exception when sqlstate 'P0001' then
    rejected := true;
  end;
  if not rejected then
    raise exception 'an old session must not allow anonymization';
  end if;

  perform set_config('request.jwt.claims', fresh_claims, true);
  select public_protocol into deletion_protocol from public.anonymize_my_customer_account();
  if deletion_protocol is null then
    raise exception 'a recent authenticated customer must receive a deletion protocol';
  end if;

  select public_protocol into repeated_protocol from public.anonymize_my_customer_account();
  if repeated_protocol is distinct from deletion_protocol then
    raise exception 'anonymization must be idempotent and return the original protocol';
  end if;

  execute 'reset role';

  if exists (
    select 1 from public.customers
    where id = customer_a
      and (email is not null or name <> 'Cliente removido' or phone <> '0000000000' or phone_normalized <> '0000000000')
  ) then
    raise exception 'customer PII was not removed';
  end if;

  if exists (
    select 1 from public.appointments
    where id = appointment_a
      and (customer_id is not null or customer_global_id is not null or customer_email is not null
           or customer_name <> 'Cliente removido' or customer_phone <> '0000000000'
           or notes is not null or cancel_reason is not null)
  ) then
    raise exception 'appointment PII was not removed';
  end if;

  if not exists (
    select 1 from public.appointments
    where id = appointment_a
      and service_name_snapshot = 'Fixture service A'
      and service_price_snapshot = 65.00
      and duration_minutes_snapshot = 30
      and professional_name_snapshot = 'Fixture professional A'
  ) then
    raise exception 'required financial snapshot was changed by anonymization';
  end if;

  if exists (
    select 1 from public.notification_outbox
    where appointment_id = appointment_a
      and (recipient_email is not null or recipient_user_id is not null or payload <> '{}'::jsonb)
  ) then
    raise exception 'notification PII was not removed';
  end if;

  if exists (
    select 1 from public.audit_logs
    where barbershop_id = barbershop_a
      and action = 'privacy_fixture'
      and (actor_user_id is not null or entity_id is not null or metadata <> '{}'::jsonb)
  ) then
    raise exception 'privacy-related audit PII was not removed';
  end if;

  if not exists (
    select 1 from public.customers
    where id = customer_b and name = 'Fixture Customer B'
      and email = 'privacy-fixture-b@example.test' and phone = '11999990002'
  ) or not exists (
    select 1 from public.appointments
    where id = appointment_b and customer_id = user_b and customer_global_id = customer_b
      and customer_email = 'privacy-fixture-b@example.test'
  ) or not exists (
    select 1 from public.notification_outbox
    where appointment_id = appointment_b and recipient_email = 'privacy-fixture-b@example.test'
  ) then
    raise exception 'anonymization changed customer B or another tenant data';
  end if;

  if (select count(*) from public.customer_privacy_requests
      where customer_id = customer_a and request_type = 'ACCOUNT_DELETION' and status = 'COMPLETED') <> 1 then
    raise exception 'anonymization must leave one completed deletion protocol';
  end if;

  execute 'reset role';
end;
$$;

rollback;
