-- Gestão V2: contratos de cadastro, perfil e situação operacional da equipe.
-- Criado manualmente após `supabase migration new` falhar no Windows com
-- LegacyMigrationNewWriteError/AlreadyExists (CLI 2.111.0).

alter table public.professionals
  add column if not exists contact_email text,
  add column if not exists schedule_mode text not null default 'barbershop';

alter table public.professionals
  drop constraint if exists professionals_contact_email_check,
  drop constraint if exists professionals_schedule_mode_check;

alter table public.professionals
  add constraint professionals_contact_email_check check (
    contact_email is null
    or (
      char_length(contact_email) <= 254
      and contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    )
  ),
  add constraint professionals_schedule_mode_check check (
    schedule_mode in ('barbershop', 'custom')
  );

update public.professionals professional
set schedule_mode = 'custom'
where exists (
  select 1
  from public.professional_hours hours
  where hours.professional_id = professional.id
);

insert into public.professional_hours (
  professional_id, weekday, opens_at, closes_at, is_closed
)
select professional.id, hours.weekday, hours.opens_at, hours.closes_at, hours.is_closed
from public.professionals professional
join public.business_hours hours on hours.barbershop_id = professional.barbershop_id
where professional.schedule_mode = 'barbershop'
on conflict (professional_id, weekday) do update
set opens_at = excluded.opens_at,
    closes_at = excluded.closes_at,
    is_closed = excluded.is_closed;

