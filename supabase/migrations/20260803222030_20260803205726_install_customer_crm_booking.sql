-- Customer and CRM vertical slice.  This migration intentionally leaves the
-- reproducible remote baseline and prebaseline history untouched.

create type public.customer_consent_type as enum (
  'BARBERSHOP_MARKETING',
  'PLATFORM_MARKETING'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text not null,
  phone_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_check check (char_length(name) between 2 and 120),
  constraint customers_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint customers_phone_normalized_check check (phone_normalized ~ '^[0-9]{10,13}$')
);

create unique index customers_auth_user_id_key
  on public.customers (auth_user_id)
  where auth_user_id is not null;
create index customers_phone_normalized_idx on public.customers (phone_normalized);

create table public.barbershop_customers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barbershop_customers_barbershop_customer_key unique (barbershop_id, customer_id)
);

create index barbershop_customers_customer_id_idx on public.barbershop_customers (customer_id);

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  barbershop_id uuid references public.barbershops(id) on delete cascade,
  consent_type public.customer_consent_type not null,
  granted boolean not null,
  consent_version text not null,
  source text not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_consents_scope_check check (
    (consent_type = 'BARBERSHOP_MARKETING' and barbershop_id is not null)
    or (consent_type = 'PLATFORM_MARKETING' and barbershop_id is null)
  ),
  constraint customer_consents_event_check check (
    (granted and granted_at is not null and revoked_at is null)
    or (not granted and granted_at is null and revoked_at is not null)
  ),
  constraint customer_consents_version_check check (char_length(consent_version) between 1 and 100),
  constraint customer_consents_source_check check (char_length(source) between 1 and 100)
);

create index customer_consents_customer_scope_created_idx
  on public.customer_consents (customer_id, consent_type, barbershop_id, created_at desc);

alter table public.appointments
  add column customer_global_id uuid references public.customers(id) on delete set null;
create index appointments_customer_global_barbershop_idx
  on public.appointments (customer_global_id, barbershop_id, starts_at desc);

-- Existing appointments keep their immutable appointment snapshots.  We only
-- establish the new identity/link records from the latest known appointment.
insert into public.customers (auth_user_id, name, email, phone, phone_normalized)
select distinct on (a.customer_id)
  a.customer_id,
  a.customer_name,
  coalesce(u.email, a.customer_email),
  a.customer_phone,
  regexp_replace(a.customer_phone, '\D', '', 'g')
from public.appointments a
left join auth.users u on u.id = a.customer_id
where a.customer_id is not null
order by a.customer_id, a.created_at desc
on conflict (auth_user_id) where auth_user_id is not null do update
set name = excluded.name,
    email = coalesce(excluded.email, public.customers.email),
    phone = excluded.phone,
    phone_normalized = excluded.phone_normalized,
    updated_at = now();

update public.appointments a
set customer_global_id = c.id
from public.customers c
where c.auth_user_id = a.customer_id
  and a.customer_global_id is null;

insert into public.barbershop_customers (barbershop_id, customer_id)
select distinct a.barbershop_id, a.customer_global_id
from public.appointments a
where a.customer_global_id is not null
on conflict (barbershop_id, customer_id) do nothing;

create or replace function public.set_customer_crm_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_customer_crm_updated_at();

create trigger set_barbershop_customers_updated_at
before update on public.barbershop_customers
for each row execute function public.set_customer_crm_updated_at();

create trigger set_customer_consents_updated_at
before update on public.customer_consents
for each row execute function public.set_customer_crm_updated_at();

