-- Executar apenas no stack isolado, com a linhagem integral aplicada.
begin;
insert into auth.users(id,aud,role,email,created_at,updated_at) values
('e1000000-0000-4000-8000-000000000001','authenticated','authenticated','subscription-a@example.test',now(),now()),
('e1000000-0000-4000-8000-000000000002','authenticated','authenticated','subscription-b@example.test',now(),now());
insert into public.barbershops(id,owner_id,name,slug,active) values
('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','Owner A','subscription-owner-a-fixture',true),
('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000002','Owner B','subscription-owner-b-fixture',true);
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
  if has_column_privilege(current_user,'public.barbershops','owner_id','select') then raise exception 'owner_id exposed'; end if;
  if (select count(*) from public.barbershop_subscriptions where barbershop_id='e2000000-0000-4000-8000-000000000001') <> 1 then raise exception 'own subscription unreadable'; end if;
  if exists(select from public.barbershop_subscriptions where barbershop_id='e2000000-0000-4000-8000-000000000002') then raise exception 'other tenant exposed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
  if exists(select from public.barbershop_subscriptions where barbershop_id in ('e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000002')) then raise exception 'stranger read subscription'; end if;
end $$;
reset role;
rollback;
