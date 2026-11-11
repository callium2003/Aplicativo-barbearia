-- Migration: 20261111100000_asaas_webhook_automation_and_platform_billing.sql
-- Item 3: Automação do Webhook de Cobranças do Asaas (conciliação instantânea, vigência, faturas e auditoria)
-- Item 2: Visão Administrativa de Cobranças na Plataforma (resumo com modalidade, Asaas, faturas e alerta de cancelamento agendado)

-- 1. Visão Administrativa CullenTech: ampliação de get_platform_barbershop_overview
drop function if exists public.get_platform_barbershop_overview();

create or replace function public.get_platform_barbershop_overview()
returns table(
  barbershop_id uuid,
  name text,
  slug text,
  registration_status text,
  subscription_status text,
  plan_code text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  contract_status text,
  billing_mode text,
  billing_cycle text,
  cancellation_scheduled boolean,
  invoices_paid bigint,
  invoices_pending bigint,
  invoices_overdue bigint,
  asaas_status text,
  responsible_name text,
  contact_phone text,
  notification_email text
)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  return query
  with latest_orders as (
    select distinct on (o.barbershop_id)
      o.barbershop_id,
      o.billing_mode,
      case when o.months = 12 then 'anual' when o.months = 1 then 'mensal' else 'avulso' end as billing_cycle,
      o.recurring_state,
      o.status as order_status
    from public.subscription_orders o
    where o.provider_environment = 'sandbox'
    order by o.barbershop_id, o.created_at desc
  ),
  order_counts as (
    select
      o.barbershop_id,
      count(*) filter (where o.status = 'CONFIRMED') as count_paid,
      count(*) filter (where o.status = 'PENDING_PAYMENT') as count_pending,
      count(*) filter (where o.status = 'REVIEW_REQUIRED') as count_overdue
    from public.subscription_orders o
    where o.provider_environment = 'sandbox'
    group by o.barbershop_id
  )
  select
    b.id,
    b.name,
    b.slug,
    case when b.active then 'active' else 'inactive' end,
    s.status,
    s.plan_code,
    s.trial_ends_at,
    s.current_period_ends_at,
    case
      when exists (
        select 1
        from private.platform_commercial_agreements ca
        where ca.barbershop_id = b.id
          and ca.active
          and ca.ends_at > now()
      ) then 'commercial_agreement'
      when s.status is null then 'unavailable'
      when s.status = 'trialing' and s.trial_ends_at > now() then 'trial'
      when s.status = 'trialing' then 'trial_ended'
      when (s.current_period_ends_at is not null and s.current_period_ends_at > now())
           and (s.status = 'cancelled' or coalesce(lo.recurring_state, '') = 'CANCELED') then 'cancelled'
      when s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now()) then 'active'
      when s.status = 'past_due' or coalesce(oc.count_overdue, 0) > 0 then 'payment_attention'
      when s.status = 'cancelled' then 'cancelled'
      else 'ended'
    end as contract_status,
    lo.billing_mode,
    lo.billing_cycle,
    (
      (s.current_period_ends_at is not null and s.current_period_ends_at > clock_timestamp())
      and (
        s.status = 'cancelled'
        or lo.recurring_state = 'CANCELED'
      )
    ) as cancellation_scheduled,
    coalesce(oc.count_paid, 0)::bigint,
    coalesce(oc.count_pending, 0)::bigint,
    coalesce(oc.count_overdue, 0)::bigint,
    case
      when (s.current_period_ends_at is not null and s.current_period_ends_at > clock_timestamp())
           and (s.status = 'cancelled' or lo.recurring_state = 'CANCELED') then 'Cancelamento agendado'
      when lo.recurring_state = 'ACTIVE' then 'Recorrência ativa'
      when s.status = 'active' then 'Ativa'
      when s.status = 'past_due' or coalesce(oc.count_overdue, 0) > 0 then 'Inadimplente'
      when s.status = 'cancelled' then 'Cancelada'
      when s.status = 'trialing' then 'Em teste'
      else coalesce(s.status, 'Não configurado')
    end as asaas_status,
    coalesce(nullif(trim(rd.responsible_name), ''), 'Não informado') as responsible_name,
    coalesce(nullif(trim(rd.responsible_phone), ''), nullif(trim(b.whatsapp), ''), nullif(trim(b.phone), ''), 'Não informado') as contact_phone,
    coalesce(nullif(trim(b.notification_email), ''), 'Não informado') as notification_email
  from public.barbershops b
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  left join latest_orders lo on lo.barbershop_id = b.id
  left join order_counts oc on oc.barbershop_id = b.id
  left join public.barbershop_registration_details rd on rd.barbershop_id = b.id
  order by b.created_at desc;
end;
$$;

revoke all on function public.get_platform_barbershop_overview() from public, anon, authenticated;
grant execute on function public.get_platform_barbershop_overview() to authenticated;

