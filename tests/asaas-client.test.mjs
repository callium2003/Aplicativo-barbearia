import test from "node:test";
import assert from "node:assert/strict";
import { createAsaasClient } from "../utils/asaas-client.mjs";

test("sandbox requests use only the sandbox host and authenticate server-side", async () => {
  let request;
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-secret", fetchImpl: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: "cus_test" }), { status: 200, headers: { "content-type": "application/json" } });
  } });
  assert.deepEqual(await client.createCustomer({ name: "Teste", cpfCnpj: "00000000000" }), { id: "cus_test" });
  assert.equal(request.url, "https://api-sandbox.asaas.com/v3/customers");
  assert.equal(request.options.headers.access_token, "test-secret");
  assert.equal(request.options.method, "POST");
});

test("rejects unknown environments and hides provider error details", async () => {
  assert.throws(() => createAsaasClient({ environment: "unexpected", apiKey: "secret" }));
  const client = createAsaasClient({ environment: "sandbox", apiKey: "secret", fetchImpl: async () =>
    new Response("provider secret or personal data", { status: 400 }) });
  await assert.rejects(client.createCustomer({ name: "Teste" }), (error) =>
    error.message === "Asaas request failed" && error.status === 400 && !error.message.includes("secret"));
});

test("creates hosted checkout without redirecting credentials or caching financial responses", async () => {
  let request;
  const client = createAsaasClient({ environment: "production", apiKey: "test-key", fetchImpl: async (url, options) => {
    request = { url, options };
    return Response.json({ id: "checkout_test" });
  } });
  assert.deepEqual(await client.createCheckout({ externalReference: "order-test" }), { id: "checkout_test" });
  assert.equal(request.url, "https://api.asaas.com/v3/checkouts");
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.cache, "no-store");
  assert.equal(request.options.credentials, "omit");
  assert.deepEqual(JSON.parse(request.options.body), { externalReference: "order-test" });
});

test("queries customer and payment references with encoded filters and explicit pagination", async () => {
  const requests = [];
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async (url, options) => {
    requests.push({ url: new URL(url), options });
    return Response.json({ data: [], hasMore: false });
  } });
  await client.listCustomers({ externalReference: "tenant&other=value", offset: 100, limit: 100 });
  await client.listPayments({ externalReference: "order-test" });
  assert.equal(requests[0].url.pathname, "/v3/customers");
  assert.equal(requests[0].url.searchParams.get("externalReference"), "tenant&other=value");
  assert.equal(requests[0].url.searchParams.has("other"), false);
  assert.equal(requests[0].url.searchParams.get("offset"), "100");
  assert.equal(requests[0].url.searchParams.get("limit"), "100");
  assert.equal(requests[1].url.pathname, "/v3/payments");
  assert.equal(requests[1].url.searchParams.get("limit"), "10");
  assert.ok(requests.every(({ options }) => options.method === "GET" && options.body === undefined));
});

test("reads payment by a validated resource id instead of accepting arbitrary paths", async () => {
  let url;
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async (input) => {
    url = input;
    return Response.json({ id: "pay_test", status: "RECEIVED" });
  } });
  assert.equal((await client.getPayment("pay_test")).status, "RECEIVED");
  assert.equal(url, "https://api-sandbox.asaas.com/v3/payments/pay_test");
  for (const invalid of ["../customers", "https://evil.example", "pay_test?x=1", "", null]) {
    await assert.rejects(async () => client.getPayment(invalid), /Invalid Asaas input/);
  }
});

test("queries checkout payments only with a validated checkout id and pagination", async () => {
  let url;
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async (input) => {
    url = new URL(input);
    return Response.json({ data: [], hasMore: false });
  } });
  await client.listCheckoutPayments({ checkoutId: "checkout-1", offset: 0, limit: 10 });
  assert.equal(url.pathname, "/v3/payments");
  assert.equal(url.searchParams.get("checkoutSession"), "checkout-1");
  await assert.rejects(async () => client.listCheckoutPayments({ checkoutId: "x&customer=other" }), /Invalid Asaas input/);
});

