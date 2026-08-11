-- Public professional profile, editable only by the barber linked to it.
alter table public.professionals
  add column if not exists photo_url text,
  add column if not exists instagram_url text;

alter table public.professionals
  drop constraint if exists professionals_instagram_url_check;

alter table public.professionals
  add constraint professionals_instagram_url_check
  check (instagram_url is null or instagram_url ~* '^https://(www\.)?instagram\.com/[A-Za-z0-9._-]+/?$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-images',
  'professional-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Barber can upload own professional image" on storage.objects;
create policy "Barber can upload own professional image"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1
    from public.professionals p
    where p.id::text = (storage.foldername(storage.objects.name))[1]
      and p.id = private.current_barber_professional_id(p.barbershop_id)
  )
);

drop policy if exists "Barber can delete own professional image" on storage.objects;
create policy "Barber can delete own professional image"
on storage.objects for delete to authenticated
using (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 1
  and exists (
    select 1
    from public.professionals p
    where p.id::text = (storage.foldername(storage.objects.name))[1]
      and p.id = private.current_barber_professional_id(p.barbershop_id)
  )
);

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
  v_professional_id uuid;
begin
  select tm.professional_id into v_professional_id
  from public.team_members tm
  where tm.user_id = (select auth.uid())
    and tm.role = 'barber'
    and tm.status = 'active'
    and tm.professional_id is not null
  limit 1;

  if v_professional_id is null then
    raise exception 'professional profile not found' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'professional name must have at least 2 characters' using errcode = '22023';
  end if;

  if p_photo_url is not null and p_photo_url not like '%/storage/v1/object/public/professional-images/' || '' then
    raise exception 'photo URL must refer to the professional-images bucket' using errcode = '22023';
  end if;

  update public.professionals
  set name = trim(p_name),
      phone = nullif(trim(p_phone), ''),
      instagram_url = nullif(trim(p_instagram_url), ''),
      photo_url = nullif(trim(p_photo_url), '')
  where id = v_professional_id;
end;
$$;

revoke all on function public.update_my_professional_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_professional_profile(text, text, text, text) to authenticated;
