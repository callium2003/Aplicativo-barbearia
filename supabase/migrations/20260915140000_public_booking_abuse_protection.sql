-- Public booking protection: preserve the 10-minute slot contract while
-- centralising unauthenticated reads behind the Edge gateway.

create or replace function public.create_team_invitation(
  p_barbershop_id uuid, p_email text, p_role text, p_professional_id uuid default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_caller_id uuid := auth.uid(); v_caller_role text; v_email text;
  v_raw_token text; v_token_hash text; v_prof_barbershop_id uuid;
  v_prof_active boolean; v_already_active boolean;
begin
  if v_caller_id is null then raise exception 'Usuário não autenticado.'; end if;
  v_caller_role := private.current_barbershop_role(p_barbershop_id);
  if v_caller_role is null or v_caller_role not in ('owner','manager') then raise exception 'Sem permissão para criar convite nesta barbearia.'; end if;
  if v_caller_role = 'manager' and p_role <> 'barber' then raise exception 'Gerentes só podem convidar barbeiros.'; end if;
  if p_role not in ('manager','barber') then raise exception 'Papel de convite inválido.'; end if;
  v_email := lower(trim(p_email));
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Endereço de e-mail inválido.'; end if;
  if p_role = 'barber' then
    if p_professional_id is null then raise exception 'Convite para barbeiro exige um profissional vinculado.'; end if;
    select barbershop_id, active into v_prof_barbershop_id, v_prof_active from public.professionals where id = p_professional_id;
    if v_prof_barbershop_id is null or v_prof_barbershop_id <> p_barbershop_id then raise exception 'O profissional deve pertencer a esta barbearia.'; end if;
    if not v_prof_active then raise exception 'O profissional selecionado não está ativo.'; end if;
    select exists (select 1 from public.team_members where professional_id=p_professional_id and status='active') into v_already_active;
    if v_already_active then raise exception 'Este profissional já possui um membro de equipe ativo vinculado.'; end if;
  elsif p_professional_id is not null then raise exception 'Convite para gerente não deve possuir profissional vinculado.'; end if;
  update public.team_invitations set status='revoked', revoked_by=v_caller_id, revoked_at=now()
  where barbershop_id=p_barbershop_id and ((p_role='barber' and professional_id=p_professional_id and status='pending') or (p_role='manager' and email_normalized=v_email and role=p_role and status='pending'));
  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex'); v_token_hash := encode(extensions.digest(v_raw_token::bytea,'sha256'),'hex');
  insert into public.team_invitations (barbershop_id,email_normalized,role,professional_id,token_hash,expires_at,status,created_by)
  values (p_barbershop_id,v_email,p_role,p_professional_id,v_token_hash,now() + interval '2 days','pending',v_caller_id);
  insert into public.audit_logs (barbershop_id,actor_user_id,action,entity_type,metadata) values (p_barbershop_id,v_caller_id,'create_team_invitation','team_invitation',jsonb_build_object('email',v_email,'role',p_role,'professional_id',p_professional_id));
  return v_raw_token;
end; $$;

create or replace function public.get_public_monthly_availability(p_slug text, p_start_date date, p_service_ids uuid[])
returns table(available_date date) language sql stable security definer set search_path = '' as $$
  select day::date
  from generate_series(
    greatest(p_start_date, (now() at time zone 'America/Sao_Paulo')::date),
    least(p_start_date + 41, (now() at time zone 'America/Sao_Paulo')::date + 90),
    interval '1 day'
  ) as day
  where exists (select 1 from public.get_public_availability(p_slug, day::date, p_service_ids));
$$;

create table if not exists public.public_request_rate_limits (
  bucket_start timestamptz not null,
  action text not null check (action in ('invitation','booking_status','availability','monthly_availability','booking')),
  origin_hash text not null,
  subject_hash text not null default '',
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (bucket_start, action, origin_hash, subject_hash)
);
alter table public.public_request_rate_limits enable row level security;
revoke all on table public.public_request_rate_limits from public, anon, authenticated;
grant select, insert, update on table public.public_request_rate_limits to service_role;

create or replace function public.consume_public_request_rate_limit(p_action text, p_origin_hash text, p_subject_hash text, p_window_seconds integer, p_limit integer)
returns table(allowed boolean, remaining integer) language plpgsql security definer set search_path = '' as $$
declare v_bucket timestamptz; v_count integer;
begin
  if p_action not in ('invitation','booking_status','availability','monthly_availability','booking') or p_window_seconds not in (60,900) or p_limit < 1 or p_limit > 60 or length(p_origin_hash) <> 64 or length(p_subject_hash) > 128 then
    raise exception 'Parâmetros de limite inválidos.';
  end if;
  v_bucket := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.public_request_rate_limits as r (bucket_start,action,origin_hash,subject_hash)
  values (v_bucket,p_action,p_origin_hash,coalesce(p_subject_hash,''))
  on conflict (bucket_start,action,origin_hash,subject_hash) do update
  set request_count = case when r.request_count < p_limit then r.request_count + 1 else r.request_count end, updated_at=now()
  returning request_count into v_count;
  return query select v_count <= p_limit, greatest(p_limit-v_count,0);
end; $$;

revoke all on function public.consume_public_request_rate_limit(text,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_public_request_rate_limit(text,text,text,integer,integer) to service_role;

revoke all on function public.get_public_availability(text, date, uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_availability(text, date, uuid[]) to service_role;
revoke all on function public.get_public_monthly_availability(text, date, uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_monthly_availability(text, date, uuid[]) to service_role;
revoke all on function public.get_public_booking_availability(text) from public, anon, authenticated;
grant execute on function public.get_public_booking_availability(text) to service_role;
revoke all on function public.get_public_booking_status(text) from public, anon, authenticated;
grant execute on function public.get_public_booking_status(text) to service_role;
revoke all on function public.get_invitation_details(text) from public, anon, authenticated;
grant execute on function public.get_invitation_details(text) to service_role;
