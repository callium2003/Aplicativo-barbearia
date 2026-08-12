-- Automatic commission ledger and real financial reporting.
-- Remote migration version: 20260807044250

create table public.appointment_commissions (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  professional_name_snapshot text not null,
  service_name_snapshot text not null,
  appointment_starts_at timestamptz not null,
  gross_amount numeric(12,2) not null,
  commission_rate_percent numeric(5,2) not null,
  commission_amount numeric(12,2) not null,
  payment_status text not null default 'pending',
  completed_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_commissions_gross_amount_check check (gross_amount >= 0),
  constraint appointment_commissions_rate_check check (commission_rate_percent >= 0 and commission_rate_percent <= 100),
  constraint appointment_commissions_amount_check check (commission_amount >= 0 and commission_amount <= gross_amount),
  constraint appointment_commissions_payment_status_check check (payment_status in ('pending', 'paid')),
  constraint appointment_commissions_payment_state_check check (
    (payment_status = 'pending' and paid_at is null and paid_by is null)
    or (payment_status = 'paid' and paid_at is not null and paid_by is not null)
  )
);

create index appointment_commissions_barbershop_period_idx
  on public.appointment_commissions (barbershop_id, appointment_starts_at desc);
create index appointment_commissions_professional_period_idx
  on public.appointment_commissions (professional_id, appointment_starts_at desc);
create index appointment_commissions_barbershop_payment_idx
  on public.appointment_commissions (barbershop_id, payment_status, appointment_starts_at desc);
create index appointment_commissions_paid_by_idx
  on public.appointment_commissions (paid_by)
  where paid_by is not null;

alter table public.appointment_commissions enable row level security;
revoke all on table public.appointment_commissions from public;
revoke all on table public.appointment_commissions from anon;
revoke all on table public.appointment_commissions from authenticated;
grant all on table public.appointment_commissions to service_role;

create or replace function private.sync_appointment_commission()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_rate numeric(5,2) := 0.00;
  v_existing_status text;
begin
  if old.status = 'completed' and new.status <> 'completed' then
    select ac.payment_status
      into v_existing_status
    from public.appointment_commissions ac
    where ac.appointment_id = old.id
    for update;

    if v_existing_status = 'paid' then
      raise exception 'Não é possível reabrir um atendimento com comissão já paga.';
    end if;

    delete from public.appointment_commissions
    where appointment_id = old.id;

    return new;
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.professional_id is null
       or new.professional_name_snapshot is null
       or new.service_name_snapshot is null
       or new.service_price_snapshot is null then
      raise exception 'Atendimento concluído sem snapshots financeiros obrigatórios.';
    end if;

    select pcs.commission_rate_percent
      into v_rate
    from public.professional_commission_settings pcs
    where pcs.professional_id = new.professional_id;

    v_rate := coalesce(v_rate, 0.00);

    insert into public.appointment_commissions (
      appointment_id,
      barbershop_id,
      professional_id,
      professional_name_snapshot,
      service_name_snapshot,
      appointment_starts_at,
      gross_amount,
      commission_rate_percent,
      commission_amount,
      payment_status,
      completed_at
    ) values (
      new.id,
      new.barbershop_id,
      new.professional_id,
      new.professional_name_snapshot,
      new.service_name_snapshot,
      new.starts_at,
      round(new.service_price_snapshot::numeric, 2),
      v_rate,
      round((new.service_price_snapshot::numeric * v_rate) / 100, 2),
      'pending',
      now()
    );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_appointment_commission() from public;
revoke all on function private.sync_appointment_commission() from anon;
revoke all on function private.sync_appointment_commission() from authenticated;

create trigger sync_appointment_commission_after_status_change
after update of status on public.appointments
for each row
when (old.status is distinct from new.status)
execute function private.sync_appointment_commission();

insert into public.appointment_commissions (
  appointment_id,
  barbershop_id,
  professional_id,
  professional_name_snapshot,
  service_name_snapshot,
  appointment_starts_at,
  gross_amount,
  commission_rate_percent,
  commission_amount,
  payment_status,
  completed_at
)
select
  a.id,
  a.barbershop_id,
  a.professional_id,
  a.professional_name_snapshot,
  a.service_name_snapshot,
  a.starts_at,
  round(a.service_price_snapshot::numeric, 2),
  coalesce(pcs.commission_rate_percent, 0.00),
  round((a.service_price_snapshot::numeric * coalesce(pcs.commission_rate_percent, 0.00)) / 100, 2),
  'pending',
  greatest(a.created_at, a.starts_at)
from public.appointments a
left join public.professional_commission_settings pcs
  on pcs.professional_id = a.professional_id
where a.status = 'completed'
  and a.professional_id is not null
  and a.professional_name_snapshot is not null
  and a.service_name_snapshot is not null
  and a.service_price_snapshot is not null
on conflict (appointment_id) do nothing;

