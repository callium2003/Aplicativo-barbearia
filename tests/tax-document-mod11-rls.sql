-- Testes isolados de banco para:
-- 1. Validação Módulo 11 de CPF/CNPJ (null, válido, inválido) + isolamento RLS em barbershop_registration_details
-- 2. Permissão authenticated + escopo seguro de anonymize_my_customer_account() + deleteUser completo
-- 3. Persistência de evento Asaas em provider_environment = 'production'

begin;

do $$
declare
  owner_a uuid := 'e1000000-0000-4000-8000-000000000001';
  owner_b uuid := 'e1000000-0000-4000-8000-000000000002';
  cust_a uuid := 'e1000000-0000-4000-8000-000000000003';
  cust_b uuid := 'e1000000-0000-4000-8000-000000000004';
  shop_a uuid := 'e2000000-0000-4000-8000-000000000001';
  shop_b uuid := 'e2000000-0000-4000-8000-000000000002';
  prof_a uuid := 'e3000000-0000-4000-8000-000000000001';
  svc_a uuid := 'e4000000-0000-4000-8000-000000000001';
  c_a uuid := 'e5000000-0000-4000-8000-000000000001';
  c_b uuid := 'e5000000-0000-4000-8000-000000000002';
  appt_a uuid := 'e6000000-0000-4000-8000-000000000001';
  appt_b uuid := 'e6000000-0000-4000-8000-000000000002';
  rejected boolean;
  updated_rows integer;
  del_protocol text;
  persisted_prod boolean;
