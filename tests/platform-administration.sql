-- Fundação CullenTech: fixtures locais e descartáveis. Nunca usa o banco remoto.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'platform-owner@example.test', now(), now()),
  ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'tenant-owner@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active)
values ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'Barbearia Plataforma', 'barbearia-plataforma-fixture', true);

insert into private.platform_administrators (user_id, role)
values ('d1000000-0000-4000-8000-000000000001', 'platform_owner');

-- Fatia 1 da consulta ampliada (§24.10.3): segunda barbearia para isolamento,
-- clientes vinculados, cliente anonimizado sem vínculo, consentimentos,
-- profissionais e serviços. Todos fictícios.
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('d1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'other-owner@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active)
values ('d2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003', 'Barbearia Vizinha', 'barbearia-vizinha-fixture', true);

insert into public.barbershop_registration_details (
  barbershop_id, responsible_name, responsible_phone, tax_document, postal_code,
  address_number, neighborhood, city, state, total_people, attending_professionals, service_positions
) values (
  'd2000000-0000-4000-8000-000000000001', 'Responsável Fixture', '11988887777', '12345678000199', '01001000',
  '10', 'Centro', 'São Paulo', 'SP', 3, 2, 2
);

insert into public.customers (id, name, email, phone, phone_normalized) values
  ('d3000000-0000-4000-8000-000000000001', 'Cliente Alfa', 'alfa@example.test', '11911110001', '11911110001'),
  ('d3000000-0000-4000-8000-000000000002', 'Cliente Beta', null, '11911110002', '11911110002'),
  ('d3000000-0000-4000-8000-000000000003', 'Cliente Vizinho', 'vizinho@example.test', '11911110003', '11911110003'),
  ('d3000000-0000-4000-8000-000000000004', 'Cliente removido', null, '0000000000', '0000000000');

insert into public.barbershop_customers (barbershop_id, customer_id) values
  ('d2000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002'),
  ('d2000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000003');

