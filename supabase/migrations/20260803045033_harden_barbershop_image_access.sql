-- Public buckets serve public object URLs without a broad SELECT policy, which
-- would otherwise allow listing every image in the bucket.
drop policy if exists "Public can read barbershop images" on storage.objects;

-- Managers are allowed to maintain their own barbershop's settings, including
-- its photo URL. The RPC below remains SECURITY INVOKER, so RLS is enforced.
drop policy if exists "Owner or manager can update own barbershop" on public.barbershops;
create policy "Owner or manager can update own barbershop"
on public.barbershops for update
to authenticated
using (private.current_barbershop_role(id) in ('owner', 'manager'))
with check (private.current_barbershop_role(id) in ('owner', 'manager'));

create or replace function public.set_barbershop_photo_url(
  p_barbershop_id uuid,
  p_photo_url text
)
returns void
language plpgsql
security invoker
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
