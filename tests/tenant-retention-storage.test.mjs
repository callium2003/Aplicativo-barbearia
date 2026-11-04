import test from "node:test";
import assert from "node:assert/strict";
import { runTenantRetention } from "../scripts/run-tenant-retention.mjs";

test("runTenantRetention simulates storage object removal in dry-run mode", async () => {
  const calls = [];
  const mockClient = {
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      if (name === "list_tenant_retention_candidates") {
        return {
          data: [
            {
              barbershop_id: "10000000-0000-0000-0000-000000000001",
              barbershop_name: "Barbearia Expirada",
              effective_end: new Date(Date.now() - 70 * 86400000).toISOString(),
            },
          ],
          error: null,
        };
      }
      if (name === "list_tenant_retention_storage") {
        return {
          data: [
            { bucket_id: "barbershop-images", object_name: "10000000-0000-0000-0000-000000000001/foto.jpg" },
            { bucket_id: "professional-images", object_name: "40000000-0000-0000-0000-000000000001/foto.jpg" },
          ],
          error: null,
        };
      }
      if (name === "run_tenant_retention_cycle") {
        return {
          data: {
            dry_run: true,
            evaluated: 1,
            processed: 1,
            appointments_anonymized: 5,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        remove: async (paths) => {
          calls.push({ storageRemove: paths });
          return { data: null, error: null };
        },
      }),
    },
  };

  const result = await runTenantRetention({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-key",
    client: mockClient,
    dryRun: true,
    batchSize: 20,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.candidatesEvaluated, 1);
  assert.equal(result.storageObjectsRemoved, 2);
  assert.equal(result.databaseCycle.dry_run, true);

  // In dry run mode, storage.from().remove() must NOT be called
  assert.equal(calls.some((c) => c.storageRemove), false);
});

test("runTenantRetention removes storage objects via Storage API before DB anonymization in real mode", async () => {
  const calls = [];
  const mockClient = {
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      if (name === "list_tenant_retention_candidates") {
        return {
          data: [
            {
              barbershop_id: "10000000-0000-0000-0000-000000000001",
              barbershop_name: "Barbearia Expirada",
              effective_end: new Date(Date.now() - 70 * 86400000).toISOString(),
            },
          ],
          error: null,
        };
      }
      if (name === "list_tenant_retention_storage") {
        return {
          data: [
            { bucket_id: "barbershop-images", object_name: "10000000-0000-0000-0000-000000000001/foto.jpg" },
            { bucket_id: "support-attachments", object_name: "10000000-0000-0000-0000-000000000001/ticket.pdf" },
          ],
          error: null,
        };
      }
      if (name === "run_tenant_retention_cycle") {
        return {
          data: {
            dry_run: false,
            evaluated: 1,
            processed: 1,
            appointments_anonymized: 3,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    storage: {
      from: (bucket) => ({
        remove: async (paths) => {
          calls.push({ storageRemove: { bucket, paths } });
          return { data: [{ name: paths[0] }], error: null };
        },
      }),
    },
  };

  const result = await runTenantRetention({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-key",
    client: mockClient,
    dryRun: false,
    batchSize: 10,
  });

  assert.equal(result.dryRun, false);
  assert.equal(result.candidatesEvaluated, 1);
  assert.equal(result.storageObjectsRemoved, 2);
  assert.equal(result.databaseCycle.dry_run, false);

  const storageRemovals = calls.filter((c) => c.storageRemove);
  assert.equal(storageRemovals.length, 2);
  assert.deepEqual(storageRemovals[0].storageRemove, {
    bucket: "barbershop-images",
    paths: ["10000000-0000-0000-0000-000000000001/foto.jpg"],
  });
  assert.deepEqual(storageRemovals[1].storageRemove, {
    bucket: "support-attachments",
    paths: ["10000000-0000-0000-0000-000000000001/ticket.pdf"],
  });

  // Verify DB cycle was called after storage removals
  const removeIndex = calls.findIndex((c) => c.storageRemove);
  const cycleIndex = calls.findIndex((c) => c.rpc === "run_tenant_retention_cycle");
  assert.ok(removeIndex < cycleIndex, "Storage removal must happen before DB anonymization cycle");
});

test("runTenantRetention isolates storage failures and logs error for retry", async () => {
  const mockClient = {
    rpc: async (name) => {
      if (name === "list_tenant_retention_candidates") {
        return {
          data: [{ barbershop_id: "10000000-0000-0000-0000-000000000001" }],
          error: null,
        };
      }
      if (name === "list_tenant_retention_storage") {
        return {
          data: [{ bucket_id: "barbershop-images", object_name: "10000000-0000-0000-0000-000000000001/photo.jpg" }],
          error: null,
        };
      }
      if (name === "run_tenant_retention_cycle") {
        return {
          data: { dry_run: false, evaluated: 0, processed: 0 },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        remove: async () => ({
          data: null,
          error: new Error("Network timeout during storage delete"),
        }),
      }),
    },
  };

  const result = await runTenantRetention({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-key",
    client: mockClient,
    dryRun: false,
  });

  assert.equal(result.failedTenantStorageCount, 1);
});
