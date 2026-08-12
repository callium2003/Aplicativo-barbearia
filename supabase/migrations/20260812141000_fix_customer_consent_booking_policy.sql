drop policy if exists "Customer can record own consent events" on public.customer_consents;
create policy "Customer can record own consent events"
on public.customer_consents for insert to authenticated
with check (
  exists (
    select 1 from public.customers c
    where c.id = customer_consents.customer_id
      and c.auth_user_id = (select auth.uid())
  )
  and (
    (consent_type = 'PLATFORM_MARKETING' and barbershop_id is null)
    or (
      consent_type = 'BARBERSHOP_MARKETING'
      and exists (
        select 1 from public.barbershop_customers bc
        where bc.customer_id = customer_consents.customer_id
          and bc.barbershop_id = customer_consents.barbershop_id
      )
    )
  )
  and consent_version = '1.0'
  and (
    (source = 'booking_form' and current_setting('app.crm_consent_write', true) = 'booking')
    or (source = 'customer_settings' and current_setting('app.crm_consent_write', true) = 'customer_settings')
  )
);
