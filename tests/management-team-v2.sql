-- Gestão V2 / Equipe. Todas as fixtures são descartadas no ROLLBACK.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('e1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-team-v2@example.test', now(), now()),
  ('e1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'barber-team-v2@example.test', now(), now()),
  ('e1000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'outsider-team-v2@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Equipe V2', 'equipe-v2-test', true),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000003', 'Outra Equipe V2', 'outra-equipe-v2-test', true);

insert into public.business_hours (barbershop_id, weekday, opens_at, closes_at, is_closed)
select 'e2000000-0000-0000-0000-000000000001', weekday, '08:00', '18:00', false
from generate_series(0, 6) weekday;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_professional_id uuid;
begin
  v_professional_id := public.create_professional_v2(
    'e2000000-0000-0000-0000-000000000001',
    '  Profissional V2  ',
    '(11) 99999-0000',
    ' CONTATO@EXAMPLE.TEST '
  );

  if not exists (
    select 1 from public.professionals
    where id = v_professional_id
      and name = 'Profissional V2'
      and phone = '11999990000'
      and contact_email = 'contato@example.test'
      and active
      and schedule_mode = 'barbershop'
  ) then
    raise exception 'Cadastro inicial não preservou os contratos da Gestão V2.';
  end if;
  if (select count(*) from public.professional_hours where professional_id = v_professional_id) <> 7 then
    raise exception 'Agenda herdada não produziu sete dias efetivos.';
  end if;
  if not exists (
    select 1 from public.get_professional_commission_rates('e2000000-0000-0000-0000-000000000001')
    where professional_id = v_professional_id and commission_rate_percent = 0
  ) then
    raise exception 'Comissão inicial não foi criada.';
  end if;

  insert into public.team_members (barbershop_id, user_id, professional_id, role, status)
  values ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', v_professional_id, 'barber', 'active');

  set local role postgres;
  set local session_replication_role = replica;
  insert into public.appointments (
    barbershop_id, professional_id, customer_name, customer_phone,
    starts_at, ends_at, status, service_ids
  ) values (
    'e2000000-0000-0000-0000-000000000001', v_professional_id,
    'Cliente futuro', '11999998888', now() + interval '7 days',
    now() + interval '7 days 30 minutes', 'scheduled',
    array['e3000000-0000-0000-0000-000000000001'::uuid]
  );
  set local session_replication_role = origin;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

  perform public.set_professional_schedule_mode(v_professional_id, 'custom');
  update public.professional_hours set opens_at = '10:00', closes_at = '16:00'
  where professional_id = v_professional_id and weekday = 1;
  perform public.set_professional_schedule_mode(v_professional_id, 'barbershop');

  update public.business_hours set opens_at = '09:00', closes_at = '17:00'
  where barbershop_id = 'e2000000-0000-0000-0000-000000000001' and weekday = 1;
  if not exists (
    select 1 from public.professional_hours
    where professional_id = v_professional_id and weekday = 1 and opens_at = '09:00' and closes_at = '17:00'
  ) then
    raise exception 'Mudança da barbearia não sincronizou a agenda herdada.';
  end if;

  perform public.set_professional_schedule_mode(v_professional_id, 'custom');
  if not exists (
    select 1 from public.professional_hours
    where professional_id = v_professional_id and weekday = 1 and opens_at = '10:00' and closes_at = '16:00'
  ) then
    raise exception 'Agenda personalizada anterior não foi restaurada.';
  end if;

  begin
    update public.professional_hours set opens_at = '07:00'
    where professional_id = v_professional_id and weekday = 1;
    raise exception 'Agenda personalizada fora do horário foi aceita.';
  exception when check_violation then null;
  end;

  perform public.set_professional_operational_status(v_professional_id, false);
  if exists (select 1 from public.professionals where id = v_professional_id and active) then
    raise exception 'Inativação não alterou o cadastro operacional.';
  end if;
  if exists (select 1 from public.team_members where professional_id = v_professional_id and status = 'active') then
    raise exception 'Inativação não bloqueou o acesso.';
  end if;
  if not exists (
    select 1 from public.professional_deactivation_reviews
    where professional_id = v_professional_id and status = 'open' and open_appointment_count = 1
  ) then
    raise exception 'Inativação não criou a revisão persistente dos compromissos futuros.';
  end if;
  begin
    perform public.resolve_professional_deactivation_review(v_professional_id);
    raise exception 'Revisão foi encerrada com compromisso futuro ainda ativo.';
  exception when check_violation then null;
  end;

  update public.appointments
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'e1000000-0000-0000-0000-000000000001'
  where professional_id = v_professional_id;
  perform public.resolve_professional_deactivation_review(v_professional_id);
  if not exists (
    select 1 from public.professional_deactivation_reviews
    where professional_id = v_professional_id and status = 'resolved'
  ) then
    raise exception 'Revisão sem compromissos ativos não foi encerrada.';
  end if;

  perform public.set_professional_operational_status(v_professional_id, true);
  if not exists (select 1 from public.professionals where id = v_professional_id and active) then
    raise exception 'Reativação não alterou o cadastro operacional.';
  end if;
  if exists (select 1 from public.team_members where professional_id = v_professional_id and status = 'active') then
    raise exception 'Reativação operacional reativou o acesso indevidamente.';
  end if;

  perform set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);
  begin
    perform public.set_professional_operational_status(v_professional_id, false);
    raise exception 'Usuário de outro tenant alterou o profissional.';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
