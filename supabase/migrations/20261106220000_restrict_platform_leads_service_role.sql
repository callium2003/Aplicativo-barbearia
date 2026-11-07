-- Migration: 20261106220000_restrict_platform_leads_service_role.sql
-- Descrição: Restringe privilégios de gravação na tabela platform_leads com menor privilégio ao service_role
-- Segurança: Revoga privilégios de anon/authenticated e remove a política pública de inserção

-- Revoga quaisquer permissões prévias de escrita direta concedidas a anon e authenticated
revoke all on public.platform_leads from public, anon, authenticated;

-- Remove a política pública de submissão direta do PostgREST
drop policy if exists "allow_public_lead_submission" on public.platform_leads;

-- Concede o menor privilégio necessário (exclusivamente INSERT) à role de serviço do backend (service_role)
grant insert on public.platform_leads to service_role;

-- Cria política de RLS restrita para gravação autorizada via service_role
create policy "allow_service_role_insert" on public.platform_leads
  for insert
  to service_role
  with check (
    length(trim(full_name)) >= 2
    and length(trim(whatsapp)) >= 8
    and length(trim(barbershop_name)) >= 2
  );
