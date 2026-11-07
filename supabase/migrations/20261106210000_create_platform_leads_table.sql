-- Migration: 20261106210000_create_platform_leads_table.sql
-- Descrição: Tabela de captação de leads e manifestações de interesse da plataforma BarbeariaSP (CullenTech)
-- Isolamento: RLS ativado, inserção restrita com menor privilégio exclusivamente à rota do servidor (service_role)

create table if not exists public.platform_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  barbershop_name text not null,
  team_size text,
  city_state text,
  notes text,
  source text not null default 'landing_page',
  created_at timestamptz not null default now()
);

-- Ativação compulsória de RLS
alter table public.platform_leads enable row level security;

-- Revoga todos os privilégios de roles públicas, anônimas e autenticadas do PostgREST
revoke all on public.platform_leads from public, anon, authenticated;

-- Concede o menor privilégio necessário (exclusivamente INSERT) à role de serviço do backend (service_role)
grant insert on public.platform_leads to service_role;

-- Política de RLS explícita para inserção autorizada via backend (service_role)
create policy "allow_service_role_insert" on public.platform_leads
  for insert
  to service_role
  with check (
    length(trim(full_name)) >= 2
    and length(trim(whatsapp)) >= 8
    and length(trim(barbershop_name)) >= 2
  );


