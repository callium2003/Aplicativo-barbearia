create or replace function public.set_team_member_access(
  p_team_member_id uuid,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_member public.team_members;
begin
  select * into v_member
  from public.team_members
  where id = p_team_member_id
  for update;

  if v_member.id is null or private.current_barbershop_role(v_member.barbershop_id) <> 'owner' then
    raise exception 'Apenas o dono pode alterar o acesso da equipe.' using errcode = '42501';
  end if;

  update public.team_members
  set status = case when p_active then 'active' else 'inactive' end
  where id = v_member.id;

  if v_member.professional_id is not null then
    update public.professionals
    set active = p_active
    where id = v_member.professional_id
      and barbershop_id = v_member.barbershop_id;
  end if;

  return true;
end;
$$;

revoke all on function public.set_team_member_access(uuid, boolean) from public, anon;
grant execute on function public.set_team_member_access(uuid, boolean) to authenticated;
