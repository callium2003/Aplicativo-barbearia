create or replace function public.update_my_professional_profile(
  p_name text,
  p_phone text,
  p_instagram_url text,
  p_photo_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional_id uuid;
  v_expected_prefix text;
begin
  select tm.professional_id into v_professional_id
  from public.team_members tm
  where tm.user_id = (select auth.uid())
    and tm.role = 'barber'
    and tm.status = 'active'
    and tm.professional_id is not null
  limit 1;

  if v_professional_id is null then
    raise exception 'professional profile not found' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'professional name must have at least 2 characters' using errcode = '22023';
  end if;

  v_expected_prefix := '%/storage/v1/object/public/professional-images/' || v_professional_id::text || '/%';
  if p_photo_url is not null and p_photo_url not like v_expected_prefix then
    raise exception 'photo URL must refer to this professional image path' using errcode = '22023';
  end if;

  update public.professionals
  set name = trim(p_name),
      phone = nullif(trim(p_phone), ''),
      instagram_url = nullif(trim(p_instagram_url), ''),
      photo_url = nullif(trim(p_photo_url), '')
  where id = v_professional_id;
end;
$$;

revoke all on function public.update_my_professional_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_professional_profile(text, text, text, text) to authenticated;
