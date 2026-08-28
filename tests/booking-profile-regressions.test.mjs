import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { formatRecurringBreakLabel } from "../utils/format-recurring-break.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("formats recurring professional breaks in readable Brazilian Portuguese", async () => {
  const page = await read("app/painel/profissionais/page.tsx");

  assert.doesNotMatch(page, /SÃ|NÃ|Â|â€“|horÃ|perÃ|fÃ|inÃ/);
  assert.match(page, /formatRecurringBreakLabel\(item\.weekday, item\.starts_at, item\.ends_at\)/);
  assert.equal(formatRecurringBreakLabel(3, "13:00:00", "14:00:00"), "Qua: 13h às 14h");
  assert.equal(formatRecurringBreakLabel(6, "09:30:00", "10:10:00"), "Sáb: 9h30 às 10h10");
});

test("removes the obsolete three-argument marketing preference RPC", async () => {
  const migrationDirectory = new URL("supabase/migrations/", root);
  const migrationNames = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql"));
  const migrations = (await Promise.all(
    migrationNames.map((name) => read(`supabase/migrations/${name}`)),
  )).join("\n");

  assert.match(
    migrations,
    /drop function if exists public\.save_my_customer_marketing_preferences\(uuid, boolean, boolean\)/i,
  );
});

test("offers a local sign-out action on the public booking page", async () => {
  const page = await read("app/[slug]/page.tsx");

  assert.match(page, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(page, /Sair ou trocar de conta/);
  assert.match(page, /Sair da gestão e trocar de conta/);
  assert.match(page, /clearPendingBooking\(\)/);
});

test("warns clearly what account deletion removes and what history remains", async () => {
  const page = await read("app/meu-perfil/privacidade/page.tsx");

  assert.match(page, /agendamentos futuros serão excluídos/i);
  assert.match(page, /agendamentos concluídos[^.]*data e serviço/i);
  assert.match(page, /não poderá ser desfeita/i);
});
