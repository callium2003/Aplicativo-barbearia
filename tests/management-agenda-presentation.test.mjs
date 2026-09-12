import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appointmentStatusErrorMessage,
  summarizeDailyAppointments,
} from "../app/painel/agenda/presentation.mjs";

test("agenda metrics summarize appointments loaded for the current day", () => {
  const appointments = [
    { starts_at: "2026-09-08T12:00:00.000Z", status: "scheduled" },
    { starts_at: "2026-09-08T14:00:00.000Z", status: "scheduled" },
    { starts_at: "2026-09-08T16:00:00.000Z", status: "completed" },
    { starts_at: "2026-09-08T18:00:00.000Z", status: "no_show" },
  ];

  assert.deepEqual(summarizeDailyAppointments(appointments), {
    total: 4,
    scheduled: 2,
    completed: 1,
    noShow: 1,
  });
});

test("agenda daily metrics remain zero when today has no appointments", () => {
  assert.deepEqual(
    summarizeDailyAppointments(
      [],
    ),
    { total: 0, scheduled: 0, completed: 0, noShow: 0 },
  );
});

test("agenda loads daily metrics independently from the selected list period", async () => {
  const page = await readFile(
    new URL("../app/painel/agenda/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /todayStart/);
  assert.match(page, /todayEnd/);
  assert.match(page, /dailyQuery/);
  assert.match(page, /setDailyAppointments/);
  assert.match(page, /summarizeDailyAppointments\(dailyAppointments\)/);
});

test("agenda expands today's appointments without changing the selected period", async () => {
  const page = await readFile(
    new URL("../app/painel/agenda/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /const \[todayExpanded, setTodayExpanded\] = useState\(false\)/);
  assert.match(page, /expanded=\{todayExpanded\}/);
  assert.match(page, /onClick=\{\(\) => setTodayExpanded\(\(expanded\) => !expanded\)\}/);
  assert.match(page, /Agendamentos de hoje/);
  assert.match(page, /todayExpanded &&/);
  assert.match(page, /appointments=\{dailyAppointments\}/);
  assert.match(page, /value=\{periodStart\}/);
  assert.match(page, /value=\{periodEnd\}/);
});

test("agenda header keeps notifications and account identity at the far right", async () => {
  const [shell, css] = await Promise.all([
    readFile(new URL("../app/painel/PanelShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product-ui.css", import.meta.url), "utf8"),
  ]);

  assert.match(shell, /id="panel-header-actions"[\s\S]*?<NotificationBell[\s\S]*?<div className="product-avatar"/);
  assert.match(css, /\.product-header-actions\s*\{[\s\S]*?margin-left:\s*auto/);
});

test("agenda translates status RPC failures without exposing provider details", () => {
  assert.equal(
    appointmentStatusErrorMessage({ code: "PGRST202", message: "Could not find the function public.set_appointment_status" }),
    "A atualização de status ainda não está disponível neste ambiente.",
  );
  assert.equal(
    appointmentStatusErrorMessage({ code: "42501", message: "permission denied" }),
    "Você não tem permissão para atualizar este agendamento.",
  );
  assert.equal(
    appointmentStatusErrorMessage({ code: "P0001", message: "Status transition not allowed" }),
    "Este agendamento mudou e não pode mais receber essa ação. Atualize a agenda e tente novamente.",
  );
  assert.equal(
    appointmentStatusErrorMessage({ code: "XX000", message: "secret provider diagnostic" }),
    "Não foi possível atualizar este agendamento. Tente novamente.",
  );
});
