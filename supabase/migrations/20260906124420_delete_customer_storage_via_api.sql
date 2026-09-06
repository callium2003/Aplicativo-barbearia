-- Return an authenticated customer's owned Storage objects to the trusted
-- account-deletion Edge Function. The Edge Function removes the physical
-- objects through the Storage API before database anonymization begins.
create or replace function public.list_my_storage_objects_for_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.has_recent_customer_authentication() then
    raise exception using errcode = 'P0001', message = 'Recent authentication required.';
  end if;

  if exists (
    select 1
    from public.barbershops barbershop
    where barbershop.owner_id = v_user_id
  ) or exists (
    select 1
    from public.team_members member
    where member.user_id = v_user_id
      and member.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'Operational account cannot use customer deletion.';
  end if;

  perform private.current_customer_privacy_customer_id();

  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'bucket_id', storage_object.bucket_id,
          'object_name', storage_object.name
        )
        order by storage_object.bucket_id, storage_object.name
      ),
      '[]'::jsonb
    )
    from storage.objects storage_object
    where storage_object.owner_id = (select auth.uid())::text
  );
end;
$$;

revoke all on function public.list_my_storage_objects_for_account_deletion() from public, anon, authenticated;
grant execute on function public.list_my_storage_objects_for_account_deletion() to authenticated;
