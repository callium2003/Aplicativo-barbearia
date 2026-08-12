create or replace function private.write_audit_log(
  p_barbershop_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if p_barbershop_id is null or p_action is null or p_entity_type is null then
    return;
  end if;
  insert into public.audit_logs (barbershop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_barbershop_id, (select auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function private.write_audit_log(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function private.write_audit_log(uuid, text, text, uuid, jsonb) to postgres, service_role;

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_barbershop_id uuid;
  v_entity_id uuid;
  v_metadata jsonb;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_barbershop_id := nullif(v_row ->> 'barbershop_id', '')::uuid;
  v_entity_id := nullif(v_row ->> 'id', '')::uuid;

  if v_barbershop_id is null and tg_table_name in ('professional_hours', 'professional_breaks', 'professional_time_blocks') then
    select p.barbershop_id into v_barbershop_id
    from public.professionals p
    where p.id = nullif(v_row ->> 'professional_id', '')::uuid;
  end if;

  if tg_table_name = 'appointments' then
    v_metadata := jsonb_build_object(
      'operation', tg_op,
      'table', tg_table_name,
      'old_status', nullif(v_old ->> 'status', ''),
      'new_status', nullif(v_row ->> 'status', '')
    );
  else
    v_metadata := jsonb_build_object('operation', tg_op, 'table', tg_table_name);
  end if;

  perform private.write_audit_log(
    v_barbershop_id,
    lower(tg_table_name) || '.' || lower(tg_op),
    lower(tg_table_name),
    v_entity_id,
    v_metadata
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_row_change() from public, anon, authenticated;
grant execute on function private.audit_row_change() to postgres, service_role;

drop trigger if exists audit_appointments_change on public.appointments;
create trigger audit_appointments_change after insert or update or delete on public.appointments for each row execute function private.audit_row_change();
drop trigger if exists audit_barbershops_change on public.barbershops;
create trigger audit_barbershops_change after insert or update or delete on public.barbershops for each row execute function private.audit_row_change();
drop trigger if exists audit_registration_details_change on public.barbershop_registration_details;
create trigger audit_registration_details_change after insert or update or delete on public.barbershop_registration_details for each row execute function private.audit_row_change();
drop trigger if exists audit_business_hours_change on public.business_hours;
create trigger audit_business_hours_change after insert or update or delete on public.business_hours for each row execute function private.audit_row_change();
drop trigger if exists audit_professional_hours_change on public.professional_hours;
create trigger audit_professional_hours_change after insert or update or delete on public.professional_hours for each row execute function private.audit_row_change();
drop trigger if exists audit_professional_breaks_change on public.professional_breaks;
create trigger audit_professional_breaks_change after insert or update or delete on public.professional_breaks for each row execute function private.audit_row_change();
drop trigger if exists audit_professional_time_blocks_change on public.professional_time_blocks;
create trigger audit_professional_time_blocks_change after insert or update or delete on public.professional_time_blocks for each row execute function private.audit_row_change();
drop trigger if exists audit_professionals_change on public.professionals;
create trigger audit_professionals_change after insert or update or delete on public.professionals for each row execute function private.audit_row_change();
drop trigger if exists audit_services_change on public.services;
create trigger audit_services_change after insert or update or delete on public.services for each row execute function private.audit_row_change();
drop trigger if exists audit_notification_preferences_change on public.notification_preferences;
create trigger audit_notification_preferences_change after insert or update or delete on public.notification_preferences for each row execute function private.audit_row_change();

revoke insert, update, delete, truncate, references, trigger on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;
