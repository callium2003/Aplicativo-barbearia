create or replace function public.mark_commission_period_paid(
  p_barbershop_id uuid,
  p_professional_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_paid_at timestamptz := now();
  v_appointment_count integer := 0;
  v_paid_amount numeric(12,2) := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_barbershop_id is null or p_professional_id is null then
    raise exception 'Barbearia e profissional são obrigatórios.';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Período inválido.';
  end if;

  if p_end_date - p_start_date > 366 then
    raise exception 'O período deve ter no máximo 367 dias.';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para quitar comissões desta barbearia.';
  end if;

  if not exists (
    select 1
    from public.professionals p
    where p.id = p_professional_id
      and p.barbershop_id = p_barbershop_id
  ) then
    raise exception 'Profissional não encontrado nesta barbearia.';
  end if;

  with paid_rows as (
    update public.appointment_commissions ac
    set payment_status = 'paid',
        paid_at = v_paid_at,
        paid_by = v_user_id,
        updated_at = v_paid_at
    where ac.barbershop_id = p_barbershop_id
      and ac.professional_id = p_professional_id
      and ac.payment_status = 'pending'
      and ac.appointment_starts_at >= (p_start_date::timestamp at time zone 'America/Sao_Paulo')
      and ac.appointment_starts_at < ((p_end_date + 1)::timestamp at time zone 'America/Sao_Paulo')
    returning ac.commission_amount
  )
  select count(*)::integer, coalesce(sum(commission_amount), 0)::numeric(12,2)
  into v_appointment_count, v_paid_amount
  from paid_rows;

  if v_appointment_count > 0 then
    insert into public.audit_logs (
      barbershop_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      p_barbershop_id,
      v_user_id,
      'mark_commission_period_paid',
      'professional_commission_period',
      p_professional_id,
      jsonb_build_object(
        'professional_id', p_professional_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'appointment_count', v_appointment_count,
        'paid_amount', v_paid_amount,
        'paid_at', v_paid_at
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'professional_id', p_professional_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'appointment_count', v_appointment_count,
    'paid_amount', v_paid_amount,
    'paid_at', case when v_appointment_count > 0 then v_paid_at else null end
  );
end;
$$;

revoke all on function public.mark_commission_period_paid(uuid, uuid, date, date) from public;
revoke all on function public.mark_commission_period_paid(uuid, uuid, date, date) from anon;
revoke all on function public.mark_commission_period_paid(uuid, uuid, date, date) from authenticated;
grant execute on function public.mark_commission_period_paid(uuid, uuid, date, date) to authenticated;


