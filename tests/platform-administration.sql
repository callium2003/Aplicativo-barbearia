-- Fundação CullenTech: fixtures locais e descartáveis. Nunca usa o banco remoto.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'platform-owner@example.test', now(), now()),
  ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'tenant-owner@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active)
values ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'Barbearia Plataforma', 'barbearia-plataforma-fixture', true);

insert into private.platform_administrators (user_id, role)
values ('d1000000-0000-4000-8000-000000000001', 'platform_owner');

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
  if row_count <> 1 then
    raise exception 'platform_owner não recebeu o resumo cadastral mínimo';
  end if;
end;
$test$;
reset role;

rollback;
