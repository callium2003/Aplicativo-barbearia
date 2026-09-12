import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManagementHomeAlerts,
  selectUpcomingManagementAppointments,
} from "../app/painel/home/presentation.mjs";
import { readAgendaProfessionalFilter } from "../app/painel/agenda/presentation.mjs";

test("prioriza pendências que impedem preparar novos agendamentos", () => {
  const alerts = buildManagementHomeAlerts({
    activeServiceCount: 0,
    activeProfessionalCount: 0,
    hasOpenBusinessHours: false,
    professionalsWithoutSchedule: ["prof-1", "prof-2"],
    inactiveProfessionalCommitments: [],
  });

  assert.deepEqual(
    alerts.map((alert) => [alert.kind, alert.href]),
    [
      ["service", "/painel/servicos"],
      ["professional", "/painel/profissionais"],
      ["business-hours", "/painel/horarios"],
      ["professional-schedule", "/painel/profissionais"],
    ],
  );
});

test("agrupa compromissos futuros de profissionais inativos sem expor dados de clientes", () => {
  const alerts = buildManagementHomeAlerts({
    activeServiceCount: 1,
    activeProfessionalCount: 1,
    hasOpenBusinessHours: true,
    professionalsWithoutSchedule: [],
    inactiveProfessionalCommitments: [
      { professionalId: "prof-1", professionalName: "Rafael", appointmentCount: 2 },
      { professionalId: "prof-2", professionalName: "João", appointmentCount: 1 },
    ],
  });

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].title, "Rafael está inativo e tem 2 agendamentos futuros.");
  assert.equal(alerts[0].href, "/painel/agenda?professional=prof-1");
  assert.equal(alerts[1].title, "João está inativo e tem 1 agendamento futuro.");
});

test("mostra somente atendimentos operacionais futuros do dia em ordem cronológica", () => {
  const appointments = selectUpcomingManagementAppointments(
    [
      { id: "finished", starts_at: "2026-09-09T13:00:00.000Z", status: "completed" },
      { id: "old", starts_at: "2026-09-09T12:00:00.000Z", status: "scheduled" },
      { id: "later", starts_at: "2026-09-09T16:00:00.000Z", status: "scheduled" },
      { id: "next", starts_at: "2026-09-09T14:00:00.000Z", status: "scheduled" },
      { id: "cancelled", starts_at: "2026-09-09T15:00:00.000Z", status: "cancelled" },
    ],
    "2026-09-09T13:30:00.000Z",
  );

  assert.deepEqual(appointments.map((appointment) => appointment.id), ["next", "later"]);
});

test("aceita somente identificador válido de profissional no link da agenda", () => {
  assert.equal(readAgendaProfessionalFilter("?professional=2d884343-32d1-4bd6-83af-9b3d9164ed38"), "2d884343-32d1-4bd6-83af-9b3d9164ed38");
  assert.equal(readAgendaProfessionalFilter("?professional=qualquer-coisa"), null);
  assert.equal(readAgendaProfessionalFilter("?status=scheduled"), null);
});
