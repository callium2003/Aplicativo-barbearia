-- CPF/CNPJ and owner registration data are private to the tenant owner.
-- Managers keep access to operational configuration through the existing
-- barbershop, services, professionals, and schedule policies.

drop policy if exists "Owner or manager can read own registration details" on public.barbershop_registration_details;
drop policy if exists "Owner or manager can create own registration details" on public.barbershop_registration_details;
drop policy if exists "Owner or manager can update own registration details" on public.barbershop_registration_details;

create policy "Owner can read registration details"
on public.barbershop_registration_details for select
to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner');

create policy "Owner can create registration details"
on public.barbershop_registration_details for insert
to authenticated
with check (private.current_barbershop_role(barbershop_id) = 'owner');

create policy "Owner can update registration details"
on public.barbershop_registration_details for update
to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner')
with check (private.current_barbershop_role(barbershop_id) = 'owner');
