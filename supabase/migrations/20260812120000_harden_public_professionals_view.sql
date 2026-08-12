alter view public.public_professionals set (security_invoker = true);

revoke all on table public.public_professionals from anon, authenticated;
revoke all on table public.barbershops from anon;
revoke all on table public.professionals from anon;

grant select on table public.public_professionals to anon, authenticated;
grant select (id, active) on table public.barbershops to anon;
grant select (id, barbershop_id, name, active, photo_url, instagram_url) on table public.professionals to anon;
