import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform incidents page defines service filters, severity badges, and incident resolution", async () => {
  const source = await readFile(new URL("../app/plataforma/incidentes/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Alertas & Gestão Operacional/);
  assert.match(source, /listPlatformOperationalIncidents/);
  assert.match(source, /getPlatformOperationalIncidentDetail/);
  assert.match(source, /acknowledgePlatformOperationalIncident/);
  assert.match(source, /addPlatformOperationalIncidentNote/);
  assert.match(source, /resolvePlatformOperationalIncident/);
  assert.match(source, /createPlatformOperationalIncident/);
  assert.match(source, /formatServiceName/);
  assert.match(source, /formatIncidentSeverity/);
  assert.match(source, /formatIncidentStatus/);
  assert.match(source, /getPlatformSentinelOverview/);
  assert.match(source, /formatSentinelStatus/);
  assert.match(source, /Sentinela Operacional/);
  assert.match(source, /sentinelBadgeAutoCreated/);
});

test("platform navigation integrates Alertas & Incidentes across platform headers", async () => {
  const [platformOverview, supportOverview] = await Promise.all([
    readFile(new URL("../app/plataforma/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/plataforma/suporte/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(platformOverview, /href="\/plataforma\/incidentes"/);
  assert.match(platformOverview, /Alertas & Incidentes/);

  assert.match(supportOverview, /href="\/plataforma\/incidentes"/);
  assert.match(supportOverview, /Alertas & Incidentes/);
});
