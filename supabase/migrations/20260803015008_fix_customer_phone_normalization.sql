-- Keep the original CRM migration immutable.  Its regular-expression literal
-- was over-escaped, so formatted phone numbers were not normalized before the
-- customer constraint was checked.
create or replace function public.sync_customer_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_email text;
begin
  if new.customer_id is null or new.customer_id <> (select auth.uid()) then
    raise exception 'Cliente não autenticado.';
  end if;

  select u.email into v_email from auth.users u where u.id = new.customer_id;
  v_email := coalesce(v_email, new.customer_email);

  insert into public.customers (auth_user_id, name, email, phone, phone_normalized)
  values (
    new.customer_id,
    btrim(new.customer_name),
    v_email,
    btrim(new.customer_phone),
    regexp_replace(new.customer_phone, '\D', '', 'g')
  )
  on conflict (auth_user_id) where auth_user_id is not null do update
  set name = excluded.name,
      email = coalesce(excluded.email, public.customers.email),
      phone = excluded.phone,
      phone_normalized = excluded.phone_normalized,
      updated_at = now()
  returning id into v_customer_id;

  insert into public.barbershop_customers (barbershop_id, customer_id)
  values (new.barbershop_id, v_customer_id)
  on conflict (barbershop_id, customer_id) do nothing;

  new.customer_global_id := v_customer_id;
  return new;
end;
$$;

revoke all on function public.sync_customer_for_appointment() from public;

-- The CRM history view is security_invoker and depends on this table.  Its
-- existing RLS policy continues to limit rows to the owner or manager of the
-- associated barbershop.
grant select on public.appointment_services to authenticated;

-- security_invoker also checks base-table privileges before RLS.  Anonymous
-- callers keep zero visible rows because the existing anon policies deny all
-- CRM access; this grant lets the protected view return an empty result.
grant select on public.appointments, public.appointment_services,
  public.customers, public.barbershop_customers, public.customer_consents to anon;

update public.customers
set phone_normalized = regexp_replace(phone, '\D', '', 'g')
where phone_normalized is distinct from regexp_replace(phone, '\D', '', 'g');
