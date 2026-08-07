-- Lote 6: implanta a matriz aprovada de permissões por papel.
-- Owner mantém operações estruturais; manager recebe somente operações administrativas previstas.

-- 1. Leitura e atualização segura dos dados operacionais da barbearia.
drop policy if exists "Owner can read own barbershop" on public.barbershops;
drop policy if exists "Public can read active barbershops" on public.barbershops;
drop policy if exists "Owner or manager can update own barbershop" on public.barbershops;

create policy "Anon can read active barbershops"
on public.barbershops
for select
to anon
using (active = true);

create policy "Authenticated can read active or managed barbershops"
on public.barbershops
for select
to authenticated
using (
  active = true
  or private.current_barbershop_role(id) in ('owner', 'manager')
);

create or replace function public.update_barbershop_profile(
  p_barbershop_id uuid,
  p_name text,
  p_address text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_notification_email text default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_role text;
  v_name text;
  v_notification_email text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para editar esta barbearia.' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Nome da barbearia inválido.' using errcode = '22023';
  end if;

  v_notification_email := nullif(lower(trim(coalesce(p_notification_email, ''))), '');
  if v_notification_email is not null and position('@' in v_notification_email) <= 1 then
    raise exception 'E-mail de notificação inválido.' using errcode = '22023';
  end if;

  update public.barbershops
  set
    name = v_name,
    address = nullif(trim(coalesce(p_address, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    whatsapp = nullif(trim(coalesce(p_whatsapp, '')), ''),
    notification_email = v_notification_email,
    description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_barbershop_id;

  if not found then
    raise exception 'Barbearia não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (
    barbershop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_barbershop_id,
    auth.uid(),
    'barbershop.profile_updated',
    'barbershop',
    p_barbershop_id,
    jsonb_build_object('role', v_role)
  );

  return jsonb_build_object('success', true);
end;
$function$;

revoke all on function public.update_barbershop_profile(uuid, text, text, text, text, text, text) from public;
revoke all on function public.update_barbershop_profile(uuid, text, text, text, text, text, text) from anon;
revoke all on function public.update_barbershop_profile(uuid, text, text, text, text, text, text) from authenticated;
grant execute on function public.update_barbershop_profile(uuid, text, text, text, text, text, text) to authenticated;

-- 2. Serviços: owner e manager criam/editam; somente owner exclui.
drop policy if exists "Owner can delete services for own barbershop" on public.services;
drop policy if exists "Owner can create services for own barbershop" on public.services;
drop policy if exists "Owner can read own services" on public.services;
drop policy if exists "Public can read active services of active barbershops" on public.services;
drop policy if exists "Owner can update services for own barbershop" on public.services;

create policy "Anon can read active services"
on public.services
for select
to anon
using (
  active = true
  and exists (
    select 1 from public.barbershops b
    where b.id = services.barbershop_id and b.active = true
  )
);

create policy "Authenticated can read public or managed services"
on public.services
for select
to authenticated
using (
  (
    active = true
    and exists (
      select 1 from public.barbershops b
      where b.id = services.barbershop_id and b.active = true
    )
  )
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

create policy "Owner or manager can create services"
on public.services
for insert
to authenticated
with check (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

create policy "Owner or manager can update services"
on public.services
for update
to authenticated
using (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
)
with check (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

create policy "Owner can delete services"
on public.services
for delete
to authenticated
using (
  private.current_barbershop_role(barbershop_id) = 'owner'
);

-- 3. Horários gerais: owner e manager criam/editam; somente owner exclui.
drop policy if exists "Owner can manage business hours" on public.business_hours;
drop policy if exists "Public can read hours of active barbershops" on public.business_hours;

create policy "Anon can read public business hours"
on public.business_hours
for select
to anon
using (
  exists (
    select 1 from public.barbershops b
    where b.id = business_hours.barbershop_id and b.active = true
  )
);

create policy "Authenticated can read public or managed business hours"
on public.business_hours
for select
to authenticated
using (
  exists (
    select 1 from public.barbershops b
    where b.id = business_hours.barbershop_id and b.active = true
  )
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

create policy "Owner or manager can create business hours"
on public.business_hours
for insert
to authenticated
with check (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

create policy "Owner or manager can update business hours"
on public.business_hours
for update
to authenticated
using (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
)
with check (
  private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

create policy "Owner can delete business hours"
on public.business_hours
for delete
to authenticated
using (
  private.current_barbershop_role(barbershop_id) = 'owner'
);

-- 4. Profissionais: manager pode ler para configurar agenda e comissão,
-- mas criação, alteração estrutural e exclusão permanecem owner-only.
drop policy if exists "Owner can read own professionals" on public.professionals;
drop policy if exists "Public can read active professionals of active barbershops" on public.professionals;

create policy "Anon can read active professionals"
on public.professionals
for select
to anon
using (
  active = true
  and exists (
    select 1 from public.barbershops b
    where b.id = professionals.barbershop_id and b.active = true
  )
);

create policy "Authenticated can read public managed or own professional"
on public.professionals
for select
to authenticated
using (
  (
    active = true
    and exists (
      select 1 from public.barbershops b
      where b.id = professionals.barbershop_id and b.active = true
    )
  )
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
  or id = private.current_barber_professional_id(barbershop_id)
);