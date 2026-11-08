-- Pedidos não concedem acesso. Escritas são reservadas ao backend e ainda não
-- há endpoint de contratação; autenticação/autorização serão exigidas antes do uso.
create table public.subscription_orders (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id),
  requester_id uuid not null,
  idempotency_key uuid not null,
  plan_code text not null check (length(plan_code) between 1 and 80),
  plan_name text not null check (length(trim(plan_name)) between 1 and 120),
  months integer not null check (months in (1, 12)),
  price_cents bigint not null check (price_cents > 0),
  max_installments integer not null check (max_installments between 1 and 3),
  user_limit integer not null check (user_limit > 0),
  terms_version text not null check (length(trim(terms_version)) between 1 and 120),
  accepted_at timestamptz not null default now(),
  status text not null default 'PENDING_PAYMENT' check (status in ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELED', 'REVIEW_REQUIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, idempotency_key)
);
-- Evita duas tentativas de contratação pendentes para o mesmo tenant.
create unique index subscription_orders_one_pending_per_shop
  on public.subscription_orders (barbershop_id) where status = 'PENDING_PAYMENT';

alter table public.subscription_orders enable row level security;
revoke all on table public.subscription_orders from public, anon, authenticated, service_role;
grant select, insert, update on table public.subscription_orders to service_role;

-- Preserve o preço e o aceite originais mesmo quando a tabela de planos muda.
create function private.prevent_subscription_order_snapshot_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.id, new.barbershop_id, new.requester_id, new.idempotency_key,
      new.plan_code, new.plan_name, new.months, new.price_cents,
      new.max_installments, new.user_limit, new.terms_version, new.accepted_at, new.created_at)
     is distinct from
     (old.id, old.barbershop_id, old.requester_id, old.idempotency_key,
      old.plan_code, old.plan_name, old.months, old.price_cents,
      old.max_installments, old.user_limit, old.terms_version, old.accepted_at, old.created_at) then
    raise exception 'Subscription order snapshot is immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_subscription_order_snapshot_changes() from public, anon, authenticated;
create trigger subscription_order_snapshot_immutable before update on public.subscription_orders
for each row execute function private.prevent_subscription_order_snapshot_changes();

-- Apenas o backend pode chamar; o proprietário é revalidado sob lock no banco.
create function public.create_subscription_order(
  p_barbershop_id uuid, p_requester_id uuid, p_idempotency_key uuid,
  p_plan_code text, p_plan_name text, p_months integer, p_price_cents bigint,
  p_max_installments integer, p_user_limit integer, p_terms_version text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_order public.subscription_orders%rowtype;
begin
  select b.owner_id into v_owner from public.barbershops b
    where b.id = p_barbershop_id for update;
  if v_owner is null or p_requester_id is null or v_owner <> p_requester_id then
    raise exception 'Unauthorized subscription order' using errcode = '42501';
  end if;
  select * into v_order from public.subscription_orders o
    where o.barbershop_id = p_barbershop_id and o.idempotency_key = p_idempotency_key;
  if found then
    if (v_order.requester_id, v_order.plan_code, v_order.plan_name, v_order.months,
        v_order.price_cents, v_order.max_installments, v_order.user_limit, v_order.terms_version)
       is distinct from
       (p_requester_id, p_plan_code, p_plan_name, p_months, p_price_cents,
        p_max_installments, p_user_limit, p_terms_version) then
      raise exception 'Idempotency key conflicts with order' using errcode = '23505';
    end if;
    return v_order.id;
  end if;
  -- Uma nova chave após atualizar a página recupera a mesma oferta pendente.
  select * into v_order from public.subscription_orders o
    where o.barbershop_id=p_barbershop_id and o.status='PENDING_PAYMENT';
  if found then
    if (v_order.requester_id, v_order.plan_code, v_order.plan_name, v_order.months,
        v_order.price_cents, v_order.max_installments, v_order.user_limit, v_order.terms_version)
       is distinct from
       (p_requester_id, p_plan_code, p_plan_name, p_months, p_price_cents,
        p_max_installments, p_user_limit, p_terms_version) then
      raise exception 'Another order is pending' using errcode = '23505';
    end if;
    return v_order.id;
  end if;
  insert into public.subscription_orders
    (barbershop_id, requester_id, idempotency_key, plan_code, plan_name, months,
     price_cents, max_installments, user_limit, terms_version)
  values (p_barbershop_id, p_requester_id, p_idempotency_key, p_plan_code, p_plan_name,
     p_months, p_price_cents, p_max_installments, p_user_limit, p_terms_version)
  returning id into v_order.id;
  return v_order.id;
end;
$$;
revoke all on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) from public, anon, authenticated, service_role;
grant execute on function public.create_subscription_order(uuid,uuid,uuid,text,text,integer,bigint,integer,integer,text) to service_role;

-- A reivindicação é registrada antes da chamada de rede. Um processo que cai
-- deixa REQUESTING, que exige conciliação, jamais uma repetição automática.
alter table public.subscription_orders
  add column provider_environment text not null default 'sandbox' check (provider_environment = 'sandbox'),
  add column checkout_state text not null default 'NOT_STARTED'
    check (checkout_state in ('NOT_STARTED','REQUESTING','READY','UNKNOWN')),
  add column provider_checkout_id text unique,
  add column provider_checkout_url text,
  add constraint subscription_checkout_id_matches_state check (
    (checkout_state = 'READY' and provider_checkout_id is not null and provider_checkout_url is not null and provider_checkout_url like 'https://sandbox.asaas.com/%')
    or (checkout_state <> 'READY' and provider_checkout_id is null and provider_checkout_url is null)
  );

