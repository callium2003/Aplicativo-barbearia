create schema if not exists private;

create table if not exists private.platform_administrators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role = 'platform_owner'),
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((active and revoked_at is null) or (not active and revoked_at is not null))
);

create table if not exists private.platform_administrator_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  administrator_user_id uuid not null,
  actor_user_id uuid,
  action text not null check (action in ('granted', 'revoked', 'updated')),
  occurred_at timestamptz not null default now()
);

alter table private.platform_administrators enable row level security;
alter table private.platform_administrator_audit enable row level security;
revoke all on table private.platform_administrators from public, anon, authenticated;
revoke all on table private.platform_administrator_audit from public, anon, authenticated;

create or replace function private.audit_platform_administrator_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into private.platform_administrator_audit (administrator_user_id, actor_user_id, action)
  values (
    coalesce(new.user_id, old.user_id),
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'granted'
      when tg_op = 'DELETE' or (old.active and not new.active) then 'revoked'
      else 'updated'
    end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_platform_administrator_change() from public, anon, authenticated;

create trigger audit_platform_administrator_change
after insert or update or delete on private.platform_administrators
for each row execute function private.audit_platform_administrator_change();

create or replace function public.get_platform_barbershop_overview()
returns table(
  barbershop_id uuid,
  name text,
  slug text,
  registration_status text,
  subscription_status text,
  plan_code text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  contract_status text
)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not exists (
    select 1
    from private.platform_administrators administrator
    where administrator.user_id = auth.uid()
      and administrator.role = 'platform_owner'
      and administrator.active
  ) then
    raise exception 'Acesso interno não autorizado';
  end if;

  return query
  select
    b.id,
    b.name,
    b.slug,
    case when b.active then 'active' else 'inactive' end,
    s.status,
    s.plan_code,
    s.trial_ends_at,
    s.current_period_ends_at,
    case
      when s.status is null then 'unavailable'
      when s.status = 'trialing' and s.trial_ends_at > now() then 'trial'
      when s.status = 'trialing' then 'trial_ended'
      when s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now()) then 'active'
      when s.status = 'past_due' then 'payment_attention'
      when s.status = 'cancelled' then 'cancelled'
      else 'ended'
    end
  from public.barbershops b
  left join public.barbershop_subscriptions s on s.barbershop_id = b.id
  order by b.created_at desc;
end;
$$;

revoke all on function public.get_platform_barbershop_overview() from public, anon, authenticated;
grant execute on function public.get_platform_barbershop_overview() to authenticated;
