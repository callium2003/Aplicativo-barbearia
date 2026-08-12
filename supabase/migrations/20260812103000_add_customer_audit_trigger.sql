create or replace function private.audit_customer_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_barbershop_id uuid;
  v_customer_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  for v_barbershop_id in
    select bc.barbershop_id
    from public.barbershop_customers bc
    where bc.customer_id = v_customer_id
  loop
    perform private.write_audit_log(
      v_barbershop_id,
      'customers.' || lower(tg_op),
      'customer',
      v_customer_id,
      jsonb_build_object('operation', tg_op, 'table', 'customers')
    );
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.audit_customer_change() from public, anon, authenticated;
grant execute on function private.audit_customer_change() to postgres, service_role;

drop trigger if exists audit_customers_change on public.customers;
create trigger audit_customers_change
after insert or update or delete on public.customers
for each row execute function private.audit_customer_change();
