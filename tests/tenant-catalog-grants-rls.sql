-- tests/tenant-catalog-grants-rls.sql
--
-- Teste de regressão A1/A2: isolamento de leitura entre tenants após
-- supabase/migrations/20260918170000_harden_tenant_catalog_grants.sql.
--
-- Execução (banco Postgres local isolado, SEMPRE descartável; nunca o remoto):
--   psql -v ON_ERROR_STOP=1 -f tests/tenant-catalog-grants-rls.sql
-- a partir da raiz do repositório. Tudo roda dentro de uma transação com
-- ROLLBACK ao final: nenhum dado persiste.
--
-- Estratégia: cria um fixture mínimo fiel ao schema real (só as colunas que a
-- migration toca), instala as policies ANTIGAS (pré-migration), aplica a
-- migration real via \ir e então valida o estado PÓS-migration com dois tenants
-- (A e B). Asserts são comportamentais: o tenant A nunca recebe dado sensível
-- do tenant B — seja por exceção, conjunto vazio ou negação de privilégio.

begin;

-- ============================================================================
-- 0. Infra do fixture
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

create schema if not exists auth;
create schema if not exists private;

-- auth.uid() falso, fiel ao contrato: lê request.jwt.claims
create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;

create table auth.users (id uuid primary key, email text);

-- Tabelas mínimas com TODAS as colunas citadas pela migration
create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  slug text,
  name text,
  phone text,
  whatsapp text,
  address text,
  description text,
  photo_url text,
  instagram_url text,
  facebook_url text,
  active boolean not null default true,
  owner_id uuid,
  notification_email text,
  initial_registration_completed boolean not null default false
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null,
  name text not null,
  phone text,
  photo_url text,
  instagram_url text,
  active boolean not null default true,
  contact_email text,
  schedule_mode text not null default 'barbershop'
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null,
  user_id uuid,
  professional_id uuid,
  role text not null,
  status text not null default 'active'
);

alter table public.barbershops enable row level security;
alter table public.professionals enable row level security;
alter table public.team_members enable row level security;

-- Funções reais (cópia fiel do baseline, security definer + search_path travado)
create or replace function private.current_barbershop_role(p_barbershop_id uuid) returns text
  language sql stable security definer set search_path to ''
  as $$ select case when exists(select 1 from public.barbershops b where b.id=p_barbershop_id and b.owner_id=(select auth.uid())) then 'owner' else (select tm.role from public.team_members tm where tm.barbershop_id=p_barbershop_id and tm.user_id=(select auth.uid()) and tm.status='active' limit 1) end; $$;

create or replace function private.current_barber_professional_id(p_barbershop_id uuid) returns uuid
  language sql stable security definer set search_path to ''
  as $$ select tm.professional_id from public.team_members tm where tm.barbershop_id=p_barbershop_id and tm.user_id=(select auth.uid()) and tm.status='active' and tm.role='barber' limit 1; $$;

-- Estado PRÉ-migration (vulnerável): GRANT ALL + policies antigas com EXISTS inline
grant all on public.barbershops to authenticated;
grant all on public.professionals to authenticated;
grant all on public.team_members to authenticated;

create policy "Authenticated can read active or managed barbershops" on public.barbershops
  for select to authenticated using (active = true);

create policy "Authenticated can read public managed or own professional" on public.professionals
  for select to authenticated using (exists (
    select 1 from public.barbershops b
    where b.id = professionals.barbershop_id and b.owner_id = (select auth.uid())));

create policy "Owner can create professionals" on public.professionals
  for insert to authenticated with check (exists (
    select 1 from public.barbershops b
    where b.id = professionals.barbershop_id and b.owner_id = (select auth.uid())));

create policy "Owner can update professionals" on public.professionals
  for update to authenticated using (exists (
    select 1 from public.barbershops b
    where b.id = professionals.barbershop_id and b.owner_id = (select auth.uid())))
  with check (exists (
    select 1 from public.barbershops b
    where b.id = professionals.barbershop_id and b.owner_id = (select auth.uid())));

create policy "Owner can delete professionals" on public.professionals
  for delete to authenticated using (exists (
    select 1 from public.barbershops b
    where b.id = professionals.barbershop_id and b.owner_id = (select auth.uid())));

-- Estado PRÉ-migration: 4 policies reais do tip (nomes exatos que a migration dropa),
-- com EXISTS inline sobre barbershops.owner_id (vulnerável a permission denied)
create policy "Authenticated can read allowed team access"
on public.team_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

create policy "Owner can insert team access"
on public.team_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

