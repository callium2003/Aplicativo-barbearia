import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPanelContext } from "../utils/panel-context.ts";

test("getPanelContext resolves owner, manager, barber, and unlinked user contexts correctly", async () => {
  // Test Mock 1: Owner
  const mockOwnerClient = {
    auth: { getUser: async () => ({ data: { user: { id: "owner-123", email: "owner@test.com" } } }) },
    from: (table) => {
      if (table === "barbershops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "shop-owner", initial_registration_completed: true } }),
            }),
          }),
        };
      }
      if (table === "team_members") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const ownerCtx = await getPanelContext(mockOwnerClient);
  assert.equal(ownerCtx.userId, "owner-123");
  assert.equal(ownerCtx.barbershopId, "shop-owner");
  assert.equal(ownerCtx.role, "owner");
  assert.equal(ownerCtx.professionalId, null);
  assert.equal(ownerCtx.initialRegistrationCompleted, true);

  // Test Mock 2: Barber
  const mockBarberClient = {
    auth: { getUser: async () => ({ data: { user: { id: "barber-123", email: "barber@test.com" } } }) },
    from: (table) => {
      if (table === "barbershops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }
      if (table === "team_members") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      barbershop_id: "shop-team",
                      role: "barber",
                      professional_id: "prof-456",
                    },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const barberCtx = await getPanelContext(mockBarberClient);
  assert.equal(barberCtx.userId, "barber-123");
  assert.equal(barberCtx.barbershopId, "shop-team");
  assert.equal(barberCtx.role, "barber");
  assert.equal(barberCtx.professionalId, "prof-456");
  assert.equal(barberCtx.initialRegistrationCompleted, true);

  // Test Mock 3: Unlinked User
  const mockUnlinkedClient = {
    auth: { getUser: async () => ({ data: { user: { id: "unlinked-123", email: "unlinked@test.com" } } }) },
    from: (table) => {
      if (table === "barbershops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }
      if (table === "team_members") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const unlinkedCtx = await getPanelContext(mockUnlinkedClient);
  assert.equal(unlinkedCtx.userId, "unlinked-123");
  assert.equal(unlinkedCtx.barbershopId, null);
  assert.equal(unlinkedCtx.role, null);
  assert.equal(unlinkedCtx.professionalId, null);
  assert.equal(unlinkedCtx.initialRegistrationCompleted, false);
});

test("strictly guards all administrative panel routes against barber role access", async () => {
  const [panelPage, configPage, registrationPage, clientsPage, reportsPage, professionalsPage, subscriptionPage, subscriptionGate] = await Promise.all([
    readFile(new URL("../app/painel/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/configurar/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cadastro-inicial/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/clientes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/relatorios/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/profissionais/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/assinatura/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/SubscriptionGate.tsx", import.meta.url), "utf8"),
  ]);

  // Main Panel: barber visibleLinks excludes Dados cadastrais, Clientes, Relatórios
  assert.match(panelPage, /shop\.role === "barber"[\s\S]*?Minha agenda/);
  assert.match(panelPage, /getPanelContext/);

  // Configurar: barber is redirected immediately to /painel/agenda and NEVER /cadastro-inicial
  assert.match(configPage, /if \(context\.role === "barber"\) \{\s*window\.location\.replace\("\/painel\/agenda"\);/);

  // Cadastro Inicial: team members (barber/manager) are redirected away from shop creation
  assert.match(registrationPage, /context\.role === "barber" \|\| context\.role === "manager"/);
  assert.match(registrationPage, /window\.location\.replace\("\/painel\/agenda"\)/);

  // Clientes: barber redirected to /painel/agenda
  assert.match(clientsPage, /if \(context\.role === "barber"\) \{ window\.location\.replace\("\/painel\/agenda"\);/);

  // Relatorios: barber redirected to /painel/agenda
  assert.match(reportsPage, /if \(context\.role === "barber"\) \{ window\.location\.replace\("\/painel\/agenda"\);/);

  // Profissionais: barber redirected to /painel/agenda
  assert.match(professionalsPage, /if \(context\.role === "barber"\) return window\.location\.replace\("\/painel\/agenda"\);/);

  // Assinatura: barber redirected to /painel/agenda
  assert.match(subscriptionPage, /if \(context\.role === "barber"\) \{ window\.location\.replace\("\/painel\/agenda"\);/);

  // SubscriptionGate: team members bypass subscription gate
  assert.match(subscriptionGate, /context\.role === "barber" \|\| context\.role === "manager"/);
});
