import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("customer privacy portal downloads only its authenticated export and requests account deletion", async () => {
  const page = await read("app/meu-perfil/privacidade/page.tsx");

  assert.match(page, /export_my_customer_data/);
  assert.match(page, /delete-my-customer-account/);
  assert.match(page, /customer_privacy_requests/);
  assert.match(page, /Voltar ao perfil/);
  assert.match(page, /pendingCustomerDeletionKey/);
  assert.match(page, /sessionStorage\.setItem\(pendingCustomerDeletionKey/);
  assert.match(page, /sessionStorage\.removeItem\(pendingCustomerDeletionKey/);
  assert.match(page, /Confirme novamente seu acesso/);
  assert.match(page, /Não, voltar ao perfil/);
  assert.match(page, /Sim, encerrar conta/);
  assert.match(page, /Conta cancelada conforme sua solicitação\. Caso deseje retornar, será preciso fazer um novo cadastro\./);
  assert.doesNotMatch(page, /window\.confirm/);
  assert.doesNotMatch(page, /customer_id\s*:/);
  assert.doesNotMatch(page, /service_role/i);
});

test("account deletion function obtains the subject only from a verified bearer token", async () => {
  const edgeFunction = await read("supabase/functions/delete-my-customer-account/index.ts");

  assert.match(edgeFunction, /Authorization/);
  assert.match(edgeFunction, /getUser\(token\)/);
  assert.match(edgeFunction, /anonymize_my_customer_account/);
  assert.match(edgeFunction, /auth\.admin\.deleteUser/);
  assert.match(edgeFunction, /authentication_required/);
  assert.doesNotMatch(edgeFunction, /request\.json\(/);
  assert.doesNotMatch(edgeFunction, /(?:body|requestBody)\s*\.\s*user_id/);
  assert.doesNotMatch(edgeFunction, /console\.(?:log|warn|error)/);
});

function accountDeletionFixture({ storageFailure = false } = {}) {
  let handler;
  const operations = [];
  const createClient = (_url, key) => {
    if (key === "service-role-test-key") {
      return {
        auth: {
          getUser: async () => {
            operations.push("getUser");
            return { data: { user: { id: "user-a" } }, error: null };
          },
          admin: {
            deleteUser: async () => {
              operations.push("deleteUser");
              return { error: null };
            },
          },
        },
        storage: {
          from: (bucket) => ({
            remove: async (paths) => {
              operations.push(`remove:${bucket}:${paths.join(",")}`);
              return { error: storageFailure ? new Error("synthetic-storage-failure") : null };
            },
          }),
        },
      };
    }
    return {
      rpc: async (name) => {
        operations.push(`rpc:${name}`);
        if (name === "list_my_storage_objects_for_account_deletion") {
          return {
            data: [
              { bucket_id: "customer-files", object_name: "user-a/document.pdf" },
              { bucket_id: "customer-files", object_name: "user-a/avatar.webp" },
            ],
            error: null,
          };
        }
        if (name === "anonymize_my_customer_account") {
          return { data: [{ public_protocol: "PRIV-TEST" }], error: null };
        }
        throw new Error(`unexpected rpc ${name}`);
      },
    };
  };
  return read("supabase/functions/delete-my-customer-account/index.ts").then((source) => {
    const executable = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ""));
    vm.runInNewContext(executable, {
      createClient,
      Deno: {
        env: { get: (name) => ({
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_ANON_KEY: "publishable-test-key",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
        })[name] },
        serve: (callback) => { handler = callback; },
      },
      Response,
      JSON,
    });
    return { handler, operations };
  });
}

test("account deletion removes owned files through the Storage API before anonymization", async () => {
  const state = await accountDeletionFixture();
  const response = await state.handler(new Request("https://example.invalid/functions/v1/delete-my-customer-account", {
    method: "POST",
    headers: { Authorization: "Bearer verified-test-token" },
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(state.operations, [
    "getUser",
    "rpc:list_my_storage_objects_for_account_deletion",
    "remove:customer-files:user-a/document.pdf,user-a/avatar.webp",
    "rpc:anonymize_my_customer_account",
    "deleteUser",
  ]);
});

test("account deletion stops before anonymization when Storage cleanup fails", async () => {
  const state = await accountDeletionFixture({ storageFailure: true });
  const response = await state.handler(new Request("https://example.invalid/functions/v1/delete-my-customer-account", {
    method: "POST",
    headers: { Authorization: "Bearer verified-test-token" },
  }));

  assert.equal(response.status, 500);
  assert.equal(state.operations.some((operation) => operation === "rpc:anonymize_my_customer_account"), false);
  assert.equal(state.operations.includes("deleteUser"), false);
});

test("forward privacy migrations support a no-regression Storage API rollout", async () => {
  const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
  const manifestMigrationName = migrationFiles.find((file) => file.endsWith("_delete_customer_storage_via_api.sql"));
  const finalMigrationName = migrationFiles.find((file) => file.endsWith("_finalize_customer_storage_api_cleanup.sql"));
  assert.ok(manifestMigrationName, "Storage manifest migration must exist");
  assert.ok(finalMigrationName, "Storage cleanup finalization migration must exist");
  const manifestMigration = await read(`supabase/migrations/${manifestMigrationName}`);
  const finalMigration = await read(`supabase/migrations/${finalMigrationName}`);

  assert.match(manifestMigration, /create or replace function public\.list_my_storage_objects_for_account_deletion\(\)/i);
  assert.match(manifestMigration, /storage_object\.owner_id = \(select auth\.uid\(\)\)::text/i);
  assert.doesNotMatch(manifestMigration, /create or replace function public\.anonymize_my_customer_account\(\)/i);
  assert.match(manifestMigration, /revoke all on function public\.list_my_storage_objects_for_account_deletion\(\) from public, anon, authenticated/i);
  assert.match(manifestMigration, /grant execute on function public\.list_my_storage_objects_for_account_deletion\(\) to authenticated/i);

  assert.match(finalMigration, /create or replace function public\.anonymize_my_customer_account\(\)/i);
  assert.doesNotMatch(finalMigration, /delete from storage\.objects/i);
});

test("privacy migration protects requests, exports only owned data, and keeps grants minimal", async () => {
  const migration = await read("supabase/migrations/20260819041728_harden_customer_privacy_rights.sql");
  const grantsFix = await read("supabase/migrations/20260824085258_restrict_customer_privacy_request_grants.sql");
  const sql = await read("tests/customer-privacy-rights-rls.sql");

  assert.match(migration, /create table public\.customer_privacy_requests/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /customer_privacy_requests_one_open_request_per_type/);
  assert.match(migration, /export_my_customer_data\(\)/);
  assert.match(migration, /anonymize_my_customer_account\(\)/);
  assert.match(migration, /Recent authentication required/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /storage\.allow_delete_query/);
  assert.match(migration, /customer_privacy_requests request/);
  assert.match(migration, /revoke all on function public\.export_my_customer_data\(\) from public, anon/);
  assert.match(migration, /grant execute on function public\.anonymize_my_customer_account\(\) to authenticated/);
  assert.match(grantsFix, /revoke all on table public\.customer_privacy_requests from authenticated/);
  assert.match(grantsFix, /grant select on table public\.customer_privacy_requests to authenticated/);
  assert.match(sql, /authenticated must have read-only access to customer privacy protocols/);
  assert.match(sql, /rollback;/i);
  assert.match(sql, /customer A must not read customer B privacy protocols/);
  assert.match(sql, /anonymization must be idempotent/);
  assert.match(sql, /an old session must not allow anonymization/);
  assert.match(sql, /required financial snapshot was changed by anonymization/);
});
