-- Suporte e FAQ Comercial da BarbeariaSP (EFS §24.10.6, §48.5.1).
-- Abertura de chamados exclusiva para proprietário ('owner') e gestor ('manager') da barbearia.
-- Precedido obrigatoriamente por consulta da FAQ categorizada (proposta de suporte contínuo).
-- SLA obrigatório: confirmação imediata, responsável e primeira resposta em até 1 dia útil.
-- Atendimento e governança pela equipe CullenTech (platform_owner).
-- Auditoria de ações sensíveis em private.platform_audit_events.

do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'private.platform_audit_events'::regclass
      and contype = 'c'
      and conname like '%action%'
  ) loop
    execute 'alter table private.platform_audit_events drop constraint ' || quote_ident(r.conname);
  end loop;
end;
$$;

alter table private.platform_audit_events add constraint platform_audit_events_action_check
  check (action in (
    'customer_data_opened',
    'customer_consents_viewed',
    'customer_data_exported',
    'commercial_agreement_activated',
    'commercial_agreement_renewed',
    'barbershop_suspended',
    'support_ticket_opened',
    'support_ticket_replied',
    'support_ticket_status_changed'
  ));

-- ============================================================================
-- 1. Tabelas de FAQ Comercial e Suporte Contínuo
-- ============================================================================