create or replace function public.get_barbershop_financial_report(
  p_barbershop_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role text;
  v_start timestamptz;
  v_end timestamptz;
  v_completed_count bigint := 0;
  v_cancelled_count bigint := 0;
  v_no_show_count bigint := 0;
  v_gross numeric(14,2) := 0;
  v_commission_total numeric(14,2) := 0;
  v_commission_pending numeric(14,2) := 0;
  v_commission_paid numeric(14,2) := 0;
  v_professionals jsonb := '[]'::jsonb;
  v_commissions jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_barbershop_id is null or p_start_date is null or p_end_date is null then
    raise exception 'Período e barbearia são obrigatórios.';
  end if;

  if p_end_date < p_start_date or p_end_date - p_start_date > 366 then
    raise exception 'Período de relatório inválido.';
  end if;

  v_role := private.current_barbershop_role(p_barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para consultar os relatórios desta barbearia.';
  end if;

  v_start := p_start_date::timestamp at time zone 'America/Sao_Paulo';
  v_end := (p_end_date + 1)::timestamp at time zone 'America/Sao_Paulo';

  select
    count(*),
    coalesce(sum(ac.gross_amount), 0),
    coalesce(sum(ac.commission_amount), 0),
    coalesce(sum(ac.commission_amount) filter (where ac.payment_status = 'pending'), 0),
    coalesce(sum(ac.commission_amount) filter (where ac.payment_status = 'paid'), 0)
  into
    v_completed_count,
    v_gross,
    v_commission_total,
    v_commission_pending,
    v_commission_paid
  from public.appointment_commissions ac
  where ac.barbershop_id = p_barbershop_id
    and ac.appointment_starts_at >= v_start
    and ac.appointment_starts_at < v_end;

  select
    count(*) filter (where a.status = 'cancelled'),
    count(*) filter (where a.status = 'no_show')
  into v_cancelled_count, v_no_show_count
  from public.appointments a
  where a.barbershop_id = p_barbershop_id
    and a.starts_at >= v_start
    and a.starts_at < v_end;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'professional_id', x.professional_id,
      'professional_name', x.professional_name,
      'completed_appointments', x.completed_appointments,
      'gross_revenue', x.gross_revenue,
      'commission_total', x.commission_total,
      'net_revenue', x.gross_revenue - x.commission_total
    ) order by x.professional_name
  ), '[]'::jsonb)
  into v_professionals
  from (
    select
      ac.professional_id,
      ac.professional_name_snapshot as professional_name,
      count(*) as completed_appointments,
      coalesce(sum(ac.gross_amount), 0)::numeric(14,2) as gross_revenue,
      coalesce(sum(ac.commission_amount), 0)::numeric(14,2) as commission_total
    from public.appointment_commissions ac
    where ac.barbershop_id = p_barbershop_id
      and ac.appointment_starts_at >= v_start
      and ac.appointment_starts_at < v_end
    group by ac.professional_id, ac.professional_name_snapshot
  ) x;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'appointment_id', ac.appointment_id,
      'starts_at', ac.appointment_starts_at,
      'professional_id', ac.professional_id,
      'professional_name', ac.professional_name_snapshot,
      'services', ac.service_name_snapshot,
      'gross_amount', ac.gross_amount,
      'commission_rate_percent', ac.commission_rate_percent,
      'commission_amount', ac.commission_amount,
      'payment_status', ac.payment_status,
      'paid_at', ac.paid_at
    ) order by ac.appointment_starts_at desc
  ), '[]'::jsonb)
  into v_commissions
  from public.appointment_commissions ac
  where ac.barbershop_id = p_barbershop_id
    and ac.appointment_starts_at >= v_start
    and ac.appointment_starts_at < v_end;

  return jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'summary', jsonb_build_object(
      'completed_appointments', v_completed_count,
      'gross_revenue', v_gross,
      'average_ticket', case when v_completed_count = 0 then 0 else round(v_gross / v_completed_count, 2) end,
      'commission_total', v_commission_total,
      'commission_pending', v_commission_pending,
      'commission_paid', v_commission_paid,
      'net_revenue', v_gross - v_commission_total,
      'cancelled_appointments', v_cancelled_count,
      'no_show_appointments', v_no_show_count
    ),
    'professionals', v_professionals,
    'commissions', v_commissions
  );
end;
$$;

revoke all on function public.get_barbershop_financial_report(uuid, date, date) from public;
revoke all on function public.get_barbershop_financial_report(uuid, date, date) from anon;
revoke all on function public.get_barbershop_financial_report(uuid, date, date) from authenticated;
grant execute on function public.get_barbershop_financial_report(uuid, date, date) to authenticated;

create or replace function public.set_appointment_commission_payment_status(
  p_appointment_id uuid,
  p_payment_status text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_row public.appointment_commissions%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_payment_status not in ('pending', 'paid') then
    raise exception 'Status de repasse inválido.';
  end if;

  select * into v_row
  from public.appointment_commissions
  where appointment_id = p_appointment_id
  for update;

  if not found then
    raise exception 'Comissão do atendimento não encontrada.';
  end if;

  v_role := private.current_barbershop_role(v_row.barbershop_id);
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Sem permissão para alterar o repasse desta barbearia.';
  end if;

  if v_row.payment_status = p_payment_status then
    return jsonb_build_object(
      'success', true,
      'appointment_id', p_appointment_id,
      'payment_status', p_payment_status
    );
  end if;

  update public.appointment_commissions
  set payment_status = p_payment_status,
      paid_at = case when p_payment_status = 'paid' then now() else null end,
      paid_by = case when p_payment_status = 'paid' then v_user_id else null end,
      updated_at = now()
  where appointment_id = p_appointment_id;

  insert into public.audit_logs (
    barbershop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_row.barbershop_id,
    v_user_id,
    'set_appointment_commission_payment_status',
    'appointment_commission',
    p_appointment_id,
    jsonb_build_object(
      'previous_status', v_row.payment_status,
      'new_status', p_payment_status,
      'commission_amount', v_row.commission_amount,
      'professional_id', v_row.professional_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'appointment_id', p_appointment_id,
    'payment_status', p_payment_status
  );
end;
$$;

revoke all on function public.set_appointment_commission_payment_status(uuid, text) from public;
revoke all on function public.set_appointment_commission_payment_status(uuid, text) from anon;
revoke all on function public.set_appointment_commission_payment_status(uuid, text) from authenticated;
grant execute on function public.set_appointment_commission_payment_status(uuid, text) to authenticated;
