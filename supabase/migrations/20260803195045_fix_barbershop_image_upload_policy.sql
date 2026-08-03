-- The previous INSERT policy resolved `name` to public.barbershops.name inside
-- its subquery, instead of the incoming storage object path. Qualify the
-- storage column so owners and managers can upload only below their UUID path.
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
    from public.barbershops as barbershop
    where barbershop.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(barbershop.id) in ('owner', 'manager')
  )
);
