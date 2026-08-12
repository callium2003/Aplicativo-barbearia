create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  event_type text not null check (event_type in ('new_appointment','appointment_confirmed','appointment_cancelled','appointment_rescheduled','appointment_reminder_24h')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_user_id, dedupe_key)
);

alter table public.user_notifications enable row level security;
revoke all on table public.user_notifications from public, anon, authenticated;
grant select on table public.user_notifications to authenticated;
grant update (read_at) on table public.user_notifications to authenticated;
grant all on table public.user_notifications to service_role;

create policy "Users read own notifications"
on public.user_notifications for select
to authenticated
using ((select auth.uid()) = recipient_user_id);

create policy "Users mark own notifications read"
on public.user_notifications for update
to authenticated
using ((select auth.uid()) = recipient_user_id)
with check ((select auth.uid()) = recipient_user_id);

create index if not exists user_notifications_recipient_created_idx
  on public.user_notifications (recipient_user_id, created_at desc);
create index if not exists user_notifications_unread_idx
  on public.user_notifications (recipient_user_id, created_at desc)
  where read_at is null;

create table if not exists public.notification_preferences (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('new_appointment','appointment_confirmed','appointment_cancelled','appointment_rescheduled','appointment_reminder_24h')),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (barbershop_id, user_id, event_type)
);

alter table public.notification_preferences enable row level security;
revoke all on table public.notification_preferences from public, anon, authenticated;
grant all on table public.notification_preferences to service_role;

alter table public.notification_outbox drop constraint if exists notification_outbox_appointment_id_kind_key;
alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox drop constraint if exists notification_outbox_status_check;
alter table public.notification_outbox
  add column if not exists recipient_user_id uuid references auth.users(id) on delete set null,
  add column if not exists dedupe_key text,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists locked_at timestamptz;

update public.notification_outbox
set dedupe_key = coalesce(dedupe_key, appointment_id::text || ':' || kind)
where dedupe_key is null;

alter table public.notification_outbox alter column dedupe_key set not null;
alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in ('new_appointment','appointment_confirmed','appointment_cancelled','appointment_rescheduled','appointment_reminder_24h'));
alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending','processing','sent','failed'));
alter table public.notification_outbox
  add constraint notification_outbox_dedupe_recipient_key unique (dedupe_key, recipient_email);

create index if not exists notification_outbox_delivery_idx
  on public.notification_outbox (status, next_attempt_at, created_at);

create or replace function private.is_notification_staff(p_user_id uuid, p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barbershops b
    where b.id = p_barbershop_id and b.owner_id = p_user_id
  ) or exists (
    select 1 from public.team_members tm
    where tm.barbershop_id = p_barbershop_id
      and tm.user_id = p_user_id
      and tm.status = 'active'
  );
$$;

revoke all on function private.is_notification_staff(uuid,uuid) from public;

