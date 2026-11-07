-- Migration: 20261106210000_create_platform_leads_table.sql
-- Descrição: Tabela de captação de leads e manifestações de interesse da plataforma BarbeariaSP (CullenTech)
-- Isolamento: RLS ativado, inserção autorizada para anon com sanitização, leitura/edição restrita

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

-- Política restrita: permite exclusivamente INSERT anônimo e autenticado
create policy "allow_public_lead_submission" on public.platform_leads
  for insert
  with check (
    length(trim(full_name)) >= 2
    and length(trim(whatsapp)) >= 8
    and length(trim(barbershop_name)) >= 2
  );

-- Revoga leitura, atualização e exclusão públicas
revoke all on public.platform_leads from public, anon, authenticated;
grant insert on public.platform_leads to anon, authenticated;
