import test from "node:test";
import assert from "node:assert/strict";
import { startSandboxPixAutomatic, startSandboxPixSubscription, startSandboxSubscription } from "../utils/sandbox-subscription-flow.ts";

const order = "a3000000-0000-4000-8000-000000000001";
const key = "a4000000-0000-4000-8000-000000000001";
const link = "https://sandbox.asaas.com/000/checkoutSession/show/checkout-1";
const invoiceLink = "https://sandbox.asaas.com/i/0_xubzbdzcspl5u1";
test("creates an order then returns only a validated sandbox checkout URL", async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push({ url, options }); return Response.json(calls.length === 1 ? { orderId: order } : { checkoutId: "checkout-1", checkoutUrl: link }); };
  assert.equal(await startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, fetcher), link);
  assert.deepEqual(calls.map(call => call.url), ["/api/subscription-orders", "/api/subscription-checkout"]);
  assert.equal(calls[0].options.headers.authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(calls[0].options.body), { planCode: "simple-anual", idempotencyKey: key, acceptedTerms: true });
  assert.deepEqual(JSON.parse(calls[1].options.body), { orderId: order });
});
test("does not return non-sandbox or mismatched checkout links", async () => {
  let calls = 0;
  const fetcher = async () => Response.json(++calls === 1 ? { orderId: order } : { checkoutId: "checkout-1", checkoutUrl: "https://asaas.com/checkoutSession/show/checkout-1" });
  await assert.rejects(startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, fetcher));
});
test("stops after a failed request without creating another checkout", async () => {
  let calls = 0;
  await assert.rejects(startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, async () => { calls++; return Response.json({}, { status: 409 }); }));
  assert.equal(calls, 1);
});

test("shows the sanitized API reason instead of replacing it with a generic checkout error", async () => {
  await assert.rejects(
    startSandboxSubscription({ token: "test-token", planCode: "simple-anual", idempotencyKey: key }, async () => Response.json({ error: "Já existe uma contratação pendente para esta barbearia." }, { status: 409 })),
    /Já existe uma contratação pendente para esta barbearia\./,
  );
});

test("shows the Pix Automatic API reason without exposing an internal response", async () => {
  let calls = 0;
  await assert.rejects(
    startSandboxPixAutomatic({ token: "test-token", planCode: "simple-mensal", idempotencyKey: key }, async () => {
      calls++;
      return Response.json(calls === 1 ? { orderId: order } : { error: "Complete os dados de cobrança da barbearia antes de contratar." }, { status: calls === 1 ? 201 : 422 });
    }),
    /Complete os dados de cobrança da barbearia antes de contratar\./,
  );
});

test("creates an order then returns only a validated sandbox invoice URL for PIX subscription", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return Response.json(calls.length === 1 ? { orderId: order } : { subscriptionId: "sub_123", invoiceUrl: invoiceLink });
  };
  assert.equal(
    await startSandboxPixSubscription(
      { token: "test-token", planCode: "simple-mensal", idempotencyKey: key, taxDocument: "14379410870", phone: "11931453535" },
      fetcher,
    ),
    invoiceLink,
  );
  assert.deepEqual(calls.map((c) => c.url), ["/api/subscription-orders", "/api/subscription-pix"]);
  assert.deepEqual(JSON.parse(calls[1].options.body), { orderId: order, taxDocument: "14379410870", phone: "11931453535" });
});

test("rejects non-sandbox or malformed invoice URLs in PIX subscription flow", async () => {
  let calls = 0;
  const fetcher = async () =>
    Response.json(++calls === 1 ? { orderId: order } : { subscriptionId: "sub_123", invoiceUrl: "https://asaas.com/i/0_xubzbdzcspl5u1" });
  await assert.rejects(startSandboxPixSubscription({ token: "test-token", planCode: "simple-mensal", idempotencyKey: key }, fetcher));
});
