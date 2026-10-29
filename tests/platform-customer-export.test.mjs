import assert from "node:assert/strict";
import test from "node:test";

import {
  exportPlatformBarbershopCustomers,
  serializeCustomersToCsv,
  serializeCustomersToJson,
} from "../utils/platform-administration.mjs";

const shopId = "d2000000-0000-4000-8000-000000000001";
const signedIn = { getUser: async () => ({ data: { user: { id: "platform-owner" } }, error: null }) };

test("exportPlatformBarbershopCustomers rejects invalid uuid without querying the database", async () => {
  let rpcCalls = 0;
  const result = await exportPlatformBarbershopCustomers(
    { auth: signedIn, rpc: async () => { rpcCalls += 1; return { data: null, error: null }; } },
    "invalid-uuid",
    "csv",
  );

  assert.deepEqual(result, { status: "not_found" });
  assert.equal(rpcCalls, 0);
});

test("exportPlatformBarbershopCustomers rejects unauthenticated session", async () => {
  const result = await exportPlatformBarbershopCustomers(
    { auth: { getUser: async () => ({ data: { user: null }, error: null }) }, rpc: async () => assert.fail("no rpc") },
    shopId,
    "csv",
  );

  assert.deepEqual(result, { status: "unauthenticated" });
});

test("exportPlatformBarbershopCustomers rejects invalid format before calling RPC", async () => {
  let rpcCalls = 0;
  const result = await exportPlatformBarbershopCustomers(
    { auth: signedIn, rpc: async () => { rpcCalls += 1; return { data: null, error: null }; } },
    shopId,
    "yaml",
  );

  assert.deepEqual(result, { status: "invalid_format" });
  assert.equal(rpcCalls, 0);
});

test("exportPlatformBarbershopCustomers passes format and barbershop_id to RPC", async () => {
  const calls = [];
  const sampleRecords = [
    {
      customer_id: "c1",
      name: "Cliente Alfa",
      email: "alfa@example.test",
      phone: "11911110001",
      related_since: "2026-10-01T10:00:00Z",
      barbershop_marketing_granted: true,
      barbershop_marketing_version: "v1",
      barbershop_marketing_source: "booking",
      barbershop_marketing_changed_at: "2026-10-01T10:00:00Z",
      platform_marketing_granted: false,
      platform_marketing_version: "v1",
      platform_marketing_source: "booking",
      platform_marketing_changed_at: "2026-10-01T10:00:00Z",
    },
  ];

  const client = {
    auth: signedIn,
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: sampleRecords, error: null };
    },
  };

  const result = await exportPlatformBarbershopCustomers(client, shopId, "json");
  assert.deepEqual(result, { status: "ready", records: sampleRecords });
  assert.deepEqual(calls, [
    ["export_platform_barbershop_customers", { p_barbershop_id: shopId, p_format: "json" }],
  ]);
});

test("exportPlatformBarbershopCustomers handles forbidden and not_found responses", async () => {
  const forbidden = await exportPlatformBarbershopCustomers(
    { auth: signedIn, rpc: async () => ({ data: null, error: { message: "Acesso interno não autorizado" } }) },
    shopId,
    "csv",
  );
  const notFound = await exportPlatformBarbershopCustomers(
    { auth: signedIn, rpc: async () => ({ data: null, error: { message: "Barbearia não encontrada" } }) },
    shopId,
    "csv",
  );

  assert.deepEqual(forbidden, { status: "forbidden" });
  assert.deepEqual(notFound, { status: "not_found" });
});

test("serializeCustomersToCsv generates correct headers and escapes special characters", () => {
  const records = [
    {
      customer_id: "c1",
      name: "Silva, João",
      email: "joao@example.test",
      phone: "11988887777",
      related_since: "2026-09-01T12:00:00.000Z",
      barbershop_marketing_granted: true,
      barbershop_marketing_version: "v1",
      barbershop_marketing_source: "booking",
      barbershop_marketing_changed_at: "2026-09-01T12:00:00.000Z",
      platform_marketing_granted: null,
      platform_marketing_version: null,
      platform_marketing_source: null,
      platform_marketing_changed_at: null,
    },
  ];

  const csv = serializeCustomersToCsv(records);
  const lines = csv.split("\r\n");

  assert.equal(
    lines[0],
    "ID do Cliente,Nome,E-mail,Telefone,Vinculado Desde,Marketing Barbearia,Versão Barbearia,Origem Barbearia,Data Consentimento Barbearia,Marketing Plataforma,Versão Plataforma,Origem Plataforma,Data Consentimento Plataforma",
  );
  // Name containing comma must be quoted
  assert.ok(lines[1].includes('"Silva, João"'));
  // Booleans mapped to human readable
  assert.ok(lines[1].includes("Sim"));
  assert.ok(lines[1].includes("Não informado"));
});

test("serializeCustomersToCsv neutralizes formula injection attempts", () => {
  const malicious = [
    {
      customer_id: "c2",
      name: "=cmd|' /C calc'!A0",
      email: "+malicious@example.test",
      phone: "@11999999999",
      related_since: "2026-10-01T00:00:00.000Z",
      barbershop_marketing_granted: false,
      barbershop_marketing_version: "-v1",
      barbershop_marketing_source: "portal",
      barbershop_marketing_changed_at: "2026-10-01T00:00:00.000Z",
      platform_marketing_granted: false,
      platform_marketing_version: "v1",
      platform_marketing_source: "portal",
      platform_marketing_changed_at: "2026-10-01T00:00:00.000Z",
    },
  ];

  const csv = serializeCustomersToCsv(malicious);
  // Prefixes '=', '+', '@', '-' must be neutralized with a leading single quote (')
  assert.ok(csv.includes("'\=cmd|' /C calc'!A0") || csv.includes("''=cmd"));
  assert.ok(csv.includes("'+malicious@example.test") || csv.includes("'+"));
  assert.ok(csv.includes("'@11999999999"));
  assert.ok(csv.includes("'-v1"));
});

test("serializeCustomersToJson structures envelope with metadata and customer records", () => {
  const records = [
    {
      customer_id: "c1",
      name: "Carlos",
      email: "carlos@example.test",
      phone: "11988887777",
      related_since: "2026-10-01T12:00:00.000Z",
      barbershop_marketing_granted: true,
      barbershop_marketing_version: "v1",
      barbershop_marketing_source: "booking",
      barbershop_marketing_changed_at: "2026-10-01T12:00:00.000Z",
      platform_marketing_granted: false,
      platform_marketing_version: "v1",
      platform_marketing_source: "booking",
      platform_marketing_changed_at: "2026-10-01T12:00:00.000Z",
    },
  ];

  const jsonStr = serializeCustomersToJson(records, {
    barbershopId: shopId,
    exportedAt: "2026-10-29T03:00:00.000Z",
  });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.barbershop_id, shopId);
  assert.equal(parsed.exported_at, "2026-10-29T03:00:00.000Z");
  assert.equal(parsed.total_records, 1);
  assert.deepEqual(parsed.customers, records);
});

