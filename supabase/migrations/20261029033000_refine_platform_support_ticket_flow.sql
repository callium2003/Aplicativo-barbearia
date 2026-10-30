-- Evolução do Fluxo de Atendimento, Notificações e Encerramento de Chamados (EFS §24.10.6, §48.5).
-- 1. Campos de canal de contato, anexo de evidência e resumo de resolução.
-- 2. Notificações in-app no sininho (user_notifications) para locatário.
-- 3. Transição refinada para 'in_progress' (Em Análise) sem forçar 'waiting_client' precocemente.
-- 4. Autonomia da equipe da plataforma para encerrar chamado com nota histórica obrigatória.
-- 5. Bucket de storage support-attachments com RLS estrita.

-- ============================================================================
-- 1. Colunas Adicionais nas Tabelas de Suporte
-- ============================================================================

alter table public.platform_support_tickets
  add column if not exists contact_channel text,
  add column if not exists attachment_url text,
  add column if not exists resolution_summary text;

alter table public.platform_support_ticket_messages
  add column if not exists attachment_url text;

-- ============================================================================
-- 2. Atualização da Constraint de Eventos de Notificação In-App
-- ============================================================================

do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.user_notifications'::regclass
      and contype = 'c'
      and conname like '%event_type%'
  ) loop
    execute 'alter table public.user_notifications drop constraint ' || quote_ident(r.conname);
  end loop;
end;
$$;

alter table public.user_notifications add constraint user_notifications_event_type_check
  check (event_type in (
    'new_appointment',
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_rescheduled',
    'appointment_reminder_24h',
    'support_ticket_opened',
    'support_ticket_replied',
    'support_ticket_resolved'
  ));

-- ============================================================================
-- 3. Bucket de Storage para Anexos de Suporte
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Support attachments are readable by authenticated" on storage.objects;
create policy "Support attachments are readable by authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'support-attachments');

drop policy if exists "Support attachments uploadable by authenticated staff" on storage.objects;
create policy "Support attachments uploadable by authenticated staff"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (
      private.is_active_platform_owner()
      or (
        array_length(storage.foldername(name), 1) >= 1
        and exists (
          select 1 from public.barbershops barbershop
          where barbershop.id::text = (storage.foldername(storage.objects.name))[1]
            and private.current_barbershop_role(barbershop.id) in ('owner', 'manager')
        )
      )
    )
  );

-- ============================================================================
-- 4. RPC para Abertura de Chamado com Notificação In-App e Anexo
-- ============================================================================

drop function if exists public.create_platform_support_ticket(uuid, text, text, text, text);

