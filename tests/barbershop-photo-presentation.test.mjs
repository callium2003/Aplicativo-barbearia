import assert from "node:assert/strict";
import test from "node:test";

import { resolveBarbershopPhotoPresentation } from "../app/painel/configurar/photo-presentation.mjs";

test("shows the saved barbershop photo when there is no new selection", () => {
  assert.deepEqual(
    resolveBarbershopPhotoPresentation({
      previewUrl: null,
      savedUrl: "https://project.supabase.co/storage/v1/object/public/barbershop-images/shop/photo.webp",
      failedUrl: null,
      shopName: "Fada Barbearia",
    }),
    {
      source: "https://project.supabase.co/storage/v1/object/public/barbershop-images/shop/photo.webp",
      alt: "Foto atual da barbearia Fada Barbearia",
      initials: "FB",
      isPreview: false,
    },
  );
});

test("shows the selected file preview in place of the saved photo", () => {
  assert.deepEqual(
    resolveBarbershopPhotoPresentation({
      previewUrl: "blob:http://127.0.0.1/new-photo",
      savedUrl: "https://project.supabase.co/storage/v1/object/public/barbershop-images/shop/old.webp",
      failedUrl: null,
      shopName: "Fada Barbearia",
    }),
    {
      source: "blob:http://127.0.0.1/new-photo",
      alt: "Prévia da nova foto da barbearia Fada Barbearia",
      initials: "FB",
      isPreview: true,
    },
  );
});

test("falls back to visible initials when the current photo cannot load", () => {
  const savedUrl = "https://project.supabase.co/storage/v1/object/public/barbershop-images/shop/broken.webp";

  assert.deepEqual(
    resolveBarbershopPhotoPresentation({
      previewUrl: null,
      savedUrl,
      failedUrl: savedUrl,
      shopName: "Fada Barbearia",
    }),
    {
      source: null,
      alt: "Foto atual da barbearia Fada Barbearia",
      initials: "FB",
      isPreview: false,
    },
  );
});
