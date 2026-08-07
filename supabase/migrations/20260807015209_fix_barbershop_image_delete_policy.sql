-- Corrige a policy de exclusão de imagens da barbearia no Supabase Storage.
-- A versão anterior extraía a pasta a partir de barbershops.name dentro da subconsulta,
-- em vez de usar o caminho real do objeto em storage.objects.name.

drop policy if exists "Owner or manager can delete barbershop images"
on storage.objects;

create policy "Owner or manager can delete barbershop images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'barbershop-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 1
  and exists (
    select 1
    from public.barbershops as b
    where b.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(b.id) in ('owner', 'manager')
  )
);
