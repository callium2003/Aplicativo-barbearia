-- Índices no lado referenciador evitam varreduras em validações das FKs.
create index if not exists professional_deactivation_reviews_created_by_idx
  on public.professional_deactivation_reviews (created_by);

create index if not exists professional_deactivation_reviews_resolved_by_idx
  on public.professional_deactivation_reviews (resolved_by);

-- Preserva integralmente a autorização existente e calcula o contexto constante
-- uma vez por comando, em vez de reavaliá-lo para cada linha candidata.
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
    (customer_consents.consent_type = 'PLATFORM_MARKETING' and customer_consents.barbershop_id is null)
    or (
      customer_consents.consent_type = 'BARBERSHOP_MARKETING'
      and exists (
        select 1
        from public.barbershop_customers bc
        where bc.customer_id = customer_consents.customer_id
          and bc.barbershop_id = customer_consents.barbershop_id
      )
    )
  )
  and customer_consents.consent_version = '1.0'
  and customer_consents.source = 'customer_preferences'
  and (select current_setting('app.crm_consent_write', true)) = 'customer_preferences'
);
