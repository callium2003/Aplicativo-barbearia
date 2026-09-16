-- Fecha a atualização de objetos de imagem ao mesmo escopo profissional/tenant
-- e remove EXECUTE herdado de funções exclusivamente acionadas por trigger.

drop policy if exists "Management can update professional images" on storage.objects;
create policy "Management can update professional images"
on storage.objects for update to authenticated
using (
  bucket_id = 'professional-images'
  and exists (
    select 1
    from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
  )
)
with check (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1
    from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
  )
);

revoke execute on function public.prevent_customer_overlapping_appointments() from public, anon, authenticated;
revoke execute on function public.set_customer_crm_updated_at() from public, anon, authenticated;
