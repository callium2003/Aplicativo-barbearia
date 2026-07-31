begin;

create or replace function public.audit_team_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(barbershop_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (new.barbershop_id, (select auth.uid()), 'team_member_created', 'team_member', new.id,
      jsonb_build_object('role', new.role, 'status', new.status));
  elsif old.role is distinct from new.role or old.status is distinct from new.status then
    insert into public.audit_logs(barbershop_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (new.barbershop_id, (select auth.uid()), 'team_member_access_changed', 'team_member', new.id,
      jsonb_build_object('old_role', old.role, 'new_role', new.role, 'old_status', old.status, 'new_status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function public.audit_team_member_change() from public, anon, authenticated;
drop trigger if exists audit_team_member_change on public.team_members;
create trigger audit_team_member_change after insert or update on public.team_members
for each row execute function public.audit_team_member_change();

drop policy if exists "Owner can manage professional hours" on public.professional_hours;
create policy "Owner or manager can manage professional hours" on public.professional_hours for all to authenticated
using (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_hours.professional_id)) in ('owner','manager'))
with check (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_hours.professional_id)) in ('owner','manager'));
drop policy if exists "owners manage professional breaks" on public.professional_breaks;
create policy "Owner or manager can manage professional breaks" on public.professional_breaks for all to authenticated
using (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_breaks.professional_id)) in ('owner','manager'))
with check (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_breaks.professional_id)) in ('owner','manager'));
drop policy if exists "owners manage professional time blocks" on public.professional_time_blocks;
create policy "Owner or manager can manage professional blocks" on public.professional_time_blocks for all to authenticated
using (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_time_blocks.professional_id)) in ('owner','manager'))
with check (private.current_barbershop_role((select p.barbershop_id from public.professionals p where p.id = professional_time_blocks.professional_id)) in ('owner','manager'));

commit;
