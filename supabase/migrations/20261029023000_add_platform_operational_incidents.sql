-- Gestão Operacional de Alertas e Incidentes da BarbeariaSP (EFS §24.10.7, §48.5.1).
-- Acesso restrito e exclusivo à equipe CullenTech (platform_owner).
-- Monitoramento de serviços essenciais: api, database, auth, storage, notifications, booking_gateway, cron_jobs.
-- Fluxo de reconhecimento, observações, atribuição de responsável e resolução com auditoria append-only.

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
    'support_ticket_status_changed',
    'incident_created',
    'incident_acknowledged',
    'incident_assigned',
    'incident_note_added',
    'incident_status_changed',
    'incident_resolved'
  ));

-- ============================================================================
-- 1. Tabelas de Incidentes e Notas Operacionais
-- ============================================================================

create table if not exists public.platform_operational_incidents (
  id uuid primary key default extensions.gen_random_uuid(),
  service_name text not null check (service_name in ('api', 'database', 'auth', 'storage', 'notifications', 'booking_gateway', 'cron_jobs')),
  severity text not null default 'medium' check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'investigating', 'resolved', 'closed')),
  title text not null check (char_length(trim(title)) >= 5),
  description text not null check (char_length(trim(description)) >= 10),
  barbershop_id uuid references public.barbershops(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  assigned_to uuid references auth.users(id),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_operational_incidents_status_severity_idx
  on public.platform_operational_incidents (status, severity, created_at desc);

create index if not exists platform_operational_incidents_service_idx
  on public.platform_operational_incidents (service_name, created_at desc);

create table if not exists public.platform_operational_incident_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  incident_id uuid not null references public.platform_operational_incidents(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  note text not null check (char_length(trim(note)) >= 2),
  created_at timestamptz not null default now()
);

create index if not exists platform_operational_incident_notes_incident_idx
  on public.platform_operational_incident_notes (incident_id, created_at asc);

alter table public.platform_operational_incidents enable row level security;
alter table public.platform_operational_incident_notes enable row level security;

revoke all on table public.platform_operational_incidents from public, anon;
revoke all on table public.platform_operational_incident_notes from public, anon;

grant select on table public.platform_operational_incidents to authenticated;
grant select on table public.platform_operational_incident_notes to authenticated;

drop policy if exists "Platform owner can read incidents" on public.platform_operational_incidents;
create policy "Platform owner can read incidents"
  on public.platform_operational_incidents for select
  to authenticated
  using (private.is_active_platform_owner());

drop policy if exists "Platform owner can read incident notes" on public.platform_operational_incident_notes;
create policy "Platform owner can read incident notes"
  on public.platform_operational_incident_notes for select
  to authenticated
  using (private.is_active_platform_owner());

-- ============================================================================
-- 2. Seed Inicial de Alertas e Incidentes Operacionais
-- ============================================================================

insert into public.platform_operational_incidents (
  service_name, severity, status, title, description, metadata
) values
  (
    'booking_gateway',
    'high',
    'open',
    'Pico de requisições com taxa elevada no gateway público',
    'Detectado aumento de 35% nas requisições do gateway público com 429 acionados por proteção anti-abuso.',
    '{"threshold": 100, "window_seconds": 60, "blocked_requests": 14}'::jsonb
  ),
  (
    'notifications',
    'medium',
    'acknowledged',
    'Retentativas na fila de e-mails para provedor externo',
    'Três e-mails de confirmação entraram em retry automático após indisponibilidade temporária de DNS.',
    '{"affected_deliveries": 3, "provider": "Resend", "error_code": "ETIMEDOUT"}'::jsonb
  ),
  (
    'database',
    'info',
    'resolved',
    'Execução rotineira da limpeza de outbox e retenção',
    'Job cron executado sem bloqueios com zero registros expirados eliminados.',
    '{"records_purged": 0, "duration_ms": 42}'::jsonb
  )
on conflict do nothing;

-- ============================================================================
-- 3. RPCs Protegidas para Gestão de Alertas e Incidentes
-- ============================================================================

-- Listagem de incidentes com filtros
create or replace function public.list_platform_operational_incidents(
  p_status text default null,
  p_service_name text default null,
  p_severity text default null
)
returns table(
  id uuid,
  service_name text,
  severity text,
  status text,
  title text,
  description text,
  barbershop_id uuid,
  barbershop_name text,
  barbershop_slug text,
  metadata jsonb,
  assigned_to uuid,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  notes_count bigint
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
    i.id,
    i.service_name,
    i.severity,
    i.status,
    i.title,
    i.description,
    i.barbershop_id,
    b.name as barbershop_name,
    b.slug as barbershop_slug,
    i.metadata,
    i.assigned_to,
    i.acknowledged_at,
    i.acknowledged_by,
    i.resolved_at,
    i.resolved_by,
    i.created_at,
    i.updated_at,
    (select count(*) from public.platform_operational_incident_notes n where n.incident_id = i.id) as notes_count
  from public.platform_operational_incidents i
  left join public.barbershops b on b.id = i.barbershop_id
  where (p_status is null or i.status = p_status)
    and (p_service_name is null or i.service_name = p_service_name)
    and (p_severity is null or i.severity = p_severity)
  order by
    case i.severity
      when 'critical' then 1
      when 'high' then 2
      when 'medium' then 3
      when 'low' then 4
      else 5
    end asc,
    i.created_at desc;
end;
$$;

revoke all on function public.list_platform_operational_incidents(text, text, text) from public, anon, authenticated;
grant execute on function public.list_platform_operational_incidents(text, text, text) to authenticated;

-- Detalhes de um incidente específico
create or replace function public.get_platform_operational_incident_detail(p_incident_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_incident record;
  v_notes jsonb;
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  select
    i.*,
    b.name as barbershop_name,
    b.slug as barbershop_slug
  into v_incident
  from public.platform_operational_incidents i
  left join public.barbershops b on b.id = i.barbershop_id
  where i.id = p_incident_id;

  if v_incident.id is null then
    raise exception 'Incidente não encontrado.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', n.id,
      'author_user_id', n.author_user_id,
      'note', n.note,
      'created_at', n.created_at
    ) order by n.created_at asc
  ), '[]'::jsonb)
  into v_notes
  from public.platform_operational_incident_notes n
  where n.incident_id = p_incident_id;

  return jsonb_build_object(
    'id', v_incident.id,
    'service_name', v_incident.service_name,
    'severity', v_incident.severity,
    'status', v_incident.status,
    'title', v_incident.title,
    'description', v_incident.description,
    'barbershop_id', v_incident.barbershop_id,
    'barbershop_name', v_incident.barbershop_name,
    'barbershop_slug', v_incident.barbershop_slug,
    'metadata', v_incident.metadata,
    'assigned_to', v_incident.assigned_to,
    'acknowledged_at', v_incident.acknowledged_at,
    'acknowledged_by', v_incident.acknowledged_by,
    'resolved_at', v_incident.resolved_at,
    'resolved_by', v_incident.resolved_by,
    'created_at', v_incident.created_at,
    'updated_at', v_incident.updated_at,
    'notes', v_notes
  );
