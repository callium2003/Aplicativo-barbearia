-- Endurecimento de Segurança, RLS e Auditoria do Sentinela Operacional (EFS §24.10.7, §48.5.1).
-- 1. Suporte a atores de sistema e eventos globais da plataforma em private.platform_audit_events.
-- 2. Habilitação de RLS e restrição de privilégios em private.platform_service_probe_states.
-- 3. Identificação confiável de chamadores internos (service_role) e platform_owner em funções SECURITY DEFINER.
-- 4. Status inicial neutro 'unknown' para evitar falso positivo de saúde sem medição prévia.
-- 5. Tratamento de incidentes encerrados externamente para preservar consistência do ciclo autônomo.

-- ============================================================================
-- 1. Ajuste em Auditoria de Plataforma para Atores de Sistema e Eventos Globais
-- ============================================================================

alter table private.platform_audit_events
  alter column actor_user_id drop not null;

alter table private.platform_audit_events
  alter column barbershop_id drop not null;

-- ============================================================================
-- 2. RLS e Privilégios em private.platform_service_probe_states
-- ============================================================================

alter table private.platform_service_probe_states enable row level security;

revoke all on table private.platform_service_probe_states from public, anon, authenticated;
grant select, insert, update on table private.platform_service_probe_states to service_role;

drop policy if exists "Service role and definer access only" on private.platform_service_probe_states;
create policy "Service role and definer access only"
  on private.platform_service_probe_states
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 3. Status 'unknown' e Prevenção de Falso Saudável sem Medição
-- ============================================================================

do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'private.platform_service_probe_states'::regclass
      and contype = 'c'
      and conname like '%status%'
  ) loop
    execute 'alter table private.platform_service_probe_states drop constraint ' || quote_ident(r.conname);
  end loop;
end;
$$;

alter table private.platform_service_probe_states
  add constraint platform_service_probe_states_last_status_check
  check (last_status in ('healthy', 'degraded', 'down', 'unknown'));

alter table private.platform_service_probe_states
  alter column last_status set default 'unknown';

-- Serviços sem medição real são normalizados para 'unknown'
update private.platform_service_probe_states
set last_status = 'unknown',
    last_latency_ms = null
where consecutive_failures = 0 and consecutive_successes = 0 and current_incident_id is null;

-- ============================================================================
-- 4. Função Determinística de Verificação de service_role
-- ============================================================================

create or replace function private.is_service_role()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select (
    -- PostgREST JWT claim ou GUC verificado de papel
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
    or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    -- Conexão direta de banco ou psql (SET LOCAL ROLE service_role ou superuser postgres)
    or (
      case
        when nullif(current_setting('role', true), '') is not null and current_setting('role', true) <> 'none'
          then current_setting('role', true) = 'service_role'
        when session_user in ('service_role', 'postgres')
          then true
        else false
      end
    )
  );
$$;

revoke all on function private.is_service_role() from public, anon, authenticated;
grant execute on function private.is_service_role() to service_role, authenticated;

-- ============================================================================
-- 5. RPC: Registro de Sondagem Atualizada com Segurança e Consistência
-- ============================================================================

