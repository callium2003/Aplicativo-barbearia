import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
  const skippedActiveTenants = new Set();

  for (const candidate of candidateList) {
    // Revalidação atômica de elegibilidade e mapeamento coordenado de arquivos sob lock no banco
    const { data: claimedData, error: claimError } = await supabase.rpc(
      "claim_tenant_for_storage_retention",
      { p_barbershop_id: candidate.barbershop_id }
    );

    if (claimError) {
      console.error(
        `Failed to claim tenant storage for retention on barbershop ${candidate.barbershop_id}:`,
        claimError
      );
      failedTenantStorage.add(candidate.barbershop_id);
      continue;
    }

    const rows = claimedData || [];
    // Se o estabelecimento foi reativado concorrentemente ou teve acordo comercial ativado, a RPC descarta elegibilidade
    if (rows.length > 0 && rows[0].eligible === false) {
      skippedActiveTenants.add(candidate.barbershop_id);
      continue;
    }

    const objects = rows.filter((r) => r.bucket_id && r.object_name);
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
    skippedActiveTenantsCount: skippedActiveTenants.size,
    databaseCycle: cycleResult,
  };

  return result;
}

// Execução direta via CLI se chamado como script principal
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
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
