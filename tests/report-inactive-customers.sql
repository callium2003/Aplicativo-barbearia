-- Relatório de clientes sem retorno. Fixtures descartadas ao final.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('f1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-inactive-report@example.test', now(), now()),
  ('f1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'outsider-inactive-report@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Relatório sem retorno', 'relatorio-sem-retorno-test', true),
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'Outro relatório', 'outro-relatorio-sem-retorno-test', true);

insert into public.customers (id, name, email, phone, phone_normalized) values
  ('f3000000-0000-0000-0000-000000000001', 'Cliente sem retorno', 'sem-retorno@example.test', '11999990001', '11999990001'),
  ('f3000000-0000-0000-0000-000000000002', 'Cliente com reserva', 'com-reserva@example.test', '11999990002', '11999990002'),
  ('f3000000-0000-0000-0000-000000000003', 'Cliente recente', 'recente@example.test', '11999990003', '11999990003');

set local session_replication_role = replica;
insert into public.appointments (
  id, barbershop_id, customer_global_id, customer_name, customer_phone, customer_email,
  starts_at, ends_at, status, service_ids, service_name_snapshot, service_price_snapshot, duration_minutes_snapshot, professional_name_snapshot
) values
  ('f4000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'Cliente sem retorno', '11999990001', 'sem-retorno@example.test', '2026-07-25 14:00:00-03', '2026-07-25 14:30:00-03', 'completed', '{f5000000-0000-0000-0000-000000000001}', 'Barba', 50, 30, 'Profissional teste'),
  ('f4000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'Cliente sem retorno', '11999990001', 'sem-retorno@example.test', '2026-07-01 14:00:00-03', '2026-07-01 14:30:00-03', 'completed', '{f5000000-0000-0000-0000-000000000002}', 'Corte', 70, 30, 'Profissional teste'),
  ('f4000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000002', 'Cliente com reserva', '11999990002', 'com-reserva@example.test', '2026-07-20 14:00:00-03', '2026-07-20 14:30:00-03', 'completed', '{f5000000-0000-0000-0000-000000000001}', 'Barba', 50, 30, 'Profissional teste'),
  ('f4000000-0000-0000-0000-000000000004', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000002', 'Cliente com reserva', '11999990002', 'com-reserva@example.test', '2026-09-15 14:00:00-03', '2026-09-15 14:30:00-03', 'scheduled', '{f5000000-0000-0000-0000-000000000001}', 'Barba', 50, 30, 'Profissional teste'),
  ('f4000000-0000-0000-0000-000000000005', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000003', 'Cliente recente', '11999990003', 'recente@example.test', '2026-07-27 14:00:00-03', '2026-07-27 14:30:00-03', 'completed', '{f5000000-0000-0000-0000-000000000002}', 'Corte', 70, 30, 'Profissional teste');
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_rows jsonb;
begin
  select public.get_barbershop_inactive_customers('f2000000-0000-0000-0000-000000000001', '2026-09-10', null)
  into v_rows;

  if jsonb_array_length(v_rows -> 'customers') <> 1 then
    raise exception 'O relatório deveria conter somente um cliente sem retorno.';
  end if;
  if v_rows #>> '{customers,0,customer_name}' <> 'Cliente sem retorno'
     or (v_rows #>> '{customers,0,days_without_return}')::int <> 47
     or (v_rows #>> '{customers,0,completed_visits}')::int <> 2 then
    raise exception 'O cliente sem retorno não trouxe o histórico esperado.';
  end if;
  if not (v_rows #> '{customers,0,service_types}' @> '["Barba", "Corte"]'::jsonb) then
    raise exception 'Os tipos de atendimento concluídos não foram preservados.';
  end if;

  perform set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);
  begin
    perform public.get_barbershop_inactive_customers('f2000000-0000-0000-0000-000000000001', '2026-09-10', null);
    raise exception 'Usuário de outro tenant acessou o relatório.';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
