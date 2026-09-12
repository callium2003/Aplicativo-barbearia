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
  assert.match(bookings, /<p className="customer-eyebrow">ÁREA DO CLIENTE<\/p>/);
  assert.match(bookings, /className="customer-appointment-list-card"/);
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
  assert.match(profile, /Editar dados/);
  assert.match(profile, /Salvar dados/);
  assert.match(profile, /Minhas barbearias/);
  assert.match(profile, /barbershop_customers/);
  assert.match(profile, /href=\{`\/\$\{barbershop\.slug\}`\}/);
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

  assert.match(shell, /role !== "barber"[\s\S]*?label: "Barbearia"/);
  assert.match(shell, /"Gestão"/);
  assert.match(shell, /"Minha agenda"/);
  assert.match(shell, /"Disponibilidade"/);
  assert.match(shell, /"Meu perfil"/);
  assert.match(shell, /barbeariasp\.public-slug/);
  assert.match(professionalProfile, /update_my_professional_profile/);
  assert.match(professionalProfile, /const limit = 2 \* 1024 \* 1024/);
});

test("agenda supports operational WhatsApp, no-show and protected barber self availability", async () => {
  const [agenda, availability] = await Promise.all([
    read("../app/painel/agenda/page.tsx"),
    read("../app/painel/ProfessionalAvailability.tsx"),
  ]);
  assert.match(agenda, /buildWhatsAppLink\(item\.customer_phone/);
  assert.match(agenda, /Aqui é da \$\{shop\.name\}/);
  assert.match(agenda, /"no_show"/);
  assert.match(agenda, /Não compareceu/);
  assert.match(agenda, /rpc\("set_appointment_status"/);
  assert.doesNotMatch(agenda, /from\("appointments"\)\.update/);
  assert.doesNotMatch(agenda, /Minha disponibilidade|Registrar ausência/);
  assert.match(availability, /from\("professional_hours"\)/);
  assert.match(availability, /from\("professional_breaks"\)/);
  assert.match(availability, /from\("professional_time_blocks"\)/);
  assert.match(availability, /\.eq\("professional_id", professionalId\)/);
  assert.match(availability, /Registrar ausência/);
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
  assert.match(reports, /Sem retorno \+45 dias/);
  assert.match(reports, /get_barbershop_inactive_customers/);
  assert.doesNotMatch(reports, /Motivos de cancelamento/);
  assert.match(reports, /Exportar CSV/);
  assert.match(reports, /downloadCsv/);
  assert.match(reports, /buildWhatsAppLink|wa\.me/);
  assert.doesNotMatch(reports, /João Martins|Rafael Souza|Lucas Costa|1\.665,00/);
});

test("management reports apply a complete filter explicitly before querying or exporting", async () => {
  const reports = await read("../app/painel/relatorios/page.tsx");

  assert.match(reports, /const \[appliedFilters, setAppliedFilters\] = useState/);
  assert.match(reports, /p_start_date: appliedFilters\.startDate/);
  assert.match(reports, /p_end_date: appliedFilters\.endDate/);
  assert.match(reports, /p_professional_id: appliedFilters\.professionalId \|\| null/);
  assert.match(reports, /\}, \[appliedFilters, refreshKey\]\);/);
  assert.doesNotMatch(reports, /\}, \[startDate, endDate, professionalId, refreshKey\]\);/);
  assert.match(reports, /function applyFilters\(\)/);
  assert.match(reports, /onClick=\{applyFilters\}/);
  assert.match(reports, /const stamp = `\$\{appliedFilters\.startDate\}_\$\{appliedFilters\.endDate\}`/);
  assert.match(reports, /Não é possível consultar mais de 367 dias/);
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
  const [css, shell, panel, clients, professionals, settings] = await Promise.all([
    read("../app/product-ui.css"),
    read("../app/painel/PanelShell.tsx"),
    read("../app/painel/page.tsx"),
    read("../app/painel/clientes/page.tsx"),
    read("../app/painel/profissionais/page.tsx"),
    read("../app/painel/configurar/page.tsx"),
  ]);
  assert.match(css, /--sp-bronze/);
  assert.match(css, /--sp-radius: 16px/);
  assert.match(css, /customer-auth-wrap/);
  assert.match(css, /product-table/);
  assert.match(shell, /Navegação do painel/);
  assert.match(panel, /PanelShell/);
  assert.match(clients, /PanelShell/);
  assert.match(professionals, /PanelShell/);
  assert.match(settings, /configuration-page/);
  assert.match(settings, /configuration-card/);
  assert.match(settings, /configuration-hours-row/);
  assert.match(css, /\.configuration-page \{ padding: 20px 14px 104px !important; \}/);
  assert.match(css, /\.configuration-page \[style\*="grid-template-columns"\] \{ grid-template-columns: 1fr !important; \}/);
});

