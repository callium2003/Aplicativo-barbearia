import assert from "node:assert/strict";
import test from "node:test";

import { loadPlatformAdministration } from "../utils/platform-administration.mjs";

test("platform administration asks unauthenticated people to sign in without loading SaaS data", async () => {
  let rpcCalls = 0;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    rpc: async () => {
      rpcCalls += 1;
      return { data: null, error: null };
    },
  };

  const result = await loadPlatformAdministration(client);

  assert.deepEqual(result, { status: "unauthenticated" });
  assert.equal(rpcCalls, 0);
});

test("platform owner receives only the overview returned by the protected query", async () => {
  const rows = [{ name: "Barbearia de teste", slug: "teste", contract_status: "trial" }];
  const result = await loadPlatformAdministration({
    auth: { getUser: async () => ({ data: { user: { id: "platform-owner" } }, error: null }) },
    rpc: async (name) => {
      assert.equal(name, "get_platform_barbershop_overview");
      return { data: rows, error: null };
    },
  });

  assert.deepEqual(result, { status: "ready", barbershops: rows });
});

test("authenticated tenant identity cannot receive platform data without the internal role", async () => {
  const result = await loadPlatformAdministration({
    auth: { getUser: async () => ({ data: { user: { id: "tenant-owner" } }, error: null }) },
    rpc: async () => ({ data: null, error: { message: "Acesso interno não autorizado" } }),
  });

  assert.deepEqual(result, { status: "forbidden" });
});
