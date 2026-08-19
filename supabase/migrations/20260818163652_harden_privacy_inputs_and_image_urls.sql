-- Preserve historical appointment notes while rejecting any newly written free text.
alter table public.appointments
  add constraint appointments_notes_must_be_null check (notes is null) not valid;

-- Existing provider responses can contain addresses, tokens or error details. Keep only a code.
update public.notification_outbox
set last_error = case
  when last_error ~ '^http_[0-9]{3}$' then last_error
  when coalesce(last_error, '') = '' then null
  else 'delivery_failed'
end
where last_error is not null;

alter table public.notification_outbox
  drop constraint if exists notification_outbox_last_error_code_check;
alter table public.notification_outbox
  add constraint notification_outbox_last_error_code_check
  check (last_error is null or last_error ~ '^[A-Za-z0-9_-]{1,64}$') not valid;

create or replace function private.current_supabase_origin()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select regexp_replace(coalesce(auth.jwt() ->> 'iss', ''), '/auth/v1/?$', '');
$$;

revoke all on function private.current_supabase_origin() from public, anon, authenticated;

create or replace function public.set_barbershop_photo_url(
  p_barbershop_id uuid,
  p_photo_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_origin text := private.current_supabase_origin();
  v_prefix text;
begin
  if v_user_id is null or not exists (
    select 1 from public.barbershops b where b.id = p_barbershop_id and b.owner_id = v_user_id
    union all
    select 1 from public.team_members tm
    where tm.barbershop_id = p_barbershop_id and tm.user_id = v_user_id and tm.status = 'active' and tm.role = 'manager'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_prefix := v_origin || '/storage/v1/object/public/barbershop-images/' || p_barbershop_id::text || '/';
  if p_photo_url is not null and (
    v_origin = '' or p_photo_url !~~ (v_prefix || '%')
    or p_photo_url like '%?%' or p_photo_url like '%#%' or p_photo_url like '%\\%'
    or p_photo_url like '%..%' or position('%' in p_photo_url) > 0 or length(p_photo_url) <= length(v_prefix)
  ) then
    raise exception 'invalid barbershop image URL' using errcode = '22023';
  end if;

  update public.barbershops set photo_url = nullif(btrim(p_photo_url), '') where id = p_barbershop_id;
end;
$$;

revoke all on function public.set_barbershop_photo_url(uuid, text) from public, anon;
grant execute on function public.set_barbershop_photo_url(uuid, text) to authenticated;

create or replace function public.update_my_professional_profile(
  p_name text,
  p_phone text,
  p_instagram_url text,
  p_photo_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_professional_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\\D', '', 'g');
  v_instagram text := nullif(btrim(coalesce(p_instagram_url, '')), '');
  v_origin text := private.current_supabase_origin();
  v_prefix text;
begin
  select tm.professional_id into v_professional_id
  from public.team_members tm
  where tm.user_id = v_user_id and tm.role = 'barber' and tm.status = 'active' and tm.professional_id is not null
  limit 1;

  if v_user_id is null or v_professional_id is null then
    raise exception 'professional profile not found' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'invalid professional name' using errcode = '22023';
  end if;
  if v_phone <> '' and char_length(v_phone) not between 10 and 13 then
    raise exception 'invalid professional phone' using errcode = '22023';
  end if;
  if v_instagram is not null and v_instagram !~ '^https://(www\\.)?instagram\\.com(/|$)' then
    raise exception 'invalid professional instagram URL' using errcode = '22023';
  end if;

  v_prefix := v_origin || '/storage/v1/object/public/professional-images/' || v_professional_id::text || '/';
  if p_photo_url is not null and (
    v_origin = '' or p_photo_url !~~ (v_prefix || '%')
    or p_photo_url like '%?%' or p_photo_url like '%#%' or p_photo_url like '%\\%'
    or p_photo_url like '%..%' or position('%' in p_photo_url) > 0 or length(p_photo_url) <= length(v_prefix)
  ) then
    raise exception 'invalid professional image URL' using errcode = '22023';
  end if;

  update public.professionals
  set name = v_name,
      phone = nullif(v_phone, ''),
      instagram_url = v_instagram,
      photo_url = nullif(btrim(p_photo_url), '')
  where id = v_professional_id;
end;
$$;

revoke all on function public.update_my_professional_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_professional_profile(text, text, text, text) to authenticated;
