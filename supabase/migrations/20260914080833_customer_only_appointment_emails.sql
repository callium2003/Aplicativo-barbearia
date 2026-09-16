-- E-mails transacionais de agenda são exclusivos ao cliente.
-- Histórico de preferências, eventos e outbox permanece preservado.

alter table public.appointments
  add column if not exists notification_anchor_at timestamptz;

update public.appointments
set notification_anchor_at = coalesce(created_at, now())
where notification_anchor_at is null;

alter table public.appointments
  alter column notification_anchor_at set default now(),
  alter column notification_anchor_at set not null;

-- Não reenvia itens pendentes gerados antes da mudança de destinatário/cópia.
-- Eles continuam auditáveis como falhos e os próximos eventos usarão as novas regras.
update public.notification_outbox
set status = 'failed',
    attempts = greatest(attempts, 5),
    locked_at = null,
    last_error = 'delivery_blocked_by_customer_only_policy'
where status in ('pending','failed')
  and kind in (
    'new_appointment',
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_rescheduled',
    'appointment_reminder_24h'
  );

create or replace function private.refresh_appointment_notification_anchor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.starts_at is distinct from new.starts_at
     or old.professional_id is distinct from new.professional_id then
    new.notification_anchor_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.refresh_appointment_notification_anchor() from public, anon, authenticated;

drop trigger if exists a_refresh_appointment_notification_anchor on public.appointments;
create trigger a_refresh_appointment_notification_anchor
  before update of starts_at, professional_id on public.appointments
  for each row execute function private.refresh_appointment_notification_anchor();

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

  -- Somente a chamada destinada ao cliente habilita e-mail. Preferências legadas
  -- de e-mail da equipe não são consultadas nem alteradas por esta migration.
  if p_default_email then
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

revoke all on function private.enqueue_notification(uuid,uuid,text,uuid,text,text,jsonb,text,boolean) from public, anon, authenticated;

