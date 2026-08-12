-- Public catalog views run as security invoker. Grant only the columns that
-- are intentionally displayed to anonymous visitors; administrative columns
-- remain unavailable.
grant select (id, slug, name, phone, whatsapp, address, description, photo_url, instagram_url, facebook_url)
  on public.barbershops to anon;
grant select (id, barbershop_id, name, price, duration_minutes, active)
  on public.services to anon;
grant select (id, barbershop_id, name, photo_url, instagram_url, active)
  on public.professionals to anon;
grant select on public.public_barbershop_pages to anon;
grant select on public.public_barbershop_services to anon;
grant select on public.public_professionals to anon;