-- 2. Automação do Webhook Asaas: atualização da RPC de persistência de eventos recorrentes
create or replace function public.persist_asaas_recurring_subscription_event(
  p_account text,
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_pix_authorization_id text,
  p_payment_id text,
  p_external_reference uuid,
  p_resource_status text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inserted integer;
  v_existing public.asaas_recurring_subscription_events%rowtype;
  v_order public.subscription_orders%rowtype;
  v_sub public.barbershop_subscriptions%rowtype;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_status_upper text := upper(coalesce(p_resource_status, ''));
  v_event_upper text := upper(coalesce(p_event_type, ''));
begin
  insert into public.asaas_recurring_subscription_events
    (provider_account_id, provider_event_id, event_type, provider_subscription_id,
     provider_pix_authorization_id, provider_payment_id, external_reference, resource_status)
  values (p_account, p_event_id, p_event_type, nullif(p_subscription_id,''),
          nullif(p_pix_authorization_id,''), nullif(p_payment_id,''), p_external_reference, nullif(p_resource_status,''))
  on conflict (provider_environment, provider_account_id, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    -- 1. Vínculos de assinatura cartão recorrente
    if p_subscription_id is not null and p_external_reference is not null then
      update public.subscription_orders set provider_subscription_id=p_subscription_id,
        recurring_state=case when recurring_state in ('REQUESTING','READY') then 'ACTIVE' else recurring_state end,
        updated_at=now()
      where id=p_external_reference and billing_mode='CARD_RECURRING' and provider_environment='sandbox';

      update public.asaas_recurring_subscription_events
      set processing_state = 'PROCESSED'
      where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;
    end if;

    -- 2. Vínculos de autorização Pix Automático
    if nullif(p_pix_authorization_id,'') is not null then
      update public.subscription_orders set recurring_state=case v_status_upper
          when 'ACTIVE' then 'ACTIVE'
          when 'REFUSED' then 'REFUSED'
          when 'CANCELLED' then 'CANCELED'
          when 'EXPIRED' then 'CANCELED'
          else recurring_state
        end,
        updated_at=now()
      where billing_mode='PIX_AUTOMATIC' and provider_environment='sandbox'
        and provider_account_id=p_account and provider_pix_authorization_id=p_pix_authorization_id
        and (p_external_reference is null or id=p_external_reference);
    end if;

    -- 3. Conciliação instantânea para pagamento recebido / confirmado
    if v_event_upper in ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_RECEIVED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED')
       or v_status_upper in ('RECEIVED', 'CONFIRMED') then
      select * into v_order from public.subscription_orders
      where provider_environment = 'sandbox'
        and provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
          or (nullif(p_payment_id, '') is not null and provider_checkout_id = p_payment_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        -- Evita duplicar concessão se já associado
        if nullif(p_payment_id, '') is not null and exists (
          select 1 from public.subscription_paid_periods
          where provider_environment = 'sandbox' and provider_account_id = p_account and provider_payment_id = p_payment_id
        ) then
          -- Período já concedido para este pagamento. Atualiza status de evidência para CONFIRMED e conclui o evento.
          if v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED' then
            update public.subscription_recurring_payment_evidence
            set provider_status = 'CONFIRMED',
                confirmed_at = now()
            where provider_environment = 'sandbox'
              and provider_account_id = p_account
              and provider_payment_id = p_payment_id;

            update public.subscription_orders
            set status = 'CONFIRMED',
                reconciliation_state = 'CONFIRMED',
                recurring_state = case when billing_mode in ('CARD_RECURRING', 'PIX_AUTOMATIC') then 'ACTIVE' else recurring_state end,
                updated_at = now()
            where id = v_order.id;
          end if;

          update public.asaas_recurring_subscription_events
          set processing_state = 'PROCESSED'
          where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;

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
              'environment', 'sandbox'
            )
          );
        else
          select * into v_sub from public.barbershop_subscriptions
          where barbershop_id = v_order.barbershop_id for update;

          if found and exists (select 1 from public.barbershops where id = v_order.barbershop_id and active and owner_id is not null) then
            v_start_at := greatest(clock_timestamp(), coalesce(v_sub.trial_ends_at, clock_timestamp()), coalesce(v_sub.current_period_ends_at, clock_timestamp()));
            if v_order.months = 12 then
              v_end_at := ((v_start_at at time zone 'America/Sao_Paulo') + interval '12 months') at time zone 'America/Sao_Paulo';
            else
              v_end_at := ((v_start_at at time zone 'America/Sao_Paulo') + interval '1 month') at time zone 'America/Sao_Paulo';
            end if;

            insert into public.subscription_paid_periods
              (order_id, barbershop_id, subscription_id, provider_environment, provider_account_id, provider_payment_id, plan_code, user_limit, starts_at, ends_at)
            values
              (v_order.id, v_order.barbershop_id, v_sub.id, 'sandbox', p_account, nullif(p_payment_id, ''), v_order.plan_code, v_order.user_limit, v_start_at, v_end_at)
            on conflict do nothing;

            if nullif(p_payment_id, '') is not null then
              insert into public.subscription_recurring_payment_evidence
                (provider_account_id, provider_payment_id, order_id, provider_pix_authorization_id, value_cents, provider_status)
              values
                (p_account, p_payment_id, v_order.id, coalesce(p_pix_authorization_id, ''), v_order.price_cents,
                 case when v_event_upper in ('PAYMENT_CONFIRMED', 'PIX_AUTOMATIC_PAYMENT_CONFIRMED') or v_status_upper = 'CONFIRMED' then 'CONFIRMED' else 'RECEIVED' end)
              on conflict do nothing;
            end if;

            update public.barbershop_subscriptions
            set status = 'active',
                plan_code = v_order.plan_code,
                provider = 'asaas',
                current_period_ends_at = v_end_at,
                updated_at = now()
            where id = v_sub.id;

            update public.subscription_orders
            set status = 'CONFIRMED',
                reconciliation_state = 'CONFIRMED',
                recurring_state = case when billing_mode in ('CARD_RECURRING', 'PIX_AUTOMATIC') then 'ACTIVE' else recurring_state end,
                updated_at = now()
            where id = v_order.id;

            update public.asaas_recurring_subscription_events
            set processing_state = 'PROCESSED'
            where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;

            perform private.write_audit_log(
              v_order.barbershop_id,
              'subscription.payment_received',
              'subscription_orders',
              v_order.id,
              jsonb_build_object(
                'event', p_event_type,
                'payment_id', p_payment_id,
                'subscription_id', p_subscription_id,
                'current_period_ends_at', v_end_at,
                'environment', 'sandbox'
              )
            );
          end if;
        end if;
      end if;

    -- 4. Notificação de pagamento em atraso
    elsif v_event_upper in ('PAYMENT_OVERDUE', 'PAYMENT_DUNNING_REQUESTED') or v_status_upper = 'OVERDUE' then
      select * into v_order from public.subscription_orders
      where provider_environment = 'sandbox'
        and provider_account_id = p_account
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
        where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_overdue',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'subscription_id', p_subscription_id, 'environment', 'sandbox')
        );
      end if;

    -- 5. Pagamento restaurado
    elsif v_event_upper = 'PAYMENT_RESTORED' or v_status_upper = 'RESTORED' then
      select * into v_order from public.subscription_orders
      where provider_environment = 'sandbox'
        and provider_account_id = p_account
        and (
          (p_external_reference is not null and id = p_external_reference)
          or (nullif(p_subscription_id, '') is not null and provider_subscription_id = p_subscription_id)
          or (nullif(p_pix_authorization_id, '') is not null and provider_pix_authorization_id = p_pix_authorization_id)
        )
      order by updated_at desc limit 1 for update;

      if found then
        if v_order.status = 'REVIEW_REQUIRED' then
          update public.subscription_orders
          set status = 'PENDING_PAYMENT',
              reconciliation_state = 'PENDING',
              updated_at = now()
          where id = v_order.id;
        end if;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_restored',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'subscription_id', p_subscription_id, 'environment', 'sandbox')
        );
      end if;

    -- 6. Assinatura cancelada no Asaas
    elsif v_event_upper in ('SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_DELETED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED')
       or v_status_upper in ('CANCELED', 'CANCELLED', 'INACTIVE', 'EXPIRED') then
      select * into v_order from public.subscription_orders
      where provider_environment = 'sandbox'
        and provider_account_id = p_account
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

        -- Abertura automática de chamado para atuação de retenção
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
            -- Falha na abertura do ticket não pode impedir a conciliação financeira do cancelamento
            null;
          end;
        end if;

        update public.asaas_recurring_subscription_events
        set processing_state = 'PROCESSED'
        where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.cancelled',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'subscription_id', p_subscription_id, 'environment', 'sandbox')
        );
      end if;

    -- 7. Estorno ou remoção de pagamento
    elsif v_event_upper in ('PAYMENT_REFUNDED', 'PAYMENT_DELETED') or v_status_upper in ('REFUNDED', 'DELETED') then
      select * into v_order from public.subscription_orders
      where provider_environment = 'sandbox'
        and provider_account_id = p_account
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
        where provider_environment = 'sandbox' and provider_account_id = p_account and provider_event_id = p_event_id;

        perform private.write_audit_log(
          v_order.barbershop_id,
          'subscription.payment_refunded',
          'subscription_orders',
          v_order.id,
          jsonb_build_object('event', p_event_type, 'payment_id', p_payment_id, 'environment', 'sandbox')
        );
      end if;
    end if;

    return true;
  end if;

  select * into v_existing from public.asaas_recurring_subscription_events
    where provider_environment='sandbox' and provider_account_id=p_account and provider_event_id=p_event_id;
  if (v_existing.event_type, coalesce(v_existing.provider_subscription_id,''), coalesce(v_existing.provider_pix_authorization_id,''),
      coalesce(v_existing.provider_payment_id,''), v_existing.external_reference, coalesce(v_existing.resource_status,''))
     is distinct from (p_event_type, coalesce(p_subscription_id,''), coalesce(p_pix_authorization_id,''),
      coalesce(p_payment_id,''), p_external_reference, coalesce(p_resource_status,'')) then
    raise exception 'Conflicting recurring provider event' using errcode='23505';
  end if;
  return false;
end;
$$;

revoke all on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.persist_asaas_recurring_subscription_event(text,text,text,text,text,text,uuid,text) to service_role;
