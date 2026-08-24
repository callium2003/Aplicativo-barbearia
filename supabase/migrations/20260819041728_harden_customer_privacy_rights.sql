create or replace function private.new_customer_privacy_protocol()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'PRV-' || upper(encode(extensions.gen_random_bytes(10), 'hex'));
$$;

create or replace function private.is_safe_customer_privacy_metadata(p_metadata jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_metadata) <> 'object' then false
    else not exists (
      select 1
      from jsonb_each_text(p_metadata) as entry(key, value)
      where entry.key not in ('source', 'export_format', 'anonymization_version')
         or entry.value !~ '^[A-Za-z0-9._-]{1,64}$'
    )
  end;
$$;

create table public.customer_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  public_protocol text not null default private.new_customer_privacy_protocol(),
  request_type text not null,
  status text not null default 'PENDING',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_privacy_requests_protocol_key unique (public_protocol),
  constraint customer_privacy_requests_type_check
    check (request_type in ('DATA_EXPORT', 'ACCOUNT_DELETION')),
  constraint customer_privacy_requests_status_check
    check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  constraint customer_privacy_requests_metadata_check
    check (private.is_safe_customer_privacy_metadata(metadata)),
  constraint customer_privacy_requests_completed_at_check
    check ((status <> 'COMPLETED') or completed_at is not null),
  constraint customer_privacy_requests_cancelled_at_check
    check ((status <> 'CANCELLED') or cancelled_at is not null)
);

alter table public.customer_privacy_requests enable row level security;

create policy "Customer reads own privacy requests"
on public.customer_privacy_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.customers customer
    where customer.id = customer_privacy_requests.customer_id
      and customer.auth_user_id = (select auth.uid())
  )
);

revoke all on table public.customer_privacy_requests from public, anon;
grant select on table public.customer_privacy_requests to authenticated;

create index customer_privacy_requests_customer_requested_idx
  on public.customer_privacy_requests (customer_id, requested_at desc);

create unique index customer_privacy_requests_one_open_request_per_type
  on public.customer_privacy_requests (customer_id, request_type)
  where status in ('PENDING', 'PROCESSING');

create trigger set_customer_privacy_requests_updated_at
before update on public.customer_privacy_requests
for each row execute function public.set_customer_crm_updated_at();

create or replace function private.current_customer_privacy_customer_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = 'P0001', message = 'Authenticated customer required.';
  end if;

  select customer.id
  into v_customer_id
  from public.customers customer
  where customer.auth_user_id = (select auth.uid());

  if v_customer_id is null then
    raise exception using errcode = 'P0001', message = 'Customer profile not found.';
  end if;

  return v_customer_id;
end;
$$;

create or replace function private.has_recent_customer_authentication()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'iat'), '') ~ '^[0-9]{10}$'
    and to_timestamp((select auth.jwt() ->> 'iat')::bigint) >= now() - interval '15 minutes'
    and exists (
      select 1
      from jsonb_array_elements(coalesce((select auth.jwt() -> 'amr'), '[]'::jsonb)) as method
      where coalesce(method ->> 'method', '') <> 'token_refresh'
        and coalesce(method ->> 'timestamp', '') ~ '^[0-9]{10}$'
        and to_timestamp((method ->> 'timestamp')::bigint) >= now() - interval '15 minutes'
    );
$$;

