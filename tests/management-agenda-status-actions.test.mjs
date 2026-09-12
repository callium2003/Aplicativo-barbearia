import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("agenda treats scheduled bookings as definitive and uses secure final-status actions", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product-ui.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, />Confirmar<\/button>/);
  assert.doesNotMatch(page, /onUpdateStatus\(item, "confirmed"\)/);
  assert.match(page, /supabase\.rpc\("set_appointment_status"/);
  assert.doesNotMatch(page, /from\("appointments"\)\.update/);
  assert.match(page, /management-agenda-status-action is-complete/);
  assert.match(page, /management-agenda-status-action is-no-show/);
  assert.match(css, /\.management-agenda-status-action\.is-complete[\s\S]*?background:\s*var\(--sp-accent\)/);
  assert.match(css, /\.management-agenda-status-action\.is-no-show[\s\S]*?background:\s*var\(--sp-surface\)/);
  assert.doesNotMatch(css, /\.management-agenda-status-action[^}]*background:\s*#201d19/);
});

test("agenda removes confirmed as a visible metric and filter", async () => {
  const page = await readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Metric label="Agendados" value=\{stats\.scheduled\}/);
  assert.doesNotMatch(page, /Metric label="Confirmados"/);
  assert.doesNotMatch(page, /\["all","scheduled","confirmed"/);
});

test("notification preferences no longer expose operational confirmation", async () => {
  const preferences = await readFile(new URL("../app/painel/configurar/NotificationPreferencesPanel.tsx", import.meta.url), "utf8");
  assert.match(preferences, /item\.event_type !== "appointment_confirmed"/);
  assert.match(preferences, /3 eventos configuráveis/);
});

test("each appointment renders its own status feedback immediately below its action group", async () => {
  const page = await readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8");

  assert.match(page, /function AppointmentList[\s\S]*?useState<Record<string, ActionResult>>/);
  assert.match(page, /className="product-row-actions"[\s\S]*?<ActionFeedback message=\{feedbackById\[item\.id\]\?\.message/);
  assert.doesNotMatch(page, /<AppointmentList[\s\S]*?<ActionFeedback message=\{actionMessage\}/);
});
