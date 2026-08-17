import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = new URL(
  "supabase/migrations/20260817090000_decouple_marketing_consent_from_booking.sql",
  root,
);

test("introduces a dedicated safe consent migration", async () => {
  const migrationExists = await access(migrationPath).then(
    () => true,
    () => false,
  );
  assert.equal(migrationExists, true);

  const migration = await read(
    "supabase/migrations/20260817090000_decouple_marketing_consent_from_booking.sql",
  );
  assert.match(migration, /create or replace function public\.save_my_customer_marketing_preferences/);
  assert.match(migration, /p_barbershop_marketing boolean default false/);
  assert.match(migration, /p_platform_marketing boolean default false/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function public\.save_my_customer_marketing_preferences[\s\S]*from public/);
  assert.match(migration, /revoke all on function public\.save_my_customer_marketing_preferences[\s\S]*from anon/);
  assert.match(migration, /grant execute on function public\.save_my_customer_marketing_preferences[\s\S]*to authenticated/);
});

test("makes absence non-authorizing and records only initial or changed choices", async () => {
  const migration = await read(
    "supabase/migrations/20260817090000_decouple_marketing_consent_from_booking.sql",
  );
  assert.match(migration, /'platform_marketing', coalesce\(v_platform, false\)/);
  assert.match(migration, /'platform_choice_recorded', v_platform_recorded/);
  assert.match(migration, /'barbershop_choice_recorded', x\.barbershop_choice_recorded/);
  assert.match(migration, /not v_platform_recorded or v_platform is distinct from p_platform_marketing/);
  assert.match(migration, /not v_barbershop_recorded or v_barbershop is distinct from p_barbershop_marketing/);
  assert.match(migration, /where c\.auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /where bc\.customer_id = v_customer_id and bc\.barbershop_id = p_barbershop_id/);
});

test("keeps booking consent-free and moves positive opt-in controls after success", async () => {
  const page = await read("app/[slug]/page.tsx");
  assert.doesNotMatch(page, /barbershopMarketingOptOut|platformMarketingOptOut/);
  const bookingCall = page.match(/rpc\("book_customer_appointment",\s*\{([\s\S]*?)\}\s*\)/);
  assert.ok(bookingCall);
  assert.doesNotMatch(bookingCall[1], /p_barbershop_marketing|p_platform_marketing/);
  assert.match(page, /showMarketingPreferences/);
  assert.match(page, /Aceito receber promoções e novidades desta barbearia\./);
  assert.match(page, /Aceito receber novidades e benefícios do aplicativo BarbeariaSP\./);
  assert.match(page, /Salvar preferências/);
  assert.match(page, /Continuar sem receber novidades/);
  assert.doesNotMatch(page, /Não quero receber|Sem marcar, você aceita/);
});

test("uses positive opt-in controls in the customer profile", async () => {
  const profile = await read("app/meu-perfil/page.tsx");
  assert.match(profile, /checked=\{preferences\.platform_marketing\}/);
  assert.match(profile, /Aceito receber novidades e benefícios do aplicativo BarbeariaSP\./);
  assert.match(profile, /Aceito receber promoções e novidades da barbearia/);
  assert.doesNotMatch(profile, /checked=\{!preferences\.platform_marketing\}/);
  assert.doesNotMatch(profile, /Não quero receber/);
});