create or replace function private.open_customer_privacy_request(
  p_customer_id uuid,
  p_request_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.customer_privacy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.customer_privacy_requests;
begin
  select request.*
  into v_request
  from public.customer_privacy_requests request
  where request.customer_id = p_customer_id
    and request.request_type = p_request_type
    and request.status in ('PENDING', 'PROCESSING')
  order by request.requested_at desc
  limit 1
  for update;

  if v_request.id is not null then
    return v_request;
  end if;

  insert into public.customer_privacy_requests (customer_id, request_type, metadata)
  values (p_customer_id, p_request_type, p_metadata)
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.export_my_customer_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_request public.customer_privacy_requests;
  v_profile jsonb;
  v_barbershops jsonb;
  v_appointments jsonb;
  v_consents jsonb;
begin
  v_customer_id := private.current_customer_privacy_customer_id();

  perform 1
  from public.customers customer
  where customer.id = v_customer_id
  for update;

  v_request := private.open_customer_privacy_request(
    v_customer_id,
    'DATA_EXPORT',
    jsonb_build_object('source', 'customer_portal', 'export_format', 'json')
  );

  update public.customer_privacy_requests request
  set status = 'PROCESSING'
  where request.id = v_request.id
    and request.status = 'PENDING';

  select jsonb_build_object(
    'name', customer.name,
    'email', customer.email,
    'phone', customer.phone,
    'created_at', customer.created_at
  )
  into v_profile
  from public.customers customer
  where customer.id = v_customer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', barbershop.name,
    'slug', barbershop.slug,
    'related_since', relation.created_at
  ) order by barbershop.name), '[]'::jsonb)
  into v_barbershops
  from public.barbershop_customers relation
  join public.barbershops barbershop on barbershop.id = relation.barbershop_id
  where relation.customer_id = v_customer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', appointment.id,
    'barbershop_name', barbershop.name,
    'starts_at', appointment.starts_at,
    'ends_at', appointment.ends_at,
    'status', appointment.status,
    'service', appointment.service_name_snapshot,
    'professional', appointment.professional_name_snapshot,
    'duration_minutes', appointment.duration_minutes_snapshot,
    'price', appointment.service_price_snapshot,
    'created_at', appointment.created_at
  ) order by appointment.starts_at desc), '[]'::jsonb)
  into v_appointments
  from public.appointments appointment
  join public.barbershops barbershop on barbershop.id = appointment.barbershop_id
  where appointment.customer_id = (select auth.uid())
     or appointment.customer_global_id = v_customer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', consent.consent_type,
    'barbershop_name', barbershop.name,
    'granted', consent.granted,
    'version', consent.consent_version,
    'source', consent.source,
    'granted_at', consent.granted_at,
    'revoked_at', consent.revoked_at,
    'recorded_at', consent.created_at
  ) order by consent.created_at desc), '[]'::jsonb)
  into v_consents
  from public.customer_consents consent
  left join public.barbershops barbershop on barbershop.id = consent.barbershop_id
  where consent.customer_id = v_customer_id;

  update public.customer_privacy_requests request
  set status = 'COMPLETED',
      completed_at = now()
  where request.id = v_request.id;

  return jsonb_build_object(
    'protocol', v_request.public_protocol,
    'generated_at', now(),
    'profile', coalesce(v_profile, '{}'::jsonb),
    'barbershops', v_barbershops,
    'appointments', v_appointments,
    'consents', v_consents
  );
end;
$$;

alter table public.notification_outbox
  alter column recipient_email drop not null;

create or replace function public.protect_customer_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.customer_id = (select auth.uid()) then
    if new.customer_id is null
       and new.customer_global_id is null
       and new.customer_name = 'Cliente removido'
       and new.customer_phone = '0000000000'
       and new.customer_email is null
       and new.notes is null
       and new.cancel_reason is null
       and (to_jsonb(new) - array[
         'customer_id', 'customer_global_id', 'customer_name', 'customer_phone',
         'customer_email', 'notes', 'cancel_reason'
       ]) is not distinct from (to_jsonb(old) - array[
         'customer_id', 'customer_global_id', 'customer_name', 'customer_phone',
         'customer_email', 'notes', 'cancel_reason'
       ]) then
      return new;
    end if;

    if old.status not in ('scheduled', 'confirmed') or old.starts_at <= now() then
      raise exception 'Este agendamento não pode mais ser cancelado pelo cliente.';
    end if;

    if new.status <> 'cancelled'
       or (to_jsonb(new) - array['status', 'cancelled_at', 'cancelled_by', 'cancel_reason'])
          is distinct from (to_jsonb(old) - array['status', 'cancelled_at', 'cancelled_by', 'cancel_reason']) then
      raise exception 'O cliente pode apenas cancelar o próprio agendamento.';
    end if;

    new.cancelled_at := now();
    new.cancelled_by := (select auth.uid());
  end if;

  return new;