create or replace function private.dispatch_appointment_event(p_appointment public.appointments, p_event_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_name text;
  v_shop_slug text;
  v_owner_id uuid;
  v_staff record;
  v_title text;
  v_staff_body text;
  v_customer_title text;
  v_customer_body text;
  v_customer_name text;
  v_service_name text;
  v_professional_name text;
  v_date text;
  v_time text;
  v_public_url text;
  v_footer text;
  v_dedupe_base text;
  v_payload jsonb;
begin
  select name, slug, owner_id into v_shop_name, v_shop_slug, v_owner_id
  from public.barbershops
  where id = p_appointment.barbershop_id;

  if v_shop_name is null then return; end if;

  v_customer_name := coalesce(nullif(trim(p_appointment.customer_name),''),'cliente');
  v_service_name := coalesce(nullif(trim(p_appointment.service_name_snapshot),''),'seu atendimento');
  v_professional_name := coalesce(nullif(trim(p_appointment.professional_name_snapshot),''),'nossa equipe');
  v_date := to_char(p_appointment.starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY');
  v_time := to_char(p_appointment.starts_at at time zone 'America/Sao_Paulo','HH24:MI');

  if coalesce(v_shop_slug,'') ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    v_public_url := 'https://barbeariasp.cullentech.com.br/' || v_shop_slug;
    v_footer := format(
      E'\n\nEsta é uma mensagem automática. Não responda a este e-mail.\nPara falar com a %s, acesse sua página:\n%s\n\n%s\n\nBarbeariaSP',
      v_shop_name,
      v_public_url,
      v_shop_name
    );
  end if;

  v_dedupe_base := p_appointment.id::text || ':' || p_event_type || ':' || coalesce(p_appointment.notification_anchor_at::text,p_appointment.created_at::text,'');
  v_payload := jsonb_build_object(
    'barbershop_name',v_shop_name,
    'barbershop_public_url',v_public_url,
    'customer_name',v_customer_name,
    'service',v_service_name,
    'professional',v_professional_name,
    'starts_at',p_appointment.starts_at,
    'event_type',p_event_type
  );

  if p_event_type = 'new_appointment' then
    v_title := 'Novo agendamento';
    v_staff_body := format('%s reservou %s com %s para %s às %s.',v_customer_name,v_service_name,v_professional_name,v_date,v_time);
    v_customer_title := format('Agendamento confirmado — %s',v_shop_name);
    v_customer_body := format(
      E'Olá, %s!\n\nSua reserva na %s foi realizada para o dia %s, às %s, para %s, com %s.\n\nObrigado por nos escolher!%s',
      v_customer_name,v_shop_name,v_date,v_time,v_service_name,v_professional_name,coalesce(v_footer,'')
    );
  elsif p_event_type = 'appointment_cancelled' then
    v_title := 'Agendamento cancelado';
    v_staff_body := format('O atendimento de %s em %s às %s foi cancelado.',v_customer_name,v_date,v_time);
    v_customer_title := format('Agendamento cancelado — %s',v_shop_name);
    v_customer_body := format(
      E'Olá, %s.\n\nSeu agendamento na %s foi cancelado.\n\nData e horário: %s, às %s\nServiço: %s\nProfissional: %s%s',
      v_customer_name,v_shop_name,v_date,v_time,v_service_name,v_professional_name,coalesce(v_footer,'')
    );
  elsif p_event_type = 'appointment_rescheduled' then
    v_title := 'Agendamento reagendado';
    v_staff_body := format('O atendimento de %s foi reagendado para %s às %s.',v_customer_name,v_date,v_time);
    v_customer_title := format('Novo horário do seu agendamento — %s',v_shop_name);
    v_customer_body := format(
      E'Olá, %s!\n\nSeu agendamento na %s foi reagendado.\n\nNovo dia e horário: %s, às %s\nServiço: %s\nProfissional: %s%s',
      v_customer_name,v_shop_name,v_date,v_time,v_service_name,v_professional_name,coalesce(v_footer,'')
    );
  elsif p_event_type = 'appointment_reminder_24h' then
    v_title := 'Lembrete de amanhã';
    v_staff_body := format('%s tem %s marcado para amanhã às %s.',v_customer_name,v_service_name,v_time);
    v_customer_title := format('Lembrete: seu horário é amanhã — %s',v_shop_name);
    v_customer_body := format(
      E'Olá, %s!\n\nLembramos que seu horário na %s é amanhã.\n\nData e horário: %s, às %s\nServiço: %s\nProfissional: %s%s',
      v_customer_name,v_shop_name,v_date,v_time,v_service_name,v_professional_name,coalesce(v_footer,'')
    );
  else
    return;
  end if;

  -- Sem slug público válido, preserva a notificação interna e segura o e-mail
  -- até que a página própria da barbearia possa ser informada corretamente.
  if p_appointment.customer_id is not null and v_public_url is not null then
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
  end if;
end;
$$;

revoke all on function private.dispatch_appointment_event(public.appointments,text) from public, anon, authenticated;

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
    if (old.starts_at is distinct from new.starts_at or old.professional_id is distinct from new.professional_id)
       and new.status = 'scheduled' then
      perform private.dispatch_appointment_event(new,'appointment_rescheduled');
    end if;
    if old.status is distinct from new.status and new.status = 'cancelled' then
      perform private.dispatch_appointment_event(new,'appointment_cancelled');
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.queue_appointment_notifications() from public, anon, authenticated;

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
    'in_app_enabled',coalesce(p.in_app_enabled,true)
  ) order by e.ord)
  into v_result
  from (values
    (1,'new_appointment'),
    (2,'appointment_cancelled'),
    (3,'appointment_rescheduled')
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
  if p_event_type not in ('new_appointment','appointment_cancelled','appointment_rescheduled') then
    raise exception 'Invalid notification event';
  end if;

  p_email_enabled := false;
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
    where a.status = 'scheduled'
      and a.starts_at > now() + interval '23 hours'
      and a.starts_at <= now() + interval '24 hours'
      and a.notification_anchor_at <= a.starts_at - interval '26 hours'
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
