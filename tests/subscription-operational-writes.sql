-- C1 / EFS 24.8: fixture local e descartável para o enforcement de assinatura.
-- Executar somente em PostgreSQL isolado:
--   psql -v ON_ERROR_STOP=1 -f tests/subscription-operational-writes.sql

begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

create schema auth;
create schema private;
create schema storage;

create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;

create function storage.foldername(p_name text) returns text[]
language sql immutable
as $$
  select case
    when position('/' in p_name) = 0 then array[]::text[]
    else string_to_array(regexp_replace(p_name, '/[^/]+$', ''), '/')
  end;
$$;

create function storage.extension(p_name text) returns text
language sql immutable
as $$
  select nullif(regexp_replace(p_name, '^.*\.', ''), p_name);
$$;

create table public.barbershops (
  id uuid primary key,
  owner_id uuid not null,
  name text not null
);

create table public.barbershop_subscriptions (
  barbershop_id uuid primary key references public.barbershops(id),
  status text not null,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz
);

create table public.barbershop_registration_details (
  barbershop_id uuid primary key references public.barbershops(id),
  responsible_name text not null
);
create table public.business_hours (id uuid primary key, barbershop_id uuid not null references public.barbershops(id));
create table public.services (id uuid primary key, barbershop_id uuid not null references public.barbershops(id), name text not null);
create table public.professionals (id uuid primary key, barbershop_id uuid not null references public.barbershops(id), name text not null);
create table public.professional_hours (id uuid primary key, professional_id uuid not null references public.professionals(id));
create table public.professional_breaks (id uuid primary key, professional_id uuid not null references public.professionals(id));
create table public.professional_time_blocks (id uuid primary key, professional_id uuid not null references public.professionals(id));
create table public.professional_saved_custom_hours (id uuid primary key, professional_id uuid not null references public.professionals(id));
create table public.professional_deactivation_reviews (id uuid primary key, barbershop_id uuid not null references public.barbershops(id));
create table public.professional_commission_settings (
  professional_id uuid primary key references public.professionals(id),
  commission_rate_percent numeric not null default 0
);
create table public.team_invitations (id uuid primary key, barbershop_id uuid not null references public.barbershops(id));
create table public.team_members (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  user_id uuid not null,
  professional_id uuid references public.professionals(id)
);
create table public.appointments (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  status text not null
);
create table public.appointment_commissions (
  appointment_id uuid primary key references public.appointments(id),
  barbershop_id uuid not null references public.barbershops(id),
  payment_status text not null default 'pending'
);

-- Escritas explicitamente fora do C1.
create table public.notification_preferences (id uuid primary key, user_id uuid not null, enabled boolean not null);
create table public.user_notifications (id uuid primary key, user_id uuid not null, read_at timestamptz);
create table public.customers (id uuid primary key, user_id uuid not null, name text not null);
create table public.customer_consents (id uuid primary key, customer_id uuid not null, granted boolean not null);
create table public.customer_privacy_requests (id uuid primary key, user_id uuid not null, status text not null);

create table storage.objects (
  id uuid primary key,
  bucket_id text not null,
  name text not null
);
alter table storage.objects enable row level security;

create function private.can_accept_public_booking(p_barbershop_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    subscription.status = 'trialing' and subscription.trial_ends_at > now()
  ) or (
    subscription.status = 'active'
    and (subscription.current_period_ends_at is null or subscription.current_period_ends_at > now())
  ) or (
    subscription.status in ('cancelled', 'past_due')
    and subscription.current_period_ends_at > now()
  ), false)
  from public.barbershop_subscriptions subscription
  where subscription.barbershop_id = p_barbershop_id;
$$;

