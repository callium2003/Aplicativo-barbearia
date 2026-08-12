create or replace view public.public_professionals
with (security_invoker = false)
as
select
  p.id,
  p.barbershop_id,
  p.name,
  p.photo_url,
  p.instagram_url
from public.professionals p
join public.barbershops b on b.id = p.barbershop_id
where p.active = true
  and b.active = true;

revoke all on table public.public_professionals from public;
grant select on table public.public_professionals to anon, authenticated;
