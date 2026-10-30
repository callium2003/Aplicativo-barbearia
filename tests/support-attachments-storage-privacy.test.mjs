import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("migration 20261030200000 sets support-attachments bucket to private", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261030200000_make_support_attachments_private.sql", import.meta.url),
    "utf-8"
  );

  assert.match(content, /update\s+storage\.buckets\s+set\s+public\s*=\s*false\s+where\s+id\s*=\s*'support-attachments'/i);
});

test("migration 20261030200000 creates tenant-isolated SELECT policy on support-attachments", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261030200000_make_support_attachments_private.sql", import.meta.url),
    "utf-8"
  );

  // Must drop the old overly permissive policy
  assert.match(content, /drop\s+policy\s+if\s+exists\s+"Support attachments are readable by authenticated"/i);

  // Must require tenant isolation via barbershop folder prefix and role check or platform owner
  assert.match(content, /create\s+policy\s+"Support attachments are readable by authorized staff"/i);
  assert.match(content, /private\.is_active_platform_owner\(\)/);
  assert.match(content, /storage\.foldername\(storage\.objects\.name\)/);
  assert.match(content, /private\.current_barbershop_role\(barbershop\.id\)\s+in\s+\('owner',\s*'manager'\)/);

  // Must not allow indiscriminate reading by all authenticated users
  assert.doesNotMatch(content, /to authenticated\s+using\s+\(bucket_id = 'support-attachments'\);/i);
});

test("migration 20261030200000 restricts deletion exclusively to platform owner", async () => {
  const content = await fs.readFile(
    new URL("../supabase/migrations/20261030200000_make_support_attachments_private.sql", import.meta.url),
    "utf-8"
  );

  assert.match(content, /create\s+policy\s+"Support attachments deletable by platform owner only"/i);
  assert.match(content, /on\s+storage\.objects\s+for\s+delete/i);
  assert.match(content, /private\.is_active_platform_owner\(\)/);
});

test("getAttachmentSignedUrl resolves both raw paths and legacy public URLs into signed URLs", async () => {
  const { getAttachmentSignedUrl } = await import("../utils/platform-administration.mjs");

  let requestedBucket = null;
  let requestedPath = null;
  let requestedExpires = null;

  const mockClient = {
    storage: {
      from: (bucket) => {
        requestedBucket = bucket;
        return {
          createSignedUrl: async (path, expiresIn) => {
            requestedPath = path;
            requestedExpires = expiresIn;
            return {
              data: {
                signedUrl: `https://project.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock-token`,
              },
              error: null,
            };
          },
        };
      },
    },
  };

  // 1. Raw relative path
  const url1 = await getAttachmentSignedUrl(mockClient, "b0000000-0000-0000-0000-000000000001/evidence.webp", 1800);
  assert.equal(requestedBucket, "support-attachments");
  assert.equal(requestedPath, "b0000000-0000-0000-0000-000000000001/evidence.webp");
  assert.equal(requestedExpires, 1800);
  assert.match(url1, /token=mock-token/);

  // 2. Legacy public URL format
  const legacyUrl = "https://project.supabase.co/storage/v1/object/public/support-attachments/shop-123/screenshot.webp";
  const url2 = await getAttachmentSignedUrl(mockClient, legacyUrl);
  assert.equal(requestedPath, "shop-123/screenshot.webp");
  assert.match(url2, /token=mock-token/);

  // 3. Data URL should be preserved without calling storage
  const dataUrl = "data:image/webp;base64,AAAA";
  const url3 = await getAttachmentSignedUrl(mockClient, dataUrl);
  assert.equal(url3, dataUrl);

  // 4. Null / empty returns null
  assert.equal(await getAttachmentSignedUrl(mockClient, null), null);
  assert.equal(await getAttachmentSignedUrl(mockClient, ""), null);
});
