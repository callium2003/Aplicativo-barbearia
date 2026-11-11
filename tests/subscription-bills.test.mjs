import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/subscription-bills/route.ts";

test("subscription bills route is disabled in production", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "production";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    const response = await GET(new Request("https://example.test/api/subscription-bills", { method: "GET" }));
    assert.equal(response.status, 404);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});

test("subscription bills route requires authorization token", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "development";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    const response = await GET(new Request("https://example.test/api/subscription-bills", { method: "GET" }));
    assert.equal(response.status, 401);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});
