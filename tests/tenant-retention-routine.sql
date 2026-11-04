-- Disposable PostgreSQL test fixture for BLD-03 tenant retention and anonymization routine.
-- Execute with psql -v ON_ERROR_STOP=1.
-- All assertions are checked inside the transaction and immediately rolled back.

begin;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists auth.users (id uuid primary key, email text);

create table if not exists public.barbershops (
  id uuid primary key,
  owner_id uuid,
  name text not null,
  slug text not null unique,
  whatsapp text, address text, description text, photo_url text,
  instagram_url text, facebook_url text, phone text, notification_email text,
  active boolean not null default true
);

create table if not exists public.barbershop_subscriptions (
  barbershop_id uuid primary key references public.barbershops(id),
  status text not null,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz
);

create table if not exists public.appointments (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  status text not null,
  customer_id uuid,
  customer_global_id uuid,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  cancel_reason text,
  cancelled_by uuid,
  service_name_snapshot text,
  service_price_snapshot numeric(10,2),
  duration_minutes_snapshot integer,
  professional_name_snapshot text
);

create table if not exists public.appointment_commissions (
  appointment_id uuid primary key references public.appointments(id) on delete restrict
);

create table if not exists public.team_members (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  user_id uuid not null references auth.users(id),
  status text not null
);

create table if not exists public.team_invitations (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  email_normalized text not null,
  status text not null,
  revoked_at timestamptz
);

create table if not exists public.customers (
  id uuid primary key,
  name text not null,
  phone text not null,
  email text
);

create table if not exists public.barbershop_customers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id),
  customer_id uuid not null references public.customers(id)
);

create table if not exists public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid references public.barbershops(id),
  customer_id uuid not null references public.customers(id)
);

create table if not exists public.barbershop_registration_details (
  barbershop_id uuid primary key references public.barbershops(id),
  responsible_name text not null
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id),
  recipient_email text,
  recipient_user_id uuid,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null,
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists private.platform_commercial_agreements (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id),
  active boolean not null default true,
  ends_at timestamptz not null
);

create or replace function private.barbershop_subscription_effective_end(p_barbershop_id uuid)
returns timestamptz language sql stable as $$
  select case
    when s.status = 'trialing' then s.trial_ends_at
    when s.status in ('active', 'cancelled', 'past_due') then s.current_period_ends_at
    else null
  end
  from public.barbershop_subscriptions s
  where s.barbershop_id = p_barbershop_id;
$$;

-- Trigger de proteção de agendamentos concluídos
create or replace function private.prevent_completed_appointment_deletion()
returns trigger language plpgsql as $$
begin
  if old.status = 'completed' then
    raise exception using errcode = 'P0001', message = 'Completed appointments cannot be deleted.';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_completed_appointment_deletion on public.appointments;
create trigger prevent_completed_appointment_deletion
before delete on public.appointments
for each row execute function private.prevent_completed_appointment_deletion();

\ir ../supabase/migrations/20261104200000_install_tenant_retention_and_anonymization_routine.sql

-- 1. Verificação de privilégios estritos (revogado de anon e authenticated)
do $$ begin
  if has_function_privilege('anon', 'private.process_tenant_retention_cycle(integer, boolean)', 'execute')
     or has_function_privilege('authenticated', 'private.process_tenant_retention_cycle(integer, boolean)', 'execute') then
    raise exception 'Segurança violada: anon ou authenticated possuem permissão de execução em process_tenant_retention_cycle';
  end if;
  if not has_function_privilege('service_role', 'private.process_tenant_retention_cycle(integer, boolean)', 'execute') then
    raise exception 'Configuração incorreta: service_role deve possuir permissão em process_tenant_retention_cycle';
  end if;
end $$;

-- 2. Carga de Fixtures
-- Usuários
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'owner_a@example.invalid'),
  ('10000000-0000-0000-0000-000000000002', 'owner_b@example.invalid'),
  ('10000000-0000-0000-0000-000000000003', 'shared_barber@example.invalid');

-- Barbearia A: Cancelada há 65 dias (elegível para expurgo/anonimização)
insert into public.barbershops (id, owner_id, name, slug, whatsapp, address, notification_email, active) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Barbearia A', 'barbearia-a', '11999990001', 'Rua A, 1', 'contato@shopa.test', true);
insert into public.barbershop_subscriptions (barbershop_id, status, current_period_ends_at) values
  ('20000000-0000-0000-0000-000000000001', 'cancelled', now() - interval '65 days');

