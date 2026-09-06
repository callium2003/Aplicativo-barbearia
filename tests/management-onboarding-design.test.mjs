import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("aligns management access and initial registration with the customer app language", async () => {
  const [login, registration, registrationStyles] = await Promise.all([
    read("../app/entrar/page.tsx"),
    read("../app/cadastro-inicial/page.tsx"),
    read("../app/cadastro-inicial/cadastro-inicial.module.css"),
  ]);

  assert.match(login, /customer-shell/);
  assert.match(login, /customer-card pad/);
  assert.match(login, /Acesse sua gestão/);
  assert.match(login, /Primeiro acesso\? Entre para criar sua barbearia/);
  assert.match(registration, /customer-shell/);
  assert.match(registration, /customer-topbar/);
  assert.match(registration, /Etapa \{step\} de 2/);
  assert.match(registration, /Configure sua agenda, equipe e serviços em seguida/);
  assert.match(registrationStyles, /var\(--sp-bg\)/);
});