end;
$$;

create or replace function public.anonymize_my_customer_account()
returns table (public_protocol text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_request public.customer_privacy_requests;
begin
  if not private.has_recent_customer_authentication() then
    raise exception using errcode = 'P0001', message = 'Recent authentication required.';
  end if;

  if exists (
    select 1
    from public.barbershops barbershop
    where barbershop.owner_id = (select auth.uid())
  ) or exists (
    select 1
    from public.team_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'Operational account cannot use customer deletion.';
  end if;

  v_customer_id := private.current_customer_privacy_customer_id();

  perform 1
  from public.customers customer
  where customer.id = v_customer_id
  for update;

  select request.*
  into v_request
  from public.customer_privacy_requests request
  where request.customer_id = v_customer_id
    and request.request_type = 'ACCOUNT_DELETION'
    and request.status = 'COMPLETED'
  order by request.completed_at desc
  limit 1;

  if v_request.id is not null then
    return query select v_request.public_protocol, v_request.status;
    return;
  end if;

  v_request := private.open_customer_privacy_request(
    v_customer_id,
    'ACCOUNT_DELETION',
    jsonb_build_object('source', 'customer_portal', 'anonymization_version', '1')
  );

  update public.customer_privacy_requests request
  set status = 'PROCESSING'
  where request.id = v_request.id
    and request.status = 'PENDING';

  update public.notification_outbox outbox
  set recipient_email = null,
      recipient_user_id = null,
      payload = '{}'::jsonb
  where outbox.appointment_id in (
    select appointment.id
    from public.appointments appointment
    where appointment.customer_id = (select auth.uid())
       or appointment.customer_global_id = v_customer_id
  );

  update public.appointments appointment
  set customer_id = null,
      customer_global_id = null,
      customer_name = 'Cliente removido',
      customer_phone = '0000000000',
      customer_email = null,
      notes = null,
      cancel_reason = null
  where appointment.customer_id = (select auth.uid())
     or appointment.customer_global_id = v_customer_id;

  delete from public.customer_consents consent
  where consent.customer_id = v_customer_id;

  delete from public.barbershop_customers relation
  where relation.customer_id = v_customer_id;

  update public.audit_logs audit
  set actor_user_id = null,
      entity_id = null,
      metadata = '{}'::jsonb
  where audit.actor_user_id = (select auth.uid())
     or audit.entity_id = v_customer_id;

  perform set_config('storage.allow_delete_query', 'true', true);

  delete from storage.objects storage_object
  where storage_object.owner_id = (select auth.uid())::text;

  update public.customers customer
  set name = 'Cliente removido',
      email = null,
      phone = '0000000000',
      phone_normalized = '0000000000'
  where customer.id = v_customer_id;

  update public.audit_logs audit
  set actor_user_id = null,
      entity_id = null,
      metadata = '{}'::jsonb
  where audit.actor_user_id = (select auth.uid())
     or audit.entity_id = v_customer_id;

  update public.customer_privacy_requests request
  set status = 'COMPLETED',
      completed_at = now()
  where request.id = v_request.id;

  return query select v_request.public_protocol, 'COMPLETED'::text;
end;
$$;

revoke all on function private.current_customer_privacy_customer_id() from public;
revoke all on function private.has_recent_customer_authentication() from public;
revoke all on function private.open_customer_privacy_request(uuid, text, jsonb) from public;
revoke all on function public.export_my_customer_data() from public, anon;
revoke all on function public.anonymize_my_customer_account() from public, anon;
grant execute on function public.export_my_customer_data() to authenticated;
grant execute on function public.anonymize_my_customer_account() to authenticated;