test("appointment list controls reveal the selected agenda section and do not offer a misleading back action", async () => {
  const bookings = await read("../app/meus-agendamentos/page.tsx");

  assert.doesNotMatch(bookings, /Voltar para minha agenda/);
  assert.match(bookings, /const appointmentListRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(bookings, /function selectAppointmentView\(nextView: ViewKey\)[\s\S]*?setView\(nextView\)[\s\S]*?appointmentListRef\.current\?\.scrollIntoView/);
  assert.match(bookings, /prefers-reduced-motion/);
  assert.match(bookings, /ref=\{appointmentListRef\}[\s\S]*?tabIndex=\{-1\}/);
  assert.match(bookings, /scrollMarginTop: 88/);
  assert.match(bookings, /onClick=\{\(\) => selectAppointmentView\(view === "upcoming" \? "history" : "upcoming"\)\}/);
  assert.match(bookings, /onClick=\{\(\) => selectAppointmentView\("upcoming"\)\}/);
  assert.match(bookings, /onClick=\{\(\) => selectAppointmentView\("history"\)\}/);
});

test("customer agenda uses the approved mobile appointment hierarchy without inventing totals", async () => {
  const [bookings, css] = await Promise.all([
    read("../app/meus-agendamentos/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(bookings, /className="customer-agenda-heading"/);
  assert.match(bookings, /className="customer-agenda-tabs"/);
  assert.match(bookings, /className="customer-appointment-list-card"/);
  assert.match(bookings, /className="customer-agenda-empty"/);
  assert.match(bookings, /Agendar novo horário/);
  assert.match(bookings, /Manter agendamento/);
  assert.match(bookings, /Confirmar cancelamento/);
  assert.match(bookings, /const itemWhatsapp = whatsapp\(shop\?\.whatsapp, shop\?\.name\);/);
  assert.match(bookings, /canChange && itemWhatsapp && <a className="customer-button secondary" href=\{itemWhatsapp\}[\s\S]*?>Falar com a barbearia<\/a>/);
  assert.match(bookings, /aria-label=\{`Falar com \$\{shop\?\.name \|\| "a barbearia"\} pelo WhatsApp`\}/);
  assert.doesNotMatch(bookings, /const wa = whatsapp\(/);
  assert.doesNotMatch(bookings, /Ver barbearia/);
  assert.doesNotMatch(bookings, /editorial-receipt-total-value[\s\S]*?>\s*Total\s*</);

  assert.match(css, /\.customer-agenda-tabs/);
  assert.match(css, /\.customer-appointment-list-card/);
  assert.match(css, /\.customer-agenda-empty/);
  assert.match(css, /\.customer-agenda-cover \{ aspect-ratio: 852 \/ 324; height: auto;/);
  assert.doesNotMatch(css, /\.customer-agenda-cover \{ height: clamp\(/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.customer-agenda-tabs/);
});

test("customer agenda keeps every future appointment in one layout and chooses a new booking destination explicitly", async () => {
  const bookings = await read("../app/meus-agendamentos/page.tsx");

  assert.match(bookings, /<p className="customer-eyebrow">ÁREA DO CLIENTE<\/p>/);
  assert.doesNotMatch(bookings, /customer-featured-appointment/);
  assert.match(bookings, /from\("barbershop_customers"\)[\s\S]*?select\("barbershops\(name,slug\)"\)/);
  assert.match(bookings, /const \[bookingShopChoices, setBookingShopChoices\] = useState\(false\);/);
  assert.match(bookings, /const router = useRouter\(\)/);
  assert.match(bookings, /if \(barbershops\.length === 1\)[\s\S]*?router\.push\(`\/\$\{barbershops\[0\]\.slug\}`\)/);
  assert.match(bookings, /barbershops\.length > 1[\s\S]*?setBookingShopChoices\(true\)/);
  assert.match(bookings, /Em qual barbearia você quer agendar\?/);
  assert.match(bookings, /canChange && itemWhatsapp/);
  assert.match(bookings, />Falar com a barbearia<\/a>/);
});

test("new booking brings the multi-barbershop choice into view", async () => {
  const bookings = await read("../app/meus-agendamentos/page.tsx");

  assert.match(bookings, /const bookingShopPickerRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(bookings, /useEffect\(\(\) => \{[\s\S]*?if \(!bookingShopChoices\) return;[\s\S]*?bookingShopPickerRef\.current\?\.scrollIntoView/);
  assert.match(bookings, /behavior: reduceMotion \? "auto" : "smooth"/);
  assert.match(bookings, /bookingShopPickerRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(bookings, /ref=\{bookingShopPickerRef\}[\s\S]*?tabIndex=\{-1\}/);
  assert.match(bookings, /Escolha a barbearia para abrir a agenda correta\./);
});

test("customer bottom navigation opens a linked barbershop instead of the commercial landing", async () => {
  const [navigation, bookings, profile, privacy] = await Promise.all([
    read("../app/customer-bottom-navigation.tsx"),
    read("../app/meus-agendamentos/page.tsx"),
    read("../app/meu-perfil/page.tsx"),
    read("../app/meu-perfil/privacidade/page.tsx"),
  ]);

  assert.match(navigation, /from\("barbershop_customers"\)/);
  assert.match(navigation, /const router = useRouter\(\)/);
  assert.match(navigation, /if \(barbershops\.length === 1\)[\s\S]*?router\.push\(`\/\$\{barbershops\[0\]\.slug\}`\)/);
  assert.match(navigation, /barbershops\.length > 1[\s\S]*?setChoosingBarbershop\(true\)/);
  assert.match(navigation, /Qual barbearia você quer acessar\?/);
  assert.match(navigation, /Escolha a barbearia que deseja abrir\./);
  assert.match(navigation, /href="\/meus-agendamentos"/);
  assert.match(bookings, /<CustomerBottomNavigation active="agenda" \/>/);
  assert.match(profile, /<CustomerBottomNavigation active="perfil" \/>/);
  assert.match(privacy, /<CustomerBottomNavigation active="perfil" \/>/);
});

test("public barbershop link never inherits private customer or management navigation", async () => {
  const publicPage = await read("../app/[slug]/page.tsx");

  assert.match(publicPage, /from\("customers"\)[\s\S]*?select\("name,phone"\)/);
  assert.doesNotMatch(publicPage, /isCustomer/);
  assert.doesNotMatch(publicPage, /<nav className=\{styles\.mobileNav\}[\s\S]*?href="\/meus-agendamentos"/);
  assert.doesNotMatch(publicPage, /href="\/meu-perfil"/);
  assert.doesNotMatch(publicPage, /Acessar minha área/);
  assert.match(publicPage, /data-public-visitor=\{!user \? "true" : "false"\}/);
  assert.match(publicPage, /Agendar horário/);
  assert.match(publicPage, /onClick=\{\(\) => openBooking\(1\)\}/);
});

test("inline cancellation keeps the customer in the agenda and exposes the updated status", async () => {
  const bookings = await read("../app/meus-agendamentos/page.tsx");

  assert.match(bookings, /const \[cancelPendingId, setCancelPendingId\] = useState<string \| null>\(null\);/);
  assert.match(bookings, /function requestCancellation\(itemId: string\)[\s\S]*?setCancelPendingId\(itemId\)/);
  assert.match(bookings, /if \(rebook && !window\.confirm\(/);
  assert.match(bookings, /setItems\(\(current\) => current\.map\(\(currentItem\) => currentItem\.id === item\.id \? \{ \.\.\.currentItem, status: "cancelled" \} : currentItem\)\);/);
  assert.match(bookings, /setMessage\("Agendamento cancelado\. Ele foi movido para o seu histórico\."\);/);
  assert.match(bookings, /setCancelPendingId\(null\)[\s\S]*?selectAppointmentView\("history"\)/);
  assert.match(bookings, /if \(rebook && targetPath\) \{[\s\S]*?router\.push\(targetPath\);[\s\S]*?return;/);
  assert.match(bookings, /aria-expanded=\{cancelPendingId === item\.id\}/);
  assert.match(bookings, /id=\{`cancel-confirmation-\$\{item\.id\}`\}/);
});

test("customer profile keeps the real profile contract in the approved editable mobile hierarchy", async () => {
  const [profile, css] = await Promise.all([
    read("../app/meu-perfil/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(profile, /const profileChanged = name\.trim\(\) !== profile\.name \|\| phone\.trim\(\) !== profile\.phone;/);
  assert.match(profile, /const \[editingProfile, setEditingProfile\] = useState\(false\);/);
  assert.match(profile, /disabled=\{!editingProfile\}/);
  assert.match(profile, /Editar dados/);
  assert.match(profile, /editingProfile && \(/);
  assert.match(profile, /setEditingProfile\(false\);/);
  assert.match(profile, /rpc\("save_my_customer_profile"/);
  assert.match(profile, /disabled\s*\/>/);
  assert.match(profile, /aria-invalid=\{Boolean\(fieldErrors\.name\)\}/);
  assert.match(profile, /aria-describedby=\{fieldErrors\.phone \? "customer-profile-phone-error" : "customer-profile-phone-note"\}/);
  assert.match(profile, /className="customer-profile-data-card"/);
  assert.match(profile, /className="customer-profile-shop-list"/);
  assert.match(profile, /className="customer-button customer-profile-save"/);
  assert.match(profile, /<p className="customer-eyebrow">ÁREA DO CLIENTE<\/p>/);
  assert.doesNotMatch(profile, /barbershops\[0\]\?\.name/);
  assert.ok(
    profile.indexOf('className="customer-profile-actions"') < profile.indexOf('className="customer-profile-shops"'),
    "as ações de edição devem vir antes dos vínculos com barbearias",
  );
  assert.doesNotMatch(profile, /💈|📅|👤/);
  assert.doesNotMatch(profile, />Seus dados<\/h2>/);
  assert.ok(
    profile.indexOf('customer-profile-data-card') < profile.indexOf('id="customer-preferences-title"')
      && profile.indexOf('id="customer-preferences-title"') < profile.indexOf("Privacidade e meus dados"),
    "perfil deve apresentar dados, depois comunicações e por último privacidade",
  );
  assert.match(css, /\.customer-profile-data-card/);
  assert.match(css, /\.customer-profile-shop-list/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.customer-profile-save/);
  assert.match(css, /\.customer-profile-data-card \{\s*padding: 0;\s*border: 0;/);
  assert.match(css, /\.customer-profile-heading \.customer-title \{ font-size: clamp\(40px, 10\.5vw, 54px\);/);
  assert.match(css, /\.customer-profile-field label \{ color: var\(--sp-ink\); font-size: 18px; font-weight: 800;/);
  assert.match(css, /\.customer-profile-input \{ min-height: 64px;/);
  assert.match(css, /\.customer-profile-save \{ width: 100%; min-height: 64px;/);
  assert.match(css, /\.customer-bottom-item \{[\s\S]*?font-size: 13px;[\s\S]*?font-weight: 750;/);
  assert.match(css, /\.customer-bottom-item\.active::before/);
});

test("customer privacy uses the approved concise wording for data access and account closure", async () => {
  const [profile, privacy] = await Promise.all([
    read("../app/meu-perfil/page.tsx"),
    read("../app/meu-perfil/privacidade/page.tsx"),
  ]);

  assert.match(profile, /Privacidade e meus dados/);
  assert.match(profile, /Consulte e baixe uma cópia dos seus dados ou encerre sua conta/);
  assert.match(privacy, /<h1 className="customer-title">Privacidade e meus dados<\/h1>/);
  assert.match(privacy, /Consulte e baixe uma cópia dos seus dados ou encerre sua conta/);
  assert.match(privacy, /Ao encerrar sua conta, seus dados pessoais serão apagados ou mantidos sem identificação, quando necessário\./);
});

test("marketing preferences remain local until explicit save and preserve draft on failure", async () => {
  const [profile, css] = await Promise.all([
    read("../app/meu-perfil/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(profile, /const \[savedPreferences, setSavedPreferences\] = useState<MarketingPreferences \| null>\(null\);/);
  assert.match(profile, /const preferencesChanged = Boolean\(preferences && savedPreferences && JSON\.stringify\(preferences\) !== JSON\.stringify\(savedPreferences\)\);/);
  assert.match(profile, /function updatePlatformMarketing\(platformMarketing: boolean\)/);
  assert.match(profile, /function updateBarbershopMarketing\(barbershopId: string, barbershopMarketing: boolean\)/);
  assert.match(profile, /async function saveMarketingPreferences\(\)/);
  assert.match(profile, /disabled=\{savingPreferences \|\| !preferencesChanged\}/);
  assert.match(profile, /Salvar preferências/);
  assert.match(profile, /setSavedPreferences\(\(current\) => reconcileSavedPreferences\(current, successfulChanges\)\);/);
  assert.match(profile, /className="customer-preferences-card"/);
  assert.match(css, /\.customer-preferences-card/);
  assert.match(css, /\.customer-preference-switch/);
});

test("marketing preferences reconcile partial scoped saves without retrying completed scopes", async () => {
  const profile = await read("../app/meu-perfil/page.tsx");

  assert.match(profile, /const \[failedPreferenceScopes, setFailedPreferenceScopes\] = useState<string\[\]>\(\[\]\);/);
  assert.match(profile, /type PreferenceSaveChange =/);
  assert.match(profile, /scope: "platform"/);
  assert.match(profile, /scope: `barbershop:\$\{barbershop\.barbershop_id\}`/);
  assert.match(profile, /const successfulChanges = results\.filter\(\(result\) => !result\.error\)\.map\(\(result\) => result\.change\);/);
  assert.match(profile, /const failedChanges = results\.filter\(\(result\) => result\.error\)\.map\(\(result\) => result\.change\);/);
  assert.match(profile, /setSavedPreferences\(\(current\) => reconcileSavedPreferences\(current, successfulChanges\)\);/);
  assert.match(profile, /setFailedPreferenceScopes\(failedChanges\.map\(\(change\) => change\.scope\)\);/);
  assert.match(profile, /Algumas preferências foram salvas, mas outras não puderam ser atualizadas\./);
  assert.match(profile, /failedPreferenceScopes\.includes\("platform"\)/);
  assert.match(profile, /failedPreferenceScopes\.includes\(`barbershop:\$\{barbershop\.barbershop_id\}`\)/);
});

test("customer privacy portal uses the approved mobile hierarchy without changing its sensitive contracts", async () => {
  const [privacy, css] = await Promise.all([
    read("../app/meu-perfil/privacidade/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(privacy, /className="customer-shell customer-privacy-shell"/);
  assert.match(privacy, /className="customer-editorial-cover customer-privacy-cover"/);
  assert.match(privacy, /className="customer-privacy-summary"/);
  assert.match(privacy, /customer-privacy-export/);
  assert.match(privacy, /className="customer-privacy-protocols"/);
  assert.match(privacy, /className="customer-privacy-danger"/);
  assert.match(privacy, /<CustomerBottomNavigation active="perfil" \/>/);
  assert.match(privacy, /export_my_customer_data/);
  assert.match(privacy, /delete-my-customer-account/);
  assert.match(privacy, /reauth=1/);
  assert.match(privacy, /Tem certeza que deseja encerrar sua conta no BarbeariaSP\?/);
  assert.match(privacy, /Conta cancelada conforme sua solicitação\./);
  assert.doesNotMatch(privacy, /Observações internas, auditorias/);
  assert.match(privacy, /Voltar ao perfil/);
  assert.match(css, /\.customer-privacy-summary/);
  assert.match(css, /\.customer-privacy-danger/);
  assert.match(css, /\.customer-privacy-confirmation/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.customer-privacy-summary/);
});

test("shared visual foundation defines approved tokens and mobile accessible controls", async () => {
  const css = await read("../app/product-ui.css");

  for (const token of [
    "--sp-canvas: #F7F3EC",
    "--sp-accent: #C85A35",
    "--sp-action-dark: #171719",
    "--sp-border: #E4DDD3",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(css, /\.product-button:focus-visible,[\s\S]*?\.customer-button:focus-visible/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.product-button,[\s\S]*?min-height: 48px/);
  assert.match(css, /\.product-skeleton/);
  assert.match(css, /\.product-notice\.permission/);
});
