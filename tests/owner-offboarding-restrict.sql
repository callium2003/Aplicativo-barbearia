-- Disposable PostgreSQL fixture for D1/D2. Run with psql -v ON_ERROR_STOP=1.
-- No user data is read; the whole fixture rolls back.
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema auth;
create schema private;
create schema storage;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table auth.users (id uuid primary key, email text);
create table public.barbershops (
  id uuid primary key,
  owner_id uuid not null,
  name text not null,
  slug text not null unique,
  whatsapp text, address text, description text, photo_url text,
  instagram_url text, facebook_url text, phone text, notification_email text,
  active boolean not null default true,
  constraint legacy_owner_fk foreign key(owner_id) references auth.users(id) on delete cascade
);
create table public.barbershop_subscriptions (
  barbershop_id uuid primary key references public.barbershops(id),
  status text not null,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz
);
create table public.appointments (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  status text not null,
  cancelled_by uuid references auth.users(id)
);
create table public.appointment_commissions (
  appointment_id uuid primary key,
  constraint legacy_commission_fk foreign key(appointment_id)
    references public.appointments(id) on delete cascade
);
create table public.team_members (
  id uuid primary key,
  barbershop_id uuid not null references public.barbershops(id),
  user_id uuid not null references auth.users(id),
  status text not null
);
create table public.team_invitations (
  id uuid primary key,
  created_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  revoked_by uuid references auth.users(id)
);
create table public.professional_deactivation_reviews (
  id uuid primary key,
  created_by uuid not null references auth.users(id) on delete restrict,
  resolved_by uuid references auth.users(id)
);
create table public.audit_logs (
  id uuid primary key,
  actor_user_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb
);
create table public.barbershop_registration_details (
  barbershop_id uuid primary key references public.barbershops(id),
  responsible_name text not null
);
create table storage.objects (bucket_id text, name text, owner_id text);
create function storage.foldername(p_name text) returns text[]
language sql immutable as $$ select string_to_array(p_name, '/'); $$;
create function private.can_accept_public_booking(p_barbershop_id uuid)
returns boolean language sql stable as $$
  select coalesce((select current_period_ends_at > now()
                   from public.barbershop_subscriptions
                   where barbershop_id = p_barbershop_id), false);
$$;
create function private.barbershop_subscription_effective_end(p_barbershop_id uuid)
returns timestamptz language sql stable as $$
  select current_period_ends_at from public.barbershop_subscriptions
  where barbershop_id = p_barbershop_id;
$$;

\ir ../supabase/migrations/20261003150000_protect_owner_and_commission_offboarding.sql

insert into auth.users values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.invalid'),
  ('10000000-0000-0000-0000-000000000002', 'manager@example.invalid');
insert into public.barbershops(id,owner_id,name,slug,notification_email) values
  ('20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001','Loja de teste','loja-de-teste','owner@example.invalid');
insert into public.barbershop_subscriptions values
  ('20000000-0000-0000-0000-000000000001','cancelled',null,now() - interval '59 days');
insert into public.appointments values
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','scheduled',null),
  ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','completed',null),
  ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','completed',null);
insert into public.appointment_commissions values
  ('30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002');
insert into public.team_members values
  ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002','active');
insert into public.team_invitations values
  ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',null,null);
insert into public.professional_deactivation_reviews values
  ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',null);
insert into public.barbershop_registration_details values
  ('20000000-0000-0000-0000-000000000001','Proprietário Teste');

do $$ begin
  begin
    delete from auth.users where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'D1 failed: active owner deletion succeeded';
  exception when foreign_key_violation then null; end;
  begin
    delete from public.appointments where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'D2 failed: commission appointment deletion succeeded';
  exception when foreign_key_violation then null; end;
  begin
    delete from public.appointments where id = '30000000-0000-0000-0000-000000000003';
    raise exception 'Completed appointment without commission was deleted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Completed appointments cannot be deleted.' then raise; end if;
  end;
  begin
    delete from public.appointments where id = '30000000-0000-0000-0000-000000000002';
    raise exception 'Completed appointment with commission was deleted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Completed appointments cannot be deleted.' then raise; end if;
  end;
end $$;

select public.begin_owner_offboarding('10000000-0000-0000-0000-000000000001');
do $$ begin
  if (select active from public.barbershops where id='20000000-0000-0000-0000-000000000001')
    or (select status from public.team_members where id='40000000-0000-0000-0000-000000000001') <> 'inactive' then
    raise exception 'Offboarding did not deactivate shop/team';
  end if;
  begin
    delete from auth.users where id='10000000-0000-0000-0000-000000000001';
    raise exception 'Owner deletion succeeded before anonymization';
  exception when foreign_key_violation then null; end;
end $$;

select public.confirm_owner_offboarding_export('10000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform public.finalize_owner_offboarding('10000000-0000-0000-0000-000000000001');
    raise exception 'Retention window was bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Owner retention period has not ended.' then raise; end if;
  end;
end $$;
update public.barbershop_subscriptions
set current_period_ends_at = now() - interval '61 days'
where barbershop_id='20000000-0000-0000-0000-000000000001';
select public.finalize_owner_offboarding('10000000-0000-0000-0000-000000000001');
delete from auth.users where id='10000000-0000-0000-0000-000000000001';
do $$ begin
  if (select owner_id is not null or active or notification_email is not null
      from public.barbershops where id='20000000-0000-0000-0000-000000000001')
    or not exists (select 1 from public.appointment_commissions
                   where appointment_id='30000000-0000-0000-0000-000000000001')
    or (select status from private.owner_offboarding_requests
        where barbershop_id='20000000-0000-0000-0000-000000000001') <> 'completed' then
    raise exception 'Offboarding did not preserve history or complete cleanup';
  end if;
  raise notice 'D1/D2 offboarding: TODOS OS ASSERTS PASSARAM';
end $$;
rollback;
