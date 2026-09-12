-- A new invitation must replace every still-valid link for the same professional.
-- The raw token remains return-only and is never persisted.
create or replace function public.create_team_invitation(
  p_barbershop_id uuid,
  p_email text,
  p_role text,
  p_professional_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_email text;
  v_raw_token text;
  v_token_hash text;
  v_prof_barbershop_id uuid;
  v_prof_active boolean;
  v_already_active boolean;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_caller_role := private.current_barbershop_role(p_barbershop_id);
  if v_caller_role is null or v_caller_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para criar convite nesta barbearia.';
  end if;
  if v_caller_role = 'manager' and p_role <> 'barber' then
    raise exception 'Gerentes só podem convidar barbeiros.';
  end if;
  if p_role not in ('manager', 'barber') then
    raise exception 'Papel de convite inválido.';
  end if;

  v_email := lower(trim(p_email));
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Endereço de e-mail inválido.';
  end if;

  if p_role = 'barber' then
    if p_professional_id is null then
      raise exception 'Convite para barbeiro exige um profissional vinculado.';
    end if;
    select barbershop_id, active into v_prof_barbershop_id, v_prof_active
    from public.professionals where id = p_professional_id;
    if v_prof_barbershop_id is null or v_prof_barbershop_id <> p_barbershop_id then
      raise exception 'O profissional deve pertencer a esta barbearia.';
    end if;
    if not v_prof_active then
      raise exception 'O profissional selecionado não está ativo.';
    end if;
    select exists (
      select 1 from public.team_members
      where professional_id = p_professional_id and status = 'active'
    ) into v_already_active;
    if v_already_active then
      raise exception 'Este profissional já possui um membro de equipe ativo vinculado.';
    end if;
  elsif p_professional_id is not null then
    raise exception 'Convite para gerente não deve possuir profissional vinculado.';
  end if;

  update public.team_invitations
  set status = 'revoked', revoked_by = v_caller_id, revoked_at = now()
  where barbershop_id = p_barbershop_id
    and (
      (p_role = 'barber' and professional_id = p_professional_id and status = 'pending')
      or (p_role = 'manager' and email_normalized = v_email and role = p_role and status = 'pending')
    );

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_raw_token::bytea, 'sha256'), 'hex');
  insert into public.team_invitations (
    barbershop_id, email_normalized, role, professional_id, token_hash, expires_at, status, created_by
  ) values (
    p_barbershop_id, v_email, p_role, p_professional_id, v_token_hash, now() + interval '7 days', 'pending', v_caller_id
  );
  insert into public.audit_logs (barbershop_id, actor_user_id, action, entity_type, metadata)
  values (
    p_barbershop_id, v_caller_id, 'create_team_invitation', 'team_invitation',
    jsonb_build_object('email', v_email, 'role', p_role, 'professional_id', p_professional_id)
  );
  return v_raw_token;
end;
$$;

revoke all on function public.create_team_invitation(uuid, text, text, uuid) from public, anon;
grant execute on function public.create_team_invitation(uuid, text, text, uuid) to authenticated;
