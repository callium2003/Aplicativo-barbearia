import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const STORAGE_DELETE_BATCH_SIZE = 100;

type StorageObject = {
  bucket_id: string;
  object_name: string;
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return response(405, { code: "method_not_allowed" });
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    return response(401, { code: "authentication_required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceRoleKey) {
    return response(500, { code: "operation_unavailable" });
  }

  const authClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authenticated, error: authenticationError } = await authClient.auth.getUser(token);
  if (authenticationError || !authenticated.user) {
    return response(401, { code: "authentication_required" });
  }

  const customerClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: rawStorageObjects, error: storageManifestError } = await customerClient.rpc(
    "list_my_storage_objects_for_account_deletion",
  );
  if (storageManifestError || !Array.isArray(rawStorageObjects)) {
    return response(403, { code: "operation_not_allowed" });
  }

  const storageObjects = rawStorageObjects as StorageObject[];
  const objectsByBucket = new Map<string, string[]>();
  for (const storageObject of storageObjects) {
    if (
      typeof storageObject?.bucket_id !== "string" || !storageObject.bucket_id.trim()
      || typeof storageObject?.object_name !== "string" || !storageObject.object_name.trim()
    ) {
      return response(500, { code: "operation_failed" });
    }
    const paths = objectsByBucket.get(storageObject.bucket_id) || [];
    paths.push(storageObject.object_name);
    objectsByBucket.set(storageObject.bucket_id, paths);
  }

  for (const [bucket, paths] of objectsByBucket) {
    for (let index = 0; index < paths.length; index += STORAGE_DELETE_BATCH_SIZE) {
      const { error: storageDeletionError } = await authClient.storage
        .from(bucket)
        .remove(paths.slice(index, index + STORAGE_DELETE_BATCH_SIZE));
      if (storageDeletionError) {
        return response(500, { code: "operation_failed" });
      }
    }
  }

  const { data: anonymization, error: anonymizationError } = await customerClient.rpc(
    "anonymize_my_customer_account",
  );
  if (anonymizationError) {
    return response(403, { code: "operation_not_allowed" });
  }

  const { error: deletionError } = await authClient.auth.admin.deleteUser(authenticated.user.id);
  if (deletionError) {
    return response(500, { code: "operation_failed" });
  }

  const result = Array.isArray(anonymization) ? anonymization[0] : anonymization;
  return response(200, { status: "completed", protocol: result?.public_protocol || null });
});
