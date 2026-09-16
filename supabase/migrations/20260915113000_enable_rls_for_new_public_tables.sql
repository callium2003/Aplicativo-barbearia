-- SEG-02: every new public table created by SQL or a migration starts with RLS.
-- This does not alter existing tables and does not grant Data API access.

create or replace function private.enable_rls_for_new_public_tables()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table if exists %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end;
$$;

revoke all on function private.enable_rls_for_new_public_tables() from public, anon, authenticated;

create event trigger ensure_rls_for_new_public_tables
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function private.enable_rls_for_new_public_tables();