create or replace function public.record_service_sentinel_probe(
  p_service_name text,
  p_is_healthy boolean,
  p_latency_ms integer default null,
  p_error text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_clean_service text;
  v_probe_state private.platform_service_probe_states%rowtype;
  v_service_friendly_name text;
  v_calculated_severity text;
  v_new_failures integer;
  v_new_successes integer;
  v_new_status text;
  v_current_incident_id uuid;
  v_action_taken text := 'none';
  v_new_incident_id uuid;
  v_incident_title text;
  v_incident_desc text;
begin
  -- Autorização confiável: apenas service_role verificado ou platform_owner ativo autenticado
  if not (private.is_service_role() or private.is_active_platform_owner()) then
    raise exception 'Acesso não autorizado ao Sentinela Operacional.';
  end if;

  v_clean_service := lower(trim(coalesce(p_service_name, '')));
  if v_clean_service not in ('api', 'database', 'auth', 'storage', 'notifications', 'booking_gateway', 'cron_jobs') then
    raise exception 'Serviço monitorado inválido para o Sentinela: %', p_service_name;
  end if;

  -- Nomes amigáveis e severidades canônicas
  case v_clean_service
    when 'database' then
      v_service_friendly_name := 'Banco de Dados Postgres';
      v_calculated_severity := 'critical';
    when 'auth' then
      v_service_friendly_name := 'Autenticação GoTrue';
      v_calculated_severity := 'critical';
    when 'api' then
      v_service_friendly_name := 'API Principal Next.js';
      v_calculated_severity := 'high';
    when 'booking_gateway' then
      v_service_friendly_name := 'Gateway Público de Agendamento';
      v_calculated_severity := 'high';
    when 'notifications' then
      v_service_friendly_name := 'Fila de Notificações (Outbox)';
      v_calculated_severity := 'medium';
    when 'storage' then
      v_service_friendly_name := 'Armazenamento de Arquivos (Storage)';
      v_calculated_severity := 'medium';
    when 'cron_jobs' then
      v_service_friendly_name := 'Tarefas Agendadas (Cron)';
      v_calculated_severity := 'medium';
  end case;

  -- Bloqueio exclusivo por serviço para garantir concorrência segura sem corrida
  select * into v_probe_state
  from private.platform_service_probe_states
  where service_name = v_clean_service
  for update;

  if v_probe_state.service_name is null then
    insert into private.platform_service_probe_states (service_name)
    values (v_clean_service)
    returning * into v_probe_state;
  end if;

  v_current_incident_id := v_probe_state.current_incident_id;

  -- Se o incidente referenciado foi encerrado por operador humano, normaliza estado ativo
  if v_current_incident_id is not null then
    if not exists (
      select 1
      from public.platform_operational_incidents i
      where i.id = v_current_incident_id
        and i.status in ('open', 'acknowledged', 'investigating')
    ) then
      v_current_incident_id := null;
    end if;
  end if;

  if not p_is_healthy then
    v_new_failures := v_probe_state.consecutive_failures + 1;
    v_new_successes := 0;
    v_new_status := case when v_new_failures >= 3 then 'down' else 'degraded' end;

    -- Regra de Auto-abertura: 3 falhas consecutivas sem incidente aberto ativo
    if v_new_failures >= 3 and v_current_incident_id is null then
      v_incident_title := format('[Sentinela] Instabilidade no serviço %s', v_service_friendly_name);
      v_incident_desc := format(
        'O Sentinela Operacional detectou 3 falhas consecutivas de verificação no serviço %s. Último erro: %s',
        v_service_friendly_name,
        coalesce(nullif(trim(p_error), ''), 'Tempo limite de resposta ou falha de conectividade.')
      );

      insert into public.platform_operational_incidents (
        service_name,
        severity,
        status,
        title,
        description,
        metadata
      ) values (
        v_clean_service,
        v_calculated_severity,
        'open',
        v_incident_title,
        v_incident_desc,
        jsonb_build_object(
          'auto_created', true,
          'source', 'sentinel',
          'actor_type', 'system',
          'consecutive_failures', v_new_failures,
          'initial_error', p_error,
          'latency_ms', p_latency_ms
        ) || coalesce(p_metadata, '{}'::jsonb)
      )
      returning id into v_new_incident_id;

      v_current_incident_id := v_new_incident_id;
      v_action_taken := 'incident_opened';

      -- Auditoria de incidente criado pelo Sentinela (Sistema)
      perform private.write_platform_audit_event(
        null,
        'incident_created',
        1,
        jsonb_build_object(
          'incident_id', v_new_incident_id,
          'service_name', v_clean_service,
          'severity', v_calculated_severity,
          'source', 'sentinel',
          'actor_type', 'system',
          'auto_created', true
        )
      );
    end if;

    update private.platform_service_probe_states
    set
      consecutive_failures = v_new_failures,
      consecutive_successes = v_new_successes,
      current_incident_id = v_current_incident_id,
      last_checked_at = now(),
      last_status = v_new_status,
      last_error = left(coalesce(nullif(trim(p_error), ''), 'Falha desconhecida na sondagem.'), 1000),
      last_latency_ms = p_latency_ms,
      metadata = coalesce(p_metadata, '{}'::jsonb)
    where service_name = v_clean_service;

  else
    v_new_successes := v_probe_state.consecutive_successes + 1;
    v_new_failures := 0;
    v_new_status := 'healthy';

    -- Regra de Auto-resolução: 3 sucessos consecutivos com incidente aberto ativo
    if v_current_incident_id is not null and v_new_successes >= 3 then
      update public.platform_operational_incidents
      set
        status = 'resolved',
        resolved_at = coalesce(resolved_at, now()),
        updated_at = now()
      where id = v_current_incident_id
        and status in ('open', 'acknowledged', 'investigating');

      -- Inserção de nota de encerramento pelo Sentinela (Sistema)
      insert into public.platform_operational_incident_notes (
        incident_id,
        author_user_id,
        note
      ) values (
        v_current_incident_id,
        null,
        format(
          '[Sentinela] Conectividade e integridade do serviço %s revalidadas com sucesso por 3 ciclos consecutivos. Incidente auto-resolvido.',
          v_service_friendly_name
        )
      );

      -- Auditoria de incidente resolvido pelo Sentinela (Sistema)
      perform private.write_platform_audit_event(
        null,
        'incident_resolved',
        1,
        jsonb_build_object(
          'incident_id', v_current_incident_id,
          'service_name', v_clean_service,
          'source', 'sentinel',
          'actor_type', 'system',
          'auto_resolved', true
        )
      );

      v_action_taken := 'incident_resolved';
      v_current_incident_id := null;
    end if;

    update private.platform_service_probe_states
    set
      consecutive_failures = v_new_failures,
      consecutive_successes = v_new_successes,
      current_incident_id = v_current_incident_id,
      last_checked_at = now(),
      last_status = v_new_status,
      last_error = null,
      last_latency_ms = p_latency_ms,
      metadata = coalesce(p_metadata, '{}'::jsonb)
    where service_name = v_clean_service;

  end if;

  return jsonb_build_object(
    'service_name', v_clean_service,
    'is_healthy', p_is_healthy,
    'consecutive_failures', v_new_failures,
    'consecutive_successes', v_new_successes,
    'status', v_new_status,
    'action_taken', v_action_taken,
    'incident_id', coalesce(v_new_incident_id, v_probe_state.current_incident_id),
    'current_incident_id', v_current_incident_id
  );
end;
$$;

revoke all on function public.record_service_sentinel_probe(text, boolean, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_service_sentinel_probe(text, boolean, integer, text, jsonb) to service_role, authenticated;

-- ============================================================================
-- 6. RPC: Consulta do Panorama do Sentinela Atualizada
-- ============================================================================

create or replace function public.get_platform_sentinel_overview()
returns table(
  service_name text,
  last_status text,
  consecutive_failures integer,
  consecutive_successes integer,
  current_incident_id uuid,
  incident_title text,
  last_checked_at timestamptz,
  last_error text,
  last_latency_ms integer,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not (private.is_service_role() or private.is_active_platform_owner()) then
    raise exception 'Acesso não autorizado ao Sentinela Operacional.';
  end if;

  return query
  select
    s.service_name,
    s.last_status,
    s.consecutive_failures,
    s.consecutive_successes,
    case
      when i.id is not null and i.status in ('open', 'acknowledged', 'investigating')
        then s.current_incident_id
      else null
    end as current_incident_id,
    case
      when i.id is not null and i.status in ('open', 'acknowledged', 'investigating')
        then i.title
      else null
    end as incident_title,
    s.last_checked_at,
    s.last_error,
    s.last_latency_ms,
    s.metadata
  from private.platform_service_probe_states s
  left join public.platform_operational_incidents i on i.id = s.current_incident_id
  order by
    case s.last_status
      when 'down' then 1
      when 'degraded' then 2
      when 'unknown' then 3
      else 4
    end asc,
    s.service_name asc;
end;
$$;

revoke all on function public.get_platform_sentinel_overview() from public, anon, authenticated;
grant execute on function public.get_platform_sentinel_overview() to service_role, authenticated;

-- ============================================================================
-- 7. RPC: Ingestão de Webhooks Atualizada
-- ============================================================================

create or replace function public.ingest_platform_infra_webhook(
  p_provider text,
  p_service_name text,
  p_status text,
  p_title text,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_clean_provider text;
  v_clean_service text;
  v_clean_status text;
  v_clean_title text;
  v_clean_desc text;
  v_is_healthy boolean;
  v_probe_result jsonb;
begin
  if not (private.is_service_role() or private.is_active_platform_owner()) then
    raise exception 'Acesso não autorizado ao receptor de webhooks de infraestrutura.';
  end if;

  v_clean_provider := lower(trim(coalesce(p_provider, 'generic')));
  v_clean_service := lower(trim(coalesce(p_service_name, 'api')));
  v_clean_status := lower(trim(coalesce(p_status, 'healthy')));
  v_clean_title := trim(coalesce(p_title, ''));
  v_clean_desc := trim(coalesce(p_description, ''));

  if v_clean_service not in ('api', 'database', 'auth', 'storage', 'notifications', 'booking_gateway', 'cron_jobs') then
    raise exception 'Serviço informado pelo webhook inválido: %', p_service_name;
  end if;

  v_is_healthy := v_clean_status in ('healthy', 'resolved', 'operational', 'up');

  -- Delega para a rotina determinística de sondagem com metadados do provedor
  v_probe_result := public.record_service_sentinel_probe(
    v_clean_service,
    v_is_healthy,
    null,
    case when not v_is_healthy then v_clean_desc else null end,
    jsonb_build_object(
      'source', 'webhook',
      'provider', v_clean_provider,
      'webhook_status', v_clean_status,
      'webhook_title', v_clean_title
    ) || coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'provider', v_clean_provider,
    'service_name', v_clean_service,
    'probe_result', v_probe_result
  );
end;
$$;

revoke all on function public.ingest_platform_infra_webhook(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_platform_infra_webhook(text, text, text, text, text, jsonb) to service_role, authenticated;