create function public.claim_subscription_checkout(p_order_id uuid, p_requester_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.subscription_orders%rowtype;
  v_owner uuid;
begin
  select * into v_order from public.subscription_orders o where o.id = p_order_id for update;
  if not found then raise exception 'Order unavailable' using errcode = '42501'; end if;
  select b.owner_id into v_owner from public.barbershops b where b.id = v_order.barbershop_id;
  if p_requester_id is null or v_owner is distinct from p_requester_id or v_order.requester_id <> p_requester_id then
    raise exception 'Order unavailable' using errcode = '42501';
  end if;
  if v_order.status <> 'PENDING_PAYMENT' then return jsonb_build_object('state','REVIEW_REQUIRED'); end if;
  if v_order.checkout_state = 'REQUESTING' then return jsonb_build_object('state','IN_PROGRESS'); end if;
  if v_order.checkout_state = 'UNKNOWN' then return jsonb_build_object('state','REVIEW_REQUIRED'); end if;
  if v_order.checkout_state = 'READY' then return jsonb_build_object('state','READY','checkoutId',v_order.provider_checkout_id,'checkoutUrl',v_order.provider_checkout_url); end if;
  update public.subscription_orders set checkout_state='REQUESTING', updated_at=now() where id=v_order.id;
  return jsonb_build_object('state','CLAIMED','offer',jsonb_build_object(
    'planCode',v_order.plan_code,'planName',v_order.plan_name,'months',v_order.months,
    'priceCents',v_order.price_cents,'maxInstallments',v_order.max_installments,'userLimit',v_order.user_limit));
end;
$$;

create function public.finish_subscription_checkout(p_order_id uuid, p_state text, p_checkout_id text, p_checkout_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_state not in ('READY','UNKNOWN') or p_state is null
    or (p_state='READY' and (p_checkout_id is null or p_checkout_id !~ '^[a-zA-Z0-9_-]{1,128}$' or p_checkout_url is null or length(p_checkout_url)>2048 or p_checkout_url not like 'https://sandbox.asaas.com/%'))
    or (p_state='UNKNOWN' and (p_checkout_id is not null or p_checkout_url is not null)) then
    raise exception 'Invalid checkout outcome' using errcode='22023';
  end if;
  update public.subscription_orders set checkout_state=p_state, provider_checkout_id=p_checkout_id, provider_checkout_url=p_checkout_url, updated_at=now()
    where id=p_order_id and checkout_state='REQUESTING' and status='PENDING_PAYMENT';
  if not found then raise exception 'Checkout state conflict' using errcode='55000'; end if;
end;
$$;
revoke all on function public.claim_subscription_checkout(uuid,uuid) from public, anon, authenticated, service_role;
revoke all on function public.finish_subscription_checkout(uuid,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.claim_subscription_checkout(uuid,uuid) to service_role;
grant execute on function public.finish_subscription_checkout(uuid,text,text,text) to service_role;

-- Caixa de entrada minimizada. Receber evento não altera status nem vigência.
create table public.asaas_checkout_events (
  id bigint generated always as identity primary key,
  provider_environment text not null default 'sandbox' check (provider_environment = 'sandbox'),
  provider_account_id text not null check (provider_account_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  provider_event_id text not null check (length(provider_event_id) between 1 and 256 and provider_event_id !~ '[[:space:]]'),
  event_type text not null check (event_type ~ '^[A-Z][A-Z0-9_]{0,99}$'),
  checkout_id text not null check (checkout_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  checkout_status text not null check (checkout_status ~ '^[A-Z][A-Z0-9_]{0,99}$'),
  received_at timestamptz not null default now(),
  processing_state text not null default 'PENDING' check (processing_state in ('PENDING','PROCESSED','REVIEW_REQUIRED')),
  unique (provider_environment, provider_account_id, provider_event_id)
);
alter table public.asaas_checkout_events enable row level security;
revoke all on table public.asaas_checkout_events from public, anon, authenticated, service_role;

create function public.persist_asaas_checkout_event(p_account text, p_event_id text, p_event_type text, p_checkout_id text, p_checkout_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inserted integer;
  v_existing public.asaas_checkout_events%rowtype;
begin
  insert into public.asaas_checkout_events (provider_account_id, provider_event_id, event_type, checkout_id, checkout_status)
  values (p_account, p_event_id, p_event_type, p_checkout_id, p_checkout_status)
  on conflict (provider_environment, provider_account_id, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then return true; end if;
  select * into v_existing from public.asaas_checkout_events
    where provider_environment='sandbox' and provider_account_id=p_account and provider_event_id=p_event_id;
  if (v_existing.event_type, v_existing.checkout_id, v_existing.checkout_status)
    is distinct from (p_event_type, p_checkout_id, p_checkout_status) then
    raise exception 'Conflicting provider event' using errcode='23505';
  end if;
  return false;
end;
$$;
revoke all on function public.persist_asaas_checkout_event(text,text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.persist_asaas_checkout_event(text,text,text,text,text) to service_role;