create function private.current_barbershop_role(p_barbershop_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select case when barbershop.owner_id = (select auth.uid()) then 'owner' end
  from public.barbershops barbershop
  where barbershop.id = p_barbershop_id;
$$;

create function private.current_barber_professional_id(p_barbershop_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select member.professional_id
  from public.team_members member
  where member.barbershop_id = p_barbershop_id
    and member.user_id = (select auth.uid())
  limit 1;
$$;

\ir ../supabase/migrations/20261003110219_enforce_subscription_operational_writes.sql

insert into public.barbershops (id, owner_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ativa'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Vencida recente');
insert into public.barbershop_subscriptions (barbershop_id, status, current_period_ends_at) values
  ('20000000-0000-0000-0000-000000000001', 'active', now() + interval '30 days'),
  ('20000000-0000-0000-0000-000000000002', 'cancelled', now() - interval '1 day');
insert into public.professionals (id, barbershop_id, name) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Profissional ativo'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Profissional vencido');
insert into public.professional_commission_settings (professional_id, commission_rate_percent) values
  ('30000000-0000-0000-0000-000000000001', 10),
  ('30000000-0000-0000-0000-000000000002', 10);
insert into public.appointments (id, barbershop_id, status) values
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'scheduled');

create function private.fixture_sync_commission()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'completed' then
    insert into public.appointment_commissions (appointment_id, barbershop_id)
    values (new.id, new.barbershop_id)
    on conflict (appointment_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger fixture_sync_commission
after update of status on public.appointments
for each row execute function private.fixture_sync_commission();

grant usage on schema public, private, storage, auth to authenticated;
grant select on public.barbershops, public.professionals, public.barbershop_subscriptions, public.team_members to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.current_barbershop_role(uuid) to authenticated;
grant execute on function private.current_barber_professional_id(uuid) to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001"}', true);

-- Assinatura vigente: escrita operacional e imagem são permitidas.
insert into public.services (id, barbershop_id, name)
values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Corte');
insert into storage.objects (id, bucket_id, name)
values ('60000000-0000-0000-0000-000000000001', 'barbershop-images', '20000000-0000-0000-0000-000000000001/foto.jpg');
update public.professional_commission_settings
set commission_rate_percent = 15
where professional_id = '30000000-0000-0000-0000-000000000001';

-- Assinatura vencida há um dia: ainda está na janela da agenda, mas catálogo,
-- equipe, horários e imagens já não podem ser alterados.
do $$
begin
  begin
    insert into public.services (id, barbershop_id, name)
    values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Bloqueado');
    raise exception 'C1 did not block an expired service write';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'A assinatura precisa estar ativa para alterar a operação da barbearia.' then
        raise;
      end if;
  end;

  begin
    insert into public.professional_hours (id, professional_id)
    values ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002');
    raise exception 'C1 did not block an expired professional schedule write';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'A assinatura precisa estar ativa para alterar a operação da barbearia.' then
        raise;
      end if;
  end;

  begin
    update public.professional_commission_settings
    set commission_rate_percent = 20
    where professional_id = '30000000-0000-0000-0000-000000000002';
    raise exception 'C1 did not block an expired commission setting write';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'A assinatura precisa estar ativa para alterar a operação da barbearia.' then
        raise;
      end if;
  end;

  begin
    insert into storage.objects (id, bucket_id, name)
    values ('60000000-0000-0000-0000-000000000002', 'barbershop-images', '20000000-0000-0000-0000-000000000002/foto.jpg');
    raise exception 'C1 did not block an expired image write';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- A janela de cinco dias continua específica da agenda. A atualização abaixo
-- representa uma transição previamente autorizada pela policy/RPC da agenda;
-- seu ledger financeiro interno também precisa ser criado.
update public.appointments
set status = 'completed'
where id = '40000000-0000-0000-0000-000000000002';

do $$
begin
  if not exists (
    select 1 from public.appointment_commissions
    where appointment_id = '40000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'allowed appointment completion did not create its commission ledger';
  end if;

  begin
    update public.appointment_commissions
    set payment_status = 'paid'
    where appointment_id = '40000000-0000-0000-0000-000000000002';
    raise exception 'C1 did not block a direct expired commission write';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'A assinatura precisa estar ativa para alterar a operação da barbearia.' then
        raise;
      end if;
  end;
end $$;

-- Conta, notificações e privacidade permanecem disponíveis.
insert into public.notification_preferences values ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', true);
insert into public.user_notifications values ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', now());
insert into public.customers values ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Cliente');
insert into public.customer_consents values ('80000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000003', false);
insert into public.customer_privacy_requests values ('80000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'pending');

reset role;

do $$
begin
  raise notice 'subscription-operational-writes: TODOS OS ASSERTS PASSARAM';
end $$;

rollback;