insert into public.customer_consents (customer_id, barbershop_id, consent_type, granted, consent_version, source, granted_at, revoked_at, created_at) values
  ('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'BARBERSHOP_MARKETING', true, 'v1', 'booking', now() - interval '2 days', null, now() - interval '2 days'),
  ('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'BARBERSHOP_MARKETING', false, 'v1', 'customer_portal', null, now() - interval '1 day', now() - interval '1 day'),
  ('d3000000-0000-4000-8000-000000000001', null, 'PLATFORM_MARKETING', true, 'v2', 'booking', now(), null, now()),
  ('d3000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000002', 'BARBERSHOP_MARKETING', true, 'v1', 'booking', now(), null, now());

insert into public.professionals (id, barbershop_id, name, phone, active) values
  ('d4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Profissional Ativo', '11977776666', true),
  ('d4000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'Profissional Inativo', null, false),
  ('d4000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000002', 'Profissional Vizinho', null, true);

insert into public.services (id, barbershop_id, name, price, duration_minutes, active) values
  ('d5000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Corte Fixture', 55, 30, true),
  ('d5000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'Barba Pausada', 35, 20, false),
  ('d5000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000002', 'Corte Vizinho', 40, 30, true);

do $test$
declare
begin
  if not has_schema_privilege('authenticated', 'private', 'usage') then
    raise exception 'fundação da plataforma removeu uso do schema private necessário às políticas existentes';
  end if;

  if has_table_privilege('authenticated', 'private.platform_administrators', 'select')
     or has_table_privilege('authenticated', 'private.platform_administrators', 'insert')
     or has_table_privilege('authenticated', 'private.platform_administrator_audit', 'select')
     or has_table_privilege('anon', 'private.platform_administrators', 'select') then
    raise exception 'papel público recebeu acesso direto à administração da plataforma';
  end if;

  if (select count(*) from private.platform_administrator_audit where administrator_user_id = 'd1000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'concessão externa de platform_owner não deixou auditoria minimizada';
  end if;

  if has_function_privilege('anon', 'public.get_platform_barbershop_overview()', 'execute')
     or not has_function_privilege('authenticated', 'public.get_platform_barbershop_overview()', 'execute') then
    raise exception 'grants da projeção administrativa não correspondem ao contrato';
  end if;

end;
$test$;

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $test$
begin
  perform public.get_platform_barbershop_overview();
  raise exception 'papel de tenant acessou resumo interno sem papel platform_owner';
exception when raise_exception then
  if sqlerrm = 'papel de tenant acessou resumo interno sem papel platform_owner' then
    raise;
  end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $test$
declare row_count integer;
begin
  select count(*) into row_count from public.get_platform_barbershop_overview();
  if row_count <> 2 then
    raise exception 'platform_owner não recebeu o resumo cadastral mínimo';
  end if;
end;
$test$;
reset role;

-- Consulta ampliada: grants e privacidade da auditoria.
do $test$
declare fn text;
begin
  if has_table_privilege('authenticated', 'private.platform_audit_events', 'select')
     or has_table_privilege('authenticated', 'private.platform_audit_events', 'insert')
     or has_table_privilege('anon', 'private.platform_audit_events', 'select')
     or has_table_privilege('authenticated', 'private.platform_commercial_agreements', 'select')
     or has_table_privilege('anon', 'private.platform_commercial_agreements', 'select') then
    raise exception 'auditoria ou acordos da plataforma ficaram acessíveis a papéis de cliente';
  end if;
  foreach fn in array array[
    'public.get_platform_barbershop_detail(uuid)',
    'public.list_platform_barbershop_professionals(uuid)',
    'public.list_platform_barbershop_services(uuid)',
    'public.list_platform_barbershop_customers(uuid)',
    'public.list_platform_barbershop_customer_consents(uuid)',
    'public.export_platform_barbershop_customers(uuid, text)',
    'public.reactivate_platform_barbershop_by_agreement(uuid, integer, text, text)',
    'public.suspend_platform_barbershop(uuid, text)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') or not has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'grants da consulta ampliada incorretos em %', fn;
    end if;
  end loop;
end;
$test$;

-- Dono da própria barbearia não usa a consulta interna, nem para a própria loja.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $test$
declare fn text; denied integer := 0;
begin
  foreach fn in array array[
    'get_platform_barbershop_detail', 'list_platform_barbershop_professionals', 'list_platform_barbershop_services',
    'list_platform_barbershop_customers', 'list_platform_barbershop_customer_consents'
  ] loop
    begin
      execute format('select * from public.%I(%L::uuid)', fn, 'd2000000-0000-4000-8000-000000000001');
    exception when others then
      if sqlerrm = 'Acesso interno não autorizado' then denied := denied + 1; end if;
    end;
  end loop;
  begin
    perform public.export_platform_barbershop_customers('d2000000-0000-4000-8000-000000000001', 'csv');
  exception when others then
    if sqlerrm = 'Acesso interno não autorizado' then denied := denied + 1; end if;
  end;
  begin
    perform public.reactivate_platform_barbershop_by_agreement('d2000000-0000-4000-8000-000000000001', 5, 'Acordo', 'Condição');
  exception when others then
    if sqlerrm = 'Acesso interno não autorizado' then denied := denied + 1; end if;
  end;
  begin
    perform public.suspend_platform_barbershop('d2000000-0000-4000-8000-000000000001', 'Motivo suspensão');
  exception when others then
    if sqlerrm = 'Acesso interno não autorizado' then denied := denied + 1; end if;
  end;
  if denied <> 8 then
    raise exception 'papel de tenant acessou consulta/ação interna (% de 8 negadas)', denied;
  end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $test$
declare
  v_detail record;
  v_names text;
begin
  select * into v_detail from public.get_platform_barbershop_detail('d2000000-0000-4000-8000-000000000001');
  if v_detail.name <> 'Barbearia Plataforma' or v_detail.tax_document <> '12345678000199'
     or v_detail.responsible_phone <> '11988887777' or v_detail.customer_count <> 2
     or v_detail.active_professional_count <> 1 or v_detail.active_service_count <> 1 then
    raise exception 'detalhe cadastral/contratual incorreto';
  end if;

  select string_agg(name || ':' || active::text, ',' order by name) into v_names
  from public.list_platform_barbershop_professionals('d2000000-0000-4000-8000-000000000001');
  if v_names <> 'Profissional Ativo:true,Profissional Inativo:false' then
    raise exception 'profissionais incorretos ou de outra barbearia: %', v_names;
  end if;

  select string_agg(name || ':' || active::text || ':' || duration_minutes || ':' || price, ',' order by name) into v_names
  from public.list_platform_barbershop_services('d2000000-0000-4000-8000-000000000001');
  if v_names <> 'Barba Pausada:false:20:35.00,Corte Fixture:true:30:55.00' then
    raise exception 'serviços incorretos ou de outra barbearia: %', v_names;
  end if;
end;
$test$;
do $test$
declare v_count integer;
begin
  select count(*) into v_count from private.platform_audit_events;
  raise exception 'auditoria da plataforma legível por authenticated';
exception
  when insufficient_privilege then null;
end;
$test$;
reset role;

do $test$
begin
  if exists (select 1 from private.platform_audit_events) then
    raise exception 'leitura simples de cadastro, profissionais ou serviços gerou auditoria';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $test$
declare
  v_names text;
  v_consent record;
  v_detail record;
begin
  select string_agg(name || ':' || coalesce(email, '-') || ':' || phone, ',' order by name) into v_names
  from public.list_platform_barbershop_customers('d2000000-0000-4000-8000-000000000001');
  if v_names <> 'Cliente Alfa:alfa@example.test:11911110001,Cliente Beta:-:11911110002' then
    raise exception 'clientes incorretos, anonimizado exposto ou cliente de outra barbearia: %', v_names;
  end if;

  select * into v_consent from public.list_platform_barbershop_customer_consents('d2000000-0000-4000-8000-000000000001')
  where customer_id = 'd3000000-0000-4000-8000-000000000001';
  if v_consent.barbershop_marketing_granted is distinct from false
     or v_consent.barbershop_marketing_source <> 'customer_portal'
     or v_consent.platform_marketing_granted is distinct from true
     or v_consent.platform_marketing_version <> 'v2' then
    raise exception 'situação atual de consentimento incorreta';
  end if;

  if (select count(*) from public.list_platform_barbershop_customer_consents('d2000000-0000-4000-8000-000000000001')) <> 2 then
    raise exception 'consentimentos devem listar somente clientes vinculados';
  end if;

  begin
    perform public.get_platform_barbershop_detail('d2000000-0000-4000-8000-0000000000ff');
    raise exception 'barbearia inexistente não foi rejeitada';
  exception when raise_exception then
    if sqlerrm <> 'Barbearia não encontrada' then raise; end if;
  end;

  begin
    perform public.export_platform_barbershop_customers('d2000000-0000-4000-8000-000000000001', 'xml');
    raise exception 'formato inválido de exportação não foi rejeitado';
  exception when raise_exception then
    if sqlerrm <> 'Formato de exportação inválido. Utilize csv ou json.' then raise; end if;
  end;

  if (select count(*) from public.export_platform_barbershop_customers('d2000000-0000-4000-8000-000000000001', 'csv')) <> 2 then
    raise exception 'exportação deve conter exatamente os clientes vinculados à barbearia';
  end if;

  -- Reativação por acordo comercial
  perform public.reactivate_platform_barbershop_by_agreement(
    'd2000000-0000-4000-8000-000000000001',
    10,
    'Acordo de renegociação',
    'Parcelamento de débitos em 2x via Pix'
  );

  select * into v_detail from public.get_platform_barbershop_detail('d2000000-0000-4000-8000-000000000001');
  if v_detail.contract_status <> 'commercial_agreement'
     or v_detail.commercial_agreement_active is not true
     or v_detail.commercial_agreement_duration_days <> 10
     or v_detail.commercial_agreement_reason <> 'Acordo de renegociação' then
    raise exception 'reativação por acordo comercial não refletiu nos detalhes: %', v_detail;
  end if;
end;
$test$;
reset role;

do $test$
begin
  if not private.can_accept_public_booking('d2000000-0000-4000-8000-000000000001') then
    raise exception 'barbearia reativada por acordo não liberou agendamento operacional';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $test$
begin
  -- Renovação explícita
  perform public.reactivate_platform_barbershop_by_agreement(
    'd2000000-0000-4000-8000-000000000001',
    15,
    'Renovação com prorrogação',
    'Segunda parcela confirmada'
  );

  -- Suspensão
  perform public.suspend_platform_barbershop('d2000000-0000-4000-8000-000000000001', 'Inadimplência da segunda parcela');
  select * into v_detail from public.get_platform_barbershop_detail('d2000000-0000-4000-8000-000000000001');
  if v_detail.registration_status <> 'inactive' or v_detail.commercial_agreement_active is true then
    raise exception 'suspensão da barbearia não desativou o registro no detalhe: %', v_detail;
  end if;
end;
$test$;
reset role;

do $test$
begin
  if (select active from public.barbershops where id = 'd2000000-0000-4000-8000-000000000001') is not false then
    raise exception 'suspensão da barbearia não desativou o registro';
  end if;
  if private.can_accept_public_booking('d2000000-0000-4000-8000-000000000001') then
    raise exception 'barbearia suspensa continuou com agendamento liberado';
  end if;
end;
$test$;
reset role;

do $test$
begin
  if (select count(*) from private.platform_audit_events where action = 'customer_data_opened'
        and actor_user_id = 'd1000000-0000-4000-8000-000000000001'
        and barbershop_id = 'd2000000-0000-4000-8000-000000000001' and record_count = 2) <> 1
     or (select count(*) from private.platform_audit_events where action = 'customer_consents_viewed') <> 2
     or (select count(*) from private.platform_audit_events where action = 'customer_data_exported'
        and actor_user_id = 'd1000000-0000-4000-8000-000000000001'
        and barbershop_id = 'd2000000-0000-4000-8000-000000000001' and record_count = 2
        and metadata->>'format' = 'csv') <> 1
     or (select count(*) from private.platform_audit_events where action = 'commercial_agreement_activated') <> 1
     or (select count(*) from private.platform_audit_events where action = 'commercial_agreement_renewed') <> 1
     or (select count(*) from private.platform_audit_events where action = 'barbershop_suspended') <> 1 then
    raise exception 'auditoria de clientes, exportação, acordos comerciais ou suspensão incompleta';
  end if;
end;
$test$;

rollback;