create table if not exists public.platform_faq_categories (
  id text primary key,
  title text not null check (char_length(trim(title)) >= 3),
  description text not null,
  icon text not null default '💬',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_faq_articles (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id text not null references public.platform_faq_categories(id) on delete cascade,
  question text not null check (char_length(trim(question)) >= 5),
  answer text not null check (char_length(trim(answer)) >= 10),
  commercial_offer_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.platform_faq_categories enable row level security;
alter table public.platform_faq_articles enable row level security;

drop policy if exists "Platform FAQ categories are readable by all" on public.platform_faq_categories;
create policy "Platform FAQ categories are readable by all"
  on public.platform_faq_categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Platform FAQ articles are readable by all" on public.platform_faq_articles;
create policy "Platform FAQ articles are readable by all"
  on public.platform_faq_articles for select
  to anon, authenticated
  using (true);

grant select on table public.platform_faq_categories to anon, authenticated;
grant select on table public.platform_faq_articles to anon, authenticated;

-- Seed inicial de categorias e artigos da FAQ
insert into public.platform_faq_categories (id, title, description, icon, sort_order) values
  ('billing', 'Assinatura & Planos', 'Dúvidas sobre faturas, planos Asaas, trial e pagamentos.', '💳', 1),
  ('agenda', 'Agenda & Agendamentos', 'Funcionamento da agenda, horários de 10 min e cancelamentos.', '📅', 2),
  ('team', 'Equipe & Permissões', 'Convites para barbeiros, comissões e papéis de gestão.', '👥', 3),
  ('commercial', 'Proposta & Acordo Comercial', 'Condições de suporte contínuo, acordos e carência.', '🤝', 4),
  ('system', 'Configuração & Operação', 'Perfil público, WhatsApp, endereço e fotos da barbearia.', '⚙️', 5)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

insert into public.platform_faq_articles (category_id, question, answer, commercial_offer_note, sort_order) values
  ('billing', 'Como funciona o período de testes (Trial)?',
   'O BarbeariaSP oferece 30 dias de trial com acesso completo a todas as funcionalidades de agendamento e gestão. Ao final do trial, a barbearia pode contratar os planos Simple, Middle ou Master via Asaas.',
   'O suporte contínuo da CullenTech acompanha sua barbearia durante e após o período de testes.', 1),
  ('billing', 'O que acontece se uma fatura atrasar?',
   'Em caso de inadimplência, a barbearia entra em período de tolerância operacional. Os dados e históricos nunca são apagados imediatamente. É possível negociar acordo de parcelamento diretamente com nossa equipe.',
   'Oferecemos opções de reativação assistida por acordo comercial com carência negociada.', 2),
  ('agenda', 'Por que os agendamentos usam intervalos de 10 minutos?',
   'O sistema adota passos de 10 minutos para otimizar a grade de horários, evitar buracos na agenda e maximizar o faturamento diário dos profissionais.',
   'Configuração padrão da plataforma com alta aderência ao fluxo de barbearias paulistanas.', 1),
  ('agenda', 'Com quanto tempo de antecedência o cliente pode reagendar?',
   'A política de segurança exige no mínimo 2 horas de antecedência para remarcação online pelo cliente, prevenindo horários ociosos de última hora.',
   null, 2),
  ('team', 'Como convidar um profissional para a equipe?',
   'Acesse Painel > Equipe > Convidar Profissional. O convite gera um link seguro válido por 7 dias. O profissional entra com Google ou e-mail seguro.',
   null, 1),
  ('commercial', 'Qual é o SLA do suporte contínuo CullenTech?',
   'Todo chamado de suporte aberto por proprietário ou gestor recebe confirmação imediata, responsável atribuído e primeira resposta em até 1 dia útil.',
   'Garantia contratual de acompanhamento operacional humano e dedicado.', 1),
  ('system', 'Como alterar a foto de capa e contatos da barbearia?',
   'Acesse Painel > Mais > Dados da Barbearia para atualizar WhatsApp, endereço no mapa, telefone fixo e fazer upload da foto de capa (JPG/PNG até 5MB).',
   null, 1)
on conflict do nothing;

-- ============================================================================
-- 2. Tabelas de Chamados e Mensagens de Suporte
-- ============================================================================

create table if not exists public.platform_support_tickets (
  id uuid primary key default extensions.gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_by_role text not null check (created_by_role in ('owner', 'manager')),
  category_id text not null references public.platform_faq_categories(id),
  subject text not null check (char_length(trim(subject)) >= 5),
  description text not null check (char_length(trim(description)) >= 10),
  faq_consulted boolean not null default true,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')),
  assigned_to uuid references auth.users(id),
  first_response_due_at timestamptz not null default (now() + interval '1 day'),
  first_responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_support_tickets_barbershop_idx
  on public.platform_support_tickets (barbershop_id, status, created_at desc);

create index if not exists platform_support_tickets_status_sla_idx
  on public.platform_support_tickets (status, first_response_due_at asc);

create table if not exists public.platform_support_ticket_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  ticket_id uuid not null references public.platform_support_tickets(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  sender_type text not null check (sender_type in ('tenant', 'platform')),
  message text not null check (char_length(trim(message)) >= 2),
  created_at timestamptz not null default now()
);

create index if not exists platform_support_ticket_messages_ticket_idx
  on public.platform_support_ticket_messages (ticket_id, created_at asc);

alter table public.platform_support_tickets enable row level security;
alter table public.platform_support_ticket_messages enable row level security;

revoke all on table public.platform_support_tickets from public, anon;
revoke all on table public.platform_support_ticket_messages from public, anon;

grant select, insert, update on table public.platform_support_tickets to authenticated;
grant select, insert on table public.platform_support_ticket_messages to authenticated;

-- Políticas de RLS em platform_support_tickets
drop policy if exists "Platform owner or tenant staff can read support tickets" on public.platform_support_tickets;
create policy "Platform owner or tenant staff can read support tickets"
  on public.platform_support_tickets for select
  to authenticated
  using (
    private.is_active_platform_owner()
    or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
  );

-- Políticas de RLS em platform_support_ticket_messages
drop policy if exists "Platform owner or tenant staff can read ticket messages" on public.platform_support_ticket_messages;
create policy "Platform owner or tenant staff can read ticket messages"
  on public.platform_support_ticket_messages for select
  to authenticated
  using (
    private.is_active_platform_owner()
    or exists (
      select 1 from public.platform_support_tickets t
      where t.id = ticket_id
        and private.current_barbershop_role(t.barbershop_id) in ('owner', 'manager')
    )
  );

-- ============================================================================
-- 3. RPCs Protegidas para Abertura, Mensagens e Gestão de Chamados
-- ============================================================================

-- RPC para abertura de chamado pelo proprietário ou gestor
create or replace function public.create_platform_support_ticket(
  p_barbershop_id uuid,
  p_category_id text,
  p_subject text,
  p_description text,
  p_priority text default 'normal'
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
  v_ticket_id uuid;
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
    faq_consulted
  ) values (
    p_barbershop_id,
    (select auth.uid()),
    v_role,
    p_category_id,
    v_normalized_subject,
    v_normalized_desc,
    v_priority,
    'open',
    now() + interval '1 day',
    true
  )
  returning id into v_ticket_id;

  -- Insere a mensagem inicial no histórico do chamado
  insert into public.platform_support_ticket_messages (
    ticket_id,
    sender_user_id,
    sender_type,
    message
  ) values (
    v_ticket_id,
    (select auth.uid()),
    'tenant',
    v_normalized_desc
  );

  -- Registra auditoria na plataforma
  perform private.write_platform_audit_event(
    p_barbershop_id,
    'support_ticket_opened',
    1,
    jsonb_build_object(
      'ticket_id', v_ticket_id,
      'category_id', p_category_id,
      'subject', v_normalized_subject,
      'priority', v_priority,
      'created_by_role', v_role
    )
  );

  return v_ticket_id;
end;
$$;

revoke all on function public.create_platform_support_ticket(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_platform_support_ticket(uuid, text, text, text, text) to authenticated;

-- RPC para responder ao chamado (suporta platform_owner e tenant staff)
create or replace function public.reply_platform_support_ticket(
  p_ticket_id uuid,
  p_message text
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
  v_sender_type text;
  v_message_id uuid;
  v_is_platform boolean;
begin
  select * into v_ticket
  from public.platform_support_tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Chamado de suporte não encontrado.';
  end if;

  v_clean_message := trim(coalesce(p_message, ''));
  if char_length(v_clean_message) < 2 then
    raise exception 'Mensagem deve ter pelo menos 2 caracteres.';
  end if;

  v_is_platform := private.is_active_platform_owner();

  if v_is_platform then
    v_sender_type := 'platform';
    update public.platform_support_tickets
    set
      status = case when status in ('open', 'in_progress') then 'waiting_client' else status end,
      first_responded_at = coalesce(first_responded_at, now()),
      assigned_to = coalesce(assigned_to, (select auth.uid())),
      updated_at = now()
    where id = p_ticket_id;
  elsif private.current_barbershop_role(v_ticket.barbershop_id) in ('owner', 'manager') then
    v_sender_type := 'tenant';
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
    message
  ) values (
    p_ticket_id,
    (select auth.uid()),
    v_sender_type,
    v_clean_message
  )
  returning id into v_message_id;

  perform private.write_platform_audit_event(
    v_ticket.barbershop_id,
    'support_ticket_replied',
    1,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'sender_type', v_sender_type
    )
  );

  return v_message_id;
end;
$$;

revoke all on function public.reply_platform_support_ticket(uuid, text) from public, anon, authenticated;
grant execute on function public.reply_platform_support_ticket(uuid, text) to authenticated;

-- RPC para alteração de status e atribuição de responsável
create or replace function public.update_platform_support_ticket_status(
  p_ticket_id uuid,
  p_status text,
  p_assigned_to uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_ticket record;
  v_clean_status text;
  v_is_platform boolean;
begin
  select * into v_ticket
  from public.platform_support_tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Chamado de suporte não encontrado.';
  end if;

  v_clean_status := lower(trim(coalesce(p_status, '')));
  if v_clean_status not in ('open', 'in_progress', 'waiting_client', 'resolved', 'closed') then
    raise exception 'Status de chamado inválido.';
  end if;

  v_is_platform := private.is_active_platform_owner();

  if not v_is_platform then
    if private.current_barbershop_role(v_ticket.barbershop_id) in ('owner', 'manager') then
      if v_clean_status not in ('resolved', 'closed') then
        raise exception 'A barbearia só pode marcar o chamado como resolvido ou encerrado.';
      end if;
    else
      raise exception 'Acesso não autorizado.';
    end if;
  end if;

  update public.platform_support_tickets
  set
    status = v_clean_status,
    assigned_to = case when v_is_platform and p_assigned_to is not null then p_assigned_to else assigned_to end,
    resolved_at = case when v_clean_status = 'resolved' and resolved_at is null then now() else resolved_at end,
    updated_at = now()
  where id = p_ticket_id;

  perform private.write_platform_audit_event(
    v_ticket.barbershop_id,
    'support_ticket_status_changed',
    1,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'new_status', v_clean_status
    )
  );
end;
$$;

revoke all on function public.update_platform_support_ticket_status(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.update_platform_support_ticket_status(uuid, text, uuid) to authenticated;

-- RPC para listagem dos chamados de uma barbearia
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
begin
  if not (
    private.is_active_platform_owner()
    or private.current_barbershop_role(p_barbershop_id) in ('owner', 'manager')
  ) then
    raise exception 'Acesso não autorizado.';
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
    t.first_response_due_at,
    t.first_responded_at,
    t.resolved_at,
    t.created_at,
    t.updated_at,
    (select count(*) from public.platform_support_ticket_messages m where m.ticket_id = t.id) as message_count
  from public.platform_support_tickets t
  left join public.platform_faq_categories c on c.id = t.category_id
  where t.barbershop_id = p_barbershop_id
  order by t.created_at desc;
end;
$$;

revoke all on function public.list_barbershop_support_tickets(uuid) from public, anon, authenticated;
grant execute on function public.list_barbershop_support_tickets(uuid) to authenticated;

-- RPC para listagem global de chamados pela CullenTech
create or replace function public.list_all_platform_support_tickets(
  p_status text default null,
  p_barbershop_id uuid default null
)
returns table(
  id uuid,
  barbershop_id uuid,
  barbershop_name text,
  barbershop_slug text,
  category_id text,
  category_title text,
  subject text,
  description text,
  priority text,
  status text,
  created_by_role text,
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
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  return query
  select
    t.id,
    t.barbershop_id,
    b.name as barbershop_name,
    b.slug as barbershop_slug,
    t.category_id,
    c.title as category_title,
    t.subject,
    t.description,
    t.priority,
    t.status,
    t.created_by_role,
    t.first_response_due_at,
    t.first_responded_at,
    t.resolved_at,
    t.created_at,
    t.updated_at,
    (select count(*) from public.platform_support_ticket_messages m where m.ticket_id = t.id) as message_count
  from public.platform_support_tickets t
  join public.barbershops b on b.id = t.barbershop_id
  left join public.platform_faq_categories c on c.id = t.category_id
  where (p_status is null or t.status = p_status)
    and (p_barbershop_id is null or t.barbershop_id = p_barbershop_id)
  order by t.created_at desc;
end;
$$;

revoke all on function public.list_all_platform_support_tickets(text, uuid) from public, anon, authenticated;
grant execute on function public.list_all_platform_support_tickets(text, uuid) to authenticated;
