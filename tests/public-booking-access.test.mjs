import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("prevents administrative members from booking their own barbershop", async () => {
  const [page, rpcMigration, triggerMigration] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("supabase/migrations/20260811120000_prevent_staff_self_booking.sql"),
    read("supabase/migrations/20260811123000_enforce_staff_self_booking_trigger.sql"),
  ]);

  assert.match(page, /getPanelContext/);
  assert.match(page, /isAdministrativeShopMember/);
  assert.match(page, /Use uma conta de cliente separada/);
  assert.match(rpcMigration, /private\.current_barbershop_role\(p_barbershop_id\) is not null/);
  assert.match(rpcMigration, /security invoker/);
  assert.match(rpcMigration, /revoke execute[\s\S]*?from anon/);
  assert.match(triggerMigration, /private\.current_barbershop_role\(new\.barbershop_id\) is not null/);
  assert.match(triggerMigration, /set_and_validate_customer_appointment/);
});

test("keeps customer booking details and public actions concise", async () => {
  const [page, styles] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("app/[slug]/public-page.module.css"),
  ]);

  assert.match(page, /from\("customers"\)[\s\S]*?select\("name,phone"\)/);
  assert.doesNotMatch(page, /Falar conosco/);
  assert.match(page, /Não quero receber promoções e novidades da barbearia/);
  assert.match(page, /const \[barbershopMarketing, setBarbershopMarketing\] = useState\(false\)/);
  assert.match(page, /!user && <a href="\/entrar">Gestão<\/a>/);
  assert.match(styles, /\.hero\{flex-direction:column\}/);
  assert.match(styles, /\.heroContent h1\{font-size:clamp\(36px,4vw,56px\);overflow-wrap:normal;word-break:normal\}/);
});
