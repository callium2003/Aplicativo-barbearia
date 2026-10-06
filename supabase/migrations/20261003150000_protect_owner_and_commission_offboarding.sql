-- D1/D2: protect operational history while allowing a controlled owner exit.
-- The referenced FK is discovered by its columns and parent table at execution
-- time; a historical/default constraint name is never assumed.
do $$
declare
  v_fk text;
  v_count integer;
begin
  select count(*), min(c.conname)
    into v_count, v_fk
  from pg_constraint c
  where c.conrelid = 'public.barbershops'::regclass
    and c.confrelid = 'auth.users'::regclass
    and c.contype = 'f'
    and c.conkey = array[(select attnum from pg_attribute where attrelid = c.conrelid and attname = 'owner_id')]::smallint[];
  if v_count <> 1 then
    raise exception 'Expected exactly one barbershops.owner_id FK to auth.users; found %', v_count;
  end if;
  execute format('alter table public.barbershops drop constraint %I', v_fk);
  alter table public.barbershops add constraint barbershops_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete restrict;

  select count(*), min(c.conname)
    into v_count, v_fk
  from pg_constraint c
  where c.conrelid = 'public.appointment_commissions'::regclass
    and c.confrelid = 'public.appointments'::regclass
    and c.contype = 'f'
    and c.conkey = array[(select attnum from pg_attribute where attrelid = c.conrelid and attname = 'appointment_id')]::smallint[];
  if v_count <> 1 then
    raise exception 'Expected exactly one appointment_commissions.appointment_id FK to appointments; found %', v_count;
  end if;
  execute format('alter table public.appointment_commissions drop constraint %I', v_fk);
  alter table public.appointment_commissions add constraint appointment_commissions_appointment_id_fkey
    foreign key (appointment_id) references public.appointments(id) on delete restrict;
end;
$$;

-- Completed appointments remain as anonymous operational history even if no
-- commission was ever written for them. Other rows with a commission are
-- protected independently by the RESTRICT foreign key above.
create or replace function private.prevent_completed_appointment_deletion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    raise exception using errcode = 'P0001', message = 'Completed appointments cannot be deleted.';
  end if;
  return old;
end;
$$;
revoke all on function private.prevent_completed_appointment_deletion() from public, anon, authenticated;
drop trigger if exists prevent_completed_appointment_deletion on public.appointments;
create trigger prevent_completed_appointment_deletion
before delete on public.appointments
for each row execute function private.prevent_completed_appointment_deletion();

alter table public.barbershops alter column owner_id drop not null;
alter table public.barbershops add constraint barbershops_ownerless_inactive_check
  check (owner_id is not null or active = false);

-- These author references must be nullable so they can be removed without
-- deleting invitation and deactivation history.
alter table public.team_invitations alter column created_by drop not null;
alter table public.professional_deactivation_reviews alter column created_by drop not null;

