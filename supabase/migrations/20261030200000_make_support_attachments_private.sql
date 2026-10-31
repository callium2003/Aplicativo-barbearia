-- Migração: Tornar Bucket support-attachments Privado com RLS Estrita por Barbearia (EFS §24.10.6, §48.5)
-- 1. Converte o bucket 'support-attachments' para privado (public = false).
-- 2. Restringe a leitura (SELECT) estritamente ao proprietário/gerente da barbearia titular da pasta ou à equipe da plataforma.
-- 3. Impede que usuários de outras barbearias, barbeiros ou anônimos acessem, listem ou visualizem anexos.
-- 4. Mantém a inserção (INSERT) restrita aos papéis autorizados com validação de caminho tenant-isolated.
-- 5. Restringe exclusão (DELETE) exclusivamente a administradores da plataforma.

-- 1. Atualiza o bucket para privado
update storage.buckets
set public = false
where id = 'support-attachments';

-- 2. Remove políticas de leitura antigas/permissivas
drop policy if exists "Support attachments are readable by authenticated" on storage.objects;
drop policy if exists "Support attachments are readable by authorized staff" on storage.objects;

-- 3. Nova política de leitura estrita com isolamento multi-tenant
create policy "Support attachments are readable by authorized staff"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      private.is_active_platform_owner()
      or (
        array_length(storage.foldername(name), 1) >= 1
        and exists (
          select 1 from public.barbershops barbershop
          where barbershop.id::text = (storage.foldername(storage.objects.name))[1]
            and private.current_barbershop_role(barbershop.id) in ('owner', 'manager')
        )
      )
    )
  );

-- 4. Remove e recria política de upload estrita
drop policy if exists "Support attachments uploadable by authenticated staff" on storage.objects;
drop policy if exists "Support attachments uploadable by authorized staff" on storage.objects;

create policy "Support attachments uploadable by authorized staff"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (
      private.is_active_platform_owner()
      or (
        array_length(storage.foldername(name), 1) >= 1
        and exists (
          select 1 from public.barbershops barbershop
          where barbershop.id::text = (storage.foldername(storage.objects.name))[1]
            and private.current_barbershop_role(barbershop.id) in ('owner', 'manager')
        )
      )
    )
  );

-- 5. Exclusão restrita a platform owner
drop policy if exists "Support attachments deletable by platform owner only" on storage.objects;

create policy "Support attachments deletable by platform owner only"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and private.is_active_platform_owner()
  );
