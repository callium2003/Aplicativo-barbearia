-- Migration: 20261114011000_fix_anonymize_customer_account_scope_and_grant.sql
-- Corrige dois achados de revisão do PR #79 em public.anonymize_my_customer_account():
-- 1. Separa a desvinculação de cancelled_by (apenas zera cancelled_by) da anonimização
--    de dados pessoais dos agendamentos (apenas onde o usuário é o próprio cliente),
--    impedindo que a exclusão de uma conta anonimize reservas de terceiros.
-- 2. Restaura GRANT EXECUTE ON FUNCTION public.anonymize_my_customer_account() TO authenticated.

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
    jsonb_build_object('source', 'customer_portal', 'anonymization_version', '6')
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

  -- Desvincula apenas a referência de quem cancelou, sem alterar dados do cliente da reserva.
  update public.appointments appointment
  set cancelled_by = null
  where appointment.cancelled_by = (select auth.uid());

  -- Anonimiza dados pessoais somente nos agendamentos pertencentes ao próprio cliente.
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
grant execute on function public.anonymize_my_customer_account() to authenticated;
