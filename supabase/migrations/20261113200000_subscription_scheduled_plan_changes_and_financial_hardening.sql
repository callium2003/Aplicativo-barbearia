-- Forward migration: 20261113200000_subscription_scheduled_plan_changes_and_financial_hardening.sql
-- 1. Tabela de contratos agendados para mudanca de plano na renovacao (PR #75)
-- 2. Concessao e deduplicacao transacional de periodos de pagamento (PR #66, PR #67, PR #76)
-- 3. Preservacao de cancelamento contra reativacao por eventos atrasados de pagamento (PR #66, PR #67)
-- 4. Caminho de leitura autorizado de subscription_paid_periods para service_role (PR #66)

-- ============================================================================
-- 1. Tabela de Mudanca de Plano Agendada
-- ============================================================================

create table if not exists public.subscription_scheduled_plan_changes (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id),
  provider_subscription_id text not null,
  plan_code text not null check (length(plan_code) between 1 and 80),
  plan_name text not null check (length(trim(plan_name)) between 1 and 120),
  months integer not null check (months in (1, 12)),
  price_cents bigint not null check (price_cents > 0),
  user_limit integer not null check (user_limit > 0),
  boundary_payment_id text,
  boundary_payment_ids text[] default '{}',
  effective_from_cycle text,
  expected_price_cents bigint,
  expected_cycle text,
  previous_plan_code text,
  previous_months integer,
  previous_user_limit integer,
  previous_price_cents bigint,
  effective_after timestamptz,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'APPLIED', 'CANCELED')),
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_scheduled_plan_changes_sub_key unique (barbershop_id, provider_subscription_id)
);

alter table public.subscription_scheduled_plan_changes
  add column if not exists boundary_payment_ids text[] default '{}',
  add column if not exists effective_from_cycle text,
  add column if not exists expected_price_cents bigint,
  add column if not exists expected_cycle text,
  add column if not exists previous_plan_code text,
  add column if not exists previous_months integer,
  add column if not exists previous_user_limit integer,
  add column if not exists previous_price_cents bigint;

create index if not exists subscription_scheduled_plan_changes_status_idx
  on public.subscription_scheduled_plan_changes (barbershop_id, provider_subscription_id, status);

alter table public.subscription_scheduled_plan_changes enable row level security;
revoke all on table public.subscription_scheduled_plan_changes from public, anon, authenticated;
grant select, insert, update on table public.subscription_scheduled_plan_changes to service_role;

-- ============================================================================
-- 2. Privilegio de Leitura de Periodos Pagos para service_role
-- ============================================================================

grant select on table public.subscription_paid_periods to service_role;

-- ============================================================================
-- 3. Atualizacao Transacional da RPC persist_asaas_recurring_subscription_event
-- ============================================================================

drop function if exists public.persist_asaas_recurring_subscription_event(text, text, text, text, text, text, uuid, text);

create or replace function public.persist_asaas_recurring_subscription_event(
  p_account text,
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_pix_authorization_id text,
  p_payment_id text,
  p_external_reference uuid,
  p_resource_status text,
  p_value_cents bigint default null,
  p_cycle text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inserted integer;
  v_existing public.asaas_recurring_subscription_events%rowtype;
  v_order public.subscription_orders%rowtype;
  v_sub public.barbershop_subscriptions%rowtype;
  v_scheduled public.subscription_scheduled_plan_changes%rowtype;
  v_is_old_payment boolean := false;
  v_granted_plan_code text;
  v_granted_months integer;
  v_granted_user_limit integer;
  v_granted_price_cents bigint;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_env text;
  v_status_upper text := upper(coalesce(p_resource_status, ''));
  v_event_upper text := upper(coalesce(p_event_type, ''));
begin
  -- Resolve ambiente do pedido ou default para sandbox
  select provider_environment into v_env from public.subscription_orders
  where (p_external_reference is not null and id = p_external_reference)
     or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
  limit 1;
  v_env := coalesce(v_env, 'sandbox');

  insert into public.asaas_recurring_subscription_events
    (provider_environment, provider_account_id, provider_event_id, event_type, provider_subscription_id,
     provider_pix_authorization_id, provider_payment_id, external_reference, resource_status)
  values (v_env, p_account, p_event_id, p_event_type, nullif(p_subscription_id,''),
          nullif(p_pix_authorization_id,''), nullif(p_payment_id,''), p_external_reference, nullif(p_resource_status,''))
  on conflict (provider_environment, provider_account_id, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    -- 1. Vinculos de assinatura cartao recorrente
    if p_subscription_id is not null and p_external_reference is not null then
      update public.subscription_orders set provider_subscription_id=p_subscription_id,
        recurring_state=case when recurring_state in ('REQUESTING','READY') then 'ACTIVE' else recurring_state end,
        updated_at=now()
      where id=p_external_reference and billing_mode='CARD_RECURRING';

      update public.asaas_recurring_subscription_events
      set processing_state = 'PROCESSED'
      where provider_account_id = p_account and provider_event_id = p_event_id;
    end if;

    -- 2. Vinculos de autorizacao Pix Automatico
    if nullif(p_pix_authorization_id,'') is not null then
      update public.subscription_orders set recurring_state=case v_status_upper
          when 'ACTIVE' then 'ACTIVE'
          when 'REFUSED' then 'REFUSED'
          when 'CANCELLED' then 'CANCELED'
          when 'EXPIRED' then 'CANCELED'
          else recurring_state
        end,
        updated_at=now()
      where billing_mode='PIX_AUTOMATIC'
        and provider_account_id=p_account and provider_pix_authorization_id=p_pix_authorization_id
        and (p_external_reference is null or id=p_external_reference);
    end if;

    -- 3. Conciliacao instantanea para pagamento recebido / confirmado
    if v_event_upper in ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_RECEIVED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED')
       or v_status_upper in ('RECEIVED', 'CONFIRMED') then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
          or (nullif(p_payment_id, '') is not null and provider_checkout_id = p_payment_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        -- Deduplicacao unificada: verifica paid_periods, payment_evidence (checkout) e recurring_payment_evidence
        if nullif(p_payment_id, '') is not null and (
          exists (
            select 1 from public.subscription_paid_periods
            where provider_account_id = p_account and provider_payment_id = p_payment_id
          )
          or exists (
            select 1 from public.subscription_payment_evidence
            where provider_account_id = p_account and provider_payment_id = p_payment_id
          )
          or exists (
            select 1 from public.subscription_recurring_payment_evidence
            where provider_account_id = p_account and provider_payment_id = p_payment_id
          )
        ) then
          -- Pagamento ja concedido anteriormente. Atualiza status para CONFIRMED se aplicavel, sem duplicar vigencia
          if v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED' then
            update public.subscription_recurring_payment_evidence
            set provider_status = 'CONFIRMED',
                confirmed_at = now()
            where provider_account_id = p_account
              and provider_payment_id = p_payment_id;

            -- Preserva cancelamento contra reativacao indevida
            update public.subscription_orders
            set status = 'CONFIRMED',
                reconciliation_state = 'CONFIRMED',
                recurring_state = case
                  when recurring_state = 'CANCELED' then 'CANCELED'
                  when billing_mode in ('CARD_RECURRING', 'PIX_AUTOMATIC') then 'ACTIVE'
                  else recurring_state
                end,
                updated_at = now()
            where id = v_order.id;
          end if;

          update public.asaas_recurring_subscription_events
          set processing_state = 'PROCESSED'
          where provider_account_id = p_account and provider_event_id = p_event_id;

          perform private.write_audit_log(
            v_order.barbershop_id,
            case when v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED'
                 then 'subscription.payment_confirmed' else 'subscription.payment_received' end,
            'subscription_orders',
            v_order.id,
            jsonb_build_object(
              'event', p_event_type,
              'payment_id', p_payment_id,
              'subscription_id', p_subscription_id,
              'environment', v_order.provider_environment
            )
          );
        else
          select * into v_sub from public.barbershop_subscriptions
          where barbershop_id = v_order.barbershop_id for update;

          if found and exists (select 1 from public.barbershops where id = v_order.barbershop_id and active and owner_id is not null) then
            -- Consumo ou preservacao de contrato agendado/aplicado para mudanca de plano
            select * into v_scheduled
            from public.subscription_scheduled_plan_changes
            where barbershop_id = v_order.barbershop_id
              and (
                (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
                or (v_order.provider_subscription_id is not null and provider_subscription_id = v_order.provider_subscription_id)
              )
              and status in ('SCHEDULED', 'APPLIED')
            order by updated_at desc
            limit 1 for update;

            v_is_old_payment := false;
            if found then
              -- 1. Identidade: verifica se o payment_id consta nos pagamentos da fronteira anterior
              if nullif(p_payment_id, '') is not null and (
                (v_scheduled.boundary_payment_id is not null and v_scheduled.boundary_payment_id = p_payment_id)
                or (v_scheduled.boundary_payment_ids is not null and p_payment_id = any(v_scheduled.boundary_payment_ids))
              ) then
                if p_value_cents is not null and p_value_cents >= coalesce(v_scheduled.expected_price_cents, v_scheduled.price_cents)
                   and (p_cycle is null or v_scheduled.expected_cycle is null or upper(p_cycle) = upper(v_scheduled.expected_cycle)) then
                  v_is_old_payment := false;
                else
                  v_is_old_payment := true;
                end if;
              end if;

              -- 2. Valor: verifica se o valor pago é inferior ao esperado para o novo contrato
              if not v_is_old_payment and p_value_cents is not null and p_value_cents < coalesce(v_scheduled.expected_price_cents, v_scheduled.price_cents) then
                v_is_old_payment := true;
              end if;

              -- 3. Ciclo: verifica se a periodicidade do pagamento difere do ciclo esperado
              if not v_is_old_payment and p_cycle is not null and v_scheduled.expected_cycle is not null
                 and upper(p_cycle) <> upper(v_scheduled.expected_cycle) then
                v_is_old_payment := true;
              end if;

              -- 4. Vigência temporal: pagamento recebido antes do marco de vigência com valor do plano antigo
              if not v_is_old_payment and v_scheduled.status = 'SCHEDULED' and v_scheduled.effective_after is not null
                 and clock_timestamp() < v_scheduled.effective_after then
                if p_value_cents is not null and p_value_cents <= v_order.price_cents and v_order.price_cents < v_scheduled.price_cents then
                  v_is_old_payment := true;
                end if;
              end if;
            end if;

            v_start_at := greatest(
              clock_timestamp(),
              case when v_sub.status = 'trialing' then coalesce(v_sub.trial_ends_at, clock_timestamp()) else clock_timestamp() end,
              coalesce(v_sub.current_period_ends_at, clock_timestamp())
            );

            if found and not v_is_old_payment then
              v_granted_plan_code := v_scheduled.plan_code;
              v_granted_months := v_scheduled.months;
              v_granted_user_limit := v_scheduled.user_limit;
              v_granted_price_cents := coalesce(p_value_cents, v_scheduled.price_cents);

              if v_scheduled.status = 'SCHEDULED' and clock_timestamp() >= v_start_at then
                update public.subscription_scheduled_plan_changes
                set status = 'APPLIED', applied_at = now(), updated_at = now()
                where id = v_scheduled.id;
              elsif v_scheduled.status = 'SCHEDULED' then
                update public.subscription_scheduled_plan_changes
                set effective_after = v_start_at, updated_at = now()
                where id = v_scheduled.id;
              end if;
            else
              v_granted_plan_code := coalesce(v_scheduled.previous_plan_code, v_order.plan_code);
              v_granted_months := coalesce(v_scheduled.previous_months, v_order.months);
              v_granted_user_limit := coalesce(v_scheduled.previous_user_limit, v_order.user_limit);
              v_granted_price_cents := coalesce(p_value_cents, v_scheduled.previous_price_cents, v_order.price_cents);
            end if;
            if v_granted_months = 12 then
              v_end_at := ((v_start_at at time zone 'America/Sao_Paulo') + interval '12 months') at time zone 'America/Sao_Paulo';
            else
              v_end_at := ((v_start_at at time zone 'America/Sao_Paulo') + interval '1 month') at time zone 'America/Sao_Paulo';
            end if;

            insert into public.subscription_paid_periods
              (order_id, barbershop_id, subscription_id, provider_environment, provider_account_id, provider_payment_id, plan_code, user_limit, starts_at, ends_at)
            values
              (v_order.id, v_order.barbershop_id, v_sub.id, v_order.provider_environment, p_account, nullif(p_payment_id, ''), v_granted_plan_code, v_granted_user_limit, v_start_at, v_end_at)
            on conflict do nothing;

            if nullif(p_payment_id, '') is not null then
              insert into public.subscription_recurring_payment_evidence
                (provider_account_id, provider_payment_id, order_id, provider_pix_authorization_id, value_cents, provider_status)
              values
                (p_account, p_payment_id, v_order.id, coalesce(p_pix_authorization_id, ''), v_granted_price_cents,
                 case when v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED' then 'CONFIRMED' else 'RECEIVED' end)
              on conflict do nothing;
            end if;

            -- Preserva cancelamento da assinatura se este pedido cancelou renovacao, a menos que haja contrato substituto ativo
            update public.barbershop_subscriptions
            set status = case
                  when v_order.recurring_state = 'CANCELED' and exists (
                    select 1 from public.subscription_orders
                    where barbershop_id = v_order.barbershop_id
                      and id <> v_order.id
                      and created_at > v_order.created_at
                      and recurring_state = 'ACTIVE'
                  ) then 'active'
                  when v_order.recurring_state = 'CANCELED' then 'cancelled'
                  else 'active'
                end,
                plan_code = case
                  when v_order.recurring_state = 'CANCELED' and exists (
                    select 1 from public.subscription_orders
                    where barbershop_id = v_order.barbershop_id
                      and id <> v_order.id
                      and created_at > v_order.created_at
                      and recurring_state = 'ACTIVE'
                  ) then plan_code
                  when v_is_old_payment and exists (
                    select 1 from public.subscription_scheduled_plan_changes
                    where barbershop_id = v_order.barbershop_id
                      and status = 'APPLIED'
                  ) then plan_code
                  when v_start_at > clock_timestamp() and v_sub.current_period_ends_at is not null and clock_timestamp() < v_sub.current_period_ends_at then plan_code
                  else v_granted_plan_code
                end,
                provider = 'asaas',
                current_period_ends_at = greatest(coalesce(current_period_ends_at, v_end_at), v_end_at),
                trial_ends_at = null,
                updated_at = now()
            where id = v_sub.id;

            -- Preserva cancelamento da ordem se cancelada
            update public.subscription_orders
            set status = 'CONFIRMED',
                reconciliation_state = 'CONFIRMED',
                recurring_state = case
                  when recurring_state = 'CANCELED' then 'CANCELED'
                  when billing_mode in ('CARD_RECURRING', 'PIX_AUTOMATIC') then 'ACTIVE'
                  else recurring_state
                end,
                updated_at = now()
            where id = v_order.id;

            update public.asaas_recurring_subscription_events
            set processing_state = 'PROCESSED'
            where provider_account_id = p_account and provider_event_id = p_event_id;

            perform private.write_audit_log(
              v_order.barbershop_id,
              'subscription.payment_received',
              'subscription_orders',
              v_order.id,
              jsonb_build_object(
                'event', p_event_type,
                'payment_id', p_payment_id,
                'subscription_id', p_subscription_id,
                'environment', v_order.provider_environment,
                'plan_code', v_granted_plan_code,
                'months', v_granted_months
              )
            );
          end if;
        end if;
      end if;

    -- 4. Estorno ou remocao de pagamento (processado antes do cancelamento de assinatura para nao cancelar indevidamente por PAYMENT_DELETED)
    elsif v_event_upper in ('PAYMENT_REFUNDED', 'PAYMENT_DELETED') or (v_status_upper in ('REFUNDED', 'DELETED') and v_event_upper like 'PAYMENT_%') then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set status = 'CANCELED',
            updated_at = now()
        where id = v_order.id;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_refunded',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'environment', v_order.provider_environment)
        );
      end if;

    -- 5. Cancelamento de assinatura
    elsif v_event_upper in ('SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVE', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_CANCELLED', 'PIX_AUTOMATIC_AUTHORIZATION_CANCELLED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED')
          or (v_status_upper in ('INACTIVE', 'CANCELED', 'CANCELLED', 'EXPIRED') and v_event_upper not like 'PAYMENT_%') then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set recurring_state = 'CANCELED',
            updated_at = now()
        where id = v_order.id;

        update public.barbershop_subscriptions
        set status = 'cancelled',
            updated_at = now()
        where barbershop_id = v_order.barbershop_id;

        -- Cancela tambem qualquer mudanca de plano agendada pendente
        update public.subscription_scheduled_plan_changes
        set status = 'CANCELED', updated_at = now()
        where barbershop_id = v_order.barbershop_id and status = 'SCHEDULED';

        -- Abertura automatica de chamado para atuacao de retencao
        if not exists (
          select 1 from public.platform_support_tickets
          where barbershop_id = v_order.barbershop_id
            and category_id = 'billing'
            and status in ('open', 'in_progress', 'waiting_client')
            and subject like '[Alerta de Retenção]%'
        ) and coalesce(v_order.requester_id, (select owner_id from public.barbershops where id = v_order.barbershop_id)) is not null then
          begin
            insert into public.platform_support_tickets (
              barbershop_id, created_by, created_by_role, category_id,
              subject, description, priority, status, faq_consulted
            ) values (
              v_order.barbershop_id,
              coalesce(v_order.requester_id, (select owner_id from public.barbershops where id = v_order.barbershop_id)),
              'owner',
              'billing',
              '[Alerta de Retenção] Cancelamento Asaas: ' || coalesce(v_order.plan_name, 'Plano'),
              'O provedor Asaas notificou o cancelamento da assinatura. Contatar o proprietário para retenção preventiva antes do fim do período de vigência.',
              'high',
              'open',
              true
            );
          exception when others then
            null;
          end;
        end if;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.cancelled',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'subscription_id', p_subscription_id, 'environment', v_order.provider_environment)
        );
      end if;

    -- 5. Notificacao de pagamento em atraso
    elsif v_event_upper in ('PAYMENT_OVERDUE', 'PAYMENT_DUNNING_REQUESTED') or v_status_upper = 'OVERDUE' then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set status = case when status = 'CONFIRMED' then status else 'REVIEW_REQUIRED' end,
            reconciliation_state = 'REVIEW_REQUIRED',
            updated_at = now()
        where id = v_order.id;

        select * into v_sub from public.barbershop_subscriptions
        where barbershop_id = v_order.barbershop_id for update;

        if found and (v_sub.current_period_ends_at is null or v_sub.current_period_ends_at <= clock_timestamp()) then
          update public.barbershop_subscriptions
          set status = 'past_due', updated_at = now()
          where id = v_sub.id;
        end if;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_overdue',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'subscription_id', p_subscription_id, 'environment', v_order.provider_environment)
        );
      end if;

    -- 6. Pagamento restaurado
    elsif v_event_upper = 'PAYMENT_RESTORED' or v_status_upper = 'RESTORED' then
      select * into v_order from public.subscription_orders
      where provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        update public.subscription_orders
        set status = case when status = 'REVIEW_REQUIRED' then 'PENDING_PAYMENT' else status end,
            reconciliation_state = case when reconciliation_state = 'REVIEW_REQUIRED' then 'PENDING' else reconciliation_state end,
            updated_at = now()
        where id = v_order.id;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_restored',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'subscription_id', p_subscription_id, 'environment', v_order.provider_environment)
        );
      end if;
    end if;

    return true;
  end if;

  select * into v_existing from public.asaas_recurring_subscription_events
    where provider_account_id=p_account and provider_event_id=p_event_id;
  if (v_existing.event_type, coalesce(v_existing.provider_subscription_id,''), coalesce(v_existing.provider_pix_authorization_id,''),
      coalesce(v_existing.provider_payment_id,''), v_existing.external_reference, coalesce(v_existing.resource_status,''))
     is distinct from (p_event_type, coalesce(p_subscription_id,''), coalesce(p_pix_authorization_id,''),
      coalesce(p_payment_id,''), p_external_reference, coalesce(p_resource_status,'')) then
    raise exception 'Conflicting recurring provider event' using errcode='23505';
  end if;
  return false;
end;
$$;

revoke all on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text,bigint,text) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text,bigint,text) to service_role;

-- ============================================================================
-- 4. Funcao de Sincronizacao do Plano Ativo quando Inicia Novo Periodo Pago
-- ============================================================================

create or replace function public.sync_barbershop_active_subscription_plan(p_barbershop_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_effective_plan text;
  v_caller uuid := auth.uid();
begin
  if v_caller is not null and not exists (
    select 1 from public.barbershops where id = p_barbershop_id and owner_id = v_caller
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select p.plan_code into v_effective_plan
  from public.subscription_paid_periods p
  where p.barbershop_id = p_barbershop_id
    and p.starts_at <= clock_timestamp()
    and p.ends_at > clock_timestamp()
  order by p.starts_at desc limit 1;

  if v_effective_plan is not null then
    update public.barbershop_subscriptions
    set plan_code = v_effective_plan, updated_at = now()
    where barbershop_id = p_barbershop_id and plan_code <> v_effective_plan;

    update public.subscription_scheduled_plan_changes
    set status = 'APPLIED', applied_at = coalesce(applied_at, now()), updated_at = now()
    where barbershop_id = p_barbershop_id and plan_code = v_effective_plan and status = 'SCHEDULED';
  end if;

  return v_effective_plan;
end;
$$;

revoke all on function public.sync_barbershop_active_subscription_plan(uuid) from public, anon;
grant execute on function public.sync_barbershop_active_subscription_plan(uuid) to authenticated, service_role;
