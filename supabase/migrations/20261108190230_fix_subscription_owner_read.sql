-- A policy legada consultava owner_id com os privilégios do chamador, embora
-- a leitura direta dessa coluna tenha sido corretamente revogada.
drop policy if exists "Owner can read own barbershop subscription" on public.barbershop_subscriptions;
create policy "Owner can read own barbershop subscription"
on public.barbershop_subscriptions for select to authenticated
using (private.current_barbershop_role(barbershop_id) = 'owner');
