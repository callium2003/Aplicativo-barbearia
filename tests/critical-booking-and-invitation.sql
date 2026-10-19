-- Schema real após todas as migrations; identidades fictícias e rollback obrigatório.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
 ('c1000000-0000-4000-8000-000000000001','authenticated','authenticated','owner-critical@example.test',now(),now()),
 ('c1000000-0000-4000-8000-000000000002','authenticated','authenticated','customer-critical@example.test',now(),now()),
 ('c1000000-0000-4000-8000-000000000003','authenticated','authenticated','invite-critical@example.test',now(),now()),
 ('c1000000-0000-4000-8000-000000000004','authenticated','authenticated','outsider-critical@example.test',now(),now());
insert into public.barbershops (id, owner_id, name, slug, active, initial_registration_completed) values
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Critical A','critical-sql-a',true,true),
 ('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000004','Critical B','critical-sql-b',true,true);
insert into public.professionals (id, barbershop_id, name, active) values
 ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Profissional A',true),
 ('c3000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','Profissional B',true);
insert into public.services (id, barbershop_id, name, price, duration_minutes, active) values
 ('c4000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Corte A',30,30,true),
 ('c4000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','Corte B',30,30,true);
insert into public.business_hours (barbershop_id, weekday, opens_at, closes_at, is_closed)
 select shop.id, day::smallint,'08:00','20:00',false
 from public.barbershops shop cross join generate_series(0,6) day
 where shop.id in ('c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002');
insert into public.professional_hours (professional_id, weekday, opens_at, closes_at, is_closed)
 select prof.id, day::smallint,'08:00','20:00',false
 from public.professionals prof cross join generate_series(0,6) day
 where prof.id in ('c3000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002')
 on conflict (professional_id, weekday) do update
 set opens_at=excluded.opens_at, closes_at=excluded.closes_at, is_closed=excluded.is_closed;

set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
do $test$
declare
 shop uuid := 'c2000000-0000-4000-8000-000000000001';
 prof uuid := 'c3000000-0000-4000-8000-000000000001';
 services uuid[] := array['c4000000-0000-4000-8000-000000000001'::uuid];
 slot timestamptz := (((now() at time zone 'America/Sao_Paulo')::date + 2) + time '10:00') at time zone 'America/Sao_Paulo';
 original uuid; occupied uuid; replacement uuid; rejected boolean;
begin
 original := public.book_customer_appointment(shop,services,prof,slot,'Cliente fictício','11900000001');
 occupied := public.book_customer_appointment(shop,services,prof,slot + interval '1 hour','Cliente fictício','11900000001');
 rejected := false;
 begin
  perform public.reschedule_customer_appointment(original,shop,services,prof,slot + interval '1 hour','Cliente fictício','11900000001');
 exception when exclusion_violation or raise_exception then rejected := true;
 end;
 if not rejected then raise exception 'Reagendamento aceitou horário ocupado'; end if;
 if not exists(select 1 from public.appointments where id=original and status='scheduled' and starts_at=slot) then
  raise exception 'Falha de reagendamento não restaurou a reserva original';
 end if;
 if (select count(*) from public.appointments where barbershop_id=shop) <> 2 then raise exception 'Falha deixou reserva parcial'; end if;
 rejected := false;
 begin
  perform public.reschedule_customer_appointment(original,'c2000000-0000-4000-8000-000000000002',services,prof,slot + interval '2 hours','Cliente fictício','11900000001');
 exception when raise_exception then rejected := true;
 end;
 if not rejected then raise exception 'Reagendamento cruzou tenants'; end if;
 replacement := public.reschedule_customer_appointment(original,shop,services,prof,slot + interval '2 hours','Cliente fictício','11900000001');
 if not exists(select 1 from public.appointments where id=original and status='cancelled')
   or not exists(select 1 from public.appointments where id=replacement and status='scheduled') then
  raise exception 'Reagendamento não cancelou e substituiu atomicamente';
 end if;
end;
$test$;

select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
select set_config('critical.invitation',public.create_team_invitation('c2000000-0000-4000-8000-000000000001','invite-critical@example.test','manager',null),true);
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000004","email":"outsider-critical@example.test","role":"authenticated"}',true);
do $test$
declare rejected boolean := false;
begin
 begin perform public.accept_team_invitation(current_setting('critical.invitation')); exception when raise_exception then rejected := true; end;
 if not rejected then raise exception 'Convite foi aceito por outro endereço'; end if;
end;
$test$;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000003","email":"invite-critical@example.test","role":"authenticated"}',true);
do $test$
declare result jsonb;
begin
 result := public.accept_team_invitation(current_setting('critical.invitation'));
 if result->>'success' is distinct from 'true' then raise exception 'Destinatário não aceitou convite'; end if;
 if not exists(select 1 from public.team_members where barbershop_id='c2000000-0000-4000-8000-000000000001' and user_id='c1000000-0000-4000-8000-000000000003' and role='manager' and status='active') then
  raise exception 'Aceite não criou vínculo correto';
 end if;
end;
$test$;
reset role;
rollback;
