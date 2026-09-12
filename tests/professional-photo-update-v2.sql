-- Gestão V2: trocar a foto do profissional preserva o isolamento do Storage.
-- Execute após as migrations; todas as fixtures são descartadas ao final.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('d1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-photo-v2@example.test', now(), now()),
  ('d1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'outsider-photo-v2@example.test', now(), now());

insert into public.barbershops (id, owner_id, name, slug, active) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Foto V2', 'foto-v2-test', true),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'Outra Foto V2', 'outra-foto-v2-test', true);

insert into public.professionals (id, barbershop_id, name, active, schedule_mode) values
  ('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'Profissional com foto', true, 'barbershop');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated","iss":"https://irszgnkzqseljowckrgz.supabase.co/auth/v1"}',
  true
);

insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'professional-images',
  'd3000000-0000-0000-0000-000000000001/fixture.webp',
  'd1000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/webp"}'::jsonb
);

select public.update_professional_v2(
  'd3000000-0000-0000-0000-000000000001',
  'Profissional com foto',
  null,
  null,
  null,
  'https://irszgnkzqseljowckrgz.supabase.co/storage/v1/object/public/professional-images/d3000000-0000-0000-0000-000000000001/fixture.webp'
);

do $$
begin
  if not exists (
    select 1 from public.professionals
    where id = 'd3000000-0000-0000-0000-000000000001'
      and photo_url like '%/d3000000-0000-0000-0000-000000000001/fixture.webp'
  ) then
    raise exception 'foto válida não foi associada ao profissional';
  end if;

  begin
    perform public.update_professional_v2(
      'd3000000-0000-0000-0000-000000000001',
      'Profissional com foto',
      null,
      null,
      null,
      'https://irszgnkzqseljowckrgz.supabase.co/storage/v1/object/public/professional-images/d3000000-0000-0000-0000-000000000001/inexistente.webp'
    );
    raise exception 'foto inexistente foi aceita';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000002","role":"authenticated","iss":"https://irszgnkzqseljowckrgz.supabase.co/auth/v1"}',
  true
);

do $$
begin
  begin
    perform public.update_professional_v2(
      'd3000000-0000-0000-0000-000000000001',
      'Tentativa externa',
      null, null, null, null
    );
    raise exception 'usuário de outro tenant alterou profissional';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;

