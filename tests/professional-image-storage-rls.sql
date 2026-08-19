-- Run in homologation only. All fixtures are discarded by ROLLBACK.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'barber-photo@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated', 'owner-photo@example.test', now(), now());
insert into public.barbershops (id, owner_id, name, slug, active) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000105', 'Photo Test Shop', 'photo-test-shop', true);
insert into public.professionals (id, barbershop_id, name) values
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Photo Test Barber');
insert into public.team_members (barbershop_id, user_id, professional_id, role) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000003', 'barber');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated","iss":"https://irszgnkzqseljowckrgz.supabase.co/auth/v1"}', true);

insert into storage.objects (bucket_id, name, owner, metadata)
values ('professional-images', '20000000-0000-0000-0000-000000000003/photo-test.png', '00000000-0000-0000-0000-000000000104', '{"mimetype":"image/png"}'::jsonb);

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('professional-images', '20000000-0000-0000-0000-000000000001/forbidden.png', '00000000-0000-0000-0000-000000000104', '{"mimetype":"image/png"}'::jsonb);
    raise exception 'barber uploaded an image to another professional path';
  exception when insufficient_privilege then null;
  end;
end $$;

do $$
begin
  begin
    perform public.update_my_professional_profile('Photo Test Barber', '', '', 'https://attacker.example/storage/v1/object/public/professional-images/20000000-0000-0000-0000-000000000003/a.png');
    raise exception 'attacker origin was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.update_my_professional_profile('X', '', '', null);
    raise exception 'short professional name was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.update_my_professional_profile('Photo Test Barber', '123', '', null);
    raise exception 'short professional phone was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.update_my_professional_profile('Photo Test Barber', '', 'http://instagram.com/test', null);
    raise exception 'non-HTTPS Instagram was accepted';
  exception when sqlstate '22023' then null;
  end;
end $$;

select public.update_my_professional_profile(
  'Photo Test Barber', '', '',
  'https://irszgnkzqseljowckrgz.supabase.co/storage/v1/object/public/professional-images/20000000-0000-0000-0000-000000000003/photo-test.png'
);

do $$
begin
  begin
    perform public.update_my_professional_profile(
      'Photo Test Barber', '', '',
      'https://irszgnkzqseljowckrgz.supabase.co/storage/v1/object/public/professional-images/20000000-0000-0000-0000-000000000001/forbidden.png'
    );
    raise exception 'barber saved a photo URL from another professional path';
  exception when sqlstate '22023' then null;
  end;
end $$;

reset role;
do $$
begin
  if (select photo_url from public.professionals where id = '20000000-0000-0000-0000-000000000003')
      not like '%/20000000-0000-0000-0000-000000000003/photo-test.png' then
    raise exception 'valid professional photo URL was not saved';
  end if;
end $$;

rollback;
