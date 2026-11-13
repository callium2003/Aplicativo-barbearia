import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/subscription-plan-change/route.ts";

test("subscription plan change route is disabled in production", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "production";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    const getRes = await GET(new Request("https://example.test/api/subscription-plan-change", { method: "GET" }));
    const postRes = await POST(new Request("https://example.test/api/subscription-plan-change", { method: "POST" }));
    assert.equal(getRes.status, 404);
    assert.equal(postRes.status, 404);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});

test("subscription plan change route requires authorization token", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFlag = process.env.BILLING_SANDBOX_ENABLED;
  try {
    process.env.NODE_ENV = "development";
    process.env.BILLING_SANDBOX_ENABLED = "true";
    const getRes = await GET(new Request("https://example.test/api/subscription-plan-change", { method: "GET" }));
    const postRes = await POST(new Request("https://example.test/api/subscription-plan-change", { method: "POST" }));
    assert.equal(getRes.status, 401);
    assert.equal(postRes.status, 401);
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldFlag === undefined) delete process.env.BILLING_SANDBOX_ENABLED; else process.env.BILLING_SANDBOX_ENABLED = oldFlag;
  }
});
