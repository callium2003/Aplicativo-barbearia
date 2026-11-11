import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/subscription-renewal/route.ts";

test("subscription renewal route is disabled in production", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "production";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    assert.equal((await GET(new Request("https://example.test/api/subscription-renewal", { method: "GET" }))).status, 404);
    assert.equal((await POST(new Request("https://example.test/api/subscription-renewal", { method: "POST" }))).status, 404);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});

test("subscription renewal route requires authorization token", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "development";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    assert.equal((await GET(new Request("https://example.test/api/subscription-renewal", { method: "GET" }))).status, 401);
    assert.equal((await POST(new Request("https://example.test/api/subscription-renewal", { method: "POST" }))).status, 401);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});
