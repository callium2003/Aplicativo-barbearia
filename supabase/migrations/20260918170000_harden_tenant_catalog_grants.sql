-- A1/A2 — endurece grants de leitura entre tenants (lote da trilha B).
--
-- Contexto: o baseline concedeu GRANT ALL ON public.barbershops / public.professionals
-- TO authenticated. Combinado com as policies de SELECT ("active = true OU papel no
-- tenant"), qualquer usuário autenticado lia TODAS as colunas (notification_email,
-- owner_id, phone, contact_email) de QUALQUER barbearia/profissional ativo.
--
-- Esta migration:
--  1. Revoga o acesso amplo de authenticated às duas tabelas-base e reconcede o mínimo:
--     SELECT por coluna (só campos de catálogo, espelhando o que anon já recebe) +
--     INSERT/UPDATE/DELETE onde o app escreve direto (as policies continuam mandando).
--  2. Reescreve as policies de escrita/leitura que usavam EXISTS inline em
--     public.barbershops.owner_id para private.current_barbershop_role(...) (security
--     definer): a expressão da policy é avaliada com os privilégios do chamador, então
--     o EXISTS inline passaria a negar por falta de SELECT em barbershops.owner_id.
--     Semântica preservada (owner-only / owner-ou-próprio); NULL nega por padrão.
--  3. Cria RPCs mínimas (security definer, search_path travado, execute só p/ authenticated)
--     para os dados operacionais/sensíveis, com checagem de papel à prova de NULL
--     (coalesce): owner/manager do tenant, ou profissional titular p/ schedule_mode.
--
-- NÃO toca: views públicas (public_professionals já é security_invoker = true),
-- grants de anon, migrations antigas, utils/panel-context.ts, EFS/documentação.

-- ============================================================================
-- 1. Grants mínimos para authenticated
-- ============================================================================

revoke all on table public.barbershops from authenticated;
revoke all on table public.professionals from authenticated;

-- Catálogo: mesmos campos já expostos ao anon (+ active, usado em filtros internos).
grant select (id, slug, name, phone, whatsapp, address, description, photo_url, instagram_url, facebook_url, active)
  on public.barbershops to authenticated;
-- cadastro-inicial: o owner cria a própria barbearia; a policy WITH CHECK continua mandando.
grant insert on public.barbershops to authenticated;

grant select (id, barbershop_id, name, photo_url, instagram_url, active)
  on public.professionals to authenticated;
-- configurar: insert/update diretos; as policies owner-only continuam mandando.
grant insert, update, delete on public.professionals to authenticated;

-- ============================================================================
-- 2. Policies com EXISTS inline em barbershops.owner_id -> função security definer
-- ============================================================================

drop policy if exists "Owner can create professionals" on public.professionals;
create policy "Owner can create professionals"
on public.professionals for insert to authenticated
with check (private.current_barbershop_role(barbershop_id) = 'owner');

drop policy if exists "Owner can update professionals" on public.professionals;
create policy "Owner can update professionals"
on public.professionals for update to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner')
with check (private.current_barbershop_role(barbershop_id) = 'owner');

drop policy if exists "Owner can delete professionals" on public.professionals;
create policy "Owner can delete professionals"
on public.professionals for delete to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner');

drop policy if exists "Authenticated can read allowed team access" on public.team_members;
create policy "Authenticated can read allowed team access"
on public.team_members for select to authenticated
using (
  user_id = (select auth.uid())
  or private.current_barbershop_role(barbershop_id) = 'owner'
);

drop policy if exists "Owner can insert team access" on public.team_members;
create policy "Owner can insert team access"
on public.team_members for insert to authenticated
with check (private.current_barbershop_role(barbershop_id) = 'owner');

drop policy if exists "Owner can update team access" on public.team_members;
create policy "Owner can update team access"
on public.team_members for update to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner')
with check (private.current_barbershop_role(barbershop_id) = 'owner');

drop policy if exists "Owner can delete team access" on public.team_members;
create policy "Owner can delete team access"
on public.team_members for delete to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner');

-- ============================================================================
-- 3. RPCs mínimas para dados operacionais/sensíveis
--    (padrão null-safe: papel NULL nega; nunca cai no "IF NULL não dispara")
-- ============================================================================