create or replace function public.create_platform_support_ticket(
  p_barbershop_id uuid,
  p_category_id text,
  p_subject text,
  p_description text,
  p_priority text default 'normal',
  p_contact_channel text default null,
  p_attachment_url text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_role text;
  v_normalized_subject text;
  v_normalized_desc text;
  v_priority text;
  v_clean_contact text;
  v_clean_attachment text;
  v_ticket_id uuid;
  v_user_id uuid;
  v_protocol text;
begin
  if p_barbershop_id is null then
    raise exception 'Identificador da barbearia é obrigatório.';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role not in ('owner', 'manager') then
    raise exception 'Apenas proprietários e gestores da barbearia podem abrir chamados de suporte.';
  end if;

  if not exists (select 1 from public.platform_faq_categories where id = p_category_id) then
    raise exception 'Categoria de suporte inválida.';
  end if;

  v_normalized_subject := trim(coalesce(p_subject, ''));
  if char_length(v_normalized_subject) < 5 then
    raise exception 'Assunto do chamado deve ter pelo menos 5 caracteres.';
  end if;

  v_normalized_desc := trim(coalesce(p_description, ''));
  if char_length(v_normalized_desc) < 10 then
    raise exception 'Descrição do chamado deve ter pelo menos 10 caracteres.';
  end if;

  v_priority := lower(trim(coalesce(p_priority, 'normal')));
  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  v_clean_contact := nullif(trim(coalesce(p_contact_channel, '')), '');
  v_clean_attachment := nullif(trim(coalesce(p_attachment_url, '')), '');
  v_user_id := (select auth.uid());

  insert into public.platform_support_tickets (
    barbershop_id,
    created_by,
    created_by_role,
    category_id,
    subject,
    description,
    priority,
    status,
    first_response_due_at,
    faq_consulted,
    contact_channel,
    attachment_url
  ) values (
    p_barbershop_id,
    v_user_id,
    v_role,
    p_category_id,
    v_normalized_subject,
    v_normalized_desc,
    v_priority,
    'open',
    now() + interval '1 day',
    true,
    v_clean_contact,
    v_clean_attachment
  )
  returning id into v_ticket_id;

  v_protocol := upper(substring(v_ticket_id::text from 1 for 8));

  -- Insere a mensagem inicial no histórico do chamado
  insert into public.platform_support_ticket_messages (
    ticket_id,
    sender_user_id,
    sender_type,
    message,
    attachment_url
  ) values (
    v_ticket_id,
    v_user_id,
    'tenant',
    v_normalized_desc,
    v_clean_attachment
  );

  -- Notificação in-app para o solicitante no painel da barbearia (Sininho)
  if v_user_id is not null then
    insert into public.user_notifications (
      barbershop_id,
      recipient_user_id,
      event_type,
      title,
      body,
      dedupe_key,
      payload
    ) values (
      p_barbershop_id,
      v_user_id,
      'support_ticket_opened',
      'Chamado #' || v_protocol || ' registrado',
      'Sua solicitação foi aberta com SLA de 1 dia útil. Nossa equipe já foi alertada.',
      'ticket-opened:' || v_ticket_id::text,
      jsonb_build_object('ticket_id', v_ticket_id, 'protocol', v_protocol)
    )
    on conflict (recipient_user_id, dedupe_key) do nothing;
  end if;

  -- Registra auditoria na plataforma
  perform private.write_platform_audit_event(
    p_barbershop_id,
    'support_ticket_opened',
    1,
    jsonb_build_object(
      'ticket_id', v_ticket_id,
      'protocol', v_protocol,
      'category_id', p_category_id,
      'subject', v_normalized_subject,
      'priority', v_priority,
      'created_by_role', v_role,
      'has_attachment', (v_clean_attachment is not null)
    )
  );

  return v_ticket_id;
end;
$$;

revoke all on function public.create_platform_support_ticket(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_platform_support_ticket(uuid, text, text, text, text, text, text) to authenticated;

-- ============================================================================
-- 5. RPC para Resposta de Chamado com Status Customizado e Notificação
-- ============================================================================

drop function if exists public.reply_platform_support_ticket(uuid, text);

create or replace function public.reply_platform_support_ticket(
  p_ticket_id uuid,
  p_message text,
  p_attachment_url text default null,
  p_status text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_ticket record;
  v_clean_message text;
  v_clean_attachment text;
  v_sender_type text;
  v_message_id uuid;
  v_is_platform boolean;
  v_user_id uuid;
  v_target_status text;
  v_protocol text;
begin
  select * into v_ticket
  from public.platform_support_tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Chamado de suporte não encontrado.';
  end if;

  v_clean_message := trim(coalesce(p_message, ''));
  v_clean_attachment := nullif(trim(coalesce(p_attachment_url, '')), '');

  if char_length(v_clean_message) < 2 and v_clean_attachment is null then
    raise exception 'Mensagem ou anexo de evidência é obrigatório.';
  end if;

  v_user_id := (select auth.uid());
  v_is_platform := private.is_active_platform_owner();
  v_protocol := upper(substring(p_ticket_id::text from 1 for 8));

  if v_is_platform then
    v_sender_type := 'platform';
    -- Status padrão é 'in_progress' (Em Análise), a menos que explicitamente especificado
    v_target_status := lower(trim(coalesce(p_status, '')));
    if v_target_status not in ('open', 'in_progress', 'waiting_client', 'resolved', 'closed') then
      v_target_status := 'in_progress';
    end if;

    update public.platform_support_tickets
    set
      status = v_target_status,
      first_responded_at = coalesce(first_responded_at, now()),
      assigned_to = coalesce(assigned_to, v_user_id),
      updated_at = now()
    where id = p_ticket_id;

    -- Dispara notificação in-app para o solicitante do chamado
    if v_ticket.created_by is not null then
      insert into public.user_notifications (
        barbershop_id,
        recipient_user_id,
        event_type,
        title,
        body,
        dedupe_key,
        payload
      ) values (
        v_ticket.barbershop_id,
        v_ticket.created_by,
        'support_ticket_replied',
        'Nova resposta no chamado #' || v_protocol,
        case
          when v_target_status = 'waiting_client' then 'A equipe de suporte respondeu e aguarda seu retorno no chamado.'
          else 'A equipe técnica enviou uma atualização no seu chamado.'
        end,
        'ticket-reply:' || p_ticket_id::text || ':' || extract(epoch from now())::text,
        jsonb_build_object('ticket_id', p_ticket_id, 'status', v_target_status)
      )
      on conflict (recipient_user_id, dedupe_key) do nothing;
    end if;

  elsif private.current_barbershop_role(v_ticket.barbershop_id) in ('owner', 'manager') then
    v_sender_type := 'tenant';
    -- Quando o locatário responde, o chamado fica em 'in_progress' ou 'open'
    update public.platform_support_tickets
    set
      status = 'in_progress',
      updated_at = now()
    where id = p_ticket_id;
  else
    raise exception 'Acesso não autorizado ao chamado de suporte.';
  end if;

  insert into public.platform_support_ticket_messages (
    ticket_id,
    sender_user_id,
    sender_type,
    message,
    attachment_url
  ) values (
    p_ticket_id,
    v_user_id,
    v_sender_type,
    v_clean_message,
    v_clean_attachment
  )
  returning id into v_message_id;

  perform private.write_platform_audit_event(
    v_ticket.barbershop_id,
    'support_ticket_replied',
    1,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'sender_type', v_sender_type,
      'new_status', coalesce(v_target_status, 'in_progress'),
      'has_attachment', (v_clean_attachment is not null)
    )
  );

  return v_message_id;
end;
$$;

revoke all on function public.reply_platform_support_ticket(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.reply_platform_support_ticket(uuid, text, text, text) to authenticated;

-- ============================================================================
-- 6. RPC para Encerramento de Chamado com Histórico Técnico Obrigatório
-- ============================================================================

create or replace function public.close_platform_support_ticket(
  p_ticket_id uuid,
  p_resolution_summary text,
  p_status text default 'closed'
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_ticket record;
  v_clean_summary text;
  v_clean_status text;
  v_is_platform boolean;
  v_sender_type text;
  v_user_id uuid;
  v_protocol text;
begin
  select * into v_ticket
  from public.platform_support_tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Chamado de suporte não encontrado.';
  end if;

  v_clean_summary := trim(coalesce(p_resolution_summary, ''));
  if char_length(v_clean_summary) < 5 then
    raise exception 'O resumo da resolução deve ter pelo menos 5 caracteres.';
  end if;

  v_clean_status := lower(trim(coalesce(p_status, 'closed')));
  if v_clean_status not in ('resolved', 'closed') then
    v_clean_status := 'closed';
  end if;

  v_user_id := (select auth.uid());
  v_is_platform := private.is_active_platform_owner();
  v_protocol := upper(substring(p_ticket_id::text from 1 for 8));

  if v_is_platform then
    v_sender_type := 'platform';
  elsif private.current_barbershop_role(v_ticket.barbershop_id) in ('owner', 'manager') then
    v_sender_type := 'tenant';
  else
    raise exception 'Acesso não autorizado.';
  end if;

  -- Atualiza o ticket
  update public.platform_support_tickets
  set
    status = v_clean_status,
    resolution_summary = v_clean_summary,
    resolved_at = coalesce(resolved_at, now()),
    updated_at = now()
  where id = p_ticket_id;

  -- Registra a mensagem final de encerramento na timeline
  insert into public.platform_support_ticket_messages (
    ticket_id,
    sender_user_id,
    sender_type,
    message
  ) values (
    p_ticket_id,
    v_user_id,
    v_sender_type,
    '🔒 [Encerramento]: ' || v_clean_summary
  );

  -- Notificação in-app para o solicitante
  if v_ticket.created_by is not null then
    insert into public.user_notifications (
      barbershop_id,
      recipient_user_id,
      event_type,
      title,
      body,
      dedupe_key,
      payload
    ) values (
      v_ticket.barbershop_id,
      v_ticket.created_by,
      'support_ticket_resolved',
      'Chamado #' || v_protocol || ' concluído',
      'Atendimento finalizado: ' || substring(v_clean_summary from 1 for 100),
      'ticket-closed:' || p_ticket_id::text || ':' || extract(epoch from now())::text,
      jsonb_build_object('ticket_id', p_ticket_id, 'resolution', v_clean_summary)
    )
    on conflict (recipient_user_id, dedupe_key) do nothing;
  end if;

  -- Registra auditoria
  perform private.write_platform_audit_event(
    v_ticket.barbershop_id,
    'support_ticket_status_changed',
    1,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'new_status', v_clean_status,
      'closed_by_type', v_sender_type,
      'resolution_summary', v_clean_summary
    )
  );
end;
$$;

revoke all on function public.close_platform_support_ticket(uuid, text, text) from public, anon, authenticated;
grant execute on function public.close_platform_support_ticket(uuid, text, text) to authenticated;

-- ============================================================================
-- 7. Atualização das RPCs de Listagem com as Novas Colunas
-- ============================================================================

drop function if exists public.list_barbershop_support_tickets(uuid);
create or replace function public.list_barbershop_support_tickets(p_barbershop_id uuid)
returns table(
  id uuid,
  barbershop_id uuid,
  category_id text,
  category_title text,
  subject text,
  description text,
  priority text,
  status text,
  contact_channel text,
  attachment_url text,
  resolution_summary text,
  first_response_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  message_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_role text;
begin
  if p_barbershop_id is null then
    raise exception 'Identificador da barbearia é obrigatório.';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if not private.is_active_platform_owner() and v_role not in ('owner', 'manager') then
    raise exception 'Acesso não autorizado aos chamados desta barbearia.';
  end if;

  return query
  select
    t.id,
    t.barbershop_id,
    t.category_id,
    c.title as category_title,
    t.subject,
    t.description,
    t.priority,
    t.status,
    t.contact_channel,
    t.attachment_url,
    t.resolution_summary,
    t.first_response_due_at,
    t.first_responded_at,
    t.resolved_at,
    t.created_at,
    t.updated_at,
    count(m.id)::bigint as message_count
  from public.platform_support_tickets t
  left join public.platform_faq_categories c on c.id = t.category_id
  left join public.platform_support_ticket_messages m on m.ticket_id = t.id
  where t.barbershop_id = p_barbershop_id
  group by t.id, c.title
  order by t.created_at desc;
end;
$$;

revoke all on function public.list_barbershop_support_tickets(uuid) from public, anon, authenticated;
grant execute on function public.list_barbershop_support_tickets(uuid) to authenticated;

drop function if exists public.list_all_platform_support_tickets(text, uuid);
create or replace function public.list_all_platform_support_tickets(
  p_status text default null,
  p_barbershop_id uuid default null
)
returns table(
  id uuid,
  barbershop_id uuid,
  barbershop_name text,
  category_id text,
  category_title text,
  subject text,
  description text,
  priority text,
  status text,
  contact_channel text,
  attachment_url text,
  resolution_summary text,
  first_response_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  assigned_to uuid,
  created_at timestamptz,
  updated_at timestamptz,
  message_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso restrito à equipe da plataforma BarbeariaSP.';
  end if;

  return query
  select
    t.id,
    t.barbershop_id,
    b.name as barbershop_name,
    t.category_id,
    c.title as category_title,
    t.subject,
    t.description,
    t.priority,
    t.status,
    t.contact_channel,
    t.attachment_url,
    t.resolution_summary,
    t.first_response_due_at,
    t.first_responded_at,
    t.resolved_at,
    t.assigned_to,
    t.created_at,
    t.updated_at,
    count(m.id)::bigint as message_count
  from public.platform_support_tickets t
  join public.barbershops b on b.id = t.barbershop_id
  left join public.platform_faq_categories c on c.id = t.category_id
  left join public.platform_support_ticket_messages m on m.ticket_id = t.id
  where (p_status is null or t.status = p_status)
    and (p_barbershop_id is null or t.barbershop_id = p_barbershop_id)
  group by t.id, b.name, c.title
  order by
    case when t.status in ('open', 'in_progress', 'waiting_client') then 0 else 1 end,
    t.created_at desc;
end;
$$;

revoke all on function public.list_all_platform_support_tickets(text, uuid) from public, anon, authenticated;
grant execute on function public.list_all_platform_support_tickets(text, uuid) to authenticated;
