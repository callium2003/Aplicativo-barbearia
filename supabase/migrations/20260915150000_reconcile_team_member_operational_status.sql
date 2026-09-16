-- Mantém compatibilidade para consumidores legados sem permitir que eles
-- contornem a revisão de compromissos futuros da inativação operacional.
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
  v_member public.team_members%rowtype;
begin
  select * into v_member
  from public.team_members
  where id = p_team_member_id
  for update;

  if not found or private.current_barbershop_role(v_member.barbershop_id) <> 'owner' then
    raise exception 'Apenas o dono pode alterar o acesso da equipe.' using errcode = '42501';
  end if;
  if v_member.professional_id is null then
    raise exception 'Membro de equipe sem profissional vinculado.' using errcode = '23514';
  end if;

  perform public.set_professional_operational_status(v_member.professional_id, p_active);

  if p_active then
    update public.team_members
    set status = 'active'
    where id = v_member.id
      and barbershop_id = v_member.barbershop_id;
  end if;

  return true;
end;
$$;

revoke all on function public.set_team_member_access(uuid, boolean) from public, anon;
grant execute on function public.set_team_member_access(uuid, boolean) to authenticated;