end;
$$;

revoke all on function public.get_platform_operational_incident_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_platform_operational_incident_detail(uuid) to authenticated;

-- Criação manual de incidente
create or replace function public.create_platform_operational_incident(
  p_service_name text,
  p_severity text,
  p_title text,
  p_description text,
  p_barbershop_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_clean_service text;
  v_clean_severity text;
  v_clean_title text;
  v_clean_desc text;
  v_incident_id uuid;
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  v_clean_service := lower(trim(coalesce(p_service_name, '')));
  if v_clean_service not in ('api', 'database', 'auth', 'storage', 'notifications', 'booking_gateway', 'cron_jobs') then
    raise exception 'Serviço monitorado inválido.';
  end if;

  v_clean_severity := lower(trim(coalesce(p_severity, 'medium')));
  if v_clean_severity not in ('info', 'low', 'medium', 'high', 'critical') then
    raise exception 'Severidade inválida.';
  end if;

  v_clean_title := trim(coalesce(p_title, ''));
  if char_length(v_clean_title) < 5 then
    raise exception 'Título do incidente deve ter pelo menos 5 caracteres.';
  end if;

  v_clean_desc := trim(coalesce(p_description, ''));
  if char_length(v_clean_desc) < 10 then
    raise exception 'Descrição do incidente deve ter pelo menos 10 caracteres.';
  end if;

  insert into public.platform_operational_incidents (
    service_name, severity, title, description, barbershop_id, metadata, status
  ) values (
    v_clean_service, v_clean_severity, v_clean_title, v_clean_desc, p_barbershop_id, coalesce(p_metadata, '{}'::jsonb), 'open'
  )
  returning id into v_incident_id;

  perform private.write_platform_audit_event(
    p_barbershop_id,
    'incident_created',
    1,
    jsonb_build_object(
      'incident_id', v_incident_id,
      'service_name', v_clean_service,
      'severity', v_clean_severity,
      'title', v_clean_title
    )
  );

  return v_incident_id;
end;
$$;

revoke all on function public.create_platform_operational_incident(text, text, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_platform_operational_incident(text, text, text, text, uuid, jsonb) to authenticated;

-- Reconhecimento de incidente
create or replace function public.acknowledge_platform_operational_incident(p_incident_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_incident record;
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  select * into v_incident
  from public.platform_operational_incidents
  where id = p_incident_id;

  if v_incident.id is null then
    raise exception 'Incidente não encontrado.';
  end if;

  update public.platform_operational_incidents
  set
    acknowledged_at = coalesce(acknowledged_at, now()),
    acknowledged_by = coalesce(acknowledged_by, (select auth.uid())),
    status = case when status = 'open' then 'acknowledged' else status end,
    updated_at = now()
  where id = p_incident_id;

  perform private.write_platform_audit_event(
    v_incident.barbershop_id,
    'incident_acknowledged',
    1,
    jsonb_build_object(
      'incident_id', p_incident_id,
      'service_name', v_incident.service_name,
      'severity', v_incident.severity
    )
  );
end;
$$;

revoke all on function public.acknowledge_platform_operational_incident(uuid) from public, anon, authenticated;
grant execute on function public.acknowledge_platform_operational_incident(uuid) to authenticated;

-- Atribuição de responsável ao incidente
create or replace function public.assign_platform_operational_incident(
  p_incident_id uuid,
  p_assigned_to uuid
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_incident record;
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  select * into v_incident
  from public.platform_operational_incidents
  where id = p_incident_id;

  if v_incident.id is null then
    raise exception 'Incidente não encontrado.';
  end if;

  update public.platform_operational_incidents
  set
    assigned_to = p_assigned_to,
    status = case when status in ('open', 'acknowledged') then 'investigating' else status end,
    updated_at = now()
  where id = p_incident_id;

  perform private.write_platform_audit_event(
    v_incident.barbershop_id,
    'incident_assigned',
    1,
    jsonb_build_object(
      'incident_id', p_incident_id,
      'assigned_to', p_assigned_to
    )
  );
end;
$$;

revoke all on function public.assign_platform_operational_incident(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_platform_operational_incident(uuid, uuid) to authenticated;

-- Adição de nota/observação operacional
create or replace function public.add_platform_operational_incident_note(
  p_incident_id uuid,
  p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_incident record;
  v_clean_note text;
  v_note_id uuid;
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  select * into v_incident
  from public.platform_operational_incidents
  where id = p_incident_id;

  if v_incident.id is null then
    raise exception 'Incidente não encontrado.';
  end if;

  v_clean_note := trim(coalesce(p_note, ''));
  if char_length(v_clean_note) < 2 then
    raise exception 'Observação deve ter pelo menos 2 caracteres.';
  end if;

  insert into public.platform_operational_incident_notes (
    incident_id, author_user_id, note
  ) values (
    p_incident_id, (select auth.uid()), v_clean_note
  )
  returning id into v_note_id;

  update public.platform_operational_incidents
  set updated_at = now()
  where id = p_incident_id;

  perform private.write_platform_audit_event(
    v_incident.barbershop_id,
    'incident_note_added',
    1,
    jsonb_build_object(
      'incident_id', p_incident_id,
      'note_id', v_note_id
    )
  );

  return v_note_id;
end;
$$;

revoke all on function public.add_platform_operational_incident_note(uuid, text) from public, anon, authenticated;
grant execute on function public.add_platform_operational_incident_note(uuid, text) to authenticated;

-- Resolução de incidente
create or replace function public.resolve_platform_operational_incident(
  p_incident_id uuid,
  p_resolution_note text default null
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_incident record;
  v_clean_note text;
begin
  if not private.is_active_platform_owner() then
    raise exception 'Acesso interno não autorizado';
  end if;

  select * into v_incident
  from public.platform_operational_incidents
  where id = p_incident_id;

  if v_incident.id is null then
    raise exception 'Incidente não encontrado.';
  end if;

  update public.platform_operational_incidents
  set
    status = 'resolved',
    resolved_at = coalesce(resolved_at, now()),
    resolved_by = coalesce(resolved_by, (select auth.uid())),
    updated_at = now()
  where id = p_incident_id;

  v_clean_note := trim(coalesce(p_resolution_note, ''));
  if char_length(v_clean_note) >= 2 then
    insert into public.platform_operational_incident_notes (
      incident_id, author_user_id, note
    ) values (
      p_incident_id, (select auth.uid()), v_clean_note
    );
  end if;

  perform private.write_platform_audit_event(
    v_incident.barbershop_id,
    'incident_resolved',
    1,
    jsonb_build_object(
      'incident_id', p_incident_id,
      'service_name', v_incident.service_name,
      'severity', v_incident.severity
    )
  );
end;
$$;

revoke all on function public.resolve_platform_operational_incident(uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_platform_operational_incident(uuid, text) to authenticated;
