import assert from "node:assert/strict";
import test from "node:test";

import {
  reactivatePlatformBarbershopByAgreement,
  suspendPlatformBarbershop,
} from "../utils/platform-administration.mjs";

const shopId = "d2000000-0000-4000-8000-000000000001";
const signedIn = { getUser: async () => ({ data: { user: { id: "platform-owner" } }, error: null }) };

test("reactivatePlatformBarbershopByAgreement validates UUID before querying database", async () => {
  let rpcCalls = 0;
  const result = await reactivatePlatformBarbershopByAgreement(
    { auth: signedIn, rpc: async () => { rpcCalls += 1; return { data: null, error: null }; } },
    "invalid-uuid",
    { durationDays: 10, reason: "Negociação comercial", condition: "Pagamento em 10 dias" },
  );

  assert.deepEqual(result, { status: "not_found" });
  assert.equal(rpcCalls, 0);
});

test("reactivatePlatformBarbershopByAgreement validates durationDays range (1 to 365)", async () => {
  let rpcCalls = 0;
  const client = { auth: signedIn, rpc: async () => { rpcCalls += 1; return { data: null, error: null }; } };

  const zeroDays = await reactivatePlatformBarbershopByAgreement(client, shopId, { durationDays: 0, reason: "Motivo válido", condition: "Condição válida" });
  const overYear = await reactivatePlatformBarbershopByAgreement(client, shopId, { durationDays: 400, reason: "Motivo válido", condition: "Condição válida" });

  assert.equal(zeroDays.status, "invalid_input");
  assert.equal(overYear.status, "invalid_input");
  assert.equal(rpcCalls, 0);
});

test("reactivatePlatformBarbershopByAgreement validates required reason and condition", async () => {
  let rpcCalls = 0;
  const client = { auth: signedIn, rpc: async () => { rpcCalls += 1; return { data: null, error: null }; } };

  const emptyReason = await reactivatePlatformBarbershopByAgreement(client, shopId, { durationDays: 7, reason: "  ", condition: "Condição válida" });
  const emptyCondition = await reactivatePlatformBarbershopByAgreement(client, shopId, { durationDays: 7, reason: "Motivo válido", condition: "" });

  assert.equal(emptyReason.status, "invalid_input");
  assert.equal(emptyCondition.status, "invalid_input");
  assert.equal(rpcCalls, 0);
});

test("reactivatePlatformBarbershopByAgreement invokes RPC with sanitized parameters", async () => {
  const calls = [];
  const client = {
    auth: signedIn,
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: null, error: null };
    },
  };

  const result = await reactivatePlatformBarbershopByAgreement(client, shopId, {
    durationDays: 15,
    reason: "  Acordo de renegociação  ",
    condition: "  Parcelamento em 2x via Pix  ",
  });

  assert.deepEqual(result, { status: "success" });
  assert.deepEqual(calls, [
    [
      "reactivate_platform_barbershop_by_agreement",
      {
        p_barbershop_id: shopId,
        p_duration_days: 15,
        p_reason: "Acordo de renegociação",
        p_condition: "Parcelamento em 2x via Pix",
      },
    ],
  ]);
});

test("suspendPlatformBarbershop validates reason and invokes suspension RPC", async () => {
  const calls = [];
  const client = {
    auth: signedIn,
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: null, error: null };
    },
  };

  const emptyReason = await suspendPlatformBarbershop(client, shopId, { reason: "  " });
  assert.equal(emptyReason.status, "invalid_input");
  assert.equal(calls.length, 0);

  const success = await suspendPlatformBarbershop(client, shopId, { reason: "Inadimplência reiterada" });
  assert.deepEqual(success, { status: "success" });
  assert.deepEqual(calls, [
    [
      "suspend_platform_barbershop",
      {
        p_barbershop_id: shopId,
        p_reason: "Inadimplência reiterada",
      },
    ],
  ]);
});

test("commercial agreement operations handle unauthenticated and forbidden sessions", async () => {
  const anon = { auth: { getUser: async () => ({ data: { user: null }, error: null }) }, rpc: async () => assert.fail("no rpc") };
  const forbidden = { auth: signedIn, rpc: async () => ({ data: null, error: { message: "Acesso interno não autorizado" } }) };

  const resAnon = await reactivatePlatformBarbershopByAgreement(anon, shopId, { durationDays: 5, reason: "Motivo", condition: "Condição" });
  const resForbidden = await reactivatePlatformBarbershopByAgreement(forbidden, shopId, { durationDays: 5, reason: "Motivo", condition: "Condição" });

  assert.equal(resAnon.status, "unauthenticated");
  assert.equal(resForbidden.status, "forbidden");
});