create policy "Owner can update team access"
on public.team_members
for update
to authenticated
using (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

create policy "Owner can delete team access"
on public.team_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

-- ============================================================================
-- 1. Aplica a migration real sob teste
-- ============================================================================

\ir ../supabase/migrations/20260918170000_harden_tenant_catalog_grants.sql
\ir ../supabase/migrations/20260918180000_fix_professionals_select_policy.sql
\ir ../supabase/migrations/20260918190000_preserve_tenant_catalog_operations.sql

-- ============================================================================
-- 2. Fixture: dois tenants
-- ============================================================================

-- Helpers de identidade: funções standalone (procedures não podem ser
-- declaradas dentro de DO). SET ROLE persiste para a sessão.
create or replace function test_set_user(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  execute 'set role authenticated';
end $$;

create or replace function test_set_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set role anon';
end $$;

do $$
declare
  owner_a      uuid := '10000000-0000-4000-8000-0000000000a1';
  owner_b      uuid := '10000000-0000-4000-8000-0000000000b1';
  manager_a    uuid := '10000000-0000-4000-8000-0000000000a2';
  barber_b     uuid := '10000000-0000-4000-8000-0000000000b2';
  stranger     uuid := '10000000-0000-4000-8000-0000000000c1';
  shop_a       uuid := '30000000-0000-4000-8000-0000000000a1';
  shop_b       uuid := '30000000-0000-4000-8000-0000000000b1';
  prof_a       uuid := '50000000-0000-4000-8000-0000000000a1';
  prof_b       uuid := '50000000-0000-4000-8000-0000000000b1';

  v_val        text;
  v_mode       text;
  v_count      integer;
  v_rejected   boolean;
  v_row        record;
begin
  -- usuários e lojas (criado como superuser: sem RLS aqui dentro)
  insert into auth.users (id, email) values
    (owner_a, 'owner-a@example.test'), (owner_b, 'owner-b@example.test'),
    (manager_a, 'manager-a@example.test'), (barber_b, 'barber-b@example.test'),
    (stranger, 'stranger@example.test');

  insert into public.barbershops (id, owner_id, name, slug, active, notification_email, phone, initial_registration_completed)
  values
    (shop_a, owner_a, 'Shop A', 'shop-a', true, 'secret-a@example.test', '11999990001', true),
    (shop_b, owner_b, 'Shop B', 'shop-b', true, 'secret-b@example.test', '11999990002', true);

  insert into public.professionals (id, barbershop_id, name, phone, active, contact_email, schedule_mode)
  values
    (prof_a, shop_a, 'Prof A', 'phone-secret-a', true, 'prof-a-secret@example.test', 'custom'),
    (prof_b, shop_b, 'Prof B', 'phone-secret-b', true, 'prof-b-secret@example.test', 'barbershop');

  insert into public.team_members (barbershop_id, user_id, professional_id, role, status) values
    (shop_a, manager_a, null, 'manager', 'active'),
    (shop_b, barber_b, prof_b, 'barber', 'active');

  -- ========================================================================
  -- 3. Grants: colunas sensíveis fora do alcance direto de authenticated
  -- ========================================================================
  if has_table_privilege('authenticated', 'public.barbershops', 'select') then
    raise exception 'authenticated não deveria ter SELECT amplo em barbershops';
  end if;
  if has_column_privilege('authenticated', 'public.barbershops', 'notification_email', 'select')
     or has_column_privilege('authenticated', 'public.barbershops', 'owner_id', 'select') then
    raise exception 'colunas sensíveis de barbershops seguem legíveis por authenticated';
  end if;
  if has_column_privilege('authenticated', 'public.professionals', 'phone', 'select')
     or has_column_privilege('authenticated', 'public.professionals', 'contact_email', 'select')
     or has_column_privilege('authenticated', 'public.professionals', 'schedule_mode', 'select') then
    raise exception 'colunas sensíveis de professionals seguem legíveis por authenticated';
  end if;
  -- catálogo continua concedido
  for v_val in select unnest(array['id','slug','name','phone','whatsapp','address','description','photo_url','instagram_url','facebook_url','active']) loop
    if not has_column_privilege('authenticated', 'public.barbershops', v_val, 'select') then
      raise exception 'coluna de catálogo % de barbershops perdeu o grant', v_val;
    end if;
  end loop;
  for v_val in select unnest(array['id','barbershop_id','name','photo_url','instagram_url','active']) loop
    if not has_column_privilege('authenticated', 'public.professionals', v_val, 'select') then
      raise exception 'coluna de catálogo % de professionals perdeu o grant', v_val;
    end if;
  end loop;
  -- escritas diretas do painel preservadas
  if not has_table_privilege('authenticated', 'public.barbershops', 'insert')
     or not has_table_privilege('authenticated', 'public.professionals', 'insert')
     or not has_table_privilege('authenticated', 'public.professionals', 'update')
     or not has_table_privilege('authenticated', 'public.professionals', 'delete') then
    raise exception 'grants de escrita do painel foram perdidos';
  end if;

  -- RPCs: só authenticated executa; anon não
  for v_val in select unnest(array[
      'public.get_barbershop_notification_email(uuid)',
      'public.list_managed_professionals(uuid)',
      'public.get_professional_details(uuid)',
      'public.get_professional_schedule_mode(uuid)',
      'public.my_owned_barbershop()']) loop
    if has_function_privilege('anon', v_val, 'execute') then
      raise exception 'anon não pode executar %', v_val;
    end if;
    if not has_function_privilege('authenticated', v_val, 'execute') then
      raise exception 'authenticated perdeu execute em %', v_val;
    end if;
  end loop;

  -- ========================================================================
  -- 4. Estranho (tenant nenhum): não recebe nada sensível do tenant B
  -- ========================================================================
  perform test_set_user(stranger);

  -- leitura direta da coluna sensível: negada
  begin
    execute 'select notification_email from public.barbershops limit 1' into v_val;
    raise exception 'stranger leu notification_email direto da tabela';
  exception when insufficient_privilege then
    -- esperado
  end;

  begin
    execute 'select phone from public.professionals limit 1' into v_val;
    raise exception 'stranger leu phone direto da tabela';
  exception when insufficient_privilege then
    -- esperado
  end;

  -- RPCs: recusadas OU sem o segredo (contrato comportamental)
  v_rejected := false;
  begin
    v_val := public.get_barbershop_notification_email(shop_b);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_val = 'secret-b@example.test' then
    raise exception 'vazamento cross-tenant via get_barbershop_notification_email';
  end if;

  v_rejected := false;
  begin
    select count(*) into v_count from public.list_managed_professionals(shop_b);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_count > 0 then
    raise exception 'vazamento cross-tenant via list_managed_professionals';
  end if;

  v_rejected := false;
  begin
    select count(*) into v_count from public.get_professional_details(prof_b) d where d.contact_email = 'prof-b-secret@example.test';
  exception when others then v_rejected := true; end;
  if not v_rejected and v_count > 0 then
    raise exception 'vazamento cross-tenant via get_professional_details';
  end if;

  v_rejected := false;
  begin
    v_mode := public.get_professional_schedule_mode(prof_b);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_mode is not null then
    raise exception 'vazamento cross-tenant via get_professional_schedule_mode';
  end if;

  -- my_owned_barbershop do estranho: vazio
  select count(*) into v_count from public.my_owned_barbershop();
  if v_count <> 0 then
    raise exception 'my_owned_barbershop retornou loja para estranho';
  end if;

  -- catálogo público segue acessível ao estranho (apenas colunas de catálogo)
  select count(*) into v_count from public.barbershops;
  if v_count <> 2 then
    raise exception 'catálogo de barbearias quebrou para authenticated (esperado 2, veio %)', v_count;
  end if;
  select count(*) into v_count from public.professionals;
  if v_count <> 2 then
    raise exception 'catálogo de profissionais quebrou para authenticated';
  end if;

  -- ========================================================================
  -- 5. Owner B: recebe os próprios dados, não os do A
  -- ========================================================================
  perform test_set_user(owner_b);

  v_val := public.get_barbershop_notification_email(shop_b);
  if v_val <> 'secret-b@example.test' then
    raise exception 'owner não recebeu o próprio notification_email';
  end if;

  select count(*) into v_count from public.list_managed_professionals(shop_b);
  if v_count <> 1 then
    raise exception 'owner não listou os próprios profissionais';
  end if;
  select phone into v_val from public.list_managed_professionals(shop_b) limit 1;
  if v_val <> 'phone-secret-b' then
    raise exception 'owner não recebeu o phone do próprio profissional';
  end if;

  select d.contact_email, d.schedule_mode into v_val, v_mode
    from public.get_professional_details(prof_b) d;
  if v_val <> 'prof-b-secret@example.test' or v_mode <> 'barbershop' then
    raise exception 'owner não recebeu os detalhes do próprio profissional';
  end if;

  -- owner não lê o tenant A
  v_rejected := false;
  begin
    v_val := public.get_barbershop_notification_email(shop_a);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_val = 'secret-a@example.test' then
    raise exception 'owner B leu notification_email do tenant A';
  end if;

  v_rejected := false;
  begin
    select count(*) into v_count from public.get_professional_details(prof_a) d where d.contact_email = 'prof-a-secret@example.test';
  exception when others then v_rejected := true; end;
  if not v_rejected and v_count > 0 then
    raise exception 'owner B leu detalhes do profissional do tenant A';
  end if;

  -- my_owned_barbershop: só a própria loja
  select count(*) into v_count from public.my_owned_barbershop() m where m.id = shop_b;
  if v_count <> 1 then
    raise exception 'my_owned_barbershop não retornou a loja do owner';
  end if;

  -- owner lê schedule_mode do próprio profissional
  v_mode := public.get_professional_schedule_mode(prof_b);
  if v_mode <> 'barbershop' then
    raise exception 'owner não leu schedule_mode do próprio profissional';
  end if;

  -- profissional inativo permanece visível ao owner para permitir reativação.
  update public.professionals set active = false where id = prof_b;
  select count(*) into v_count from public.professionals where id = prof_b;
  if v_count <> 1 then
    raise exception 'owner perdeu acesso ao profissional inativo do próprio tenant';
  end if;
  update public.professionals set active = true where id = prof_b;

  -- escritas legítimas do owner continuam funcionando (policies reescritas)
  insert into public.professionals (barbershop_id, name, phone)
    values (shop_b, 'Novo Prof B', '11999990003');
  update public.professionals set phone = '11999990004'
    where barbershop_id = shop_b and name = 'Novo Prof B';
  if not found then
    raise exception 'owner não conseguiu atualizar profissional próprio';
  end if;
  -- e continuam negadas no tenant alheio
  v_rejected := false;
  begin
    insert into public.professionals (barbershop_id, name) values (shop_a, 'Invasor');
  exception when others then v_rejected := true; end;
  if not v_rejected then
    raise exception 'owner B inseriu profissional no tenant A';
  end if;
  delete from public.professionals where barbershop_id = shop_b and name = 'Novo Prof B';

  -- ========================================================================
  -- 6. Manager A: dados operacionais do próprio tenant; nada do B
  -- ========================================================================
  perform test_set_user(manager_a);

  v_val := public.get_barbershop_notification_email(shop_a);
  if v_val <> 'secret-a@example.test' then
    raise exception 'manager não recebeu notification_email do próprio tenant';
  end if;

  select count(*) into v_count from public.list_managed_professionals(shop_a);
  if v_count <> 1 then
    raise exception 'manager não listou profissionais do próprio tenant';
  end if;

  v_mode := public.get_professional_schedule_mode(prof_a);
  if v_mode <> 'custom' then
    raise exception 'manager não leu schedule_mode do próprio tenant';
  end if;

  v_rejected := false;
  begin
    v_val := public.get_barbershop_notification_email(shop_b);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_val = 'secret-b@example.test' then
    raise exception 'manager A leu notification_email do tenant B';
  end if;

  -- manager não é owner: my_owned_barbershop vazio
  select count(*) into v_count from public.my_owned_barbershop();
  if v_count <> 0 then
    raise exception 'my_owned_barbershop retornou loja para manager não-owner';
  end if;

  -- ========================================================================
  -- 7. Barbeiro titular: lê o próprio schedule_mode; nada de colegas
  -- ========================================================================
  perform test_set_user(barber_b);

  v_mode := public.get_professional_schedule_mode(prof_b);
  if v_mode <> 'barbershop' then
    raise exception 'barbeiro titular não leu o próprio schedule_mode';
  end if;

  -- colega de outro tenant: negado ou sem dado
  v_rejected := false;
  begin
    v_mode := public.get_professional_schedule_mode(prof_a);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_mode is not null then
    raise exception 'barbeiro leu schedule_mode de profissional de outro tenant';
  end if;

  -- barbeiro não lê metadata sensível (contact_email) nem como titular
  v_rejected := false;
  begin
    select count(*) into v_count from public.get_professional_details(prof_b);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_count > 0 then
    raise exception 'barbeiro leu detalhes administrativos do próprio registro';
  end if;

  v_rejected := false;
  begin
    v_val := public.get_barbershop_notification_email(shop_b);
  exception when others then v_rejected := true; end;
  if not v_rejected and v_val = 'secret-b@example.test' then
    raise exception 'barbeiro leu notification_email da barbearia';
  end if;

  -- ========================================================================
  -- 8. Anon: sem execute nas RPCs; catálogo público intacto (inalterado)
  -- ========================================================================
  perform test_set_anon();

  for v_val in select unnest(array[
      'public.get_barbershop_notification_email(uuid)',
      'public.list_managed_professionals(uuid)',
      'public.get_professional_details(uuid)',
      'public.get_professional_schedule_mode(uuid)',
      'public.my_owned_barbershop()']) loop
    if has_function_privilege('anon', v_val, 'execute') then
      raise exception 'anon com execute em %', v_val;
    end if;
  end loop;

  raise notice 'tenant-catalog-grants-rls: TODOS OS ASSERTS PASSARAM';
end $$;

rollback;
