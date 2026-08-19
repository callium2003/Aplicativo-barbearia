import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configPage = new URL("../app/painel/configurar/page.tsx", import.meta.url);
const migration = new URL(
  "../supabase/migrations/20260803044908_add_barbershop_image_storage.sql",
  import.meta.url,
);
const uploadPolicyFixMigration = new URL(
  "../supabase/migrations/20260803195045_fix_barbershop_image_upload_policy.sql",
  import.meta.url,
);
const privacyMigration = new URL(
  "../supabase/migrations/20260818163652_harden_privacy_inputs_and_image_urls.sql",
  import.meta.url,
);

test("keeps the barbershop image upload flow constrained to supported images", async () => {
  const page = await readFile(configPage, "utf8");

  assert.match(page, /accept="image\/jpeg,image\/png,image\/webp,\.jpg,\.jpeg,\.png,\.webp"/);
  assert.match(page, /id="barbershop-image-input"/);
  assert.match(page, /htmlFor="barbershop-image-input"/);
  assert.match(page, /No celular, escolha na galeria\/Fotos ou em Arquivos\./);
  assert.doesNotMatch(page, /capture=/);
  assert.match(page, /MAX_IMAGE_BYTES = 3 \* 1024 \* 1024/);
  assert.match(page, /MAX_IMAGE_SIDE = 1600/);
  assert.match(page, /acceptedImageTypes = new Set\(\["image\/jpeg", "image\/png", "image\/webp"\]\)/);
  assert.match(page, /acceptedImageExtensions = new Set\(\["jpg", "jpeg", "png", "webp"\]\)/);
  assert.match(page, /A imagem deve estar nos formatos JPG, PNG ou WebP e ter no máximo 3 MB\./);
  assert.match(page, /crypto\.randomUUID\(\)/);
  assert.match(page, /prepareImageForUpload\(selectedImage\)/);
  assert.match(page, /Enviar e salvar foto/);
  assert.match(page, /A prévia ainda não publica a foto/);
  assert.match(page, /\.from\("barbershop-images"\)\s*\.upload\(/);
  assert.match(page, /rpc\("set_barbershop_photo_url"/);
  assert.ok(page.indexOf('rpc("set_barbershop_photo_url"') < page.indexOf(".remove([oldPath])"));
  assert.match(page, /console\.error\("Falha ao enviar a foto da barbearia", \{ code: "operation_failed" \}\)/);
});

test("creates tenant-isolated storage policies for barbershop images", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /'barbershop-images'/);
  assert.match(sql, /file_size_limit = excluded\.file_size_limit/);
  assert.match(sql, /3145728/);
  assert.match(sql, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(sql, /for insert\s+to authenticated/s);
  assert.match(sql, /for delete\s+to authenticated/s);
  assert.match(sql, /private\.current_barbershop_role\(id\) in \('owner', 'manager'\)/);
  assert.match(sql, /storage\.foldername\(name\)/);
  assert.match(sql, /revoke all on function public\.set_barbershop_photo_url\(uuid, text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.set_barbershop_photo_url\(uuid, text\) to authenticated/);
});

test("uses the uploaded storage path when authorizing barbershop image uploads", async () => {
  const sql = await readFile(uploadPolicyFixMigration, "utf8");

  assert.match(sql, /drop policy if exists "Owner or manager can upload barbershop images"/);
  assert.match(sql, /storage\.foldername\(storage\.objects\.name\)/);
  assert.match(sql, /private\.current_barbershop_role\(barbershop\.id\) in \('owner', 'manager'\)/);
});

test("rejects attacker origins and cross-tenant paths in the final image RPC", async () => {
  const sql = await readFile(privacyMigration, "utf8");
  assert.match(sql, /private\.current_supabase_origin\(\)/);
  assert.match(sql, /barbershop-images\/\' \|\| p_barbershop_id::text/);
  assert.match(sql, /p_photo_url like '%\?%'/);
  assert.match(sql, /p_photo_url like '%#%'/);
  assert.match(sql, /p_photo_url like '%\.\.%'/);
  assert.match(sql, /position\('%' in p_photo_url\) > 0/);
});
