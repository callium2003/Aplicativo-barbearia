import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("prevents administrative members from booking their own barbershop", async () => {
  const [page, migration] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("supabase/migrations/20260811120000_prevent_staff_self_booking.sql"),
  ]);

  assert.match(page, /getPanelContext/);
  assert.match(page, /isAdministrativeShopMember/);
  assert.match(page, /Use uma conta de cliente separada/);
  assert.match(migration, /private\.current_barbershop_role\(p_barbershop_id\) is not null/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /revoke execute[\s\S]*?from anon/);
});

test("keeps customer booking details and public actions concise", async () => {
  const [page, styles] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("app/[slug]/public-page.module.css"),
  ]);

  assert.match(page, /from\("customers"\)[\s\S]*?select\("name,phone"\)/);
  assert.doesNotMatch(page, /Falar conosco/);
  assert.match(page, /!user && <a href="\/entrar">Gestão<\/a>/);
  assert.match(styles, /\.hero\{flex-direction:column\}/);
});
