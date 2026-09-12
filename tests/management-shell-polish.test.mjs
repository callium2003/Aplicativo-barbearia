import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("keeps only the five primary management destinations in the desktop shell", async () => {
  const navigation = await read("../app/painel/navigation.mjs");

  const primary = navigation.match(/export const managementLinks = \[([\s\S]*?)\];/)?.[1] || "";
  assert.match(primary, /"Início"/);
  assert.match(primary, /"Agenda"/);
  assert.match(primary, /"Clientes"/);
  assert.match(primary, /"Equipe"/);
  assert.match(primary, /"Mais"/);
  assert.doesNotMatch(primary, /"Relatórios"|"Notificações"|"Configurações"/);
});

test("uses the concise approved management labels and keeps alerts after shortcuts", async () => {
  const [home, agenda, clients, team, reports] = await Promise.all([
    read("../app/painel/page.tsx"),
    read("../app/painel/agenda/page.tsx"),
    read("../app/painel/clientes/page.tsx"),
    read("../app/painel/profissionais/page.tsx"),
    read("../app/painel/relatorios/page.tsx"),
  ]);

  assert.match(home, /<h2 id="shortcuts-title">\{isBarber \? "Acesso rápido" : "Gestão"\}<\/h2>/);
  assert.doesNotMatch(home, /Continue a gestão|<span>Continuar<\/span>/);
  assert.ok(home.indexOf('id="shortcuts-title"') < home.indexOf('id="alerts-title"'));
  assert.doesNotMatch(agenda, /Operação diária/);
  assert.match(clients, /<h1 className="product-title">Clientes<\/h1>/);
  assert.doesNotMatch(clients, /Relacionamento|Sua base de clientes/);
  assert.match(team, /<h1 className="product-title">Equipe<\/h1>/);
  assert.doesNotMatch(team, /<h1 className="product-title">Profissionais<\/h1>/);
  assert.match(reports, /<h1 className="product-title">Relatórios<\/h1>/);
  assert.doesNotMatch(reports, /Receita e ticket consideram atendimentos concluídos/);
});

test("uses the compact header and reserves enough room for the final team card on mobile", async () => {
  const css = await read("../app/product-ui.css");

  assert.match(css, /\.product-brand\s*\{[\s\S]*?font-size:\s*16px/);
  assert.match(css, /\.product-avatar\s*\{[\s\S]*?width:\s*32px[\s\S]*?height:\s*32px/);
  assert.match(css, /\.product-sign-out\s*\{[\s\S]*?min-height:\s*32px/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.management-team-page\s*\{[\s\S]*?padding-bottom:\s*112px/);
});
