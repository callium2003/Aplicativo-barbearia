import assert from "node:assert/strict";
import test from "node:test";

import {
  loadPlatformBarbershopConsents,
  loadPlatformBarbershopCustomers,
  loadPlatformBarbershopDetail,
} from "../utils/platform-administration.mjs";

const shopId = "d2000000-0000-4000-8000-000000000001";
const signedIn = { getUser: async () => ({ data: { user: { id: "platform-owner" } }, error: null }) };

test("barbershop consultation rejects a malformed identifier without querying the database", async () => {
  let rpcCalls = 0;
  const result = await loadPlatformBarbershopDetail({ auth: signedIn, rpc: async () => { rpcCalls += 1; return { data: null, error: null }; } }, "1; drop table");

  assert.deepEqual(result, { status: "not_found" });
  assert.equal(rpcCalls, 0);
});

test("platform owner receives detail, professionals and services of the selected barbershop", async () => {
  const calls = [];
  const responses = {
    get_platform_barbershop_detail: [{ barbershop_id: shopId, name: "Barbearia de teste" }],
    list_platform_barbershop_professionals: [{ name: "Bruno", active: true }],
    list_platform_barbershop_services: [{ name: "Corte", active: true, duration_minutes: 30, price: 50 }],
  };
  const result = await loadPlatformBarbershopDetail({
    auth: signedIn,
    rpc: async (name, args) => { calls.push([name, args]); return { data: responses[name], error: null }; },
  }, shopId);

  assert.deepEqual(result, {
    status: "ready",
    detail: responses.get_platform_barbershop_detail[0],
    professionals: responses.list_platform_barbershop_professionals,
    services: responses.list_platform_barbershop_services,
  });
  assert.deepEqual(calls.map(([name]) => name).sort(), Object.keys(responses).sort());
  assert.ok(calls.every(([, args]) => args.p_barbershop_id === shopId));
});

test("barbershop consultation distinguishes missing session, missing role and unknown barbershop", async () => {
  const anonymous = await loadPlatformBarbershopDetail({ auth: { getUser: async () => ({ data: { user: null }, error: null }) }, rpc: async () => assert.fail("no rpc") }, shopId);
  const forbidden = await loadPlatformBarbershopDetail({ auth: signedIn, rpc: async () => ({ data: null, error: { message: "Acesso interno não autorizado" } }) }, shopId);
  const missing = await loadPlatformBarbershopDetail({ auth: signedIn, rpc: async () => ({ data: null, error: { message: "Barbearia não encontrada" } }) }, shopId);

  assert.deepEqual(anonymous, { status: "unauthenticated" });
  assert.deepEqual(forbidden, { status: "forbidden" });
  assert.deepEqual(missing, { status: "not_found" });
});

test("customers and consents are loaded only on explicit request, each through its own audited query", async () => {
  const calls = [];
  const client = {
    auth: signedIn,
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: [{ customer_id: "c1" }], error: null };
    },
  };

  const customers = await loadPlatformBarbershopCustomers(client, shopId);
  const consents = await loadPlatformBarbershopConsents(client, shopId);

  assert.deepEqual(customers, { status: "ready", customers: [{ customer_id: "c1" }] });
  assert.deepEqual(consents, { status: "ready", consents: [{ customer_id: "c1" }] });
  assert.deepEqual(calls, [
    ["list_platform_barbershop_customers", { p_barbershop_id: shopId }],
    ["list_platform_barbershop_customer_consents", { p_barbershop_id: shopId }],
  ]);
});

test("detail loading never touches customer or consent queries", async () => {
  const names = [];
  await loadPlatformBarbershopDetail({ auth: signedIn, rpc: async (name) => { names.push(name); return { data: [{}], error: null }; } }, shopId);
  assert.ok(names.every((name) => !/customer/.test(name)));
});
