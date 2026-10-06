import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { requireLocalDemoUrl } from '../scripts/landing-demo-guard.mjs';
import { demoScreenGroups } from '../app/marketing-demo-screens.mjs';

test('demo aceita somente API do stack local exclusivo', () => {
  assert.equal(requireLocalDemoUrl('http://127.0.0.1:55321'), 'http://127.0.0.1:55321');
  for (const url of [undefined, '', 'https://projeto.supabase.co', 'http://localhost:55321', 'http://127.0.0.1:54321', 'http://127.0.0.1:55321@projeto.supabase.co', 'http://127.0.0.1:55321/']) {
    assert.throws(() => requireLocalDemoUrl(url), /execução bloqueada/);
  }
});

test('cada demo publicada possui captura JPEG local e uma rota real do app', async () => {
  const sources = new Set();
  for (const group of demoScreenGroups) {
    for (const screen of group.screens) {
      assert.equal(sources.has(screen.src), false, `captura duplicada: ${screen.src}`);
      sources.add(screen.src);
      const image = await readFile(new URL(`../public${screen.src}`, import.meta.url));
      assert.equal(image.readUInt16BE(0), 0xffd8, `formato inválido: ${screen.src}`);
      assert.ok(image.length > 5000, `captura vazia: ${screen.src}`);
      await readFile(new URL(`../app${screen.route}/page.tsx`, import.meta.url));
    }
  }
  assert.equal(sources.size, 14);
});