begin
  -- 1. Verifica permissão de execução de anonymize_my_customer_account()
  if not has_function_privilege('authenticated', 'public.anonymize_my_customer_account()', 'execute') then
    raise exception 'authenticated must have execute on public.anonymize_my_customer_account()';
  end if;
  if has_function_privilege('anon', 'public.anonymize_my_customer_account()', 'execute') then
    raise exception 'anon must not have execute on public.anonymize_my_customer_account()';
  end if;

  insert into auth.users (id, aud, role, email, created_at, updated_at) values
    (owner_a, 'authenticated', 'authenticated', 'mod11-owner-a@example.test', now(), now()),
    (owner_b, 'authenticated', 'authenticated', 'mod11-owner-b@example.test', now(), now()),
    (cust_a, 'authenticated', 'authenticated', 'mod11-cust-a@example.test', now(), now()),
    (cust_b, 'authenticated', 'authenticated', 'mod11-cust-b@example.test', now(), now());

  alter table public.barbershops disable trigger user;
  insert into public.barbershops (id, owner_id, name, slug, active) values
    (shop_a, owner_a, 'Barbearia Mod11 A', 'barbearia-mod11-a', true),
    (shop_b, owner_b, 'Barbearia Mod11 B', 'barbearia-mod11-b', true);
  alter table public.barbershops enable trigger user;

  insert into public.barbershop_subscriptions (barbershop_id, status, plan_code, trial_ends_at) values
    (shop_a, 'active', 'iniciante', now() + interval '30 days'),
    (shop_b, 'active', 'iniciante', now() + interval '30 days');

  -- 2. Testa validação Módulo 11 em barbershop_registration_details como Owner A
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_a::text, 'role', 'authenticated')::text, true);

  -- 2a. Null é aceito
  insert into public.barbershop_registration_details (
    barbershop_id, responsible_name, responsible_phone, tax_document, postal_code,
    address_number, neighborhood, city, state, total_people, attending_professionals, service_positions
  ) values (
    shop_a, 'Owner A', '11999990001', null, '01001000',
    '10', 'Centro', 'São Paulo', 'SP', 2, 1, 1
  );

  -- 2b. CPF válido é aceito
  update public.barbershop_registration_details
  set tax_document = '52998224725'
  where barbershop_id = shop_a;

  -- 2c. CNPJ válido é aceito
  update public.barbershop_registration_details
  set tax_document = '11222333000181'
  where barbershop_id = shop_a;

  -- 2d. CPF com dígito inválido é rejeitado
  rejected := false;
  begin
    update public.barbershop_registration_details
    set tax_document = '52998224724'
    where barbershop_id = shop_a;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'invalid CPF check digit must be rejected';
  end if;

  -- 2e. CNPJ com dígito inválido é rejeitado
  rejected := false;
  begin
    update public.barbershop_registration_details
    set tax_document = '11222333000180'
    where barbershop_id = shop_a;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'invalid CNPJ check digit must be rejected';
  end if;

  -- 2f. Sequência repetida é rejeitada
  rejected := false;
  begin
    update public.barbershop_registration_details
    set tax_document = '11111111111'
    where barbershop_id = shop_a;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'repeated digit CPF must be rejected';
  end if;

  -- 3. Testa isolamento RLS: Owner B não pode ler, inserir ou alterar dados de Owner A
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_b::text, 'role', 'authenticated')::text, true);

  if exists (select 1 from public.barbershop_registration_details where barbershop_id = shop_a) then
    raise exception 'owner B must not read barbershop A registration details';
  end if;

  update public.barbershop_registration_details
  set tax_document = '52998224725'
  where barbershop_id = shop_a;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 0 then
    raise exception 'owner B must not update barbershop A registration details';
  end if;

  rejected := false;
  begin
    insert into public.barbershop_registration_details (
      barbershop_id, responsible_name, responsible_phone, tax_document, postal_code,
      address_number, neighborhood, city, state, total_people, attending_professionals, service_positions
    ) values (
      shop_a, 'Intruder B', '11999990002', '52998224725', '01001000',
      '20', 'Centro', 'São Paulo', 'SP', 1, 1, 1
    );
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'owner B must not insert registration details for barbershop A';
  end if;

  execute 'reset role';

  -- 4. Testa anonymize_my_customer_account() + isolamento de cancelled_by + deleteUser completo
  insert into public.professionals (id, barbershop_id, name) values (prof_a, shop_a, 'Prof A');
  insert into public.services (id, barbershop_id, name, duration_minutes, price) values (svc_a, shop_a, 'Corte A', 30, 50.00);
  insert into public.customers (id, auth_user_id, name, email, phone, phone_normalized) values
    (c_a, cust_a, 'Cliente A', 'mod11-cust-a@example.test', '11911112222', '11911112222'),
    (c_b, cust_b, 'Cliente B Terceiro', 'mod11-cust-b@example.test', '11933334444', '11933334444');

  alter table public.appointments disable trigger user;
  insert into public.appointments (
    id, barbershop_id, professional_id, service_id, service_ids,
    customer_id, customer_global_id, customer_name, customer_phone, customer_email,
    starts_at, ends_at, status, cancelled_by, notes,
    service_name_snapshot, service_price_snapshot, duration_minutes_snapshot, professional_name_snapshot
  ) values
    (appt_a, shop_a, prof_a, svc_a, array[svc_a],
      cust_a, c_a, 'Cliente A', '11911112222', 'mod11-cust-a@example.test',
      now() - interval '2 days', now() - interval '2 days' + interval '30 minutes', 'completed', null, 'Obs A',
      'Corte A', 50.00, 30, 'Prof A'),
    (appt_b, shop_a, prof_a, svc_a, array[svc_a],
      cust_b, c_b, 'Cliente B Terceiro', '11933334444', 'mod11-cust-b@example.test',
      now() - interval '1 day', now() - interval '1 day' + interval '30 minutes', 'cancelled', cust_a, 'Obs confidencial B',
      'Corte A', 50.00, 30, 'Prof A');
  alter table public.appointments enable trigger user;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', cust_a::text,
    'role', 'authenticated',
    'iat', extract(epoch from now())::bigint,
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint))
  )::text, true);

  select public_protocol into del_protocol from public.anonymize_my_customer_account();
  if del_protocol is null then
    raise exception 'customer anonymization must succeed and return protocol';
  end if;

  execute 'reset role';

  -- Agendamento de cust_b deve preservar todos os dados pessoais e zerar apenas cancelled_by
  if not exists (
    select 1 from public.appointments
    where id = appt_b
      and cancelled_by is null
      and customer_id = cust_b
      and customer_global_id = c_b
      and customer_name = 'Cliente B Terceiro'
      and customer_phone = '11933334444'
      and customer_email = 'mod11-cust-b@example.test'
      and notes = 'Obs confidencial B'
  ) then
    raise exception 'anonymizing cust_a must not alter cust_b appointment PII or notes';
  end if;

  -- Simula auth.admin.deleteUser(cust_a) após anonymize_my_customer_account()
  delete from auth.users where id = cust_a;

  -- 5. Testa persist_asaas_checkout_event gravando em provider_environment = 'production'
  persisted_prod := public.persist_asaas_checkout_event(
    'acc_prod_test',
    'evt_prod_test_1',
    'CHECKOUT_PAID',
    'chk_prod_test_1',
    'PAID',
    'production'
  );
  if persisted_prod is not true then
    raise exception 'production checkout event must persist cleanly';
  end if;
  if not exists (
    select 1 from public.asaas_checkout_events
    where provider_account_id = 'acc_prod_test'
      and provider_event_id = 'evt_prod_test_1'
      and provider_environment = 'production'
  ) then
    raise exception 'checkout event must be stored under production environment, not sandbox';
  end if;
end;
$$;

rollback;