create or replace function public.get_barbershop_notification_email(p_barbershop_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_allowed boolean;
begin
  v_allowed := coalesce(private.current_barbershop_role(p_barbershop_id) in ('owner', 'manager'), false);
  if auth.uid() is null or not v_allowed then
    raise exception 'Sem permissão para ler dados operacionais desta barbearia.' using errcode = '42501';
  end if;
  return (select b.notification_email from public.barbershops b where b.id = p_barbershop_id);
end;
$function$;

create or replace function public.list_managed_professionals(p_barbershop_id uuid)
returns table (
  id uuid,
  name text,
  phone text,
  photo_url text,
  active boolean,
  schedule_mode text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_allowed boolean;
begin
  v_allowed := coalesce(private.current_barbershop_role(p_barbershop_id) in ('owner', 'manager'), false);
  if auth.uid() is null or not v_allowed then
    raise exception 'Sem permissão para listar profissionais desta barbearia.' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.phone, p.photo_url, p.active, p.schedule_mode
    from public.professionals p
    where p.barbershop_id = p_barbershop_id
    order by p.name;
end;
$function$;

create or replace function public.get_professional_details(p_professional_id uuid)
returns table (
  id uuid,
  name text,
  phone text,
  instagram_url text,
  photo_url text,
  active boolean,
  contact_email text,
  schedule_mode text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_barbershop_id uuid;
  v_allowed boolean;
begin
  select p.barbershop_id into v_barbershop_id
  from public.professionals p
  where p.id = p_professional_id;

  if v_barbershop_id is null then
    return; -- inexistente: conjunto vazio, nenhum dado
  end if;

  v_allowed := coalesce(private.current_barbershop_role(v_barbershop_id) in ('owner', 'manager'), false);
  if auth.uid() is null or not v_allowed then
    raise exception 'Sem permissão para ler dados deste profissional.' using errcode = '42501';
  end if;

  return query
    select p.id, p.name, p.phone, p.instagram_url, p.photo_url, p.active, p.contact_email, p.schedule_mode
    from public.professionals p
    where p.id = p_professional_id;
end;
$function$;

-- schedule_mode: owner/manager do tenant OU o próprio profissional titular
-- (padrão já usado por set_my_professional_schedule_mode via
-- private.current_barber_professional_id).
create or replace function public.get_professional_schedule_mode(p_professional_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_barbershop_id uuid;
  v_is_titular boolean;
  v_allowed boolean;
begin
  select p.barbershop_id into v_barbershop_id
  from public.professionals p
  where p.id = p_professional_id;

  if v_barbershop_id is null then
    return null; -- inexistente: nenhum dado
  end if;

  v_is_titular := coalesce(private.current_barber_professional_id(v_barbershop_id) = p_professional_id, false);
  v_allowed := coalesce(private.current_barbershop_role(v_barbershop_id) in ('owner', 'manager'), false);

  if auth.uid() is null or (not v_allowed and not v_is_titular) then
    raise exception 'Sem permissão para ler a agenda deste profissional.' using errcode = '42501';
  end if;

  return (select p.schedule_mode from public.professionals p where p.id = p_professional_id);
end;
$function$;

-- Contrato para o lote A3 (adaptação de utils/panel-context.ts): devolve a barbearia
-- da qual o chamador é owner (0..1 linha). Definida e testada aqui; o arquivo NÃO é
-- alterado neste lote.
create or replace function public.my_owned_barbershop()
returns table (
  id uuid,
  initial_registration_completed boolean
)
language sql
security definer
set search_path to ''
as $$
  select b.id, b.initial_registration_completed
  from public.barbershops b
  where b.owner_id = (select auth.uid())
  limit 1;
$$;

-- ============================================================================
-- 4. Execute das RPCs: só authenticated
-- ============================================================================

revoke all on function public.get_barbershop_notification_email(uuid) from public;
revoke all on function public.list_managed_professionals(uuid) from public;
revoke all on function public.get_professional_details(uuid) from public;
revoke all on function public.get_professional_schedule_mode(uuid) from public;
revoke all on function public.my_owned_barbershop() from public;

grant execute on function public.get_barbershop_notification_email(uuid) to authenticated;
grant execute on function public.list_managed_professionals(uuid) to authenticated;
grant execute on function public.get_professional_details(uuid) to authenticated;
grant execute on function public.get_professional_schedule_mode(uuid) to authenticated;
grant execute on function public.my_owned_barbershop() to authenticated;
