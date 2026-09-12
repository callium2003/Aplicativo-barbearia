import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  clientEmptyMessage,
  clientInitials,
} from "../app/painel/clientes/presentation.mjs";

test("client initials use the first two meaningful name parts", () => {
  assert.equal(clientInitials("João Pedro da Silva"), "JP");
  assert.equal(clientInitials("  Ana  "), "AN");
  assert.equal(clientInitials(""), "CL");
});

test("empty client copy distinguishes an empty base from an empty search", () => {
  assert.equal(
    clientEmptyMessage(""),
    "Ainda não há clientes com agendamentos nesta barbearia.",
  );
  assert.equal(
    clientEmptyMessage("maria"),
    "Nenhum cliente corresponde à busca atual.",
  );
});

test("clients page uses the approved compact metric panel and customer list", () => {
  const source = readFileSync(
    new URL("../app/painel/clientes/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /management-clients-metric-panel/);
  assert.match(source, /management-client-row/);
  assert.doesNotMatch(source, /product-card product-stat/);
  assert.doesNotMatch(source, /management-client-facts/);
});
