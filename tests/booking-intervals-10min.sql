-- Comprehensive 10-minute interval availability & booking validation test suite.
-- All fixtures run inside a transaction and are discarded by ROLLBACK.

begin;

-- Fixture setup
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('b1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'customer-10min@example.test', now(), now()),
  ('b1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner1-10min@example.test', now(), now()),
  ('b1000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'owner2-10min@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'Shop 10min', 'shop-10min-test', true),
  ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'Shop 2 10min', 'shop-2-10min-test', true);

insert into public.professionals (id, barbershop_id, name, active) values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Barber 1', true),
  ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'Barber 2', true),
  ('b3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 'Barber 3 (Shop 2)', true);

insert into public.services (id, barbershop_id, name, price, duration_minutes, active) values
  ('b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Corte 20m', 30, 20, true),
  ('b4000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'Barba 30m', 40, 30, true),
  ('b4000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'Combo 50m', 70, 50, true),
  ('b4000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', 'Corte Shop2', 35, 20, true);

insert into public.business_hours (barbershop_id, weekday, opens_at, closes_at, is_closed)
select shop_id, days.weekday::smallint, '08:00', '18:00', false
from (values ('b2000000-0000-0000-0000-000000000001'::uuid), ('b2000000-0000-0000-0000-000000000002'::uuid)) shops(shop_id)
cross join generate_series(0, 6) as days(weekday);

insert into public.professional_hours (professional_id, weekday, opens_at, closes_at, is_closed)
select prof_id, days.weekday::smallint, '08:00', '18:00', false
from (values
  ('b3000000-0000-0000-0000-000000000001'::uuid),
  ('b3000000-0000-0000-0000-000000000002'::uuid),
  ('b3000000-0000-0000-0000-000000000003'::uuid)
) profs(prof_id)
cross join generate_series(0, 6) as days(weekday);

-- Barber 1 break from 12:00 to 13:00
insert into public.professional_breaks (professional_id, weekday, starts_at, ends_at)
select 'b3000000-0000-0000-0000-000000000001'::uuid, days.weekday::smallint, '12:00', '13:00'
from generate_series(0, 6) as days(weekday);

-- Target date for testing: tomorrow
do $$
declare
  v_test_date date := (now() at time zone 'America/Sao_Paulo')::date + 1;
  v_starts_0900 timestamptz := (v_test_date + time '09:00') at time zone 'America/Sao_Paulo';
  v_starts_1500 timestamptz := (v_test_date + time '15:00') at time zone 'America/Sao_Paulo';
  v_starts_1530 timestamptz := (v_test_date + time '15:30') at time zone 'America/Sao_Paulo';
  v_count integer;
begin
  -- Barber 1 time block from 15:00 to 15:30
  insert into public.professional_time_blocks (professional_id, starts_at, ends_at, reason)
  values ('b3000000-0000-0000-0000-000000000001', v_starts_1500, v_starts_1530, 'Reunião');

  -- Scenario 1: 20-minute service
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time in ('08:00', '08:10', '08:20', '08:30', '08:40', '08:50');
  if v_count <> 6 then raise exception 'Scenario 1 failed: expected 6 10-minute slots between 08:00 and 08:50, got %', v_count; end if;

  -- Scenario 2: 30-minute service
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000002'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time in ('08:00', '08:10', '08:20', '08:30', '08:40');
  if v_count <> 5 then raise exception 'Scenario 2 failed: expected 5 10-minute slots between 08:00 and 08:40, got %', v_count; end if;

  -- Scenario 3: Combination of 50 minutes (20m + 30m)
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid, 'b4000000-0000-0000-0000-000000000002'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '08:10';
  if v_count <> 1 then raise exception 'Scenario 3 failed: 50m combo should generate 08:10 slot'; end if;

  -- Scenario 4: Combination of 70 minutes (20m + 50m)
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid, 'b4000000-0000-0000-0000-000000000003'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '08:10';
  if v_count <> 1 then raise exception 'Scenario 4 failed: 70m combo should generate 08:10 slot'; end if;
end $$;

-- Book an appointment for Barber 1: 09:00 to 09:50 (50 minutes)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select public.book_customer_appointment(
  'b2000000-0000-0000-0000-000000000001',
  array['b4000000-0000-0000-0000-000000000003'::uuid],
  'b3000000-0000-0000-0000-000000000001',
  ((now() at time zone 'America/Sao_Paulo')::date + 1 + time '09:00') at time zone 'America/Sao_Paulo',
  'Cliente 10min',
  '11999991010'
);
reset role;

do $$
declare
  v_test_date date := (now() at time zone 'America/Sao_Paulo')::date + 1;
  v_count integer;
begin
  -- Scenario 5: Next appointment starts EXACTLY at the end of previous (09:50)
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '09:50';
  if v_count <> 1 then raise exception 'Scenario 5 failed: 09:50 slot should be available after 09:00-09:50 appointment'; end if;

  -- Scenario 5b: Slots during 09:00-09:50 appointment (09:00, 09:10, 09:20, 09:30, 09:40) must NOT be available
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time in ('09:00', '09:10', '09:20', '09:30', '09:40');
  if v_count <> 0 then raise exception 'Scenario 5b failed: slots during existing appointment must be rejected'; end if;

  -- Scenario 6: Appointment crossing break (12:00-13:00) must be rejected
  -- 50-minute service starting at 11:20 ends at 12:10 (crosses 12:00 break) -> MUST NOT be returned
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000003'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '11:20';
  if v_count <> 0 then raise exception 'Scenario 6 failed: slot 11:20 crossing 12:00 break must be rejected'; end if;

  -- Scenario 6b: 50-minute service starting at 11:10 ends at 12:00 (exact break start) -> MUST be available
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000003'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '11:10';
  if v_count <> 1 then raise exception 'Scenario 6b failed: slot 11:10 ending at 12:00 break start should be available'; end if;

  -- Scenario 7: Appointment crossing block (15:00-15:30) must be rejected
  -- 50-minute service starting at 14:20 ends at 15:10 (crosses 15:00 block) -> MUST NOT be returned
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000003'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '14:20';
  if v_count <> 0 then raise exception 'Scenario 7 failed: slot 14:20 crossing 15:00 block must be rejected'; end if;

  -- Scenario 8: Appointment exceeding closing time (18:00) must be rejected
  -- 50-minute service starting at 17:20 ends at 18:10 (exceeds 18:00) -> MUST NOT be returned
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000003'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '17:20';
  if v_count <> 0 then raise exception 'Scenario 8 failed: slot 17:20 exceeding closing time 18:00 must be rejected'; end if;

  -- Scenario 8b: 50-minute service starting at 17:10 ends at 18:00 -> MUST be available
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000003'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000001'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '17:10';
  if v_count <> 1 then raise exception 'Scenario 8b failed: slot 17:10 ending at 18:00 closing time should be available'; end if;

  -- Scenario 10: Past start times must not appear
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', (now() at time zone 'America/Sao_Paulo')::date - 1, array['b4000000-0000-0000-0000-000000000001'::uuid]);
  if v_count <> 0 then raise exception 'Scenario 10 failed: past dates must return zero slots'; end if;

  -- Scenario 11: Two professionals remain independent
  -- Barber 1 has appointment 09:00-09:50, Barber 2 does NOT
  select count(*) into v_count
  from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid])
  where professional_id = 'b3000000-0000-0000-0000-000000000002'
    and (starts_at at time zone 'America/Sao_Paulo')::time = '09:00';
  if v_count <> 1 then raise exception 'Scenario 11 failed: Barber 2 should have 09:00 available despite Barber 1 appointment'; end if;

  -- Scenario 12: Barbershops remain isolated
  -- Shop 1 availability should only include Barber 1 and Barber 2
  if exists (
    select 1
    from public.get_public_availability('shop-10min-test', v_test_date, array['b4000000-0000-0000-0000-000000000001'::uuid])
    where professional_id = 'b3000000-0000-0000-0000-000000000003'
  ) then raise exception 'Scenario 12 failed: Shop 1 availability returned Barber 3 from Shop 2'; end if;
end $$;

-- Scenario 9: Attempt conflicting booking (09:30 for Barber 1, overlapping 09:00-09:50) -> MUST BE REJECTED
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_failed boolean := false;
begin
  begin
    perform public.book_customer_appointment(
      'b2000000-0000-0000-0000-000000000001',
      array['b4000000-0000-0000-0000-000000000001'::uuid],
      'b3000000-0000-0000-0000-000000000001',
      ((now() at time zone 'America/Sao_Paulo')::date + 1 + time '09:30') at time zone 'America/Sao_Paulo',
      'Cliente Conflito',
      '11999991011'
    );
  exception when others then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'Scenario 9 failed: conflicting appointment 09:30 unexpectedly succeeded';
  end if;
end $$;
reset role;

rollback;