-- Barbearia B: Cancelada há 20 dias (NÃO elegível - janela de retenção de 60 dias ativa)
insert into public.barbershops (id, owner_id, name, slug, whatsapp, address, notification_email, active) values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Barbearia B', 'barbearia-b', '11999990002', 'Rua B, 2', 'contato@shopb.test', true);
insert into public.barbershop_subscriptions (barbershop_id, status, current_period_ends_at) values
  ('20000000-0000-0000-0000-000000000002', 'cancelled', now() - interval '20 days');

-- Barbearia D: Assinatura cancelada há 80 dias, MAS com acordo comercial ativo pela CullenTech
insert into public.barbershops (id, owner_id, name, slug, whatsapp, address, notification_email, active) values
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Barbearia D', 'barbearia-d', '11999990004', 'Rua D, 4', 'contato@shopd.test', true);
insert into public.barbershop_subscriptions (barbershop_id, status, current_period_ends_at) values
  ('20000000-0000-0000-0000-000000000004', 'cancelled', now() - interval '80 days');
insert into private.platform_commercial_agreements (barbershop_id, active, ends_at) values
  ('20000000-0000-0000-0000-000000000004', true, now() + interval '30 days');

-- Barbearia E: Inativa, campos de contato diretos nulos, mas com instagram_url e registros em CRM/detalhes cadastrais
insert into public.barbershops (id, owner_id, name, slug, whatsapp, address, notification_email, instagram_url, active) values
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Barbearia E', 'barbearia-e', null, null, null, 'https://instagram.com/barbearia_e', false);
insert into public.barbershop_subscriptions (barbershop_id, status, current_period_ends_at) values
  ('20000000-0000-0000-0000-000000000005', 'cancelled', now() - interval '70 days');
insert into public.barbershop_customers (barbershop_id, customer_id) values
  ('20000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001');
insert into public.barbershop_registration_details (barbershop_id, responsible_name) values
  ('20000000-0000-0000-0000-000000000005', 'Responsável E');

-- Clientes
insert into public.customers (id, name, phone, email) values
  ('50000000-0000-0000-0000-000000000001', 'Cliente Ficticio', '11988880001', 'cliente@example.invalid');

-- CRM e Consents
insert into public.barbershop_customers (barbershop_id, customer_id) values
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001');

insert into public.customer_consents (barbershop_id, customer_id) values
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001');

-- Equipe: barbeiro compartilhado entre A e B
insert into public.team_members (id, barbershop_id, user_id, status) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'active'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'active');

insert into public.team_invitations (id, barbershop_id, email_normalized, status) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'convite_a@shopa.test', 'pending'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'convite_b@shopb.test', 'pending');

-- Detalhes cadastrais
insert into public.barbershop_registration_details (barbershop_id, responsible_name) values
  ('20000000-0000-0000-0000-000000000001', 'Responsável A'),
  ('20000000-0000-0000-0000-000000000002', 'Responsável B');

-- Agendamentos da Barbearia A:
-- 1. Futuro scheduled (órfão)
insert into public.appointments (id, barbershop_id, status, customer_name, customer_phone, customer_email, starts_at, ends_at) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'scheduled', 'Cliente Futuro A', '11999991111', 'futuro@shopa.test', now() + interval '2 days', now() + interval '2 days 30 minutes');

-- 2. Concluído histórico COM comissão vinculada (deve ser anonimizado, snapshot financeiro preservado, NÃO deletado)
insert into public.appointments (id, barbershop_id, status, customer_name, customer_phone, customer_email, starts_at, ends_at, service_name_snapshot, service_price_snapshot, duration_minutes_snapshot, professional_name_snapshot) values
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'completed', 'Cliente Historico A', '11999992222', 'historico@shopa.test', now() - interval '70 days', now() - interval '70 days' + interval '30 minutes', 'Corte Degradê', 45.00, 30, 'Barbeiro 1');
insert into public.appointment_commissions (appointment_id) values
  ('30000000-0000-0000-0000-000000000002');

-- Agendamentos da Barbearia B (devem permanecer intactos)
insert into public.appointments (id, barbershop_id, status, customer_name, customer_phone, customer_email, starts_at, ends_at) values
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'scheduled', 'Cliente B', '11999993333', 'cliente@shopb.test', now() + interval '1 day', now() + interval '1 day 30 minutes');

