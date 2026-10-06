-- C1 / EFS 24.8: impede escritas operacionais quando a assinatura não está
-- vigente, sem transformar a regra em um bloqueio geral da conta.
--
-- A agenda mantém sua fronteira própria: novas reservas já são bloqueadas no
-- fim efetivo e compromissos existentes continuam operáveis por até cinco
-- dias. Conta pessoal, privacidade, assinatura, exportação, notificações e a
-- ação do cliente sobre a própria reserva permanecem fora destes triggers.

create or replace function private.can_write_barbershop_operations(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_barbershop_id is not null
    and private.can_accept_public_booking(p_barbershop_id);
$$;

revoke all on function private.can_write_barbershop_operations(uuid)
  from public, anon, authenticated;
grant execute on function private.can_write_barbershop_operations(uuid)
  to authenticated;

create or replace function private.enforce_active_subscription_for_operational_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_reference_id uuid;
  v_barbershop_id uuid;
begin
  -- Migrations, service workers and side effects of an already-authorized
  -- trigger are not browser-originated operational mutations. In particular,
  -- completing an allowed appointment may still create its commission ledger.
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_reference_id := nullif(v_row ->> tg_argv[1], '')::uuid;

  if tg_argv[0] = 'barbershop' then
    v_barbershop_id := v_reference_id;
  elsif tg_argv[0] = 'professional' then
    select professional.barbershop_id
      into v_barbershop_id
    from public.professionals professional
    where professional.id = v_reference_id;
  else
    raise exception 'Invalid operational subscription trigger configuration'
      using errcode = 'P0001';
  end if;

  if not coalesce(private.can_write_barbershop_operations(v_barbershop_id), false) then
    raise exception 'A assinatura precisa estar ativa para alterar a operação da barbearia.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_active_subscription_for_operational_write()
  from public, anon, authenticated;
grant execute on function private.enforce_active_subscription_for_operational_write()
  to postgres, service_role;

-- A criação da barbearia não é bloqueada: ela cria o trial no mesmo fluxo.
-- Alterações posteriores do perfil público já exigem assinatura vigente.
drop trigger if exists enforce_active_subscription_barbershops on public.barbershops;
create trigger enforce_active_subscription_barbershops
before update on public.barbershops
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'id');

drop trigger if exists enforce_active_subscription_barbershop_registration_details on public.barbershop_registration_details;
create trigger enforce_active_subscription_barbershop_registration_details
before insert or update or delete on public.barbershop_registration_details
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_business_hours on public.business_hours;
create trigger enforce_active_subscription_business_hours
before insert or update or delete on public.business_hours
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_services on public.services;
create trigger enforce_active_subscription_services
before insert or update or delete on public.services
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_professionals on public.professionals;
create trigger enforce_active_subscription_professionals
before insert or update or delete on public.professionals
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_professional_hours on public.professional_hours;
create trigger enforce_active_subscription_professional_hours
before insert or update or delete on public.professional_hours
for each row execute function private.enforce_active_subscription_for_operational_write('professional', 'professional_id');

drop trigger if exists enforce_active_subscription_professional_breaks on public.professional_breaks;
create trigger enforce_active_subscription_professional_breaks
before insert or update or delete on public.professional_breaks
for each row execute function private.enforce_active_subscription_for_operational_write('professional', 'professional_id');

drop trigger if exists enforce_active_subscription_professional_time_blocks on public.professional_time_blocks;
create trigger enforce_active_subscription_professional_time_blocks
before insert or update or delete on public.professional_time_blocks
for each row execute function private.enforce_active_subscription_for_operational_write('professional', 'professional_id');

drop trigger if exists enforce_active_subscription_professional_saved_custom_hours on public.professional_saved_custom_hours;
create trigger enforce_active_subscription_professional_saved_custom_hours
before insert or update or delete on public.professional_saved_custom_hours
for each row execute function private.enforce_active_subscription_for_operational_write('professional', 'professional_id');

drop trigger if exists enforce_active_subscription_professional_deactivation_reviews on public.professional_deactivation_reviews;
create trigger enforce_active_subscription_professional_deactivation_reviews
before insert or update or delete on public.professional_deactivation_reviews
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_professional_commission_settings on public.professional_commission_settings;
create trigger enforce_active_subscription_professional_commission_settings
before insert or update or delete on public.professional_commission_settings
for each row execute function private.enforce_active_subscription_for_operational_write('professional', 'professional_id');

drop trigger if exists enforce_active_subscription_team_invitations on public.team_invitations;
create trigger enforce_active_subscription_team_invitations
before insert or update or delete on public.team_invitations
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_team_members on public.team_members;
create trigger enforce_active_subscription_team_members
before insert or update or delete on public.team_members
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

drop trigger if exists enforce_active_subscription_appointment_commissions on public.appointment_commissions;
create trigger enforce_active_subscription_appointment_commissions
before insert or update or delete on public.appointment_commissions
for each row execute function private.enforce_active_subscription_for_operational_write('barbershop', 'barbershop_id');

-- Storage também é uma escrita operacional. As leituras públicas dos buckets
-- não são recriadas nem ampliadas por esta migration.
drop policy if exists "Owner or manager can upload barbershop images" on storage.objects;
create policy "Owner or manager can upload barbershop images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'barbershop-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1
    from public.barbershops barbershop
    where barbershop.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(barbershop.id) in ('owner', 'manager')
      and private.can_write_barbershop_operations(barbershop.id)
  )
);

drop policy if exists "Owner or manager can delete barbershop images" on storage.objects;
create policy "Owner or manager can delete barbershop images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'barbershop-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 1
  and exists (
    select 1
    from public.barbershops barbershop
    where barbershop.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(barbershop.id) in ('owner', 'manager')
      and private.can_write_barbershop_operations(barbershop.id)
  )
);

drop policy if exists "Barber can upload own professional image" on storage.objects;
create policy "Barber can upload own professional image"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1
    from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and professional.id = private.current_barber_professional_id(professional.barbershop_id)
      and private.can_write_barbershop_operations(professional.barbershop_id)
  )
);

drop policy if exists "Barber can delete own professional image" on storage.objects;
create policy "Barber can delete own professional image"
on storage.objects for delete to authenticated
using (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 1
  and exists (
    select 1
    from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and professional.id = private.current_barber_professional_id(professional.barbershop_id)
      and private.can_write_barbershop_operations(professional.barbershop_id)
  )
);

drop policy if exists "Management can insert professional images" on storage.objects;
create policy "Management can insert professional images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'professional-images'
  and array_length(storage.foldername(name), 1) = 1
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and exists (
    select 1
    from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
      and private.can_write_barbershop_operations(professional.barbershop_id)
  )
);

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
      and private.can_write_barbershop_operations(professional.barbershop_id)
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
      and private.can_write_barbershop_operations(professional.barbershop_id)
  )
);

drop policy if exists "Management can delete professional images" on storage.objects;
create policy "Management can delete professional images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'professional-images'
  and exists (
    select 1
    from public.professionals professional
    where professional.id::text = (storage.foldername(storage.objects.name))[1]
      and private.current_barbershop_role(professional.barbershop_id) in ('owner', 'manager')
      and private.can_write_barbershop_operations(professional.barbershop_id)
  )
);