-- This trigger covers legacy/direct appointment inserts as well as the RPC
-- below.  The surrounding INSERT statement is atomic: an appointment failure
-- rolls back the customer and relationship created here.
create or replace function public.sync_customer_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_email text;
begin
  if new.customer_id is null or new.customer_id <> (select auth.uid()) then
    raise exception 'Cliente não autenticado.';
  end if;

  select u.email into v_email from auth.users u where u.id = new.customer_id;
  v_email := coalesce(v_email, new.customer_email);

  insert into public.customers (auth_user_id, name, email, phone, phone_normalized)
  values (
    new.customer_id,
    btrim(new.customer_name),
    v_email,
    btrim(new.customer_phone),
    regexp_replace(new.customer_phone, '\D', '', 'g')
  )
  on conflict (auth_user_id) where auth_user_id is not null do update
  set name = excluded.name,
      email = coalesce(excluded.email, public.customers.email),
      phone = excluded.phone,
      phone_normalized = excluded.phone_normalized,
      updated_at = now()
  returning id into v_customer_id;

  insert into public.barbershop_customers (barbershop_id, customer_id)
  values (new.barbershop_id, v_customer_id)
  on conflict (barbershop_id, customer_id) do nothing;

  new.customer_global_id := v_customer_id;
  return new;
end;
$$;

revoke all on function public.sync_customer_for_appointment() from public;

create trigger crm_sync_customer_for_appointment
before insert on public.appointments
for each row execute function public.sync_customer_for_appointment();

-- This helper is deliberately private and narrowly scoped.  It prevents an
-- RLS recursion between customers and their tenant relationship while still
-- delegating the tenant-role decision to the existing private role helper.
create or replace function private.can_read_related_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.barbershop_customers bc
    where bc.customer_id = p_customer_id
      and private.current_barbershop_role(bc.barbershop_id) in ('owner', 'manager')
  );
$$;

revoke all on function private.can_read_related_customer(uuid) from public;
grant execute on function private.can_read_related_customer(uuid) to authenticated;