test("lists a bounded page of payments for sandbox reconciliation", async () => {
  let requestUrl;
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async (input) => {
    requestUrl = new URL(input);
    return Response.json({ data: [], hasMore: false });
  } });
  await client.listPaymentsPage({ offset: 100, limit: 25 });
  assert.equal(requestUrl.searchParams.get("offset"), "100");
  assert.equal(requestUrl.searchParams.get("limit"), "25");
  await assert.rejects(async () => client.listPaymentsPage({ offset: -1, limit: 25 }), /Invalid Asaas input/);
  const production = createAsaasClient({ environment: "production", apiKey: "test-key" });
  await assert.rejects(async () => production.listPaymentsPage({ offset: 0, limit: 25 }), /Invalid Asaas input/);
});

test("timeout aborts one creation attempt and marks the result as requiring reconciliation", async () => {
  let attempts = 0;
  const client = createAsaasClient({ environment: "sandbox", apiKey: "never-print", timeoutMs: 20, fetchImpl: async (_url, options) => {
    attempts++;
    return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("never-print")), { once: true }));
  } });
  await assert.rejects(client.createCustomer({ name: "Teste" }), (error) =>
    error.code === "ASAAS_TIMEOUT" && error.outcomeUnknown === true && !JSON.stringify(error).includes("never-print"));
  assert.equal(attempts, 1);
});

test("does not repeat a financial write on network failures, server errors or malformed success", async () => {
  for (const scenario of ["network", "server", "json", "missing-id"]) {
    let attempts = 0;
    const client = createAsaasClient({ environment: "sandbox", apiKey: "never-print", fetchImpl: async () => {
      attempts++;
      if (scenario === "network") throw new Error("never-print");
      if (scenario === "server") return new Response("never-print", { status: 503 });
      if (scenario === "json") return new Response("never-print", { status: 200 });
      return Response.json({ unexpected: "never-print" });
    } });
    await assert.rejects(client.createCustomer({ name: "Teste" }), (error) =>
      error.outcomeUnknown === true && !JSON.stringify(error).includes("never-print") && error.cause === undefined);
    assert.equal(attempts, 1, scenario);
  }
});

test("a rejected creation is distinguished from an uncertain server outcome", async () => {
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async () => new Response("private details", { status: 400 }) });
  await assert.rejects(client.createCustomer({ name: "Teste" }), (error) =>
    error.status === 400 && error.outcomeUnknown === false && error.code === "ASAAS_HTTP_ERROR");
});

test("rejects invalid configuration, broad lookups and pagination before making requests", async () => {
  let calls = 0;
  const config = { environment: "sandbox", apiKey: "test-key", fetchImpl: async () => { calls++; return Response.json({ data: [] }); } };
  for (const bad of [{ apiKey: " " }, { apiKey: "key\nother" }, { timeoutMs: 0 }, { timeoutMs: Infinity }, { timeoutMs: 1.5 }]) {
    assert.throws(() => createAsaasClient({ ...config, ...bad }), /Invalid Asaas configuration/);
  }
  const client = createAsaasClient(config);
  for (const input of [{}, { externalReference: " " }, { externalReference: "x", limit: 101 }, { externalReference: "x", offset: -1 }]) {
    await assert.rejects(async () => client.listCustomers(input), /Invalid Asaas input/);
  }
  assert.equal(calls, 0);
});

test("failure while discarding an HTTP error body cannot leak provider diagnostics", async () => {
  const response = new Response(new ReadableStream({ cancel() { throw new Error("private diagnostic"); } }), { status: 403 });
  const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async () => response });
  await assert.rejects(client.createCustomer({ name: "Teste" }), (error) =>
    error.message === "Asaas request failed" && error.status === 403 && !String(error.stack).includes("private diagnostic"));
});

test("rejects malformed list responses instead of treating them as an empty reconciliation", async () => {
  for (const payload of [{}, { data: [] }, { data: null, hasMore: false }]) {
    const client = createAsaasClient({ environment: "sandbox", apiKey: "test-key", fetchImpl: async () => Response.json(payload) });
    await assert.rejects(client.listCustomers({ externalReference: "tenant-test" }), (error) =>
      error.code === "ASAAS_INVALID_RESPONSE" && error.outcomeUnknown === false);
  }
});
