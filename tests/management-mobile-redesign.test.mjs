import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("management access uses the approved photographic mobile composition", async () => {
  const [login, css] = await Promise.all([
    read("../app/entrar/page.tsx"),
    read("../app/product-ui.css"),
  ]);

  assert.match(login, /management-login-hero/);
  assert.match(login, /marketing-barbershop-hero\.png/);
  assert.match(login, /Voltar para o início/);
  assert.match(css, /\.management-login-hero/);
});

test("management navigation and settings expose every approved destination", async () => {
  const [shell, settings] = await Promise.all([
    read("../app/painel/PanelShell.tsx"),
    read("../app/painel/configurar/page.tsx"),
  ]);

  for (const label of ["Agenda", "Gestão", "Clientes", "Equipe", "Relatórios", "Configurações"]) {
    assert.match(shell, new RegExp(`"${label}"`));
  }
  assert.doesNotMatch(shell, /managementLinks\.filter/);
  assert.match(settings, /PanelShell/);
  assert.match(settings, /settings-hub/);
  for (const target of ["dados-barbearia", "servicos", "profissionais", "agenda-horarios", "equipe-acessos"]) {
    assert.match(settings, new RegExp(`id="${target}"`));
  }
  assert.match(settings, /Enviar pelo WhatsApp/);
  assert.match(settings, /Copiar link/);
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
