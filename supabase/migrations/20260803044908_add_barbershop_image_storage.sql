-- Public photos for a barbershop. Only its owner or active manager may mutate
-- objects under that barbershop's UUID prefix.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbershop-images',
  'barbershop-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read barbershop images" on storage.objects;
create policy "Public can read barbershop images"
on storage.objects for select
to public
using (bucket_id = 'barbershop-images');

drop policy if exists "Owner or manager can upload barbershop images" on storage.objects;
create policy "Owner or manager can upload barbershop images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'barbershop-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1
    from public.barbershops
    where id::text = (storage.foldername(name))[1]
      and private.current_barbershop_role(id) in ('owner', 'manager')
  )
);

drop policy if exists "Owner or manager can delete barbershop images" on storage.objects;
create policy "Owner or manager can delete barbershop images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'barbershop-images'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.barbershops
    where id::text = (storage.foldername(name))[1]
      and private.current_barbershop_role(id) in ('owner', 'manager')
  )
);

create or replace function public.set_barbershop_photo_url(
  p_barbershop_id uuid,
  p_photo_url text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.current_barbershop_role(p_barbershop_id) not in ('owner', 'manager') then
    raise exception 'not authorized to update this barbershop photo' using errcode = '42501';
  end if;

  if p_photo_url is not null
    and p_photo_url not like '%/storage/v1/object/public/barbershop-images/%' then
    raise exception 'photo URL must refer to the barbershop-images bucket' using errcode = '22023';
  end if;

  update public.barbershops
  set photo_url = p_photo_url
  where id = p_barbershop_id;

  if not found then
    raise exception 'barbershop not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_barbershop_photo_url(uuid, text) from public, anon;
grant execute on function public.set_barbershop_photo_url(uuid, text) to authenticated;
