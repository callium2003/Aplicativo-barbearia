-- Gestão V2: pausa e bloqueio influenciam a disponibilidade pública.
-- Todas as fixtures são descartadas ao final.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('c1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-availability-v2@example.test', now(), now()),
  ('c1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'outsider-availability-v2@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Disponibilidade V2', 'disponibilidade-v2-test', true),
  ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Outra disponibilidade V2', 'outra-disponibilidade-v2-test', true);

insert into public.business_hours (barbershop_id, weekday, opens_at, closes_at, is_closed)
select 'c2000000-0000-0000-0000-000000000001', weekday, '09:00', '18:00', false
from generate_series(0, 6) weekday;

insert into public.professionals (id, barbershop_id, name, active, schedule_mode) values
  ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'Disponibilidade profissional', true, 'custom');

insert into public.professional_hours (professional_id, weekday, opens_at, closes_at, is_closed)
select 'c3000000-0000-0000-0000-000000000001', weekday, '09:00', '18:00', false
from generate_series(0, 6) weekday;

insert into public.services (id, barbershop_id, name, price, duration_minutes, active)
values ('c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'Serviço de disponibilidade', 30, 30, true);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_date date := current_date + 1;
  v_weekday integer := extract(dow from current_date + 1);
begin
  insert into public.professional_breaks (professional_id, weekday, starts_at, ends_at)
  values ('c3000000-0000-0000-0000-000000000001', v_weekday, '12:00', '13:00');

  insert into public.professional_time_blocks (professional_id, starts_at, ends_at, reason)
  values (
    'c3000000-0000-0000-0000-000000000001',
    (v_date + time '15:00') at time zone 'America/Sao_Paulo',
    (v_date + time '15:30') at time zone 'America/Sao_Paulo',
    'Teste de bloqueio'
  );

  if exists (
    select 1 from public.get_public_availability(
      'disponibilidade-v2-test',
      v_date,
      array['c4000000-0000-0000-0000-000000000001'::uuid]
    )
    where professional_id = 'c3000000-0000-0000-0000-000000000001'
      and (starts_at at time zone 'America/Sao_Paulo')::time in ('12:00', '12:10', '12:20', '12:30', '12:40', '12:50', '15:00')
  ) then
    raise exception 'pausa ou bloqueio apareceu na disponibilidade pública';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
do $$
begin
  begin
    insert into public.professional_breaks (professional_id, weekday, starts_at, ends_at)
    values ('c3000000-0000-0000-0000-000000000001', 1, '10:00', '11:00');
    raise exception 'usuário externo criou pausa';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.professional_time_blocks (professional_id, starts_at, ends_at, reason)
    values ('c3000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 30 minutes', 'Tentativa externa');
    raise exception 'usuário externo criou bloqueio';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;

