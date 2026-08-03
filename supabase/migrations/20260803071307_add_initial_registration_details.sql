-- Dados do cadastro inicial não ficam em public.barbershops: essa tabela é
-- lida pelo catálogo público. A coluna de progresso é pública, mas não expõe
-- nenhuma informação pessoal ou fiscal e mantém as contas existentes compatíveis.
alter table public.barbershops
  add column if not exists initial_registration_completed boolean not null default true;

create table public.barbershop_registration_details (
  barbershop_id uuid primary key references public.barbershops(id) on delete cascade,
  responsible_name text not null check (char_length(trim(responsible_name)) >= 2),
  responsible_phone text not null,
  tax_document text check (tax_document is null or tax_document ~ '^[0-9]{11}$|^[0-9]{14}$'),
  postal_code text not null check (postal_code ~ '^[0-9]{8}$'),
  address_number text not null check (char_length(trim(address_number)) > 0),
  neighborhood text not null check (char_length(trim(neighborhood)) > 0),
  city text not null check (char_length(trim(city)) > 0),
  state text not null check (state ~ '^[A-Z]{2}$'),
  total_people integer not null check (total_people > 0),
  attending_professionals integer not null check (attending_professionals > 0 and attending_professionals <= total_people),
  service_positions integer not null check (service_positions > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.barbershop_registration_details enable row level security;
grant select, insert, update on public.barbershop_registration_details to authenticated;

create policy "Owner or manager can read own registration details"
on public.barbershop_registration_details for select
to authenticated
using (private.current_barbershop_role(barbershop_id) in ('owner', 'manager'));

create policy "Owner or manager can create own registration details"
on public.barbershop_registration_details for insert
to authenticated
with check (private.current_barbershop_role(barbershop_id) in ('owner', 'manager'));

create policy "Owner or manager can update own registration details"
on public.barbershop_registration_details for update
to authenticated
using (private.current_barbershop_role(barbershop_id) in ('owner', 'manager'))
with check (private.current_barbershop_role(barbershop_id) in ('owner', 'manager'));
