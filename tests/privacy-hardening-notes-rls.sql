-- Local-only regression test. It creates a pre-migration legacy row, then
-- proves the NOT VALID constraint preserves it while rejecting new free text.
begin;

alter table public.appointments disable trigger user;
alter table public.appointments drop constraint if exists appointments_notes_must_be_null;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'legacy-notes-owner@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active)
values ('10000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000201', 'Legacy Notes Shop', 'legacy-notes-shop', true);

insert into public.appointments (id, barbershop_id, customer_name, customer_phone, starts_at, ends_at, service_ids, notes)
values (
  '30000000-0000-0000-0000-000000000201',
  '10000000-0000-0000-0000-000000000201',
  'Cliente Legado',
  '11999999999',
  now() + interval '1 day',
  now() + interval '1 day 30 minutes',
  array['40000000-0000-0000-0000-000000000201'::uuid],
  'observação legada preservada'
);

alter table public.appointments enable trigger user;
alter table public.appointments add constraint appointments_notes_must_be_null check (notes is null) not valid;
alter table public.appointments disable trigger user;

do $$
begin
  if (select notes from public.appointments where id = '30000000-0000-0000-0000-000000000201') <> 'observação legada preservada' then
    raise exception 'legacy note was removed or changed';
  end if;

  begin
    insert into public.appointments (id, barbershop_id, customer_name, customer_phone, starts_at, ends_at, service_ids, notes)
    values ('30000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000201', 'Novo Cliente', '11999999998', now() + interval '2 days', now() + interval '2 days 30 minutes', array['40000000-0000-0000-0000-000000000202'::uuid], 'nova observação');
    raise exception 'new non-null note was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.appointments set notes = 'tentativa de alterar legado' where id = '30000000-0000-0000-0000-000000000201';
    raise exception 'non-null note update was accepted';
  exception when check_violation then null;
  end;

  update public.appointments set notes = null where id = '30000000-0000-0000-0000-000000000201';
  if (select notes is not null from public.appointments where id = '30000000-0000-0000-0000-000000000201') then
    raise exception 'null notes update was rejected';
  end if;
end $$;

alter table public.appointments enable trigger user;

rollback;
