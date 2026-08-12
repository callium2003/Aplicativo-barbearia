-- Complemento do Lote 6: preserva o fluxo atual da interface sem conceder UPDATE estrutural ao manager.

create or replace function private.guard_manager_barbershop_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_role text;
begin
  v_role := private.current_barbershop_role(old.id);

  if v_role = 'manager' then
    if new.id is distinct from old.id
      or new.owner_id is distinct from old.owner_id
      or new.slug is distinct from old.slug
      or new.created_at is distinct from old.created_at
      or new.photo_url is distinct from old.photo_url
      or new.instagram_url is distinct from old.instagram_url
      or new.facebook_url is distinct from old.facebook_url
      or new.active is distinct from old.active
      or new.initial_registration_completed is distinct from old.initial_registration_completed
    then
      raise exception 'Manager pode alterar apenas os dados operacionais da barbearia.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_manager_barbershop_update() from public;
revoke all on function private.guard_manager_barbershop_update() from anon;
revoke all on function private.guard_manager_barbershop_update() from authenticated;

drop trigger if exists guard_manager_barbershop_update on public.barbershops;
create trigger guard_manager_barbershop_update
before update on public.barbershops
for each row
execute function private.guard_manager_barbershop_update();

drop policy if exists "Owner can update own barbershop" on public.barbershops;
drop policy if exists "Owner or manager can update operational barbershop fields" on public.barbershops;

create policy "Owner or manager can update operational barbershop fields"
on public.barbershops
for update
to authenticated
using (
  private.current_barbershop_role(id) in ('owner', 'manager')
)
with check (
  private.current_barbershop_role(id) in ('owner', 'manager')
);

-- A interface atual usa UPDATE direto; remove a RPC transitória para manter uma única superfície.
drop function if exists public.update_barbershop_profile(uuid, text, text, text, text, text, text);