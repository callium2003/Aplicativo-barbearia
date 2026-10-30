-- Migração: Reparação de Encoding de Notificações de Suporte e RPCs Resilientes (EFS §24.10.6, §48.5)
-- 1. Repara registros históricos na tabela public.user_notifications com caracteres corrompidos ou substitutos (mojibake).
-- 2. Atualiza create_platform_support_ticket, reply_platform_support_ticket e close_platform_support_ticket
--    utilizando literais com escape Unicode (U&'...') para imunidade a encoding de transporte/cliente.

-- 1. Repara registros existentes no banco
update public.user_notifications
set title = regexp_replace(title, 'conclu[^\w\s]*do', 'concluído', 'gi')
where title ~* 'conclu[^\w\s]*do';

update public.user_notifications
set body = 'Sua solicitação foi aberta com SLA de 1 dia útil. Nossa equipe já foi alertada.'
where event_type = 'support_ticket_opened'
  and (body ~* 'solicita' or body ~* 'alerta');

update public.user_notifications
set body = 'A equipe técnica enviou uma atualização no seu chamado.'
where event_type = 'support_ticket_replied'
  and (body ~* 'equipe' or body ~* 'atualiza');

-- 2. Atualiza RPC create_platform_support_ticket com escape Unicode
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
    v_clean_contact,
    v_clean_attachment
  ) returning id into v_ticket_id;

  v_protocol := upper(substring(v_ticket_id::text from 1 for 8));

  -- Cria a primeira mensagem do histórico da conversa
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

  -- Notificação in-app para o solicitante no painel da barbearia (Sininho) com escape Unicode imune a encoding
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
      U&'Sua solicita\00e7\00e3o foi aberta com SLA de 1 dia \00fatil. Nossa equipe j\00e1 foi alertada.',
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

-- 3. Atualiza RPC reply_platform_support_ticket com escape Unicode
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
  v_user_id uuid;
  v_sender_type text;
  v_message_id uuid;
  v_clean_message text;
  v_clean_attachment text;
  v_target_status text;
  v_protocol text;
begin
  if p_ticket_id is null then
    raise exception 'Identificador do chamado é obrigatório.';
  end if;

  v_clean_message := trim(coalesce(p_message, ''));
  if char_length(v_clean_message) < 2 then
    raise exception 'Mensagem da resposta deve ter pelo menos 2 caracteres.';
  end if;

  v_clean_attachment := nullif(trim(coalesce(p_attachment_url, '')), '');
  v_user_id := (select auth.uid());

  select * into v_ticket
  from public.platform_support_tickets
  where id = p_ticket_id;

  if not found then
    raise exception 'Chamado de suporte não encontrado.';
  end if;

  if v_ticket.status in ('resolved', 'closed') then
    raise exception 'Não é possível responder a um chamado já resolvido ou encerrado.';
  end if;

  v_protocol := upper(substring(p_ticket_id::text from 1 for 8));

  -- Determina se quem responde é a plataforma ou o locatário
  if private.is_active_platform_owner() then
    v_sender_type := 'platform';

    -- Permite definir status da resposta da plataforma (padrão 'in_progress')
    v_target_status := lower(trim(coalesce(p_status, 'in_progress')));
    if v_target_status not in ('in_progress', 'waiting_client', 'resolved', 'closed') then
      v_target_status := 'in_progress';
    end if;

    update public.platform_support_tickets
    set status = v_target_status,
        first_responded_at = coalesce(first_responded_at, clock_timestamp()),
        updated_at = clock_timestamp()
    where id = p_ticket_id;

    -- Dispara notificação in-app para o solicitante do chamado com escape Unicode
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
          when v_target_status = 'waiting_client' then U&'A equipe de suporte respondeu e aguarda seu retorno no chamado.'
          else U&'A equipe t\00e9cnica enviou uma atualiza\00e7\00e3o no seu chamado.'
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
    set status = 'in_progress',
        updated_at = clock_timestamp()
    where id = p_ticket_id;
  else
    raise exception 'Acesso não autorizado para responder a este chamado.';
  end if;

  -- Insere a mensagem
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
  ) returning id into v_message_id;

  -- Registra auditoria
  perform private.write_platform_audit_event(
    v_ticket.barbershop_id,
    'support_ticket_replied',
    1,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'sender_type', v_sender_type,
      'has_attachment', (v_clean_attachment is not null),
      'resulting_status', coalesce(v_target_status, 'in_progress')
    )
  );

  return v_message_id;
end;
$$;

revoke all on function public.reply_platform_support_ticket(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.reply_platform_support_ticket(uuid, text, text, text) to authenticated;

-- 4. Atualiza RPC close_platform_support_ticket com escape Unicode
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
  v_sender_type text;
  v_user_id uuid;
  v_protocol text;
begin
  if p_ticket_id is null then
    raise exception 'Identificador do chamado é obrigatório.';
  end if;

  v_clean_summary := trim(coalesce(p_resolution_summary, ''));
  if char_length(v_clean_summary) < 5 then
    raise exception 'Resumo de resolução é obrigatório para encerramento e deve ter pelo menos 5 caracteres.';
  end if;

  v_clean_status := lower(trim(coalesce(p_status, 'closed')));
  if v_clean_status not in ('closed', 'resolved') then
    v_clean_status := 'closed';
  end if;

  select * into v_ticket
  from public.platform_support_tickets
  where id = p_ticket_id;

  if not found then
    raise exception 'Chamado de suporte não encontrado.';
  end if;

  v_user_id := (select auth.uid());
  v_protocol := upper(substring(p_ticket_id::text from 1 for 8));

  if private.is_active_platform_owner() then
    v_sender_type := 'platform';
  elsif private.current_barbershop_role(v_ticket.barbershop_id) in ('owner', 'manager') then
    v_sender_type := 'tenant';
  else
    raise exception 'Acesso não autorizado para encerrar este chamado.';
  end if;

  -- Atualiza o chamado
  update public.platform_support_tickets
  set status = v_clean_status,
      resolution_summary = v_clean_summary,
      resolved_at = coalesce(resolved_at, clock_timestamp()),
      updated_at = clock_timestamp()
  where id = p_ticket_id;

  -- Registra mensagem de encerramento
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

  -- Notificação in-app para o solicitante com escape Unicode
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
      'Chamado #' || v_protocol || U&' conclu\00eddo',
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
