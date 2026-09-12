import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("professional navigation exposes five distinct self-service destinations", async () => {
  const shell = await read("../app/painel/PanelShell.tsx");

  const links = shell.match(/const barberLinks = \[([\s\S]*?)\] as const;/)?.[1] || "";
  assert.match(links, /"\/painel\/agenda", "Minha agenda"/);
  assert.match(links, /"\/painel\/minha-disponibilidade", "Disponibilidade"/);
  assert.match(links, /"\/painel\/notificacoes", "Notificações"/);
  assert.match(links, /"\/painel\/meu-perfil", "Meu perfil"/);
  assert.match(links, /"\/painel\/minha-conta", "Minha conta"/);
  assert.doesNotMatch(links, /#disponibilidade|#meu-perfil|"\/painel", "Início"/);
});

test("professional agenda contains only operational appointments", async () => {
  const agenda = await read("../app/painel/agenda/page.tsx");

  assert.doesNotMatch(agenda, /ProfessionalProfile|Minha disponibilidade|Registrar ausência/);
  assert.doesNotMatch(agenda, /professional_hours|professional_breaks|professional_time_blocks/);
  assert.match(agenda, /shop\.role !== "barber"[\s\S]*?>Cancelar<\/button>/);
  assert.match(agenda, /\.eq\("professional_id", currentShop\.professional_id\)/);
});

test("professional agenda limits status actions to its own appointments and never exposes cancellation", async () => {
  const [agenda, migration] = await Promise.all([
    read("../app/painel/agenda/page.tsx"),
    read("../supabase/migrations/20260909154505_simplify_appointment_status.sql"),
  ]);

  assert.match(agenda, /currentShop\.role === "barber" \? currentShop\.professional_id/);
  assert.match(agenda, /shop\.role !== "barber" && <button[^>]*>[\s\S]*?>Cancelar<\/button>/);
  assert.match(agenda, /className="management-agenda-row-feedback"[\s\S]*?<ActionFeedback/);
  assert.match(migration, /v_role = 'barber' and \([\s\S]*?p_status = 'cancelled'[\s\S]*?v_appointment\.professional_id is distinct from private\.current_barber_professional_id/i);
});

test("professional self-service screens have dedicated routes", async () => {
  const routes = [
    "../app/painel/minha-disponibilidade/page.tsx",
    "../app/painel/meu-perfil/page.tsx",
    "../app/painel/minha-conta/page.tsx",
  ];

  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));

  const [availability, profile, account] = await Promise.all(routes.map(read));
  assert.match(availability, /ProfessionalAvailability/);
  assert.match(profile, /ProfessionalProfile/);
  assert.match(account, /role === "barber"/);
});

test("professional shell uses the professional identity and keeps five mobile destinations inside the viewport", async () => {
  const [shell, css] = await Promise.all([
    read("../app/painel/PanelShell.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(shell, /getPanelContext/);
  assert.match(shell, /accountName/);
  assert.match(shell, /product-shell-role-\$\{role\}/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.product-mobile-nav\s*\{[^}]*overflow-x:\s*hidden/);
  assert.match(css, /#meu-perfil > form > \.product-button:not\(\.secondary\)/);
  assert.match(css, /professional-self-service-page \.product-card \{[^}]*background: var\(--sp-surface\)/);
});

test("professional availability exposes inherited and customized schedules, while account exposes only personal completed work", async () => {
  const [availability, account] = await Promise.all([
    read("../app/painel/ProfessionalAvailability.tsx"),
    read("../app/painel/minha-conta/page.tsx"),
  ]);

  assert.match(availability, /Usar agenda da barbearia/);
  assert.match(availability, /Personalizar minha agenda/);
  assert.match(availability, /set_my_professional_schedule_mode/);
  assert.match(availability, /professional-availability-submit/);
  assert.match(account, /Atendimentos realizados/);
  assert.match(account, /service_price_snapshot/);
  assert.match(account, /\.eq\("status", "completed"\)/);
});

test("booking prevents a customer from overlapping own active appointments at one barbershop", async () => {
  const migration = await read("../supabase/migrations/20260912141000_prevent_customer_overlapping_appointments.sql");

  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /appointment\.customer_id = new\.customer_id/);
  assert.match(migration, /appointment\.barbershop_id = new\.barbershop_id/);
  assert.match(migration, /appointment\.starts_at < new\.ends_at/);
  assert.match(migration, /appointment\.ends_at > new\.starts_at/);
});
