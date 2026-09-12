-- Save the edited week and activate it in one transaction.
create or replace function public.save_professional_custom_schedule(p_professional_id uuid, p_hours jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_shop uuid; v_role text; v_day record;
begin
  select barbershop_id into v_shop from public.professionals where id = p_professional_id for update;
  v_role := private.current_barbershop_role(v_shop);
  if auth.uid() is null or v_role is null or v_role not in ('owner','manager') then
    raise exception 'Sem permissão para alterar esta agenda.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_hours) is distinct from 'array' then
    raise exception 'Preencha os sete dias da semana.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_hours) <> 7 or
    (select count(distinct weekday) from jsonb_to_recordset(p_hours) as x(weekday integer) where weekday between 0 and 6) <> 7 then
    raise exception 'Preencha os sete dias da semana.' using errcode = '22023';
  end if;
  for v_day in select * from jsonb_to_recordset(p_hours)
    as x(weekday integer, opens_at time, closes_at time, is_closed boolean)
  loop
    if v_day.is_closed is null then
      raise exception 'Informe se cada dia está aberto ou fechado.' using errcode = '22023';
    end if;
    if not v_day.is_closed and not exists (
      select 1 from public.business_hours b where b.barbershop_id=v_shop and b.weekday=v_day.weekday
      and b.is_closed=false and v_day.opens_at >= b.opens_at and v_day.closes_at <= b.closes_at
      and v_day.opens_at < v_day.closes_at
    ) then
      raise exception 'A agenda personalizada deve permanecer dentro do horário da barbearia.' using errcode = '23514';
    end if;
  end loop;
  update public.professionals set schedule_mode='custom' where id=p_professional_id;
  insert into public.professional_hours(professional_id,weekday,opens_at,closes_at,is_closed)
    select p_professional_id,weekday,case when is_closed then null else opens_at end,
      case when is_closed then null else closes_at end,is_closed
    from jsonb_to_recordset(p_hours) as x(weekday integer,opens_at time,closes_at time,is_closed boolean)
    on conflict(professional_id,weekday) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,is_closed=excluded.is_closed;
  insert into public.professional_saved_custom_hours(professional_id,weekday,opens_at,closes_at,is_closed)
    select professional_id,weekday,opens_at,closes_at,is_closed from public.professional_hours where professional_id=p_professional_id
    on conflict(professional_id,weekday) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,is_closed=excluded.is_closed,updated_at=now();
end;
$$;
revoke all on function public.save_professional_custom_schedule(uuid,jsonb) from public,anon;
grant execute on function public.save_professional_custom_schedule(uuid,jsonb) to authenticated;

-- Keeping an existing photo must not block unrelated profile edits when the
-- deployment has not configured its trusted Storage origin.
do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('public.update_professional_v2(uuid,text,text,text,text,text)'::regprocedure) into v_definition;
  v_definition := replace(v_definition,
    'if v_photo is not null and (',
    'if v_photo is not null and v_photo is distinct from v_professional.photo_url and (');
  execute v_definition;
end;
$migration$;