-- A SECURITY INVOKER RPC preserves the appointment INSERT RLS check and the
-- pre-existing availability/overlap triggers while keeping all booking writes
-- in the same PostgreSQL transaction.
create or replace function public.book_customer_appointment(
  p_barbershop_id uuid,
  p_service_ids uuid[],
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_barbershop_marketing boolean default false,
  p_platform_marketing boolean default false,
  p_consent_version text default '2026-08-02',
  p_consent_source text default 'booking_form'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment_id uuid;
  v_customer_id uuid;
  -- The public signature stays backward-compatible, but consent provenance is
  -- defined by this server-side flow rather than by values supplied by a browser.
  v_consent_version constant text := '1.0';
  v_consent_source constant text := 'booking_form';
begin
  if (select auth.uid()) is null then
    raise exception 'Cliente não autenticado.';
  end if;

  insert into public.appointments (
    barbershop_id, service_id, service_ids, professional_id, starts_at, ends_at,
    status, customer_id, customer_name, customer_phone, customer_email
  )
  values (
    p_barbershop_id, p_service_ids[1], p_service_ids, p_professional_id,
    p_starts_at, p_starts_at, 'scheduled', (select auth.uid()),
    btrim(p_customer_name), btrim(p_customer_phone), null
  )
  returning id, customer_global_id into v_appointment_id, v_customer_id;

  if p_barbershop_marketing then
    perform set_config('app.crm_consent_write', 'booking', true);
    insert into public.customer_consents (
      customer_id, barbershop_id, consent_type, granted, consent_version,
      source, granted_at
    ) values (
      v_customer_id, p_barbershop_id, 'BARBERSHOP_MARKETING', true,
      v_consent_version, v_consent_source, now()
    );
    perform set_config('app.crm_consent_write', '', true);
  end if;

  if p_platform_marketing then
    perform set_config('app.crm_consent_write', 'booking', true);
    insert into public.customer_consents (
      customer_id, consent_type, granted, consent_version, source, granted_at
    ) values (
      v_customer_id, 'PLATFORM_MARKETING', true,
      v_consent_version, v_consent_source, now()
    );
    perform set_config('app.crm_consent_write', '', true);
  end if;

  return v_appointment_id;
end;
$$;

create or replace function public.revoke_customer_marketing_consent(
  p_consent_type public.customer_consent_type,
  p_barbershop_id uuid default null,
  p_consent_version text default '2026-08-02',
  p_consent_source text default 'customer_settings'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_consent_id uuid;
  -- Kept only for API compatibility; the recorded event is server-defined.
  v_consent_version constant text := '1.0';
  v_consent_source constant text := 'customer_settings';
begin
  select c.id into v_customer_id
  from public.customers c
  where c.auth_user_id = (select auth.uid());

  if v_customer_id is null then
    raise exception 'Cliente não encontrado.';
  end if;

  if (p_consent_type = 'PLATFORM_MARKETING' and p_barbershop_id is not null)
     or (p_consent_type = 'BARBERSHOP_MARKETING' and p_barbershop_id is null) then
    raise exception 'Escopo de consentimento inválido.';
  end if;

  if p_consent_type = 'BARBERSHOP_MARKETING' and not exists (
    select 1 from public.barbershop_customers bc
    where bc.customer_id = v_customer_id and bc.barbershop_id = p_barbershop_id
  ) then
    raise exception 'Cliente não relacionado à barbearia.';
  end if;

  perform set_config('app.crm_consent_write', 'revocation', true);
  insert into public.customer_consents (
    customer_id, barbershop_id, consent_type, granted, consent_version,
    source, revoked_at
  ) values (
    v_customer_id, p_barbershop_id, p_consent_type, false,
    v_consent_version, v_consent_source, now()
  ) returning id into v_consent_id;
  perform set_config('app.crm_consent_write', '', true);

  return v_consent_id;
end;
$$;

-- Metrics intentionally live in this view instead of mutable counters.  This
-- makes status corrections and existing appointment data immediately correct.
alter policy "No direct client access" on public.appointment_services
  to anon
  using (false)
  with check (false);

create policy "Owner or manager can read appointment service snapshots"
on public.appointment_services for select to authenticated
using (
  exists (
    select 1 from public.appointments a
    where a.id = appointment_services.appointment_id
      and private.current_barbershop_role(a.barbershop_id) in ('owner', 'manager')
  )
);

create view public.barbershop_customer_history
with (security_invoker = true)
as
select
  bc.barbershop_id,
  c.id as customer_id,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  a.id as appointment_id,
  a.starts_at,
  a.status,
  a.professional_name_snapshot,
  a.service_name_snapshot,
  a.service_price_snapshot,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'service_id', aps.service_id,
        'name', aps.service_name_snapshot,
        'price', aps.service_price_snapshot,
        'duration_minutes', aps.duration_minutes_snapshot
      ) order by aps.created_at
    ) filter (where aps.id is not null),
    '[]'::jsonb
  ) as services_snapshot,
  count(a.id) over (partition by bc.barbershop_id, c.id) as appointments_count,
  count(a.id) filter (where a.status = 'completed') over (partition by bc.barbershop_id, c.id) as completed_appointments_count,
  min(a.starts_at) over (partition by bc.barbershop_id, c.id) as first_appointment_at,
  max(a.starts_at) over (partition by bc.barbershop_id, c.id) as last_appointment_at,
  max(a.starts_at) filter (where a.status = 'completed') over (partition by bc.barbershop_id, c.id) as last_completed_appointment_at,
  coalesce(sum(a.service_price_snapshot) filter (where a.status = 'completed') over (partition by bc.barbershop_id, c.id), 0) as completed_revenue_total
from public.barbershop_customers bc
join public.customers c on c.id = bc.customer_id
join public.appointments a
  on a.barbershop_id = bc.barbershop_id
 and a.customer_global_id = c.id
left join public.appointment_services aps on aps.appointment_id = a.id
group by bc.barbershop_id, c.id, c.name, c.email, c.phone, a.id, a.starts_at, a.status,
         a.professional_name_snapshot, a.service_name_snapshot, a.service_price_snapshot;