create or replace function private.notification_channel_enabled(
  p_barbershop_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_channel text,
  p_default_email boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pref public.notification_preferences%rowtype;
begin
  select * into v_pref
  from public.notification_preferences
  where barbershop_id = p_barbershop_id
    and user_id = p_user_id
    and event_type = p_event_type;

  if found then
    if p_channel = 'in_app' then return v_pref.in_app_enabled; end if;
    if p_channel = 'email' then return v_pref.email_enabled; end if;
  end if;

  if p_channel = 'in_app' then return true; end if;
  if p_channel = 'email' then return p_default_email; end if;
  return false;
end;
$$;

revoke all on function private.notification_channel_enabled(uuid,uuid,text,text,boolean) from public;

create or replace function private.enqueue_notification(
  p_barbershop_id uuid,
  p_appointment_id uuid,
  p_event_type text,
  p_recipient_user_id uuid,
  p_title text,
  p_body text,
  p_payload jsonb,
  p_dedupe_key text,
  p_default_email boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if p_recipient_user_id is null then return; end if;

  if private.notification_channel_enabled(p_barbershop_id,p_recipient_user_id,p_event_type,'in_app',p_default_email) then
    insert into public.user_notifications (
      barbershop_id, recipient_user_id, appointment_id, event_type, title, body, payload, dedupe_key
    ) values (
      p_barbershop_id, p_recipient_user_id, p_appointment_id, p_event_type, p_title, p_body, coalesce(p_payload,'{}'::jsonb), p_dedupe_key
    ) on conflict (recipient_user_id, dedupe_key) do nothing;
  end if;

  if private.notification_channel_enabled(p_barbershop_id,p_recipient_user_id,p_event_type,'email',p_default_email) then
    select email into v_email from auth.users where id = p_recipient_user_id;
    if coalesce(v_email,'') <> '' then
      insert into public.notification_outbox (
        barbershop_id, appointment_id, kind, recipient_email, recipient_user_id, payload, dedupe_key
      ) values (
        p_barbershop_id, p_appointment_id, p_event_type, v_email, p_recipient_user_id,
        coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('title',p_title,'body',p_body), p_dedupe_key
      ) on conflict (dedupe_key, recipient_email) do nothing;
    end if;
  end if;
end;
$$;

revoke all on function private.enqueue_notification(uuid,uuid,text,uuid,text,text,jsonb,text,boolean) from public;

create or replace function private.dispatch_appointment_event(p_appointment public.appointments, p_event_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_name text;
  v_owner_id uuid;
  v_staff record;
  v_title text;
  v_staff_body text;
  v_customer_title text;
  v_customer_body text;
  v_when text;
  v_dedupe_base text;
  v_payload jsonb;
begin
  select name, owner_id into v_shop_name, v_owner_id
  from public.barbershops where id = p_appointment.barbershop_id;

  v_when := to_char(p_appointment.starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI');
  v_dedupe_base := p_appointment.id::text || ':' || p_event_type || ':' || coalesce(p_appointment.starts_at::text,'');
  v_payload := jsonb_build_object(
    'barbershop_name',v_shop_name,
    'customer_name',p_appointment.customer_name,
    'customer_phone',p_appointment.customer_phone,
    'service',p_appointment.service_name_snapshot,
    'professional',p_appointment.professional_name_snapshot,
    'starts_at',v_when,
    'event_type',p_event_type
  );

  if p_event_type = 'new_appointment' then
    v_title := 'Novo agendamento';
    v_staff_body := format('%s reservou %s com %s para %s.',p_appointment.customer_name,coalesce(p_appointment.service_name_snapshot,'um serviço'),coalesce(p_appointment.professional_name_snapshot,'a equipe'),v_when);
    v_customer_title := 'Agendamento confirmado';
    v_customer_body := format('Seu horário na %s foi reservado para %s, com %s.',v_shop_name,v_when,coalesce(p_appointment.professional_name_snapshot,'a equipe'));
  elsif p_event_type = 'appointment_confirmed' then
    v_title := 'Agendamento confirmado';
    v_staff_body := format('O atendimento de %s em %s está confirmado.',p_appointment.customer_name,v_when);
    v_customer_title := 'Horário confirmado';
    v_customer_body := format('%s confirmou seu atendimento de %s em %s.',v_shop_name,coalesce(p_appointment.service_name_snapshot,'serviço'),v_when);
  elsif p_event_type = 'appointment_cancelled' then
    v_title := 'Agendamento cancelado';
    v_staff_body := format('O atendimento de %s em %s foi cancelado.',p_appointment.customer_name,v_when);
    v_customer_title := 'Agendamento cancelado';
    v_customer_body := format('Seu atendimento na %s em %s foi cancelado.',v_shop_name,v_when);
  elsif p_event_type = 'appointment_rescheduled' then
    v_title := 'Agendamento reagendado';
    v_staff_body := format('O atendimento de %s foi reagendado para %s.',p_appointment.customer_name,v_when);
    v_customer_title := 'Novo horário do agendamento';
    v_customer_body := format('Seu atendimento na %s foi atualizado para %s.',v_shop_name,v_when);
  elsif p_event_type = 'appointment_reminder_24h' then
    v_title := 'Lembrete de amanhã';
    v_staff_body := format('%s tem %s marcado para %s.',p_appointment.customer_name,coalesce(p_appointment.service_name_snapshot,'atendimento'),v_when);
    v_customer_title := 'Lembrete do seu horário';
    v_customer_body := format('Seu atendimento na %s é em %s, com %s.',v_shop_name,v_when,coalesce(p_appointment.professional_name_snapshot,'a equipe'));
  else
    return;
  end if;

  if p_appointment.customer_id is not null then
    perform private.enqueue_notification(
      p_appointment.barbershop_id,p_appointment.id,p_event_type,p_appointment.customer_id,
      v_customer_title,v_customer_body,v_payload,v_dedupe_base || ':customer',true
    );
  end if;

  if p_event_type <> 'appointment_reminder_24h' then
    for v_staff in
      select distinct x.user_id
      from (
        select v_owner_id as user_id
        union all
        select tm.user_id
        from public.team_members tm
        where tm.barbershop_id = p_appointment.barbershop_id
          and tm.status = 'active'
          and (
            tm.role = 'manager'
            or (tm.role = 'barber' and tm.professional_id = p_appointment.professional_id)
          )
      ) x
      where x.user_id is not null
    loop
      perform private.enqueue_notification(
        p_appointment.barbershop_id,p_appointment.id,p_event_type,v_staff.user_id,
        v_title,v_staff_body,v_payload,v_dedupe_base || ':staff:' || v_staff.user_id::text,false
      );
    end loop;
  else
    for v_staff in
      select distinct tm.user_id
      from public.team_members tm
      where tm.barbershop_id = p_appointment.barbershop_id
        and tm.status = 'active'
        and tm.role = 'barber'
        and tm.professional_id = p_appointment.professional_id
        and tm.user_id is not null
    loop
      perform private.enqueue_notification(
        p_appointment.barbershop_id,p_appointment.id,p_event_type,v_staff.user_id,
        v_title,v_staff_body,v_payload,v_dedupe_base || ':staff:' || v_staff.user_id::text,false
      );
    end loop;
  end if;
end;
$$;

revoke all on function private.dispatch_appointment_event(public.appointments,text) from public;

drop trigger if exists queue_new_appointment_notification on public.appointments;
drop function if exists public.queue_new_appointment_notification();

create or replace function private.queue_appointment_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.dispatch_appointment_event(new,'new_appointment');
  else
    if old.starts_at is distinct from new.starts_at and new.status in ('scheduled','confirmed') then
      perform private.dispatch_appointment_event(new,'appointment_rescheduled');
    end if;
    if old.status is distinct from new.status then
      if new.status = 'confirmed' then
        perform private.dispatch_appointment_event(new,'appointment_confirmed');
      elsif new.status = 'cancelled' then
        perform private.dispatch_appointment_event(new,'appointment_cancelled');
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.queue_appointment_notifications() from public;

create trigger queue_appointment_notifications
  after insert or update of status, starts_at, professional_id on public.appointments
  for each row execute function private.queue_appointment_notifications();

create or replace function public.get_my_notification_preferences(p_barbershop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not private.is_notification_staff(v_user,p_barbershop_id) then raise exception 'Access denied'; end if;

  select jsonb_agg(jsonb_build_object(
    'event_type',e.event_type,
    'in_app_enabled',coalesce(p.in_app_enabled,true),
    'email_enabled',coalesce(p.email_enabled,false)
  ) order by e.ord)
  into v_result
  from (values
    (1,'new_appointment'),
    (2,'appointment_confirmed'),
    (3,'appointment_cancelled'),
    (4,'appointment_rescheduled'),
    (5,'appointment_reminder_24h')
  ) e(ord,event_type)
  left join public.notification_preferences p
    on p.barbershop_id=p_barbershop_id and p.user_id=v_user and p.event_type=e.event_type;

  return coalesce(v_result,'[]'::jsonb);
end;
$$;

revoke all on function public.get_my_notification_preferences(uuid) from public, anon;
grant execute on function public.get_my_notification_preferences(uuid) to authenticated, service_role;

create or replace function public.save_my_notification_preference(
  p_barbershop_id uuid,
  p_event_type text,
  p_in_app_enabled boolean,
  p_email_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not private.is_notification_staff(v_user,p_barbershop_id) then raise exception 'Access denied'; end if;
  if p_event_type not in ('new_appointment','appointment_confirmed','appointment_cancelled','appointment_rescheduled','appointment_reminder_24h') then
    raise exception 'Invalid notification event';
  end if;

  insert into public.notification_preferences(barbershop_id,user_id,event_type,in_app_enabled,email_enabled,updated_at)
  values(p_barbershop_id,v_user,p_event_type,p_in_app_enabled,p_email_enabled,now())
  on conflict(barbershop_id,user_id,event_type) do update
  set in_app_enabled=excluded.in_app_enabled,
      email_enabled=excluded.email_enabled,
      updated_at=now();
end;
$$;

revoke all on function public.save_my_notification_preference(uuid,text,boolean,boolean) from public, anon;
grant execute on function public.save_my_notification_preference(uuid,text,boolean,boolean) to authenticated, service_role;

create or replace function public.get_notification_delivery_monitor(p_barbershop_id uuid, p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.barbershops b where b.id=p_barbershop_id and b.owner_id=v_user
    union all
    select 1 from public.team_members tm where tm.barbershop_id=p_barbershop_id and tm.user_id=v_user and tm.status='active' and tm.role='manager'
  ) then raise exception 'Access denied'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  into v_result
  from (
    select id,appointment_id,kind,recipient_email,status,attempts,last_error,sent_at,created_at,next_attempt_at
    from public.notification_outbox
    where barbershop_id=p_barbershop_id
    order by created_at desc
    limit greatest(1,least(coalesce(p_limit,50),100))
  ) x;
  return v_result;
end;
$$;

revoke all on function public.get_notification_delivery_monitor(uuid,integer) from public, anon;
grant execute on function public.get_notification_delivery_monitor(uuid,integer) to authenticated, service_role;

create or replace function public.enqueue_due_appointment_reminders(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.appointments%rowtype;
  v_count integer := 0;
begin
  for v_row in
    select a.*
    from public.appointments a
    where a.status in ('scheduled','confirmed')
      and a.starts_at > now() + interval '23 hours'
      and a.starts_at <= now() + interval '24 hours'
    order by a.starts_at
    limit greatest(1,least(coalesce(p_limit,200),500))
  loop
    perform private.dispatch_appointment_event(v_row,'appointment_reminder_24h');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.enqueue_due_appointment_reminders(integer) from public, anon, authenticated;
grant execute on function public.enqueue_due_appointment_reminders(integer) to service_role;

create or replace function public.claim_notification_outbox(p_limit integer default 50)
returns setof public.notification_outbox
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select id
    from public.notification_outbox
    where status in ('pending','failed')
      and attempts < 5
      and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  )
  update public.notification_outbox o
  set status='processing', attempts=o.attempts+1, locked_at=now(), last_error=null
  from picked
  where o.id=picked.id
  returning o.*;
$$;

revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;

create or replace function public.complete_notification_outbox(p_id uuid, p_success boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_outbox
  set status = case when p_success then 'sent' else 'failed' end,
      sent_at = case when p_success then now() else sent_at end,
      last_error = case when p_success then null else left(coalesce(p_error,'Delivery failed'),1000) end,
      locked_at = null,
      next_attempt_at = case when p_success then next_attempt_at else now() + (interval '5 minutes' * power(2,least(attempts,4))) end
  where id=p_id;
end;
$$;

revoke all on function public.complete_notification_outbox(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.complete_notification_outbox(uuid,boolean,text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;