create table if not exists public.professional_saved_custom_hours (
  professional_id uuid not null references public.professionals(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (professional_id, weekday),
  constraint professional_saved_custom_hours_interval_check check (
    (is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null and opens_at < closes_at)
  )
);

alter table public.professional_saved_custom_hours enable row level security;
revoke all on table public.professional_saved_custom_hours from public, anon;
grant select on table public.professional_saved_custom_hours to authenticated;

drop policy if exists "Management can read saved professional hours"
  on public.professional_saved_custom_hours;
create policy "Management can read saved professional hours"
  on public.professional_saved_custom_hours
  for select
  to authenticated
  using (
    private.current_barbershop_role((
      select professional.barbershop_id
      from public.professionals professional
      where professional.id = professional_saved_custom_hours.professional_id
    )) in ('owner', 'manager')
  );

create or replace function private.validate_custom_professional_hours()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_professional record;
  v_business_hours record;
begin
  select professional.barbershop_id, professional.schedule_mode
  into v_professional
  from public.professionals professional
  where professional.id = new.professional_id;

  if v_professional.schedule_mode <> 'custom' or new.is_closed then
    return new;
  end if;

  select hours.opens_at, hours.closes_at, hours.is_closed
  into v_business_hours
  from public.business_hours hours
  where hours.barbershop_id = v_professional.barbershop_id
    and hours.weekday = new.weekday;

  if v_business_hours.is_closed is distinct from false
    or new.opens_at is null or new.closes_at is null
    or new.opens_at < v_business_hours.opens_at
    or new.closes_at > v_business_hours.closes_at
    or new.opens_at >= new.closes_at then
    raise exception 'A agenda personalizada deve permanecer dentro do horário da barbearia.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_custom_professional_hours() from public, anon, authenticated;
grant execute on function private.validate_custom_professional_hours() to postgres, service_role;

drop trigger if exists validate_custom_professional_hours_change on public.professional_hours;
create trigger validate_custom_professional_hours_change
before insert or update on public.professional_hours
for each row execute function private.validate_custom_professional_hours();

create table if not exists public.professional_deactivation_reviews (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  open_appointment_count integer not null check (open_appointment_count > 0),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_by uuid not null references auth.users(id) on delete restrict,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint professional_deactivation_reviews_resolution_check check (
    (status = 'open' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create unique index if not exists professional_deactivation_reviews_one_open_idx
  on public.professional_deactivation_reviews (professional_id)
  where status = 'open';

create index if not exists professional_deactivation_reviews_barbershop_idx
  on public.professional_deactivation_reviews (barbershop_id, status, created_at desc);

alter table public.professional_deactivation_reviews enable row level security;
revoke all on table public.professional_deactivation_reviews from public, anon;
grant select on table public.professional_deactivation_reviews to authenticated;

drop policy if exists "Management can read professional deactivation reviews"
  on public.professional_deactivation_reviews;
create policy "Management can read professional deactivation reviews"
  on public.professional_deactivation_reviews
  for select
  to authenticated
  using (private.current_barbershop_role(barbershop_id) in ('owner', 'manager'));

create or replace function public.create_professional_v2(
  p_barbershop_id uuid,
  p_name text,
  p_phone text default null,
  p_contact_email text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role text;
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_contact_email text := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_professional_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para cadastrar profissional nesta barbearia.' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'O nome deve ter entre 2 e 120 caracteres.' using errcode = '22023';
  end if;
  if v_phone is not null and char_length(v_phone) not between 10 and 13 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if v_contact_email is not null and (
    char_length(v_contact_email) > 254
    or v_contact_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) then
    raise exception 'E-mail de contato inválido.' using errcode = '22023';
  end if;
  if (
    select count(*)
    from public.professionals professional
    where professional.barbershop_id = p_barbershop_id and professional.active
  ) >= 5 then
    raise exception 'O plano atual permite até cinco profissionais ativos.' using errcode = '23514';
  end if;

  insert into public.professionals (
    barbershop_id, name, phone, contact_email, active, schedule_mode
  ) values (
    p_barbershop_id, v_name, v_phone, v_contact_email, true, 'barbershop'
  )
  returning id into v_professional_id;

  insert into public.professional_commission_settings (
    professional_id, commission_rate_percent, updated_by
  ) values (
    v_professional_id, 0.00, auth.uid()
  )
  on conflict (professional_id) do nothing;

  insert into public.professional_hours (
    professional_id, weekday, opens_at, closes_at, is_closed
  )
  select
    v_professional_id,
    hours.weekday,
    hours.opens_at,
    hours.closes_at,
    hours.is_closed
  from public.business_hours hours
  where hours.barbershop_id = p_barbershop_id
  on conflict (professional_id, weekday) do update
  set opens_at = excluded.opens_at,
      closes_at = excluded.closes_at,
      is_closed = excluded.is_closed;

  return v_professional_id;
end;
$$;

revoke all on function public.create_professional_v2(uuid, text, text, text) from public, anon;
grant execute on function public.create_professional_v2(uuid, text, text, text) to authenticated;

create or replace function public.update_professional_v2(
  p_professional_id uuid,
  p_name text,
  p_phone text default null,
  p_contact_email text default null,
  p_instagram_url text default null,
  p_photo_url text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_professional public.professionals%rowtype;
  v_role text;
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_contact_email text := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_instagram text := nullif(trim(coalesce(p_instagram_url, '')), '');
  v_photo text := nullif(trim(coalesce(p_photo_url, '')), '');
  v_origin text := rtrim(coalesce(current_setting('app.settings.supabase_url', true), ''), '/');
  v_photo_prefix text;
begin
  select * into v_professional
  from public.professionals
  where id = p_professional_id;

  if not found then
    raise exception 'Profissional não encontrado.' using errcode = 'P0002';
  end if;
  v_role := private.current_barbershop_role(v_professional.barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para editar este profissional.' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'O nome deve ter entre 2 e 120 caracteres.' using errcode = '22023';
  end if;
  if v_phone is not null and char_length(v_phone) not between 10 and 13 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if v_contact_email is not null and (
    char_length(v_contact_email) > 254
    or v_contact_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) then
    raise exception 'E-mail de contato inválido.' using errcode = '22023';
  end if;
  if v_instagram is not null and v_instagram !~* '^https://(www\.)?instagram\.com/[A-Za-z0-9._-]+/?$' then
    raise exception 'URL do Instagram inválida.' using errcode = '22023';
  end if;

  v_photo_prefix := v_origin || '/storage/v1/object/public/professional-images/' || p_professional_id::text || '/';
  if v_photo is not null and (
    v_origin = '' or v_photo !~~ (v_photo_prefix || '%')
    or v_photo like '%?%' or v_photo like '%#%' or v_photo like '%\%'
    or v_photo like '%..%' or position('%' in v_photo) > 0
    or length(v_photo) <= length(v_photo_prefix)
  ) then
    raise exception 'URL da foto inválida.' using errcode = '22023';
  end if;

  update public.professionals
  set name = v_name,
      phone = v_phone,
      contact_email = v_contact_email,
      instagram_url = v_instagram,
      photo_url = v_photo
  where id = p_professional_id;
end;
$$;

revoke all on function public.update_professional_v2(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.update_professional_v2(uuid, text, text, text, text, text) to authenticated;

create or replace function public.set_professional_schedule_mode(
  p_professional_id uuid,
  p_schedule_mode text
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_barbershop_id uuid;
  v_current_mode text;
begin
  select professional.barbershop_id, professional.schedule_mode
  into v_barbershop_id, v_current_mode
  from public.professionals professional
  where professional.id = p_professional_id;

  if v_barbershop_id is null then
    raise exception 'Profissional não encontrado.' using errcode = 'P0002';
  end if;
  if private.current_barbershop_role(v_barbershop_id) not in ('owner', 'manager') then
    raise exception 'Sem permissão para alterar esta agenda.' using errcode = '42501';
  end if;
  if p_schedule_mode not in ('barbershop', 'custom') then
    raise exception 'Modo de agenda inválido.' using errcode = '22023';
  end if;
  if p_schedule_mode = v_current_mode then
    return;
  end if;

  if p_schedule_mode = 'barbershop' then
    insert into public.professional_saved_custom_hours (
      professional_id, weekday, opens_at, closes_at, is_closed, updated_at
    )
    select professional_id, weekday, opens_at, closes_at, is_closed, now()
    from public.professional_hours
    where professional_id = p_professional_id
    on conflict (professional_id, weekday) do update
    set opens_at = excluded.opens_at,
        closes_at = excluded.closes_at,
        is_closed = excluded.is_closed,
        updated_at = now();

    delete from public.professional_hours where professional_id = p_professional_id;
    insert into public.professional_hours (
      professional_id, weekday, opens_at, closes_at, is_closed
    )
    select p_professional_id, weekday, opens_at, closes_at, is_closed
    from public.business_hours
    where barbershop_id = v_barbershop_id;
  else
    update public.professionals
    set schedule_mode = 'custom'
    where id = p_professional_id;

    if (select count(*) from public.professional_saved_custom_hours where professional_id = p_professional_id) = 7 then
      delete from public.professional_hours where professional_id = p_professional_id;
      insert into public.professional_hours (
        professional_id, weekday, opens_at, closes_at, is_closed
      )
      select professional_id, weekday, opens_at, closes_at, is_closed
      from public.professional_saved_custom_hours
      where professional_id = p_professional_id;
    elsif (select count(*) from public.professional_hours where professional_id = p_professional_id) <> 7 then
      raise exception 'A agenda personalizada deve possuir os sete dias.' using errcode = '22023';
    end if;
  end if;

  update public.professionals
  set schedule_mode = p_schedule_mode
  where id = p_professional_id;
end;
$$;

revoke all on function public.set_professional_schedule_mode(uuid, text) from public, anon;
grant execute on function public.set_professional_schedule_mode(uuid, text) to authenticated;

create or replace function private.sync_inherited_professional_hours()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_barbershop_id uuid := coalesce(new.barbershop_id, old.barbershop_id);
  v_weekday integer := coalesce(new.weekday, old.weekday);
begin
  if tg_op = 'DELETE' then
    delete from public.professional_hours hours
    using public.professionals professional
    where hours.professional_id = professional.id
      and professional.barbershop_id = v_barbershop_id
      and professional.schedule_mode = 'barbershop'
      and hours.weekday = v_weekday;
    return old;
  end if;

  insert into public.professional_hours (
    professional_id, weekday, opens_at, closes_at, is_closed
  )
  select professional.id, new.weekday, new.opens_at, new.closes_at, new.is_closed
  from public.professionals professional
  where professional.barbershop_id = new.barbershop_id
    and professional.schedule_mode = 'barbershop'
  on conflict (professional_id, weekday) do update
  set opens_at = excluded.opens_at,
      closes_at = excluded.closes_at,
      is_closed = excluded.is_closed;

  return new;
end;
$$;

revoke all on function private.sync_inherited_professional_hours() from public, anon, authenticated;
grant execute on function private.sync_inherited_professional_hours() to postgres, service_role;

drop trigger if exists sync_inherited_professional_hours_change on public.business_hours;
create trigger sync_inherited_professional_hours_change
after insert or update or delete on public.business_hours
for each row execute function private.sync_inherited_professional_hours();

create or replace function public.set_professional_operational_status(
  p_professional_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_professional public.professionals%rowtype;
  v_role text;
  v_future_count integer := 0;
begin
  select * into v_professional
  from public.professionals
  where id = p_professional_id
  for update;

  if not found then
    raise exception 'Profissional não encontrado.' using errcode = 'P0002';
  end if;
  v_role := private.current_barbershop_role(v_professional.barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para alterar este profissional.' using errcode = '42501';
  end if;
  if p_active = v_professional.active then
    return jsonb_build_object('success', true, 'active', p_active, 'future_appointments', 0);
  end if;

  if p_active then
    if (
      select count(*) from public.professionals professional
      where professional.barbershop_id = v_professional.barbershop_id
        and professional.active and professional.id <> p_professional_id
    ) >= 5 then
      raise exception 'O plano atual permite até cinco profissionais ativos.' using errcode = '23514';
    end if;
    update public.professionals set active = true where id = p_professional_id;
  else
    select count(*) into v_future_count
    from public.appointments appointment
    where appointment.barbershop_id = v_professional.barbershop_id
      and appointment.professional_id = p_professional_id
      and appointment.starts_at > now()
      and appointment.status in ('scheduled', 'confirmed');

    update public.professionals set active = false where id = p_professional_id;
    update public.team_members
    set status = 'inactive'
    where barbershop_id = v_professional.barbershop_id
      and professional_id = p_professional_id
      and status = 'active';
    update public.team_invitations
    set status = 'revoked', revoked_by = auth.uid(), revoked_at = now()
    where barbershop_id = v_professional.barbershop_id
      and professional_id = p_professional_id
      and status = 'pending';

    if v_future_count > 0 then
      insert into public.professional_deactivation_reviews (
        barbershop_id, professional_id, open_appointment_count, created_by
      ) values (
        v_professional.barbershop_id, p_professional_id, v_future_count, auth.uid()
      )
      on conflict (professional_id) where status = 'open'
      do update set
        open_appointment_count = excluded.open_appointment_count,
        created_by = excluded.created_by,
        created_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'active', p_active,
    'future_appointments', v_future_count
  );
end;
$$;

revoke all on function public.set_professional_operational_status(uuid, boolean) from public, anon;
grant execute on function public.set_professional_operational_status(uuid, boolean) to authenticated;

create or replace function public.resolve_professional_deactivation_review(
  p_professional_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_professional public.professionals%rowtype;
  v_review public.professional_deactivation_reviews%rowtype;
  v_role text;
  v_future_count integer;
begin
  select * into v_professional
  from public.professionals
  where id = p_professional_id;
  if not found then
    raise exception 'Profissional não encontrado.' using errcode = 'P0002';
  end if;

  v_role := private.current_barbershop_role(v_professional.barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para encerrar esta revisão.' using errcode = '42501';
  end if;

  select * into v_review
  from public.professional_deactivation_reviews
  where professional_id = p_professional_id
    and status = 'open'
  for update;
  if not found then
    raise exception 'Revisão pendente não encontrada.' using errcode = 'P0002';
  end if;

  select count(*) into v_future_count
  from public.appointments appointment
  where appointment.barbershop_id = v_professional.barbershop_id
    and appointment.professional_id = p_professional_id
    and appointment.starts_at > now()
    and appointment.status in ('scheduled', 'confirmed');
  if v_future_count > 0 then
    raise exception 'Ainda existem compromissos futuros ativos para revisar.' using errcode = '23514';
  end if;

  update public.professional_deactivation_reviews
  set status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
  where id = v_review.id;
end;
$$;

revoke all on function public.resolve_professional_deactivation_review(uuid) from public, anon;
grant execute on function public.resolve_professional_deactivation_review(uuid) to authenticated;

create or replace function public.set_professional_access_status(
  p_professional_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_professional public.professionals%rowtype;
  v_member public.team_members%rowtype;
  v_role text;
begin
  select * into v_professional
  from public.professionals
  where id = p_professional_id;
  if not found then
    raise exception 'Profissional não encontrado.' using errcode = 'P0002';
  end if;

  v_role := private.current_barbershop_role(v_professional.barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para alterar este acesso.' using errcode = '42501';
  end if;
  if p_status not in ('active', 'inactive') then
    raise exception 'Situação de acesso inválida.' using errcode = '22023';
  end if;
  if p_status = 'active' and not v_professional.active then
    raise exception 'Reative o cadastro antes de reativar o acesso.' using errcode = '22023';
  end if;

  select * into v_member
  from public.team_members
  where barbershop_id = v_professional.barbershop_id
    and professional_id = p_professional_id
    and role = 'barber'
  order by created_at desc
  limit 1
  for update;
  if not found then
    raise exception 'Vínculo de acesso não encontrado.' using errcode = 'P0002';
  end if;

  update public.team_members
  set status = p_status
  where id = v_member.id;
end;
$$;

revoke all on function public.set_professional_access_status(uuid, text) from public, anon;
grant execute on function public.set_professional_access_status(uuid, text) to authenticated;

drop policy if exists "Management can insert professional images" on storage.objects;
create policy "Management can insert professional images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1 from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
  )
);

drop policy if exists "Management can read professional images" on storage.objects;
create policy "Management can read professional images"
on storage.objects for select to authenticated
using (
  bucket_id = 'professional-images'
  and exists (
    select 1 from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
  )
);

drop policy if exists "Management can update professional images" on storage.objects;
create policy "Management can update professional images"
on storage.objects for update to authenticated
using (
  bucket_id = 'professional-images'
  and exists (
    select 1 from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
  )
)
with check (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
);

drop policy if exists "Management can delete professional images" on storage.objects;
create policy "Management can delete professional images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'professional-images'
  and exists (
    select 1 from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
  )
);
