import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { moreDestinationsForRole } from "../app/painel/navigation.mjs";

test("moreDestinationsForRole exposes Suporte e Ajuda to owner and manager only", () => {
  const ownerDestinations = moreDestinationsForRole("owner");
  const managerDestinations = moreDestinationsForRole("manager");
  const barberDestinations = moreDestinationsForRole("barber");

  const ownerSupport = ownerDestinations.find((d) => d.href === "/painel/suporte");
  assert.ok(ownerSupport, "owner must have /painel/suporte");
  assert.equal(ownerSupport.label, "Suporte e Ajuda");

  const managerSupport = managerDestinations.find((d) => d.href === "/painel/suporte");
  assert.ok(managerSupport, "manager must have /painel/suporte");
  assert.equal(managerSupport.label, "Suporte e Ajuda");

  const barberSupport = barberDestinations.find((d) => d.href === "/painel/suporte");
  assert.equal(barberSupport, undefined, "barber must not have /painel/suporte");
});

test("tenant support page defines FAQ search, SLA guarantee notice, and ticket creation form", async () => {
  const source = await readFile(new URL("../app/painel/suporte/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Suporte e Ajuda/);
  assert.match(source, /Perguntas Frequentes \(FAQ\)/);
  assert.match(source, /Meus Chamados/);
  assert.match(source, /SLA garantido de 1 dia útil/);
  assert.match(source, /createPlatformSupportTicket/);
  assert.match(source, /replyPlatformSupportTicket/);
  assert.match(source, /updatePlatformSupportTicketStatus/);
});

test("platform support page defines ticket monitoring, SLA tracking, and CullenTech responses", async () => {
  const source = await readFile(new URL("../app/plataforma/suporte/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Central de Chamados & Suporte/);
  assert.match(source, /listAllPlatformSupportTickets/);
  assert.match(source, /calculateTicketSlaStatus/);
  assert.match(source, /replyPlatformSupportTicket/);
  assert.match(source, /updatePlatformSupportTicketStatus/);
  assert.match(source, /SLA crítico ou vencido/);
  assert.match(source, /styles\.initialDescriptionBox/);
  assert.match(source, /styles\.descriptionText/);
  assert.match(source, /styles\.messagesList/);
  assert.match(source, /styles\.ticketModalActions/);
});

test("support and platform modals enforce single unified scroll container and word-wrap on descriptions", async () => {
  const tenantCss = await readFile(new URL("../app/painel/suporte/support.module.css", import.meta.url), "utf8");
  const platformCss = await readFile(new URL("../app/plataforma/platform.module.css", import.meta.url), "utf8");

  for (const [name, css] of [
    ["support.module.css", tenantCss],
    ["platform.module.css", platformCss],
  ]) {
    assert.match(css, /\.modalCard\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*40px\)/, `${name} must cap modalCard height on desktop`);
    assert.match(css, /\.modalCard\s*\{[^}]*overflow-y:\s*auto/, `${name} must scroll inside modalCard`);
    assert.match(css, /\.modalCard\s*\{[^}]*overflow-x:\s*hidden/, `${name} must prevent horizontal overflow on modalCard`);
    assert.match(css, /\.initialDescriptionBox\s*\{[^}]*word-break:\s*break-word/, `${name} must wrap words in initialDescriptionBox`);
    assert.match(css, /\.initialDescriptionBox\s*\{[^}]*overflow-wrap:\s*anywhere/, `${name} must wrap long unbroken strings in initialDescriptionBox`);
    assert.match(css, /\.descriptionText\s*\{[^}]*overflow-wrap:\s*anywhere/, `${name} must wrap long unbroken strings in descriptionText`);
  }
});

test("every form field in support pages defines both id and name attributes for browser autofill compliance", async () => {
  const tenantSource = await readFile(new URL("../app/painel/suporte/page.tsx", import.meta.url), "utf8");
  const platformSource = await readFile(new URL("../app/plataforma/suporte/page.tsx", import.meta.url), "utf8");
  const incidentsSource = await readFile(new URL("../app/plataforma/incidentes/page.tsx", import.meta.url), "utf8");
  const loginSource = await readFile(new URL("../app/plataforma/entrar/page.tsx", import.meta.url), "utf8");

  for (const [label, src] of [
    ["app/painel/suporte/page.tsx", tenantSource],
    ["app/painel/suporte/chamados/page.tsx", await readFile(new URL("../app/painel/suporte/chamados/page.tsx", import.meta.url), "utf8")],
    ["app/plataforma/suporte/page.tsx", platformSource],
    ["app/plataforma/incidentes/page.tsx", incidentsSource],
    ["app/plataforma/entrar/page.tsx", loginSource],
  ]) {
    const tagMatches = src.match(/<(input|select|textarea)\b[\s\S]*?>/g) ?? [];
    assert.ok(tagMatches.length > 0, `${label} should contain form fields`);
    for (const tag of tagMatches) {
      assert.match(tag, /\bid=/, `${label} field missing id attribute: ${tag}`);
      assert.match(tag, /\bname=/, `${label} field missing name attribute: ${tag}`);
    }
  }
});

test("notification bell routes support ticket notifications directly to dedicated tickets page", async () => {
  const bellSource = await readFile(new URL("../app/painel/NotificationBell.tsx", import.meta.url), "utf8");
  const tenantSource = await readFile(new URL("../app/painel/suporte/page.tsx", import.meta.url), "utf8");
  const chamadosSource = await readFile(new URL("../app/painel/suporte/chamados/page.tsx", import.meta.url), "utf8");

  assert.match(bellSource, /router\.push\("\/painel\/suporte\/chamados"\)/, "NotificationBell must route directly to dedicated tickets page");
  assert.match(bellSource, /setOpen\(false\)/, "NotificationBell must close popover on notification click");
  assert.match(tenantSource, /window\.location\.replace\("\/painel\/suporte\/chamados"\)/, "SuportePage must forward legacy query parameter to dedicated chamados route");
  assert.match(chamadosSource, /Meus Chamados/, "Dedicated chamados page must render Meus Chamados");
  assert.match(chamadosSource, /Histórico de Chamados/, "Dedicated chamados page must render ticket history");
});

test("mobile support css stacks tabs vertically with bullets and layouts ticket filters in 3 columns without horizontal scroll", async () => {
  const tenantCss = await readFile(new URL("../app/painel/suporte/support.module.css", import.meta.url), "utf8");

  assert.match(tenantCss, /\.tabs\s*\{[^}]*flex-direction:\s*column/, "mobile tabs must stack vertically");
  assert.match(tenantCss, /\.tabBullet/, "tab bullet must be defined");
  assert.match(tenantCss, /\.tabButtonActive\s*\.tabBullet\s*\{[^}]*background:\s*var\(--sp-primary/, "active tab bullet must use brand primary color");
  assert.match(tenantCss, /\.ticketFilterChips\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "mobile ticket filter chips must use 3-column grid");
  assert.match(tenantCss, /\.ticketFilterChipActive\s*\{[^}]*background:\s*var\(--sp-primary/, "active filter chip must use brand primary color");
});

test("navigation links in panel shell and notification bell declare prefetch={false} to prevent unused CSS preload warnings", async () => {
  const shellSource = await readFile(new URL("../app/painel/PanelShell.tsx", import.meta.url), "utf8");
  const bellSource = await readFile(new URL("../app/painel/NotificationBell.tsx", import.meta.url), "utf8");

  assert.match(shellSource, /<Link prefetch=\{false\} className="product-brand"/, "PanelShell brand link must disable prefetch");
  assert.match(shellSource, /prefetch=\{false\}[\s\S]*?key=\{`\$\{href\}-\$\{index\}`\}/, "PanelShell nav links must disable prefetch");
  assert.match(shellSource, /prefetch=\{false\}[\s\S]*?key=\{`mobile-\$\{href\}-\$\{index\}`\}/, "PanelShell mobile dock links must disable prefetch");
  assert.match(bellSource, /<Link prefetch=\{false\} className="notification-settings-link"/, "NotificationBell settings link must disable prefetch");
});

test("platform support page switches from wide table to responsive vertical card list on mobile screens", async () => {
  const platformSource = await readFile(new URL("../app/plataforma/suporte/page.tsx", import.meta.url), "utf8");
  const platformCss = await readFile(new URL("../app/plataforma/platform.module.css", import.meta.url), "utf8");

  assert.match(platformSource, /styles\.tableWrapDesktop/, "Platform support must declare desktop table wrap");
  assert.match(platformSource, /styles\.cardsWrapMobile/, "Platform support must declare mobile cards wrap");
  assert.match(platformSource, /styles\.ticketMobileCard/, "Platform support must declare mobile ticket card");
  assert.match(platformSource, /styles\.mobileAttendButton/, "Platform support must declare mobile attend button");

  assert.match(platformCss, /\.tableWrapDesktop\s*\{\s*display:\s*none\s*;?\s*\}/, "CSS must hide desktop table on mobile");
  assert.match(platformCss, /\.cardsWrapMobile\s*\{\s*display:\s*flex/, "CSS must display vertical cards on mobile");
});



