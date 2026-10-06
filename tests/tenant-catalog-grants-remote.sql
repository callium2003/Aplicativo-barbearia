-- Regressão remota A1/A2: valida isolamento entre dois tenants no schema real.
-- Todos os dados são sintéticos e a transação é sempre descartada com ROLLBACK.

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('10000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'owner-a-remote@example.test', now(), now()),
  ('10000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'owner-b-remote@example.test', now(), now()),
  ('10000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'stranger-remote@example.test', now(), now());

insert into public.barbershops (
  id, owner_id, name, slug, active, notification_email, phone,
  initial_registration_completed
) values
  (
    '30000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-0000000000a1',
    'Remote Fixture A', 'remote-fixture-a-20261003', true,
    'secret-a-remote@example.test', '11999990001', true
  ),
  (
    '30000000-0000-4000-8000-0000000000b1',
    '10000000-0000-4000-8000-0000000000b1',
    'Remote Fixture B', 'remote-fixture-b-20261003', true,
    'secret-b-remote@example.test', '11999990002', true
  );

insert into public.professionals (
  id, barbershop_id, name, phone, active, contact_email, schedule_mode
) values
  (
    '50000000-0000-4000-8000-0000000000a1',
    '30000000-0000-4000-8000-0000000000a1',
    'Remote Professional A', 'phone-secret-a', true,
    'prof-a-secret-remote@example.test', 'custom'
  ),
  (
    '50000000-0000-4000-8000-0000000000b1',
    '30000000-0000-4000-8000-0000000000b1',
    'Remote Professional B', 'phone-secret-b', true,
    'prof-b-secret-remote@example.test', 'barbershop'
  );

do $$
declare
  owner_a constant uuid := '10000000-0000-4000-8000-0000000000a1';
  owner_b constant uuid := '10000000-0000-4000-8000-0000000000b1';
  stranger constant uuid := '10000000-0000-4000-8000-0000000000c1';
  shop_a constant uuid := '30000000-0000-4000-8000-0000000000a1';
  shop_b constant uuid := '30000000-0000-4000-8000-0000000000b1';
  prof_a constant uuid := '50000000-0000-4000-8000-0000000000a1';
  prof_b constant uuid := '50000000-0000-4000-8000-0000000000b1';
  value_text text;
  value_count integer;
  rejected boolean;
begin
  if has_table_privilege('authenticated', 'public.barbershops', 'select')
     or has_column_privilege('authenticated', 'public.barbershops', 'owner_id', 'select')
     or has_column_privilege('authenticated', 'public.barbershops', 'notification_email', 'select') then
    raise exception 'authenticated ainda possui leitura ampla ou sensível em barbershops';
  end if;

  if has_table_privilege('authenticated', 'public.professionals', 'select')
     or has_column_privilege('authenticated', 'public.professionals', 'phone', 'select')
     or has_column_privilege('authenticated', 'public.professionals', 'contact_email', 'select')
     or has_column_privilege('authenticated', 'public.professionals', 'schedule_mode', 'select') then
    raise exception 'authenticated ainda possui leitura ampla ou sensível em professionals';
  end if;

  if has_function_privilege('anon', 'public.get_barbershop_notification_email(uuid)', 'execute')
     or has_function_privilege('anon', 'public.list_managed_professionals(uuid)', 'execute')
     or has_function_privilege('anon', 'public.get_professional_details(uuid)', 'execute')
     or has_function_privilege('anon', 'public.get_professional_schedule_mode(uuid)', 'execute')
     or has_function_privilege('anon', 'public.my_owned_barbershop()', 'execute') then
    raise exception 'anon recebeu execução de RPC operacional';
  end if;

  if not has_function_privilege('authenticated', 'public.get_barbershop_notification_email(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.list_managed_professionals(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.get_professional_details(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.get_professional_schedule_mode(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.my_owned_barbershop()', 'execute') then
    raise exception 'authenticated perdeu execução de RPC operacional';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_a::text, 'role', 'authenticated')::text,
    true
  );

  if public.get_barbershop_notification_email(shop_a) <> 'secret-a-remote@example.test' then
    raise exception 'owner A não recebeu o próprio notification_email';
  end if;

  select count(*) into value_count from public.list_managed_professionals(shop_a);
  if value_count <> 1 then
    raise exception 'owner A não recebeu o próprio profissional';
  end if;

  select contact_email into value_text from public.get_professional_details(prof_a);
  if value_text <> 'prof-a-secret-remote@example.test' then
    raise exception 'owner A não recebeu os próprios detalhes profissionais';
  end if;

  if public.get_professional_schedule_mode(prof_a) <> 'custom' then
    raise exception 'owner A não recebeu o próprio schedule_mode';
  end if;

  select count(*) into value_count from public.my_owned_barbershop() where id = shop_a;
  if value_count <> 1 then
    raise exception 'my_owned_barbershop não retornou o tenant A';
  end if;

  rejected := false;
  begin
    perform public.get_barbershop_notification_email(shop_b);
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'owner A leu notification_email do tenant B';
  end if;

  rejected := false;
  begin
    perform 1 from public.get_professional_details(prof_b);
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'owner A leu detalhes do profissional do tenant B';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_b::text, 'role', 'authenticated')::text,
    true
  );

  if public.get_barbershop_notification_email(shop_b) <> 'secret-b-remote@example.test' then
    raise exception 'owner B não recebeu o próprio notification_email';
  end if;

  rejected := false;
  begin
    perform public.get_professional_schedule_mode(prof_a);
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'owner B leu schedule_mode do tenant A';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', stranger::text, 'role', 'authenticated')::text,
    true
  );

  select count(*) into value_count from public.my_owned_barbershop();
  if value_count <> 0 then
    raise exception 'usuário sem tenant recebeu uma barbearia';
  end if;

  rejected := false;
  begin
    perform public.get_barbershop_notification_email(shop_a);
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'usuário sem tenant leu dados sensíveis do tenant A';
  end if;
end;
$$;

rollback;