create table private.owner_offboarding_requests (
  barbershop_id uuid primary key references public.barbershops(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'deactivated'
    check (status in ('deactivated', 'export_confirmed', 'ready_for_auth_deletion', 'completed')),
  requested_at timestamptz not null default now(),
  export_confirmed_at timestamptz,
  finalized_at timestamptz,
  completed_at timestamptz,
  constraint owner_offboarding_export_state_check check (
    status = 'deactivated' or export_confirmed_at is not null
  )
);

create unique index owner_offboarding_user_pending_idx
  on private.owner_offboarding_requests(owner_user_id)
  where owner_user_id is not null;
alter table private.owner_offboarding_requests enable row level security;
revoke all on private.owner_offboarding_requests from public, anon, authenticated;
grant select, insert, update on private.owner_offboarding_requests to service_role;

-- Auth deletion sets owner_user_id to NULL in the same transaction. Mark the
-- protocol complete there, without a second network operation after deletion.
create or replace function private.complete_owner_offboarding_on_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.owner_user_id is not null and new.owner_user_id is null then
    if old.status <> 'ready_for_auth_deletion' then
      raise exception using errcode = 'P0001', message = 'Owner Auth deletion requires finalized offboarding.';
    end if;
    new.status := 'completed';
    new.completed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.complete_owner_offboarding_on_auth_delete() from public, anon, authenticated;
create trigger complete_owner_offboarding_on_auth_delete
before update of owner_user_id on private.owner_offboarding_requests
for each row execute function private.complete_owner_offboarding_on_auth_delete();

-- C1 remains the subscription guard; offboarding additionally freezes its
-- operational writes even when a paid period has not yet ended.
create or replace function private.can_write_barbershop_operations(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.can_accept_public_booking(p_barbershop_id), false)
    and not exists (
      select 1 from private.owner_offboarding_requests request
      where request.barbershop_id = p_barbershop_id
    );
$$;
revoke all on function private.can_write_barbershop_operations(uuid) from public, anon, authenticated;
grant execute on function private.can_write_barbershop_operations(uuid) to authenticated;

create or replace function private.guard_owner_offboarding_barbershop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select request.status into v_status
  from private.owner_offboarding_requests request
  where request.barbershop_id = new.id;

  if v_status is not null and new.active then
    raise exception using errcode = 'P0001', message = 'Offboarded barbershop cannot be reactivated.';
  end if;
  if v_status is not null and (select auth.uid()) is not null then
    raise exception using errcode = 'P0001', message = 'Offboarded barbershop is read-only.';
  end if;
  if old.owner_id is not null and new.owner_id is null
    and coalesce(v_status, '') <> 'ready_for_auth_deletion' then
    raise exception using errcode = 'P0001', message = 'Owner can be detached only by offboarding.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_owner_offboarding_barbershop() from public, anon, authenticated;
drop trigger if exists guard_owner_offboarding_barbershop on public.barbershops;
create trigger guard_owner_offboarding_barbershop
before update on public.barbershops
for each row execute function private.guard_owner_offboarding_barbershop();

-- Only the trusted Edge Function receives service-role execution of the
-- mutation RPCs. Caller identity is obtained from a verified bearer there.
create or replace function public.begin_owner_offboarding(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop public.barbershops;
  v_request private.owner_offboarding_requests;
begin
  select shop.* into v_shop
  from public.barbershops shop
  where shop.owner_id = p_user_id
  for update;
  if v_shop.id is null then
    raise exception using errcode = 'P0001', message = 'Owner barbershop not found.';
  end if;
  if exists (select 1 from public.team_members member where member.user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'Team membership must be resolved before owner offboarding.';
  end if;

  select request.* into v_request
  from private.owner_offboarding_requests request
  where request.barbershop_id = v_shop.id
  for update;
  if v_request.barbershop_id is null then
    insert into private.owner_offboarding_requests(barbershop_id, owner_user_id)
    values (v_shop.id, p_user_id)
    returning * into v_request;
  elsif v_request.owner_user_id is distinct from p_user_id then
    raise exception using errcode = 'P0001', message = 'Offboarding owner mismatch.';
  end if;

  update public.barbershops set active = false where id = v_shop.id and active;
  update public.team_members set status = 'inactive'
    where barbershop_id = v_shop.id and status = 'active';

  return jsonb_build_object(
    'status', v_request.status,
    'eligible_at', private.barbershop_subscription_effective_end(v_shop.id) + interval '60 days',
    'eligible', now() >= private.barbershop_subscription_effective_end(v_shop.id) + interval '60 days'
  );
end;
$$;
revoke all on function public.begin_owner_offboarding(uuid) from public, anon, authenticated;
grant execute on function public.begin_owner_offboarding(uuid) to service_role;

create or replace function public.confirm_owner_offboarding_export(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request private.owner_offboarding_requests;
begin
  select request.* into v_request
  from private.owner_offboarding_requests request
  where request.owner_user_id = p_user_id
  for update;
  if v_request.barbershop_id is null then
    raise exception using errcode = 'P0001', message = 'Owner offboarding not started.';
  end if;
  update private.owner_offboarding_requests
  set status = 'export_confirmed', export_confirmed_at = coalesce(export_confirmed_at, now())
  where barbershop_id = v_request.barbershop_id and status = 'deactivated';
  return jsonb_build_object(
    'status', 'export_confirmed',
    'eligible_at', private.barbershop_subscription_effective_end(v_request.barbershop_id) + interval '60 days',
    'eligible', now() >= private.barbershop_subscription_effective_end(v_request.barbershop_id) + interval '60 days'
  );
end;
$$;
revoke all on function public.confirm_owner_offboarding_export(uuid) from public, anon, authenticated;
grant execute on function public.confirm_owner_offboarding_export(uuid) to service_role;

create or replace function public.get_owner_offboarding_state(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'barbershop_id', request.barbershop_id,
    'status', request.status,
    'eligible_at', private.barbershop_subscription_effective_end(request.barbershop_id) + interval '60 days',
    'eligible', now() >= private.barbershop_subscription_effective_end(request.barbershop_id) + interval '60 days'
  )
  from private.owner_offboarding_requests request
  where request.owner_user_id = p_user_id;
$$;
revoke all on function public.get_owner_offboarding_state(uuid) from public, anon, authenticated;
grant execute on function public.get_owner_offboarding_state(uuid) to service_role;

create or replace function public.list_owner_offboarding_storage(p_user_id uuid)
returns table(bucket_id text, object_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select object.bucket_id, object.name
  from storage.objects object
  join private.owner_offboarding_requests request
    on request.owner_user_id = p_user_id
  where request.status in ('export_confirmed', 'ready_for_auth_deletion')
    and (
      object.owner_id = p_user_id::text
      or (object.bucket_id = 'barbershop-images'
        and (storage.foldername(object.name))[1] = request.barbershop_id::text)
    );
$$;
revoke all on function public.list_owner_offboarding_storage(uuid) from public, anon, authenticated;
grant execute on function public.list_owner_offboarding_storage(uuid) to service_role;

create or replace function public.finalize_owner_offboarding(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request private.owner_offboarding_requests;
  v_effective_end timestamptz;
begin
  select request.* into v_request
  from private.owner_offboarding_requests request
  where request.owner_user_id = p_user_id
  for update;
  if v_request.barbershop_id is null or v_request.export_confirmed_at is null then
    raise exception using errcode = 'P0001', message = 'Export confirmation required.';
  end if;
  v_effective_end := private.barbershop_subscription_effective_end(v_request.barbershop_id);
  if v_effective_end is null or now() < v_effective_end + interval '60 days' then
    raise exception using errcode = 'P0001', message = 'Owner retention period has not ended.';
  end if;
  if exists (select 1 from public.team_members member where member.user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'Team membership must be resolved before owner deletion.';
  end if;
  if v_request.status = 'ready_for_auth_deletion' then
    return jsonb_build_object('barbershop_id', v_request.barbershop_id, 'status', v_request.status);
  end if;

  update private.owner_offboarding_requests
  set status = 'ready_for_auth_deletion', finalized_at = now()
  where barbershop_id = v_request.barbershop_id;

  update public.team_invitations
  set created_by = null where created_by = p_user_id;
  update public.team_invitations
  set accepted_by = null where accepted_by = p_user_id;
  update public.team_invitations
  set revoked_by = null where revoked_by = p_user_id;
  update public.professional_deactivation_reviews
  set created_by = null where created_by = p_user_id;
  update public.professional_deactivation_reviews
  set resolved_by = null where resolved_by = p_user_id;
  update public.appointments
  set cancelled_by = null where cancelled_by = p_user_id;
  update public.audit_logs
  set actor_user_id = null, metadata = '{}'::jsonb
  where actor_user_id = p_user_id;
  delete from public.barbershop_registration_details
  where barbershop_id = v_request.barbershop_id;
  update public.barbershops
  set owner_id = null,
      active = false,
      name = 'Barbearia encerrada',
      slug = 'encerrada-' || replace(gen_random_uuid()::text, '-', ''),
      whatsapp = null, address = null, description = null,
      photo_url = null, instagram_url = null, facebook_url = null,
      phone = null, notification_email = null
  where id = v_request.barbershop_id and owner_id = p_user_id;

  return jsonb_build_object('barbershop_id', v_request.barbershop_id, 'status', 'ready_for_auth_deletion');
end;
$$;
revoke all on function public.finalize_owner_offboarding(uuid) from public, anon, authenticated;
grant execute on function public.finalize_owner_offboarding(uuid) to service_role;
