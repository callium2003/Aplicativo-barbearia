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

test("keeps customer authentication separate from management and retains booking drafts only for 15 minutes", async () => {
  const [clients, publicPage, customerLogin, appointments, profile, privacy] = await Promise.all([
    read("utils/supabase.ts"),
    read("app/[slug]/page.tsx"),
    read("app/cliente/entrar/page.tsx"),
    read("app/meus-agendamentos/page.tsx"),
    read("app/meu-perfil/page.tsx"),
    read("app/meu-perfil/privacidade/page.tsx"),
  ]);

  assert.match(clients, /export const customerSupabase = createClient\([\s\S]*?storageKey: "barbeariasp-customer-auth"/);
  for (const source of [publicPage, customerLogin, appointments, profile, privacy]) {
    assert.match(source, /customerSupabase/);
  }
  assert.match(publicPage, /pendingBookingMaxAgeMs = 15 \* 60 \* 1000/);
  assert.match(publicPage, /sessionStorage\.setItem\(pendingBookingKey/);
  assert.doesNotMatch(publicPage, /localStorage\.(?:setItem|getItem|removeItem)\(pendingBookingKey/);
  assert.match(publicPage, /customerSupabase as supabase/);
  assert.match(publicPage, /getPanelContext\(supabase\)/);
  assert.match(publicPage, /Use uma conta de cliente separada/);
});

test("keeps customer booking details and public actions concise", async () => {
  const [page, styles] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("app/[slug]/public-page.module.css"),
  ]);
  assert.match(page, /from\("customers"\)[\s\S]*?select\("name,phone"\)/);
  assert.doesNotMatch(page, /Falar conosco/);
  assert.doesNotMatch(page, /barbershopMarketingOptOut|platformMarketingOptOut/);
  assert.match(page, /showMarketingPreferences/);
  assert.match(page, /Aceito receber promoções e novidades desta barbearia\./);
  assert.match(page, /Aceito receber novidades e benefícios do aplicativo BarbeariaSP\./);
  assert.match(page, /!user && <a href="\/entrar">Gestão<\/a>/);
  assert.match(styles, /\.hero\{flex-direction:column\}/);
  assert.match(styles, /\.heroContent h1\{font-size:clamp\(36px,4vw,56px\);overflow-wrap:normal;word-break:normal\}/);
});

test("shows each configured general business hour on the public barbershop page", async () => {
  const page = await read("app/[slug]/page.tsx");

  assert.match(page, /type BusinessHour =/);
  assert.match(page, /from\("business_hours"\)/);
  assert.match(page, /select\("weekday,opens_at,closes_at,is_closed"\)/);
  assert.match(page, /formatBusinessHour/);
  assert.match(page, /businessHours\.map/);
  assert.doesNotMatch(page, /Escolha uma data no agendamento para consultar os horários disponíveis\./);
});

test("keeps the public profile accessible while disabling booking until setup is complete", async () => {
  const page = await read("app/[slug]/page.tsx");

  assert.match(page, /get_public_booking_status/);
  assert.match(page, /Agendamento online indisponível/);
  assert.match(page, /disabled=\{!bookingAvailable\}/);
  assert.match(page, /Esta barbearia ainda está preparando o agendamento online\./);
});

test("renders a valid dynamic barbershop photo directly from public Storage", async () => {
  const page = await read("app/[slug]/page.tsx");

  assert.match(page, /photoUrl && !photoUnavailable \? \(/);
  assert.match(page, /src=\{photoUrl\}[\s\S]*?unoptimized/);
  assert.doesNotMatch(page, /photoUrl\.includes\("a6e68ab6"\)/);
});

test("uses the supplied institutional BarbeariaSP image instead of a fictional barbershop as the public fallback", async () => {
  const page = await read("app/[slug]/page.tsx");

  assert.match(page, /src="\/barbeariasp-institutional-hero\.png"/);
  assert.doesNotMatch(page, /marketing-barbershop-hero\.png/);
  assert.doesNotMatch(page, /barbearia-central-hero\.png/);
});

test("keeps the public mobile shell independent from legacy global section spacing", async () => {
  const styles = await read("app/[slug]/public-page.module.css");
  assert.match(styles, /\.hero\s*\{[\s\S]*?padding:\s*0;/);
  assert.match(styles, /\.showcaseSection\s*\{[\s\S]*?padding:\s*0;/);
  assert.match(styles, /\.content\s*\{[\s\S]*?width:\s*min\(100%,\s*430px\)/);
});

test("does not render a bottom navigation on the public barbershop page", async () => {
  const page = await read("app/[slug]/page.tsx");
  assert.doesNotMatch(page, /<nav className=\{styles\.mobileNav\}/);
  assert.doesNotMatch(page, /mobileNavSection/);
});

test("keeps the public page inside a 360px mobile viewport", async () => {
  const styles = await read("app/[slug]/public-page.module.css");
  assert.match(styles, /\.page\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-x:\s*clip;/);
  assert.match(styles, /\.serviceCircleItem\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.successDetails>div\s*\{[^}]*grid-template-columns:/);
});

test("keeps the public booking trigger focused on the barbershop agenda", async () => {
  const page = await read("app/[slug]/page.tsx");

  assert.match(page, /function openBooking[\s\S]*?setBookingStep\(step\)[\s\S]*?focusBookingStep\(step\)/);
  assert.match(page, /onClick=\{\(\) => openBooking\(1\)\}/);
});

test("keeps the public booking flow in four visual steps with an accessible monthly calendar", async () => {
  const [page, styles] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("app/[slug]/public-page.module.css"),
  ]);
  assert.match(page, /aria-label="Mês anterior"/);
  assert.match(page, /aria-label="Próximo mês"/);
  assert.match(page, /calendarDay/);
  assert.match(page, /setBookingStep\(4\)/);
  assert.match(styles, /\.calendarGrid\s*\{[^}]*grid-template-columns:\s*repeat\(7,/);
  assert.match(styles, /\.slotList\s*\{[^}]*grid-template-columns:\s*repeat\(4,/);
});

test("moves focus and viewport to the active booking step without returning home", async () => {
  const page = await read("app/[slug]/page.tsx");
  assert.match(page, /function focusBookingStep\(step: 1 \| 2 \| 3 \| 4\)/);
  assert.match(page, /prefers-reduced-motion/);
  assert.match(page, /activeStepHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /function openBooking\(step: 1 \| 2 \| 3 \| 4 = 1\)[\s\S]*?focusBookingStep\(step\)/);
});

test("renders every eligible public professional without using a photo as a filter", async () => {
  const page = await read("app/[slug]/page.tsx");
  assert.match(page, /Object\.values\(publicProfessionals\)\.map\(\(professional\) => \(/);
  assert.doesNotMatch(page, /Object\.values\(publicProfessionals\)\.filter\(\(professional\) => professional\.photo_url\)/);
});

test("places confirmation at its own summary instead of the wizard header", async () => {
  const page = await read("app/[slug]/page.tsx");
  assert.match(page, /const confirmationRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(page, /const target = step === 4 \? confirmationRef : bookingRef/);
  assert.match(page, /className=\{styles\.confirmationCard\} ref=\{confirmationRef\}/);
});

test("uses the real public availability probe for every selectable calendar date", async () => {
  const page = await read("app/[slug]/page.tsx");
  assert.match(page, /const \[calendarAvailability, setCalendarAvailability\]/);
  assert.match(page, /p_service_ids: \[probeService\.id\]/);
  assert.match(page, /calendarAvailability\[key\] === true/);
  assert.match(page, /const selected = key === selectedDate && available;/);
  assert.doesNotMatch(page, /day\.getMonth\(\) === calendarMonth\.getMonth\(\) && key >= dateForInput\(\)/);
  assert.match(page, /setCalendarMonth\(new Date\(day\.getFullYear\(\), day\.getMonth\(\), 1\)\)/);
});

test("documents why T02 uses the shortest active service as its preliminary availability probe", async () => {
  const [page, specification] = await Promise.all([
    read("app/[slug]/page.tsx"),
    read("docs/PRODUCT-DESIGN-SPECIFICATION-20260907.md"),
  ]);

  assert.match(page, /T02 preliminary availability invariant/);
  assert.match(page, /no professional.*service association/i);
  assert.match(page, /all active professionals.*eligible/i);
  assert.match(page, /only availability effect of a service is its duration/i);
  assert.match(page, /no slot fits the shortest active service/i);
  assert.match(specification, /serviços realizados por profissional/i);
  assert.match(specification, /T02 preliminary availability rule/i);
});
