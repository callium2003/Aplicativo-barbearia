import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("customer authentication is separated from management and requires WhatsApp profile completion", async () => {
  const [customerLogin, managementLogin, bookings] = await Promise.all([
    read("../app/cliente/entrar/page.tsx"),
    read("../app/entrar/page.tsx"),
    read("../app/meus-agendamentos/page.tsx"),
  ]);

  assert.match(customerLogin, /Entrar ou criar conta/);
  assert.match(customerLogin, /signInWithOAuth\(\{ provider: "google"/);
  assert.match(customerLogin, /signInWithOtp/);
  assert.match(customerLogin, /rpc\("save_my_customer_profile"/);
  assert.match(customerLogin, /Celular \/ WhatsApp/);
  assert.match(customerLogin, /WhatsApp é obrigatório/);
  assert.match(customerLogin, /returnTo/);

  assert.match(managementLogin, /Acessar gestão/);
  assert.match(managementLogin, /Área do Cliente/);
  assert.match(managementLogin, /href="\/cliente\/entrar"/);

  assert.match(bookings, /\/cliente\/entrar\?returnTo=%2Fmeus-agendamentos/);
  assert.match(bookings, /\.from\("appointments"\)[\s\S]*?\.eq\("customer_id", user\.id\)/);
  assert.match(bookings, /href="\/meu-perfil"/);
  assert.doesNotMatch(bookings, /rpc\("save_my_customer_profile"/);
  assert.doesNotMatch(bookings, /Minha conta/);
  assert.match(bookings, /Próximo agendamento/);
});

test("customer profile is a dedicated authenticated page with required WhatsApp and public navigation", async () => {
  const [profile, publicPage] = await Promise.all([
    read("../app/meu-perfil/page.tsx"),
    read("../app/[slug]/page.tsx"),
  ]);

  assert.match(profile, /supabase\.auth\.getUser\(\)/);
  assert.match(profile, /\/cliente\/entrar\?returnTo=%2Fmeu-perfil/);
  assert.match(profile, /rpc\("save_my_customer_profile"/);
  assert.match(profile, /Celular \/ WhatsApp/);
  assert.match(profile, /autoComplete="tel"/);
  assert.match(profile, /Obrigatório, com DDD/);
  assert.match(profile, /Salvar alterações/);
  assert.match(publicPage, /Barbearia[\s\S]*?Agenda[\s\S]*?Gestão[\s\S]*?Meu perfil/);
  assert.doesNotMatch(publicPage, /Bater papo/);
});

test("an authenticated customer who reaches a panel URL returns to customer appointments", async () => {
  const panelStart = await read("../app/painel/inicio/page.tsx");

  assert.match(panelStart, /from\("customers"\)/);
  assert.match(panelStart, /auth_user_id", context\.userId/);
  assert.match(panelStart, /window\.location\.replace\("\/meus-agendamentos"\)/);
  assert.match(panelStart, /window\.location\.replace\("\/cadastro-inicial"\)/);
});

test("role-aware panel navigation keeps the public barbershop and professional profile available", async () => {
  const [shell, professionalProfile] = await Promise.all([
    read("../app/painel/PanelShell.tsx"),
    read("../app/painel/ProfessionalProfile.tsx"),
  ]);

  assert.match(shell, /label: "Barbearia"/);
  assert.match(shell, /"Gestão"/);
  assert.match(shell, /"Minha agenda"/);
  assert.match(shell, /"Disponibilidade"/);
  assert.match(shell, /"Meu perfil"/);
  assert.match(shell, /barbeariasp\.public-slug/);
  assert.match(professionalProfile, /update_my_professional_profile/);
  assert.match(professionalProfile, /const limit = 2 \* 1024 \* 1024/);
});

test("agenda supports operational WhatsApp, no-show and protected barber self availability", async () => {
  const agenda = await read("../app/painel/agenda/page.tsx");
  assert.match(agenda, /buildWhatsAppLink\(item\.customer_phone/);
  assert.match(agenda, /Aqui é da \$\{shop\.name\}/);
  assert.match(agenda, /"no_show"/);
  assert.match(agenda, /Não compareceu/);
  assert.match(agenda, /update\(\{ status \}\)/);
  assert.match(agenda, /Minha disponibilidade/);
  assert.match(agenda, /from\("professional_hours"\)/);
  assert.match(agenda, /from\("professional_breaks"\)/);
  assert.match(agenda, /from\("professional_time_blocks"\)/);
  assert.match(agenda, /\.eq\("professional_id", shop\.professional_id\)/);
  assert.match(agenda, /Registrar ausência/);
});

test("management reports provide market-aligned real metrics, filters and CSV exports", async () => {
  const reports = await read("../app/painel/relatorios/page.tsx");
  assert.match(reports, /rpc\("get_barbershop_management_report"/);
  assert.match(reports, /Visão geral/);
  assert.match(reports, /Agendamentos/);
  assert.match(reports, /Equipe/);
  assert.match(reports, /Serviços/);
  assert.match(reports, /Clientes/);
  assert.match(reports, /Comissões/);
  assert.match(reports, /occupancy_percent/);
  assert.match(reports, /Clientes e recorrência/);
  assert.match(reports, /Taxa de retorno/);
  assert.match(reports, /Motivos de cancelamento/);
  assert.match(reports, /Exportar CSV/);
  assert.match(reports, /downloadCsv/);
  assert.match(reports, /buildWhatsAppLink|wa\.me/);
  assert.doesNotMatch(reports, /João Martins|Rafael Souza|Lucas Costa|1\.665,00/);
});

test("report and customer profile RPCs enforce tenant roles and explicit grants", async () => {
  const [initial, fix] = await Promise.all([
    read("../supabase/migrations/20260807070808_add_customer_account_and_complete_management_reports.sql"),
    read("../supabase/migrations/20260807070958_fix_management_report_service_revenue_share.sql"),
  ]);

  assert.match(initial, /create or replace function public\.save_my_customer_profile/);
  assert.match(initial, /Informe um celular\/WhatsApp válido com DDD/);
  assert.match(initial, /revoke all on function public\.save_my_customer_profile\(text, text\) from anon/);
  assert.match(initial, /grant execute on function public\.save_my_customer_profile\(text, text\) to authenticated/);
  assert.match(initial, /private\.current_barbershop_role\(p_barbershop_id\)/);
  assert.match(initial, /v_role not in \('owner', 'manager'\)/);
  assert.match(initial, /revoke all on function public\.get_barbershop_management_report\(uuid, date, date, uuid\) from anon/);
  assert.match(initial, /professional_breaks/);
  assert.match(initial, /professional_time_blocks/);
  assert.match(initial, /occupancy_percent/);
  assert.match(initial, /new_clients/);
  assert.match(initial, /returning_clients/);
  assert.match(initial, /rebooked_clients/);

  assert.match(fix, /services_total/);
  assert.match(fix, /st\.total_revenue/);
  assert.doesNotMatch(fix, /sum\(revenue\) over \(\)/);
});

test("premium product design system is shared across customer and management surfaces", async () => {
  const [css, shell, panel, clients, professionals] = await Promise.all([
    read("../app/product-ui.css"),
    read("../app/painel/PanelShell.tsx"),
    read("../app/painel/page.tsx"),
    read("../app/painel/clientes/page.tsx"),
    read("../app/painel/profissionais/page.tsx"),
  ]);
  assert.match(css, /--sp-bronze/);
  assert.match(css, /--sp-radius: 16px/);
  assert.match(css, /customer-auth-wrap/);
  assert.match(css, /product-table/);
  assert.match(shell, /Navegação do painel/);
  assert.match(panel, /PanelShell/);
  assert.match(clients, /PanelShell/);
  assert.match(professionals, /PanelShell/);
});
