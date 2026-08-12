create or replace function public.get_my_professional_profile()
returns table(id uuid, name text, phone text, instagram_url text, photo_url text)
language sql
security definer
set search_path to ''
as $$
  select p.id, p.name, p.phone, p.instagram_url, p.photo_url
  from public.team_members tm
  join public.professionals p on p.id = tm.professional_id
  where tm.user_id = (select auth.uid())
    and tm.role = 'barber'
    and tm.status = 'active'
  limit 1;
$$;

revoke all on function public.get_my_professional_profile() from public, anon;
grant execute on function public.get_my_professional_profile() to authenticated;
