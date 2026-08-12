-- Run in homologation only. All fixtures are discarded by ROLLBACK.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'notify-owner@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'notify-other@example.test', now(), now());
insert into public.barbershops (id, owner_id, name, slug, active) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Notify Test Shop', 'notify-test-shop', true);
insert into public.user_notifications (barbershop_id, recipient_user_id, event_type, title, body, dedupe_key) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'new_appointment', 'Own', 'Own notification', 'notify-test-own'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'new_appointment', 'Other', 'Other notification', 'notify-test-other');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$
declare v_id uuid;
begin
  if (select count(*) from public.user_notifications) <> 1 then raise exception 'owner can see another users notifications'; end if;
  select id into v_id from public.user_notifications limit 1;
  update public.user_notifications set read_at = now() where id = v_id;
  if not found then raise exception 'owner cannot mark own notification as read'; end if;
  update public.user_notifications set read_at = now() where dedupe_key = 'notify-test-other';
  if found then raise exception 'owner marked another users notification as read'; end if;
  if jsonb_array_length(public.get_my_notification_preferences('10000000-0000-0000-0000-000000000001')) <> 5 then raise exception 'expected default notification preferences'; end if;
end $$;

select public.save_my_notification_preference('10000000-0000-0000-0000-000000000001', 'new_appointment', false, true);
do $$
begin
  if not exists (
    select 1
    from jsonb_to_recordset(public.get_my_notification_preferences('10000000-0000-0000-0000-000000000001'))
      as p(event_type text, in_app_enabled boolean, email_enabled boolean)
    where event_type = 'new_appointment' and not in_app_enabled and email_enabled
  ) then raise exception 'owner preference was not saved'; end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
do $$
begin
  if (select count(*) from public.user_notifications) <> 1
     or not exists (select 1 from public.user_notifications where dedupe_key = 'notify-test-other') then
    raise exception 'other user can see another users notification';
  end if;
  update public.user_notifications set read_at = now() where dedupe_key = 'notify-test-own';
  if found then raise exception 'other user marked owner notification as read'; end if;
  begin
    perform public.save_my_notification_preference('10000000-0000-0000-0000-000000000001', 'new_appointment', true, true);
    raise exception 'non-member saved notification preference';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

reset role;
rollback;
