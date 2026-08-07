import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

const expectedMigrations = [
  "20260801001539_baseline_remote_schema.sql",
  "20260803044908_add_barbershop_image_storage.sql",
  "20260803045033_harden_barbershop_image_access.sql",
  "20260803071307_add_initial_registration_details.sql",
  "20260803195045_fix_barbershop_image_upload_policy.sql",
  "20260803222030_20260803205726_install_customer_crm_booking.sql",
  "20260803224530_20260803230000_secure_public_catalog_and_internal_trigger.sql",
  "20260804013607_20260803230000_optimize_booking_intervals_10min.sql",
  "20260804043338_add_team_invitations.sql",
  "20260806040824_20260804050000_add_professional_commission_rate.sql",
  "20260806040831_20260804060000_isolate_professional_commission.sql",
  "20260806040839_20260804070000_harden_professional_commission_security.sql",
  "20260806051055_20260806050000_revoke_anon_commission_rpc_execute.sql",
  "20260807015209_fix_barbershop_image_delete_policy.sql",
  "20260807015637_harden_team_invitations_table_privileges.sql",
  "20260807020013_harden_team_invitation_rpc_privileges.sql",
  "20260807020457_harden_public_invitation_details.sql",
  "20260807022443_implement_role_permission_matrix.sql",
  "20260807022720_preserve_safe_manager_profile_updates.sql",
  "20260807025705_optimize_rls_and_foreign_key_indexes.sql",
  "20260807030613_allow_barber_self_schedule_management.sql",
];

test("executable Supabase migrations match the reconciled remote lineage", async () => {
  const files = (await readdir(new URL("../supabase/migrations/", import.meta.url)))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  assert.deepEqual(files, [...expectedMigrations].sort());

  const versions = files.map((file) => file.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length, "migration versions must be unique");

  assert.ok(!files.some((file) => file.startsWith("20260802180056_")));
  assert.ok(!files.some((file) => file.startsWith("20260803015008_")));
});
