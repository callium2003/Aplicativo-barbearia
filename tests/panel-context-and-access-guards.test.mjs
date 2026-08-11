import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPanelContext } from "../utils/panel-context.ts";

test("SessionGuard does not reload the panel after a sign-in event", async () => {
  const sessionGuard = await readFile(new URL("../app/painel/SessionGuard.tsx", import.meta.url), "utf8");

  assert.match(sessionGuard, /window\.location\.pathname === "\/painel"\) return;/);
  assert.match(sessionGuard, /window\.location\.replace\("\/painel"\)/);
});

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

test("getPanelContext fails closed when ownership or membership lookup errors", async () => {
  const ownershipError = new Error("ownership lookup failed");
  const membershipError = new Error("membership lookup failed");

  const ownershipFailureClient = {
    auth: { getUser: async () => ({ data: { user: { id: "barber-123", email: "barber@test.com" } } }) },
    from: (table) => {
      if (table === "barbershops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: ownershipError }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  await assert.rejects(() => getPanelContext(ownershipFailureClient), ownershipError);

  const membershipFailureClient = {
    auth: { getUser: async () => ({ data: { user: { id: "barber-123", email: "barber@test.com" } } }) },
    from: (table) => {
      if (table === "barbershops") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        };
      }
      if (table === "team_members") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: null, error: membershipError }) }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  await assert.rejects(() => getPanelContext(membershipFailureClient), membershipError);
});

test("getPanelContext treats a missing browser session as an anonymous visitor", async () => {
  const anonymousClient = {
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: { name: "AuthSessionMissingError" },
      }),
    },
  };

  const context = await getPanelContext(anonymousClient);
  assert.deepEqual(context, {
    userId: "",
    userEmail: null,
    barbershopId: null,
    role: null,
    professionalId: null,
    initialRegistrationCompleted: false,
  });
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

test("barber self-service availability remains limited to the linked professional", async () => {
  const [agendaPage, permissionMigration] = await Promise.all([
    readFile(new URL("../app/painel/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260807030613_allow_barber_self_schedule_management.sql", import.meta.url), "utf8"),
  ]);

  assert.match(agendaPage, /Minha disponibilidade/);
  assert.match(agendaPage, /from\("professional_hours"\)[\s\S]*?professional_id/);
  assert.match(agendaPage, /from\("professional_breaks"\)[\s\S]*?professional_id/);
  assert.match(agendaPage, /from\("professional_time_blocks"\)[\s\S]*?professional_id/);
  assert.match(agendaPage, /\.eq\("professional_id", shop\.professional_id\)/);
  assert.match(agendaPage, /Registrar ausência/);

  assert.match(permissionMigration, /professional_hours\.professional_id = private\.current_barber_professional_id/);
  assert.match(permissionMigration, /professional_breaks\.professional_id = private\.current_barber_professional_id/);
  assert.match(permissionMigration, /professional_time_blocks\.professional_id = private\.current_barber_professional_id/);
});
