-- BLD-03: Rotina segura e idempotente de retenção, anonimização e expurgo de tenants.
-- Executada exclusivamente em ambiente isolado ou pelo agendador de banco (service_role).
-- Preserva histórico operacional anonimizado e integridade fiscal/financeira.

create table if not exists private.tenant_retention_execution_logs (
  id uuid primary key default gen_random_uuid(),
  executed_at timestamptz not null default now(),
  dry_run boolean not null default false,
  barbershops_evaluated integer not null default 0,
  barbershops_processed integer not null default 0,
  appointments_anonymized integer not null default 0,
  details jsonb not null default '[]'::jsonb
);

alter table private.tenant_retention_execution_logs enable row level security;
revoke all on private.tenant_retention_execution_logs from public, anon, authenticated;
grant select, insert on private.tenant_retention_execution_logs to service_role;

create or replace function private.process_tenant_retention_cycle(
  p_batch_size integer default 50,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_limit integer;
  v_candidate record;
  v_effective_end timestamptz;
  v_has_active_subscription boolean;
  v_has_active_agreement boolean;
  v_appointments_count integer;
  v_total_evaluated integer := 0;
  v_total_processed integer := 0;
  v_total_appointments_anonymized integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_shop_detail jsonb;
begin
  v_batch_limit := greatest(1, least(coalesce(p_batch_size, 50), 200));

  for v_candidate in
    select
      b.id as barbershop_id,
      b.name as barbershop_name,
      b.active as is_active,
      b.owner_id,
      private.barbershop_subscription_effective_end(b.id) as effective_end
    from public.barbershops b
    where private.barbershop_subscription_effective_end(b.id) is not null
      and now() >= private.barbershop_subscription_effective_end(b.id) + interval '60 days'
      and not exists (
        select 1
        from public.barbershop_subscriptions s
        where s.barbershop_id = b.id
          and s.status = 'active'
          and (s.current_period_ends_at is null or s.current_period_ends_at > now())
      )
      and not exists (
        select 1
        from private.platform_commercial_agreements ca
        where ca.barbershop_id = b.id
          and ca.active
          and ca.ends_at > now()
      )
      and (
        b.active = true
        or b.notification_email is not null
        or b.whatsapp is not null
        or b.address is not null
        or b.description is not null
        or b.photo_url is not null
        or b.instagram_url is not null
        or b.facebook_url is not null
        or b.phone is not null
        or exists (
          select 1
          from public.appointments a
          where a.barbershop_id = b.id
            and (
              (a.status = 'scheduled' and a.starts_at > now())
              or a.customer_id is not null
              or a.customer_global_id is not null
              or a.customer_name <> 'Cliente removido'
              or a.customer_phone <> '0000000000'
              or a.customer_email is not null
              or a.notes is not null
              or a.cancel_reason is not null
              or a.cancelled_by is not null
            )
        )
        or exists (
          select 1
          from public.barbershop_customers bc
          where bc.barbershop_id = b.id
        )
        or exists (
          select 1
          from public.customer_consents cc
          where cc.barbershop_id = b.id
        )
        or exists (
          select 1
          from public.notification_outbox nox
          where nox.barbershop_id = b.id
            and (
              nox.recipient_email is not null
              or nox.recipient_user_id is not null
              or nox.payload <> '{}'::jsonb
            )
        )
        or exists (
          select 1
          from public.user_notifications un
          where un.barbershop_id = b.id
        )
        or exists (
          select 1
          from public.team_members tm
          where tm.barbershop_id = b.id
            and tm.status = 'active'
        )
        or exists (
          select 1
          from public.team_invitations ti
          where ti.barbershop_id = b.id
            and ti.status = 'pending'
        )
        or exists (
          select 1
          from public.barbershop_registration_details rd
          where rd.barbershop_id = b.id
        )
        or exists (
          select 1
          from public.audit_logs al
          where al.barbershop_id = b.id
            and (
              al.actor_user_id is not null
              or al.entity_id is not null
              or al.metadata <> '{}'::jsonb
            )
        )
      )
    order by private.barbershop_subscription_effective_end(b.id) asc
    limit v_batch_limit
    for update of b skip locked
  loop
    v_total_evaluated := v_total_evaluated + 1;

    -- Revalidação de segurança dentro do bloqueio de concorrência
    v_effective_end := private.barbershop_subscription_effective_end(v_candidate.barbershop_id);
    if v_effective_end is null or now() < v_effective_end + interval '60 days' then
      continue;
    end if;

    select exists (
      select 1
      from public.barbershop_subscriptions s
      where s.barbershop_id = v_candidate.barbershop_id
        and s.status = 'active'
        and (s.current_period_ends_at is null or s.current_period_ends_at > now())
    ) into v_has_active_subscription;

    if v_has_active_subscription then
      continue;
    end if;

    select exists (
      select 1
      from private.platform_commercial_agreements ca
      where ca.barbershop_id = v_candidate.barbershop_id
        and ca.active
        and ca.ends_at > now()
    ) into v_has_active_agreement;

    if v_has_active_agreement then
      continue;
    end if;

    select count(*)
    into v_appointments_count
    from public.appointments a
    where a.barbershop_id = v_candidate.barbershop_id
      and (
        a.customer_id is not null
        or a.customer_global_id is not null
        or a.customer_name <> 'Cliente removido'
        or a.customer_phone <> '0000000000'
        or a.customer_email is not null
        or a.notes is not null
        or a.cancel_reason is not null
        or a.cancelled_by is not null
      );

    if not p_dry_run then
      -- 1. Desativa a barbearia caso ainda esteja ativa
      update public.barbershops
      set active = false
      where id = v_candidate.barbershop_id
        and active = true;

      -- 2. Remove agendamentos futuros pendentes (órfãos sem atendimento)
      delete from public.appointments
      where barbershop_id = v_candidate.barbershop_id
        and status = 'scheduled'
        and starts_at > now();

      -- 3. Anonimiza PII em agendamentos históricos (preserva snapshots operacionais)
      update public.appointments
      set customer_id = null,
          customer_global_id = null,
          customer_name = 'Cliente removido',
          customer_phone = '0000000000',
          customer_email = null,
          notes = null,
          cancel_reason = null,
          cancelled_by = null
      where barbershop_id = v_candidate.barbershop_id
        and (
          customer_id is not null
          or customer_global_id is not null
          or customer_name <> 'Cliente removido'
          or customer_phone <> '0000000000'
          or customer_email is not null
          or notes is not null
          or cancel_reason is not null
          or cancelled_by is not null
        );

      -- 4. Remove vínculos de CRM e consentimentos específicos deste tenant
      delete from public.barbershop_customers
      where barbershop_id = v_candidate.barbershop_id;

      delete from public.customer_consents
      where barbershop_id = v_candidate.barbershop_id;

      -- 5. Anonimiza outbox e remove notificações no app ligadas ao tenant
      update public.notification_outbox
      set recipient_email = null,
          recipient_user_id = null,
          payload = '{}'::jsonb
      where barbershop_id = v_candidate.barbershop_id
        and (recipient_email is not null or recipient_user_id is not null or payload <> '{}'::jsonb);

      delete from public.user_notifications
      where barbershop_id = v_candidate.barbershop_id;

      -- 6. Inativa equipe da barbearia e revoga convites pendentes
      update public.team_members
      set status = 'inactive'
      where barbershop_id = v_candidate.barbershop_id
        and status = 'active';

      update public.team_invitations
      set status = 'revoked',
          revoked_at = coalesce(revoked_at, now())
      where barbershop_id = v_candidate.barbershop_id
        and status = 'pending';

      -- 7. Anonimiza dados públicos de marketing e contato da barbearia
      update public.barbershops
      set whatsapp = null,
          address = null,
          description = null,
          photo_url = null,
          instagram_url = null,
          facebook_url = null,
          phone = null,
          notification_email = null
      where id = v_candidate.barbershop_id;

      -- 8. Remove detalhes cadastrais da barbearia
      delete from public.barbershop_registration_details
      where barbershop_id = v_candidate.barbershop_id;

      -- 9. Neutraliza registros de auditoria interna da barbearia
      update public.audit_logs
      set actor_user_id = null,
          entity_id = null,
          metadata = '{}'::jsonb
      where barbershop_id = v_candidate.barbershop_id
        and (actor_user_id is not null or entity_id is not null or metadata <> '{}'::jsonb);
    end if;

    v_total_processed := v_total_processed + 1;
    v_total_appointments_anonymized := v_total_appointments_anonymized + v_appointments_count;

    v_shop_detail := jsonb_build_object(
      'barbershop_id', v_candidate.barbershop_id,
      'effective_end', v_effective_end,
      'appointments_anonymized', v_appointments_count,
      'status', case when p_dry_run then 'simulated' else 'processed' end
    );
    v_details := v_details || jsonb_build_array(v_shop_detail);
  end loop;

  insert into private.tenant_retention_execution_logs (
    dry_run,
    barbershops_evaluated,
    barbershops_processed,
    appointments_anonymized,
    details
  ) values (
    p_dry_run,
    v_total_evaluated,
    v_total_processed,
    v_total_appointments_anonymized,
    v_details
  );

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'evaluated', v_total_evaluated,
    'processed', v_total_processed,
    'appointments_anonymized', v_total_appointments_anonymized,
    'details', v_details
  );
end;
$$;

revoke all on function private.process_tenant_retention_cycle(integer, boolean) from public, anon, authenticated;
grant execute on function private.process_tenant_retention_cycle(integer, boolean) to service_role;

-- Procedimento preparado para o agendador pg_cron (a ser ativado somente após homologação formal)
create or replace function private.configure_tenant_retention_cron()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'barbeariasp-tenant-retention-cycle'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'barbeariasp-tenant-retention-cycle',
    '37 3 * * *',
    $job$select private.process_tenant_retention_cycle(50, false);$job$
  );
end;
$$;

revoke all on function private.configure_tenant_retention_cron() from public, anon, authenticated;
grant execute on function private.configure_tenant_retention_cron() to service_role;