-- Agendamento da Barbearia D (com acordo comercial ativo, deve permanecer intacto)
insert into public.appointments (id, barbershop_id, status, customer_name, customer_phone, customer_email, starts_at, ends_at) values
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'scheduled', 'Cliente D', '11999994444', 'cliente@shopd.test', now() + interval '1 day', now() + interval '1 day 30 minutes');

-- 3. TESTE DE SIMULAÇÃO (DRY RUN = true)
do $$
declare
  v_sim jsonb;
begin
  v_sim := private.process_tenant_retention_cycle(50, true);
  if (v_sim->>'evaluated')::integer <> 2 or (v_sim->>'processed')::integer <> 2 then
    raise exception 'Simulação falhou: esperado 2 barbearias avaliadas/processadas, obteve %', v_sim;
  end if;

  -- Verifica que NADA foi alterado na Barbearia A durante dry_run
  if (select active from public.barbershops where id = '20000000-0000-0000-0000-000000000001') = false
     or (select customer_name from public.appointments where id = '30000000-0000-0000-0000-000000000002') = 'Cliente removido'
     or not exists (select 1 from public.appointments where id = '30000000-0000-0000-0000-000000000001') then
    raise exception 'Simulação modificou dados indevidamente';
  end if;
end $$;

-- 4. TESTE DE EXECUÇÃO REAL (DRY RUN = false)
do $$
declare
  v_res jsonb;
begin
  v_res := private.process_tenant_retention_cycle(50, false);
  if (v_res->>'processed')::integer <> 2 then
    raise exception 'Execução real falhou: esperado 2 barbearias processadas, obteve %', v_res;
  end if;

  -- 4.1 Barbearia A: Desativada e PII de contato anonimizada
  if (select active from public.barbershops where id = '20000000-0000-0000-0000-000000000001') <> false
     or (select whatsapp from public.barbershops where id = '20000000-0000-0000-0000-000000000001') is not null
     or (select address from public.barbershops where id = '20000000-0000-0000-0000-000000000001') is not null
     or (select notification_email from public.barbershops where id = '20000000-0000-0000-0000-000000000001') is not null then
    raise exception 'Barbearia A não foi desativada/anonimizada corretamente';
  end if;

  -- 4.1.1 Barbearia E: Inativa com dados indiretos (instagram, CRM, registro) teve alvos limpos
  if (select instagram_url from public.barbershops where id = '20000000-0000-0000-0000-000000000005') is not null
     or exists (select 1 from public.barbershop_customers where barbershop_id = '20000000-0000-0000-0000-000000000005')
     or exists (select 1 from public.barbershop_registration_details where barbershop_id = '20000000-0000-0000-0000-000000000005') then
    raise exception 'Barbearia E não teve seus alvos remanescentes limpos';
  end if;

  -- 4.2 Agendamento futuro da Barbearia A foi removido
  if exists (select 1 from public.appointments where id = '30000000-0000-0000-0000-000000000001') then
    raise exception 'Agendamento futuro órfão não foi excluído';
  end if;

  -- 4.3 Agendamento completed COM comissão NÃO foi deletado, mas teve PII anonimizada e snapshot preservado
  if not exists (select 1 from public.appointments where id = '30000000-0000-0000-0000-000000000002') then
    raise exception 'Agendamento com comissão foi deletado indevidamente';
  end if;
  if not exists (select 1 from public.appointment_commissions where appointment_id = '30000000-0000-0000-0000-000000000002') then
    raise exception 'Comissão financeira foi removida indevidamente';
  end if;
  if (select customer_name from public.appointments where id = '30000000-0000-0000-0000-000000000002') <> 'Cliente removido'
     or (select customer_phone from public.appointments where id = '30000000-0000-0000-0000-000000000002') <> '0000000000'
     or (select customer_email from public.appointments where id = '30000000-0000-0000-0000-000000000002') is not null then
    raise exception 'PII do agendamento concluído não foi anonimizada';
  end if;
  if (select service_name_snapshot from public.appointments where id = '30000000-0000-0000-0000-000000000002') <> 'Corte Degradê'
     or (select service_price_snapshot from public.appointments where id = '30000000-0000-0000-0000-000000000002') <> 45.00 then
    raise exception 'Snapshot operacional do agendamento foi corrompido';
  end if;

  -- 4.4 Equipe da Barbearia A inativada e convite revogado
  if (select status from public.team_members where id = '40000000-0000-0000-0000-000000000001') <> 'inactive' then
    raise exception 'Membro de equipe da Barbearia A não foi inativado';
  end if;
  if (select status from public.team_invitations where id = '60000000-0000-0000-0000-000000000001') <> 'revoked' then
    raise exception 'Convite da Barbearia A não foi revogado';
  end if;

  -- 4.5 CRM e Consents da Barbearia A removidos
  if exists (select 1 from public.barbershop_customers where barbershop_id = '20000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.customer_consents where barbershop_id = '20000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.barbershop_registration_details where barbershop_id = '20000000-0000-0000-0000-000000000001') then
    raise exception 'Vínculos da Barbearia A não foram limpos';
  end if;

  -- 5. ISOLAMENTO: Barbearia B (cancelada há apenas 20 dias) permanece 100% INTACTA
  if (select active from public.barbershops where id = '20000000-0000-0000-0000-000000000002') <> true
     or (select whatsapp from public.barbershops where id = '20000000-0000-0000-0000-000000000002') <> '11999990002'
     or (select customer_name from public.appointments where id = '30000000-0000-0000-0000-000000000003') <> 'Cliente B'
     or (select status from public.team_members where id = '40000000-0000-0000-0000-000000000002') <> 'active'
     or (select status from public.team_invitations where id = '60000000-0000-0000-0000-000000000002') <> 'pending'
     or not exists (select 1 from public.barbershop_customers where barbershop_id = '20000000-0000-0000-0000-000000000002') then
    raise exception 'Isolamento violado: Barbearia B foi afetada indevidamente';
  end if;

  -- 5.1 ACORDO COMERCIAL ATIVO: Barbearia D não é afetada mesmo com assinatura vencida há 80 dias
  if (select active from public.barbershops where id = '20000000-0000-0000-0000-000000000004') <> true
     or (select customer_name from public.appointments where id = '30000000-0000-0000-0000-000000000004') <> 'Cliente D'
     or (select whatsapp from public.barbershops where id = '20000000-0000-0000-0000-000000000004') <> '11999990004' then
    raise exception 'Acordo comercial violado: Barbearia D com acordo ativo foi processada indevidamente';
  end if;

  -- 6. CONTAS COMPARTILHADAS: Usuários e cliente global permanecem intactos
  if not exists (select 1 from auth.users where id = '10000000-0000-0000-0000-000000000003')
     or not exists (select 1 from public.customers where id = '50000000-0000-0000-0000-000000000001') then
    raise exception 'Contas compartilhadas ou clientes globais foram deletados indevidamente';
  end if;
