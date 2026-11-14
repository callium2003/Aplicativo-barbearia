-- Migration: 20261113230000_harden_offboarding_fks_and_leads_access.sql
-- Corrige FKs para auth.users(id) sem ON DELETE SET NULL que bloqueavam
-- a exclusão definitiva de contas (LGPD Art. 18, VI) e atualiza as RPCs
-- anonymize_my_customer_account() e finalize_owner_offboarding(uuid), além
-- de prover leitura/expurgo seguro de platform_leads para platform_owner.

-- ============================================================================
-- 1. FKs para auth.users(id) com ON DELETE SET NULL
-- ============================================================================

alter table public.appointments
  drop constraint if exists appointments_cancelled_by_fkey;
alter table public.appointments
  add constraint appointments_cancelled_by_fkey
  foreign key (cancelled_by) references auth.users(id) on delete set null;

alter table public.platform_support_tickets
  alter column created_by drop not null;
alter table public.platform_support_tickets
  drop constraint if exists platform_support_tickets_created_by_fkey;
alter table public.platform_support_tickets
  add constraint platform_support_tickets_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.platform_support_tickets
  drop constraint if exists platform_support_tickets_assigned_to_fkey;
alter table public.platform_support_tickets
  add constraint platform_support_tickets_assigned_to_fkey
  foreign key (assigned_to) references auth.users(id) on delete set null;

alter table public.platform_support_ticket_messages
  alter column sender_user_id drop not null;
alter table public.platform_support_ticket_messages
  drop constraint if exists platform_support_ticket_messages_sender_user_id_fkey;
alter table public.platform_support_ticket_messages
  add constraint platform_support_ticket_messages_sender_user_id_fkey
  foreign key (sender_user_id) references auth.users(id) on delete set null;

alter table public.platform_operational_incidents
  drop constraint if exists platform_operational_incidents_assigned_to_fkey;
alter table public.platform_operational_incidents
  add constraint platform_operational_incidents_assigned_to_fkey
  foreign key (assigned_to) references auth.users(id) on delete set null;

alter table public.platform_operational_incidents
  drop constraint if exists platform_operational_incidents_acknowledged_by_fkey;
alter table public.platform_operational_incidents
  add constraint platform_operational_incidents_acknowledged_by_fkey
  foreign key (acknowledged_by) references auth.users(id) on delete set null;

alter table public.platform_operational_incidents
  drop constraint if exists platform_operational_incidents_resolved_by_fkey;
alter table public.platform_operational_incidents
  add constraint platform_operational_incidents_resolved_by_fkey
  foreign key (resolved_by) references auth.users(id) on delete set null;

alter table public.platform_operational_incident_notes
  alter column author_user_id drop not null;
alter table public.platform_operational_incident_notes
  drop constraint if exists platform_operational_incident_notes_author_user_id_fkey;
alter table public.platform_operational_incident_notes
  add constraint platform_operational_incident_notes_author_user_id_fkey
  foreign key (author_user_id) references auth.users(id) on delete set null;

-- ============================================================================
-- 2. Atualização de anonymize_my_customer_account() para limpar cancelled_by
-- ============================================================================

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
    jsonb_build_object('source', 'customer_portal', 'anonymization_version', '5')
  );

  update public.customer_privacy_requests request
  set status = 'PROCESSING'
  where request.id = v_request.id
    and request.status = 'PENDING';

  delete from public.appointments appointment
  where (
      appointment.customer_id = (select auth.uid())
      or appointment.customer_global_id = v_customer_id
    )
    and appointment.status = 'scheduled'
    and appointment.starts_at > now();

  delete from public.user_notifications notification
  where notification.recipient_user_id = (select auth.uid());

  delete from public.notification_preferences preference
  where preference.user_id = (select auth.uid());

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
      cancelled_by = case
        when appointment.cancelled_by = (select auth.uid()) then null
        else appointment.cancelled_by
      end,
      customer_name = 'Cliente removido',
      customer_phone = '0000000000',
      customer_email = null,
      notes = null,
      cancel_reason = null
  where appointment.customer_id = (select auth.uid())
     or appointment.customer_global_id = v_customer_id
     or appointment.cancelled_by = (select auth.uid());

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

  update public.customers customer
  set name = 'Cliente removido',
      email = null,
      phone = '0000000000',
      phone_normalized = '0000000000'
  where customer.id = v_customer_id;

  update public.customer_privacy_requests request
  set status = 'COMPLETED',
      completed_at = now()
  where request.id = v_request.id;

  return query select v_request.public_protocol, 'COMPLETED'::text;
end;
$$;

revoke all on function public.anonymize_my_customer_account() from public, anon, authenticated;

-- ============================================================================
-- 3. Atualização de finalize_owner_offboarding(uuid) para desvincular suporte/incidentes
-- ============================================================================

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
  update public.platform_support_tickets
  set created_by = null where created_by = p_user_id;
  update public.platform_support_tickets
  set assigned_to = null where assigned_to = p_user_id;
  update public.platform_support_ticket_messages
  set sender_user_id = null where sender_user_id = p_user_id;
  update public.platform_operational_incidents
  set assigned_to = null where assigned_to = p_user_id;
  update public.platform_operational_incidents
  set acknowledged_by = null where acknowledged_by = p_user_id;
  update public.platform_operational_incidents
  set resolved_by = null where resolved_by = p_user_id;
  update public.platform_operational_incident_notes
  set author_user_id = null where author_user_id = p_user_id;
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

-- ============================================================================
-- 4. Governança de leitura e expurgo de platform_leads para platform_owner
-- ============================================================================

create or replace function public.list_platform_leads(p_limit integer default 100)
returns table(
  id uuid,
  full_name text,
  whatsapp text,
  barbershop_name text,
  team_size text,
  city_state text,
  notes text,
  source text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_active_platform_owner() then
    raise exception 'Sem permissão para consultar leads da plataforma.' using errcode = '42501';
  end if;

  return query
    select l.id, l.full_name, l.whatsapp, l.barbershop_name, l.team_size, l.city_state, l.notes, l.source, l.created_at
    from public.platform_leads l
    order by l.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

revoke all on function public.list_platform_leads(integer) from public, anon, authenticated;
grant execute on function public.list_platform_leads(integer) to authenticated;

create or replace function public.purge_expired_platform_leads(p_retention_days integer default 180)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
begin
  if auth.uid() is not null and not private.is_active_platform_owner() then
    raise exception 'Sem permissão para expurgar leads da plataforma.' using errcode = '42501';
  end if;

  delete from public.platform_leads
  where created_at < now() - make_interval(days => greatest(coalesce(p_retention_days, 180), 30));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_platform_leads(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_platform_leads(integer) to authenticated, service_role;
