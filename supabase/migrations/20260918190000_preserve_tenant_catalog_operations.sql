-- A1/A2 continuidade: preserva operações legítimas após restringir o catálogo.
--
-- As migrations 20260918170000 e 20260918180000 removem leitura ampla de
-- owner_id e metadata operacional. Esta continuidade mantém duas capacidades
-- que o painel já possuía, sem devolver SELECT a colunas sensíveis:
--
-- 1. owner/manager continuam atualizando somente os campos de perfil usados
--    pelo cadastro inicial e Configurar; a policy de update existente continua
--    sendo a fronteira de tenant e papel;
-- 2. owner/manager e o barbeiro titular continuam selecionando profissional
--    inativo do próprio tenant, necessário para reativação e autoatendimento.

grant update (
  name,
  slug,
  phone,
  whatsapp,
  address,
  notification_email,
  description,
  initial_registration_completed
) on public.barbershops to authenticated;

drop policy if exists "Authenticated can read public managed or own professional"
  on public.professionals;

create policy "Authenticated can read public managed or own professional"
on public.professionals
for select
to authenticated
using (
  active = true
  or private.current_barbershop_role(barbershop_id) in ('owner', 'manager')
  or id = private.current_barber_professional_id(barbershop_id)
);