alter table public.customers enable row level security;
alter table public.barbershop_customers enable row level security;
alter table public.customer_consents enable row level security;

create policy "Customer or related manager can read customers"
on public.customers for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or private.can_read_related_customer(id)
);

create policy "Customer can update own global customer"
on public.customers for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

create policy "Customer or owner manager can read barbershop customers"
on public.barbershop_customers for select to authenticated
using (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
  or exists (
    select 1 from public.customers c
    where c.id = barbershop_customers.customer_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "Customer or owner manager can read consents"
on public.customer_consents for select to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = customer_consents.customer_id
      and c.auth_user_id = (select auth.uid())
  )
  or (
    barbershop_id is not null
    and consent_type = 'BARBERSHOP_MARKETING'
    and private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
  )
);

create policy "Customer can record own consent events"
on public.customer_consents for insert to authenticated
with check (
  exists (
    select 1 from public.customers c
    where c.id = customer_consents.customer_id
      and c.auth_user_id = (select auth.uid())
  )
  and (
    (
      consent_type = 'PLATFORM_MARKETING'
      and barbershop_id is null
    )
    or (
      consent_type = 'BARBERSHOP_MARKETING'
      and exists (
        select 1 from public.barbershop_customers bc
        where bc.customer_id = customer_consents.customer_id
          and bc.barbershop_id = customer_consents.barbershop_id
      )
    )
  )
  and consent_version = '1.0'
  and (
    (
      granted
      and source = 'booking_form'
      and current_setting('app.crm_consent_write', true) = 'booking'
    )
    or (
      not granted
      and source = 'customer_settings'
      and current_setting('app.crm_consent_write', true) = 'revocation'
    )
  )
);

grant select on public.customers, public.barbershop_customers, public.customer_consents to authenticated;
grant select on public.appointment_services to authenticated;
grant insert on public.customer_consents to authenticated;
grant select on public.barbershop_customer_history to authenticated;
revoke execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text) from public;
revoke execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text) from anon;
revoke execute on function public.revoke_customer_marketing_consent(public.customer_consent_type, uuid, text, text) from public;
revoke execute on function public.revoke_customer_marketing_consent(public.customer_consent_type, uuid, text, text) from anon;
grant execute on function public.book_customer_appointment(uuid, uuid[], uuid, timestamptz, text, text, boolean, boolean, text, text) to authenticated;
grant execute on function public.revoke_customer_marketing_consent(public.customer_consent_type, uuid, text, text) to authenticated;

-- Correct the Brazilian-phone normalization used by the transactional customer sync.
create or replace function public.sync_customer_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_email text;
begin
  if new.customer_id is null or new.customer_id <> (select auth.uid()) then
    raise exception 'Cliente não autenticado.';
  end if;
  select u.email into v_email from auth.users u where u.id = new.customer_id;
  v_email := coalesce(v_email, new.customer_email);
  insert into public.customers (auth_user_id, name, email, phone, phone_normalized)
  values (new.customer_id, btrim(new.customer_name), v_email, btrim(new.customer_phone), regexp_replace(new.customer_phone, '\D', '', 'g'))
  on conflict (auth_user_id) where auth_user_id is not null do update
  set name = excluded.name,
      email = coalesce(excluded.email, public.customers.email),
      phone = excluded.phone,
      phone_normalized = excluded.phone_normalized,
      updated_at = now()
  returning id into v_customer_id;
  insert into public.barbershop_customers (barbershop_id, customer_id)
  values (new.barbershop_id, v_customer_id)
  on conflict (barbershop_id, customer_id) do nothing;
  new.customer_global_id := v_customer_id;
  return new;
end;
$$;

revoke all on function public.sync_customer_for_appointment() from public;

update public.customers
set phone_normalized = regexp_replace(phone, '\D', '', 'g')
where phone_normalized is distinct from regexp_replace(phone, '\D', '', 'g');
