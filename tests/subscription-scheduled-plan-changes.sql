-- Fictitious scheduled plan change and cycle validation test.
-- The fixture is rolled back and proves that:
-- 1. Old payments (in boundary or matching old price/cycle) retain original order terms and do not consume scheduled contract.
-- 2. Each payment releases exactly one period (deduplication works).
-- 3. The actual renewal payment validates value and cycle, applies the scheduled contract, and grants the new term (12 months).

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('c1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'plan-change@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Barbearia Agendamento Teste', 'barbearia-agendamento-teste', true);

do $$
declare
  v_order_id uuid;
  v_initial_ends timestamptz;
  v_after_old_ends timestamptz;
  v_after_annual_ends timestamptz;
  v_sub_id text := 'sub_recurring_test_123';
  v_account text := 'account_fixture_plan_change';
begin
  -- 1. Cria pedido mensal confirmado vinculado a assinatura recorrente
  v_order_id := public.create_subscription_order(
    'c2000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    gen_random_uuid(),
    'simple-mensal', 'Plano Simple (Mensal)', 1, 4990, 1, 3, 'terms-v1'
  );

  update public.subscription_orders
  set status = 'CONFIRMED',
      recurring_state = 'ACTIVE',
      billing_mode = 'CARD_RECURRING',
      provider_account_id = v_account,
      provider_subscription_id = v_sub_id,
      provider_environment = 'sandbox'
  where id = v_order_id;

  update public.barbershop_subscriptions
  set plan_code = 'simple-mensal',
      status = 'active',
      trial_ends_at = null,
      current_period_ends_at = now() + interval '10 days'
  where barbershop_id = 'c2000000-0000-4000-8000-000000000001';

  select current_period_ends_at into v_initial_ends
  from public.barbershop_subscriptions
  where barbershop_id = 'c2000000-0000-4000-8000-000000000001';

  -- 2. Agenda mudança de plano para anual com validações de fronteira, valor e ciclo
  insert into public.subscription_scheduled_plan_changes (
    barbershop_id, provider_subscription_id, plan_code, plan_name,
    months, price_cents, user_limit, boundary_payment_id, boundary_payment_ids,
    effective_from_cycle, expected_price_cents, expected_cycle, effective_after, status
  ) values (
    'c2000000-0000-4000-8000-000000000001',
    v_sub_id,
    'pro-anual', 'Plano Pro (Anual)',
    12, 89900, 10,
    'pay_m1', array['pay_m1', 'pay_m2'],
    '2026-12', 89900, 'YEARLY',
    v_initial_ends, 'SCHEDULED'
  );

  -- 3. Pagamento antigo que estava na fronteira (pay_m2) chega com atraso
  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_old_pay_m2', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_m2', v_order_id, 'RECEIVED', 4990, 'MONTHLY'
  );

  -- Verifica se o contrato agendado NÃO foi consumido (continua SCHEDULED)
  if (select status from public.subscription_scheduled_plan_changes where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'SCHEDULED' then
    raise exception 'Pagamento antigo consumiu indevidamente o contrato agendado';
  end if;

  -- Verifica se a assinatura conservou o plano original (simple-mensal)
  if (select plan_code from public.barbershop_subscriptions where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'simple-mensal' then
    raise exception 'Pagamento antigo alterou o plano da assinatura para o plano agendado';
  end if;

  -- Verifica se o período pago concedeu o plano mensal original (simple-mensal)
  if (select plan_code from public.subscription_paid_periods where provider_payment_id = 'pay_m2') <> 'simple-mensal' then
    raise exception 'Pagamento antigo não concedeu vigência do plano original';
  end if;

  -- 4. Pagamento tardio não mapeado na fronteira (pay_late_unlisted), mas com valor antigo (4990 < 89900) e ciclo MONTHLY
  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_late_unlisted', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_late_unlisted', v_order_id, 'RECEIVED', 4990, 'MONTHLY'
  );

  -- Deve conservar o contrato agendado como SCHEDULED
  if (select status from public.subscription_scheduled_plan_changes where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'SCHEDULED' then
    raise exception 'Pagamento tardio por valor consumiu indevidamente o contrato agendado';
  end if;

  -- 5. Repetição de pagamento (pay_late_unlisted): deduplicação não concede período duplo
  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_late_duplicate', 'PAYMENT_CONFIRMED',
    v_sub_id, null, 'pay_late_unlisted', v_order_id, 'CONFIRMED', 4990, 'MONTHLY'
  );

  if (select count(*) from public.subscription_paid_periods where provider_payment_id = 'pay_late_unlisted') <> 1 then
    raise exception 'Pagamento duplicado gerou vigência duplicada em subscription_paid_periods';
  end if;

  -- 6. Renovação anual legítima (pay_annual_renewal): valor 89900, ciclo YEARLY, fora da fronteira
  -- Simula expiração do período anterior para que a renovação inicie no momento da aplicação
  update public.barbershop_subscriptions
  set current_period_ends_at = now() - interval '1 second',
      trial_ends_at = null
  where barbershop_id = 'c2000000-0000-4000-8000-000000000001';

  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_annual_renewal', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_annual_renewal', v_order_id, 'RECEIVED', 89900, 'YEARLY'
  );

  -- Contrato agendado deve ser consumido (APPLIED)
  if (select status from public.subscription_scheduled_plan_changes where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'APPLIED' then
    raise exception 'Renovação legítima não aplicou o contrato agendado';
  end if;

  -- Assinatura atualizada para o plano anual pro-anual
  if (select plan_code from public.barbershop_subscriptions where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'pro-anual' then
    raise exception 'Assinatura não foi atualizada para pro-anual após renovação';
  end if;

  -- Período pago concedeu 12 meses
  if (select user_limit from public.subscription_paid_periods where provider_payment_id = 'pay_annual_renewal') <> 10 then
    raise exception 'Limite de profissionais do novo contrato não foi aplicado';
  end if;

  -- 7. Pagamento antigo que chega APÓS a mudança já ter sido aplicada (status = APPLIED):
  -- Não deve rebaixar o plano pro-anual da assinatura ativa de volta para simple-mensal
  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_old_pay_m1', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_m1', v_order_id, 'RECEIVED', 4990, 'MONTHLY'
  );

  if (select plan_code from public.barbershop_subscriptions where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'pro-anual' then
    raise exception 'Pagamento antigo chegado após contrato aplicado rebaixou indevidamente o plano da assinatura';
  end if;

  if (select plan_code from public.subscription_paid_periods where provider_payment_id = 'pay_m1') <> 'simple-mensal' then
    raise exception 'Pagamento antigo não concedeu vigência do plano original em subscription_paid_periods';
  end if;

  -- 8. Transição para novo plano C (master-anual) com snapshot dos termos imediatamente precedentes de B (pro-anual, 12 meses, 10 usuários):
  insert into public.subscription_scheduled_plan_changes (
    barbershop_id, provider_subscription_id, plan_code, plan_name,
    months, price_cents, user_limit, previous_plan_code, previous_months, previous_user_limit, previous_price_cents,
    boundary_payment_ids, effective_from_cycle, expected_price_cents, expected_cycle, effective_after, status
  ) values (
    'c2000000-0000-4000-8000-000000000001',
    v_sub_id,
    'master-anual', 'Plano Master (Anual)',
    12, 119900, 20, 'pro-anual', 12, 10, 89900,
    array['pay_annual_b_prior'], '2027-12', 119900, 'YEARLY', now() + interval '12 months', 'SCHEDULED'
  )
  on conflict (barbershop_id, provider_subscription_id) do update
  set plan_code = excluded.plan_code, plan_name = excluded.plan_name, months = excluded.months, price_cents = excluded.price_cents,
      user_limit = excluded.user_limit, previous_plan_code = excluded.previous_plan_code, previous_months = excluded.previous_months,
      previous_user_limit = excluded.previous_user_limit, previous_price_cents = excluded.previous_price_cents,
      boundary_payment_ids = excluded.boundary_payment_ids, effective_from_cycle = excluded.effective_from_cycle,
      expected_price_cents = excluded.expected_price_cents, expected_cycle = excluded.expected_cycle,
      effective_after = excluded.effective_after, status = excluded.status;

  -- Chega um pagamento de renovação do contrato B que estava na fronteira (pay_annual_b_prior, valor 89900, ciclo YEARLY)
  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_pay_b_prior', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_annual_b_prior', v_order_id, 'RECEIVED', 89900, 'YEARLY'
  );

  -- O período pago deve receber os termos de B (pro-anual, limite 10), e NÃO de A (simple-mensal, limite 3)!
  if (select plan_code from public.subscription_paid_periods where provider_payment_id = 'pay_annual_b_prior') <> 'pro-anual' then
    raise exception 'Pagamento de ciclo B não recebeu os termos snapshotted de B';
  end if;
  if (select user_limit from public.subscription_paid_periods where provider_payment_id = 'pay_annual_b_prior') <> 10 then
    raise exception 'Pagamento de ciclo B não recebeu o limite snapshotted de B';
  end if;

  -- 9. Cenário de Downgrade (Master mensal -> Simple mensal):
  -- Agenda downgrade de Master mensal (11990 centavos, limite 7) para Simple mensal (4990 centavos, limite 3).
  -- Um pagamento tardio de Master na fronteira (pay_master_boundary, 11990 centavos) deve manter Master (limite 7),
  -- e não ser rebaixado para Simple com limite 3 só porque seu valor (11990) é maior que o novo preço (4990).
  insert into public.subscription_scheduled_plan_changes (
    barbershop_id, provider_subscription_id, plan_code, plan_name,
    months, price_cents, user_limit, previous_plan_code, previous_months, previous_user_limit, previous_price_cents,
    boundary_payment_ids, effective_from_cycle, expected_price_cents, expected_cycle, effective_after, status
  ) values (
    'c2000000-0000-4000-8000-000000000001',
    v_sub_id,
    'simple-mensal', 'Plano Simple (Mensal)',
    1, 4990, 3, 'master-mensal', 1, 7, 11990,
    array['pay_master_boundary'], '2028-01', 4990, 'MONTHLY', now() + interval '1 month', 'SCHEDULED'
  )
  on conflict (barbershop_id, provider_subscription_id) do update
  set plan_code = excluded.plan_code, plan_name = excluded.plan_name, months = excluded.months, price_cents = excluded.price_cents,
      user_limit = excluded.user_limit, previous_plan_code = excluded.previous_plan_code, previous_months = excluded.previous_months,
      previous_user_limit = excluded.previous_user_limit, previous_price_cents = excluded.previous_price_cents,
      boundary_payment_ids = excluded.boundary_payment_ids, effective_from_cycle = excluded.effective_from_cycle,
      expected_price_cents = excluded.expected_price_cents, expected_cycle = excluded.expected_cycle,
      effective_after = excluded.effective_after, status = excluded.status;

  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_pay_master_boundary', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_master_boundary', v_order_id, 'RECEIVED', 11990, 'MONTHLY'
  );

  if (select plan_code from public.subscription_paid_periods where provider_payment_id = 'pay_master_boundary') <> 'master-mensal' then
    raise exception 'Pagamento de downgrade na fronteira foi indevidamente convertido para o novo plano inferior';
  end if;
  if (select user_limit from public.subscription_paid_periods where provider_payment_id = 'pay_master_boundary') <> 7 then
    raise exception 'Pagamento de downgrade na fronteira não conservou o limite de 7 profissionais';
  end if;
  if (select status from public.subscription_scheduled_plan_changes where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'SCHEDULED' then
    raise exception 'Pagamento de downgrade na fronteira consumiu indevidamente o contrato agendado';
  end if;

  -- 9b. Pagamento atrasado de Master mensal (11990) fora da lista boundary_payment_ids também deve preservar Master (limite 7)
  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_pay_master_late_unlisted', 'PAYMENT_RECEIVED',
    v_sub_id, null, 'pay_master_late_unlisted', v_order_id, 'RECEIVED', 11990, 'MONTHLY'
  );

  if (select plan_code from public.subscription_paid_periods where provider_payment_id = 'pay_master_late_unlisted') <> 'master-mensal' then
    raise exception 'Pagamento atrasado de Master fora da fronteira foi rebaixado indevidamente para Simple';
  end if;
  if (select user_limit from public.subscription_paid_periods where provider_payment_id = 'pay_master_late_unlisted') <> 7 then
    raise exception 'Pagamento atrasado de Master fora da fronteira não conservou o limite de 7 profissionais';
  end if;
  if (select status from public.subscription_scheduled_plan_changes where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'SCHEDULED' then
    raise exception 'Pagamento atrasado de Master fora da fronteira consumiu indevidamente o contrato agendado';
  end if;

  -- 10. Cancelamento tardio de assinatura anterior não deve cancelar agendamento nem assinatura substituta ativa
  insert into public.subscription_orders (
    id, barbershop_id, requester_id, idempotency_key,
    plan_code, plan_name, months, price_cents, max_installments, user_limit, terms_version,
    status, recurring_state, billing_mode, provider_account_id, provider_subscription_id, provider_environment, created_at, updated_at
  ) values (
    'c3000000-0000-4000-8000-000000000099',
    'c2000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    gen_random_uuid(),
    'simple-mensal', 'Plano Simple (Mensal)', 1, 4990, 1, 3, 'terms-v1',
    'CONFIRMED', 'ACTIVE', 'CARD_RECURRING', v_account, 'sub_old_canceled_1', 'sandbox',
    now() - interval '2 hours', now() - interval '2 hours'
  );

  perform public.persist_asaas_recurring_subscription_event(
    v_account, 'evt_old_sub_canceled', 'SUBSCRIPTION_DELETED',
    'sub_old_canceled_1', null, null, null, 'INACTIVE', null, null
  );

  if (select status from public.subscription_scheduled_plan_changes where barbershop_id = 'c2000000-0000-4000-8000-000000000001' and provider_subscription_id = v_sub_id) <> 'SCHEDULED' then
    raise exception 'Cancelamento tardio de assinatura antiga cancelou indevidamente o agendamento da assinatura substituta';
  end if;
  if (select status from public.barbershop_subscriptions where barbershop_id = 'c2000000-0000-4000-8000-000000000001') <> 'active' then
    raise exception 'Cancelamento tardio de assinatura antiga cancelou indevidamente a assinatura ativa substituta';
  end if;

end;
$$;

rollback;