end $$;

-- 7. REEXECUÇÃO E IDEMPOTÊNCIA: segunda execução não encontra novos candidatos
do $$
declare
  v_res jsonb;
begin
  v_res := private.process_tenant_retention_cycle(50, false);
  if (v_res->>'processed')::integer <> 0 then
    raise exception 'Idempotência violada: reexecução processou % barbearias', v_res->>'processed';
  end if;
end $$;

-- 8. REATIVAÇÃO CONCORRENTE: se a assinatura for reativada, a rotina não a processa
do $$
declare
  v_res jsonb;
begin
  -- Restaura dados de teste para Barbearia A simulando reativação
  update public.barbershop_subscriptions
  set status = 'active', current_period_ends_at = now() + interval '30 days'
  where barbershop_id = '20000000-0000-0000-0000-000000000001';

  update public.barbershops
  set active = true, notification_email = 'reativada@shopa.test'
  where id = '20000000-0000-0000-0000-000000000001';

  v_res := private.process_tenant_retention_cycle(50, false);
  if (v_res->>'processed')::integer <> 0 then
    raise exception 'Reativação ignorada: rotina processou barbearia com assinatura ativa!';
  end if;

  if (select active from public.barbershops where id = '20000000-0000-0000-0000-000000000001') <> true then
    raise exception 'Barbearia reativada foi modificada indevidamente';
  end if;
end $$;

-- 9. REGISTRO DE AUDITORIA: confirma que a tabela de log registrou as execuções sem PII
do $$
declare
  v_log_count integer;
begin
  select count(*) into v_log_count from private.tenant_retention_execution_logs;
  if v_log_count < 2 then
    raise exception 'Log de auditoria não registrou as execuções (encontrado % registros)', v_log_count;
  end if;

  -- Confirma que o log não contém campos de PII
  if exists (
    select 1
    from private.tenant_retention_execution_logs l
    where l.details::text ~* '(Cliente Ficticio|1199999|contato@shopa)'
  ) then
    raise exception 'Log de auditoria vazou dados pessoais (PII)!';
  end if;

  raise notice 'BLD-03: TODOS OS TESTES PASSARAM COM SUCESSO!';
end $$;

rollback;
