-- Migration: 20260918180000_fix_professionals_select_policy.sql
--
-- Corrige a policy SELECT de professionals deixada pela migration
-- 20260918170000_harden_tenant_catalog_grants.sql.
--
-- Problema: a policy antiga "Authenticated can read public managed or own
-- professional" contém EXISTS inline sobre public.barbershops.owner_id.
-- Como a migration anterior revogou de authenticated o SELECT na coluna
-- owner_id (dado sensível), a avaliação da policy (feita com os privilégios
-- do chamador, não do dono da tabela) passou a falhar com
-- "permission denied for table barbershops" em QUALQUER select em professionals,
-- quebrando o catálogo público.
--
-- Correção: substitui por policy de catálogo público (active = true),
-- consistente com a policy de barbershops, sem referenciar colunas sensíveis.

drop policy if exists "Authenticated can read public managed or own professional"
  on public.professionals;

create policy "Authenticated can read public managed or own professional"
  on public.professionals
  for select
  to authenticated
  using (active = true);
