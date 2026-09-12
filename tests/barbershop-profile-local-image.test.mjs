import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("barbershop profile renders saved and local preview images without the optimizer", async () => {
  const page = await readFile(
    new URL("../app/painel/configurar/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /<h3 id="barbershop-photo-title">Foto da barbearia<\/h3>/);
  assert.match(page, /src=\{photoPresentation\.source\}\s+unoptimized/);
  assert.match(page, /onError=\{\(\) => setFailedPhotoSource\(photoPresentation\.source\)\}/);
});
