-- Lote 8 — performance e limpeza técnica sem ampliar permissões.

-- 1. Foreign keys com índices de cobertura ausentes.
create index if not exists appointment_services_service_id_idx
  on public.appointment_services (service_id);

create index if not exists appointments_cancelled_by_idx
  on public.appointments (cancelled_by);

create index if not exists appointments_service_id_idx
  on public.appointments (service_id);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists customer_consents_barbershop_id_idx
  on public.customer_consents (barbershop_id);

create index if not exists notification_outbox_barbershop_id_idx
  on public.notification_outbox (barbershop_id);

create index if not exists professional_commission_settings_updated_by_idx
  on public.professional_commission_settings (updated_by);

create index if not exists professional_time_blocks_professional_id_idx
  on public.professional_time_blocks (professional_id);

create index if not exists team_invitations_accepted_by_idx
  on public.team_invitations (accepted_by);

create index if not exists team_invitations_created_by_idx
  on public.team_invitations (created_by);

create index if not exists team_invitations_professional_id_idx
  on public.team_invitations (professional_id);

create index if not exists team_invitations_revoked_by_idx
  on public.team_invitations (revoked_by);

-- 2. Remove somente o índice standalone duplicado; mantém o índice que sustenta a UNIQUE constraint.
drop index if exists public.business_hours_barbershop_weekday_key;

-- 3. customer_consents: evita reavaliar current_setting() por linha.
drop policy if exists "Customer can record own consent events" on public.customer_consents;
create policy "Customer can record own consent events"
on public.customer_consents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_consents.customer_id
      and c.auth_user_id = (select auth.uid())
  )
  and (
    (consent_type = 'PLATFORM_MARKETING'::public.customer_consent_type and barbershop_id is null)
    or (
      consent_type = 'BARBERSHOP_MARKETING'::public.customer_consent_type
      and exists (
        select 1
        from public.barbershop_customers bc
        where bc.customer_id = customer_consents.customer_id
          and bc.barbershop_id = customer_consents.barbershop_id
      )
    )
  )
  and consent_version = '1.0'
  and (
    (
      granted
      and source = 'booking_form'
      and (select current_setting('app.crm_consent_write', true)) = 'booking'
    )
    or (
      not granted
      and source = 'customer_settings'
      and (select current_setting('app.crm_consent_write', true)) = 'revocation'
    )
  )
);

-- 4. appointments: consolida policies permissivas mantendo a união exata dos acessos anteriores.
drop policy if exists "Barber can read own appointments" on public.appointments;
drop policy if exists "Customer can read own appointments" on public.appointments;
drop policy if exists "Owner or manager can read appointments" on public.appointments;
create policy "Authenticated can read allowed appointments"
on public.appointments
for select
to authenticated
using (
  professional_id = private.current_barber_professional_id(barbershop_id)
  or customer_id = (select auth.uid())
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

drop policy if exists "Barber can update own appointments" on public.appointments;
drop policy if exists "Customer can cancel own future appointment" on public.appointments;
drop policy if exists "Owner or manager can update appointments" on public.appointments;
create policy "Authenticated can update allowed appointments"
on public.appointments
for update
to authenticated
using (
  professional_id = private.current_barber_professional_id(barbershop_id)
  or (
    customer_id = (select auth.uid())
    and status in ('scheduled', 'confirmed')
    and starts_at > now()
  )
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
)
with check (
  professional_id = private.current_barber_professional_id(barbershop_id)
  or (
    customer_id = (select auth.uid())
    and status = 'cancelled'
  )
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
);

-- 5. professional_hours: separa leitura pública/anônima e administração autenticada,
-- evitando duas policies permissivas SELECT para authenticated.
drop policy if exists "Owner or manager can manage professional hours" on public.professional_hours;
drop policy if exists "Public can read hours of active professionals" on public.professional_hours;

create policy "Anon can read hours of active professionals"
on public.professional_hours
for select
to anon
using (
  exists (
    select 1
    from public.professionals p
    join public.barbershops b on b.id = p.barbershop_id
    where p.id = professional_hours.professional_id
      and p.active
      and b.active
  )
);

create policy "Authenticated can read allowed professional hours"
on public.professional_hours
for select
to authenticated
using (
  exists (
    select 1
    from public.professionals p
    join public.barbershops b on b.id = p.barbershop_id
    where p.id = professional_hours.professional_id
      and p.active
      and b.active
  )
  or private.current_barbershop_role((
    select p.barbershop_id from public.professionals p
    where p.id = professional_hours.professional_id
  )) in ('owner', 'manager')
);

create policy "Owner or manager can insert professional hours"
on public.professional_hours
for insert
to authenticated
with check (
  private.current_barbershop_role((
    select p.barbershop_id from public.professionals p
    where p.id = professional_hours.professional_id
  )) in ('owner', 'manager')
);

create policy "Owner or manager can update professional hours"
on public.professional_hours
for update
to authenticated
using (
  private.current_barbershop_role((
    select p.barbershop_id from public.professionals p
    where p.id = professional_hours.professional_id
  )) in ('owner', 'manager')
)
with check (
  private.current_barbershop_role((
    select p.barbershop_id from public.professionals p
    where p.id = professional_hours.professional_id
  )) in ('owner', 'manager')
);

create policy "Owner or manager can delete professional hours"
on public.professional_hours
for delete
to authenticated
using (
  private.current_barbershop_role((
    select p.barbershop_id from public.professionals p
    where p.id = professional_hours.professional_id
  )) in ('owner', 'manager')
);

-- 6. team_members: preserva owner como administrador e cada membro lendo o próprio vínculo,
-- sem policies permissivas SELECT sobrepostas.
drop policy if exists "Owner can manage team access" on public.team_members;
drop policy if exists "Professional can read own access" on public.team_members;

create policy "Authenticated can read allowed team access"
on public.team_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

create policy "Owner can insert team access"
on public.team_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

create policy "Owner can update team access"
on public.team_members
for update
to authenticated
using (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);

create policy "Owner can delete team access"
on public.team_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.barbershops b
    where b.id = team_members.barbershop_id
      and b.owner_id = (select auth.uid())
  )
);
