begin;
insert into auth.users(id,aud,role,email,created_at,updated_at) values ('f1000000-0000-0000-0000-000000000001','authenticated','authenticated','team-regression@example.test',now(),now());
insert into public.barbershops(id,owner_id,name,slug,active) values ('f2000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','Regression','regression-team-atomic',true);
insert into public.business_hours(barbershop_id,weekday,opens_at,closes_at,is_closed)
select 'f2000000-0000-0000-0000-000000000001',d,'08:00','18:00',false from generate_series(0,6) d;
insert into public.services(id,barbershop_id,name,price,duration_minutes,active)
values ('f3000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001','Serviço teste',30,30,true);
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000001',true);
do $test$
declare v_id uuid; v_week jsonb; v_date date := current_date + 1; v_count integer;
begin
  v_id := public.create_professional_v2('f2000000-0000-0000-0000-000000000001','Teste edição','11999990000','teste@example.test');
  perform public.update_professional_v2(v_id,'Dados atualizados','11999990000','teste@example.test','https://instagram.com/teste',null);
  if not exists(select 1 from public.professionals where id=v_id and name='Dados atualizados') then raise exception 'Data edit failed'; end if;
  select jsonb_agg(jsonb_build_object('weekday',d,'opens_at','09:00','closes_at','17:00','is_closed',false)) into v_week from generate_series(0,6) d;
  perform public.save_professional_custom_schedule(v_id,v_week);
  select count(*) into v_count from public.get_public_availability('regression-team-atomic',v_date,array['f3000000-0000-0000-0000-000000000001'::uuid]) where professional_id=v_id;
  if v_count=0 then raise exception 'No public availability after saving'; end if;
  if exists(select 1 from public.get_public_availability('regression-team-atomic',v_date,array['f3000000-0000-0000-0000-000000000001'::uuid])
    where professional_id=v_id and ((starts_at at time zone 'America/Sao_Paulo')::time < '09:00' or (ends_at at time zone 'America/Sao_Paulo')::time > '17:00')) then
    raise exception 'Public availability ignored custom hours';
  end if;
  perform public.set_professional_schedule_mode(v_id,'barbershop');
  update public.business_hours set is_closed=true,opens_at=null,closes_at=null where barbershop_id='f2000000-0000-0000-0000-000000000001' and weekday=2;
  begin
    perform public.save_professional_custom_schedule(v_id,v_week);
    raise exception 'Invalid day accepted';
  exception when check_violation then null;
  end;
  if not exists(select 1 from public.professionals where id=v_id and schedule_mode='barbershop') then raise exception 'Failed save changed mode'; end if;
  v_week := jsonb_set(v_week,'{2}', '{"weekday":2,"is_closed":true,"opens_at":null,"closes_at":null}');
  perform public.save_professional_custom_schedule(v_id,v_week);
  if not exists(select 1 from public.professionals where id=v_id and schedule_mode='custom') then raise exception 'Corrected custom schedule not activated'; end if;
  perform set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000099',true);
  begin
    perform public.save_professional_custom_schedule(v_id,v_week);
    raise exception 'Outsider accepted';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
rollback;
