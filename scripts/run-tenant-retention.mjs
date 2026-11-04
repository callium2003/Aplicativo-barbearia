import { createClient } from "@supabase/supabase-js";

export async function runTenantRetention(options = {}) {
  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = options.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = options.dryRun ?? process.argv.includes("--dry-run");
  const batchSizeArg = options.batchSize ?? (() => {
    const idx = process.argv.indexOf("--batch-size");
    return idx !== -1 && process.argv[idx + 1] ? parseInt(process.argv[idx + 1], 10) : 50;
  })();
  const batchSize = Math.max(1, Math.min(Number.isInteger(batchSizeArg) ? batchSizeArg : 50, 200));

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = options.client || createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: candidates, error: candidateError } = await supabase.rpc(
    "list_tenant_retention_candidates",
    { p_batch_size: batchSize }
  );

  if (candidateError) {
    throw new Error(`Failed to list retention candidates: ${candidateError.message || candidateError}`);
  }

  const candidateList = candidates || [];
  let storageObjectsRemoved = 0;
  const failedTenantStorage = new Set();

  for (const candidate of candidateList) {
    const { data: rawObjects, error: storageListError } = await supabase.rpc(
      "list_tenant_retention_storage",
      { p_barbershop_id: candidate.barbershop_id }
    );

    if (storageListError) {
      console.error(
        `Failed to list storage objects for barbershop ${candidate.barbershop_id}:`,
        storageListError
      );
      failedTenantStorage.add(candidate.barbershop_id);
      continue;
    }

    const objects = rawObjects || [];
    if (objects.length === 0) continue;

    if (dryRun) {
      for (const obj of objects) {
        console.log(`[dry-run] Would remove storage object: ${obj.bucket_id}/${obj.object_name}`);
      }
      storageObjectsRemoved += objects.length;
      continue;
    }

    // Agrupa objetos por bucket para remoção em lote via Storage API
    const byBucket = new Map();
    for (const obj of objects) {
      if (!obj.bucket_id || !obj.object_name) continue;
      const list = byBucket.get(obj.bucket_id) || [];
      list.push(obj.object_name);
      byBucket.set(obj.bucket_id, list);
    }

    let tenantStorageFailed = false;
    for (const [bucket, paths] of byBucket.entries()) {
      for (let i = 0; i < paths.length; i += 100) {
        const batch = paths.slice(i, i + 100);
        const { error: removeError } = await supabase.storage.from(bucket).remove(batch);
        if (removeError) {
          console.error(
            `Failed to remove storage objects in bucket ${bucket} for barbershop ${candidate.barbershop_id}:`,
            removeError
          );
          tenantStorageFailed = true;
          break;
        }
        storageObjectsRemoved += batch.length;
      }
      if (tenantStorageFailed) break;
    }

    if (tenantStorageFailed) {
      failedTenantStorage.add(candidate.barbershop_id);
    }
  }

  // Executa o ciclo de banco de dados para os candidatos elegíveis
  const { data: cycleResult, error: cycleError } = await supabase.rpc(
    "run_tenant_retention_cycle",
    { p_batch_size: batchSize, p_dry_run: dryRun }
  );

  if (cycleError) {
    throw new Error(`Failed to execute tenant retention cycle: ${cycleError.message || cycleError}`);
  }

  const result = {
    dryRun,
    candidatesEvaluated: candidateList.length,
    storageObjectsRemoved,
    failedTenantStorageCount: failedTenantStorage.size,
    databaseCycle: cycleResult,
  };

  return result;
}

// Execução direta via CLI se chamado como script principal
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  runTenantRetention()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Tenant retention execution failed:", err);
      process.exit(1);
    });
}
