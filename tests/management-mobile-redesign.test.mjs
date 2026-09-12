import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  managementLinks,
  managementMobileKeys,
  moreDestinationsForRole,
} from "../app/painel/navigation.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("management and customer access delimit the institutional image before it begins", async () => {
  const [login, customerLogin, css] = await Promise.all([
    read("../app/entrar/page.tsx"),
    read("../app/cliente/entrar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(login, /management-login-hero/);
  assert.match(login, /management-login-image-spacer/);
  assert.match(customerLogin, /management-login-image-spacer/);
  assert.match(login, /barbeariasp-institutional-hero\.png/);
  assert.match(login, /Voltar para o início/);
  assert.match(css, /\.management-login-hero/);
  assert.match(css, /\.management-login-image-spacer\s*\{[^}]*min-height:\s*clamp\(8px,\s*1\.2vw,\s*16px\)/);
  assert.match(css, /\.management-login-hero\s*>\s*img\s*\{[\s\S]*?object-position:\s*left top/);
});

test("management navigation keeps the five primary destinations and exposes secondary destinations in More", async () => {
  const [shell, settings] = await Promise.all([
    read("../app/painel/PanelShell.tsx"),
    read("../app/painel/configurar/page.tsx"),
  ]);

  for (const label of ["Início", "Agenda", "Clientes", "Equipe", "Mais"]) {
    assert.ok(managementLinks.some((link) => link.label === label));
  }
  for (const label of ["Relatórios", "Configurações"]) {
    assert.equal(managementLinks.some((link) => link.label === label), false);
  }
  assert.ok(moreDestinationsForRole("owner").some((destination) => destination.label === "Relatórios"));
  assert.match(shell, /managementMobileKeys/);
  assert.match(shell, /product-shell-/);
  assert.match(settings, /settings-hub/);
  for (const target of ["dados-barbearia", "servicos", "profissionais", "agenda-horarios", "equipe-acessos"]) {
    assert.match(settings, new RegExp(`id="${target}"`));
  }
  assert.match(settings, /Enviar pelo WhatsApp/);
  assert.match(settings, /Copiar link/);
});

test("management primary navigation follows the approved mobile order and role-aware More index", () => {
  assert.deepEqual(
    managementMobileKeys.map((key) => managementLinks.find((link) => link.key === key)?.label),
    ["Início", "Agenda", "Clientes", "Equipe", "Mais"],
  );

  assert.deepEqual(
    moreDestinationsForRole("manager").map(({ href, label }) => [href, label]),
    [
      ["/painel/dados-da-barbearia", "Dados da barbearia"],
      ["/painel/servicos", "Serviços"],
      ["/painel/horarios", "Horários"],
      ["/painel/notificacoes", "Notificações"],
      ["/painel/relatorios", "Relatórios"],
      ["/painel/minha-conta", "Minha conta"],
    ],
  );
  assert.deepEqual(
    moreDestinationsForRole("owner").map(({ href, label }) => [href, label]),
    [
      ["/painel/dados-da-barbearia", "Dados da barbearia"],
      ["/painel/servicos", "Serviços"],
      ["/painel/horarios", "Horários"],
      ["/painel/notificacoes", "Notificações"],
      ["/painel/relatorios", "Relatórios"],
      ["/painel/assinatura", "Assinatura"],
      ["/painel/minha-conta", "Minha conta"],
    ],
  );
  assert.equal(moreDestinationsForRole("barber").length, 0);
});

test("keeps notification channel preferences inside the notification module", async () => {
  const [settingsLayout, notifications] = await Promise.all([
    read("../app/painel/configurar/layout.tsx"),
    read("../app/painel/notificacoes/page.tsx"),
  ]);

  assert.doesNotMatch(settingsLayout, /NotificationPreferencesPanel/);
  assert.match(notifications, /NotificationPreferencesPanel/);
  assert.match(notifications, /get_my_notification_preferences/);
  assert.match(notifications, /Preferências/);
});

test("keeps contextual settings pages easy to leave and the More index vertically extensible", async () => {
  const [settingsLayout, css] = await Promise.all([
    read("../app/painel/configurar/layout.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(settingsLayout, /Voltar para Mais/);
  assert.match(settingsLayout, /\/painel\/mais/);
  assert.match(settingsLayout, /\/painel\/horarios/);
  assert.match(css, /\.management-more-index\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.management-more-index\s+\.ios-settings-item\s*\{[^}]*grid-template-columns/s);
});

test("prioritizes unread notifications and uses one consistent mobile back action", async () => {
  const [shell, notifications, preferences, signOut, css] = await Promise.all([
    read("../app/painel/PanelShell.tsx"),
    read("../app/painel/notificacoes/page.tsx"),
    read("../app/painel/configurar/NotificationPreferencesPanel.tsx"),
    read("../app/painel/SignOutButton.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(shell, /mobileBackHref/);
  assert.match(shell, /mobileBackLabel/);
  assert.match(shell, /\/painel\/notificacoes#preferencias/);
  assert.match(notifications, /useState<ViewKey>\("unread"\)/);
  assert.match(notifications, /Não lidas \(\{unread\.length\}\)[\s\S]*?Histórico \(\{notifications\.length\}\)/);
  assert.match(notifications, /mobileBackHref=\{role === "barber" \? "\/painel\/agenda" : "\/painel\/mais"\}/);
  assert.match(preferences, /eventos configuráveis/);
  assert.match(signOut, /product-sign-out/);
  assert.doesNotMatch(signOut, /style=\{\{ padding: "9px 12px"/);
  assert.match(css, /\.product-sign-out\s*\{/);
  assert.match(css, /\.product-shell-more > \.product-topbar/);
  assert.match(css, /\.product-shell-notifications > \.product-topbar/);
});

test("keeps technical email delivery history out of the notification center", async () => {
  const [notifications, css] = await Promise.all([
    read("../app/painel/notificacoes/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(notifications, /className="product-chip-row management-notification-tabs"/);
  assert.doesNotMatch(notifications, /get_notification_delivery_monitor|Histórico de e-mails/);
  assert.match(css, /\.management-notification-tabs \.product-chip\[data-active="true"\]/);
  assert.match(css, /\.management-notification-tabs \.product-chip\[data-active="true"\]\s*\{[^}]*background:\s*#7d3516\s*!important[^}]*color:\s*#fff\s*!important/s);
});

test("uses the approved concise public-profile copy and rounded create-service action", async () => {
  const [settingsLayout, css] = await Promise.all([
    read("../app/painel/configurar/layout.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(settingsLayout, /Cadastre as informações que seus clientes consultam sobre a barbearia\./);
  assert.match(css, /\.management-service-new\s*\{[^}]*border-radius:\s*14px\s*!important/s);
});

test("reports keep all functions and collapse to labeled cards on phones", async () => {
  const [reports, css] = await Promise.all([
    read("../app/painel/relatorios/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  for (const table of ["appointments", "team", "services", "clients", "commissions"]) {
    assert.match(reports, new RegExp(`data-report-table="${table}"`));
  }
  assert.match(reports, /Exportar CSV/);
  assert.match(reports, /togglePayment/);
  assert.match(css, /\[data-report-table\]/);
  assert.match(css, /content: attr\(data-label\)/);
});
