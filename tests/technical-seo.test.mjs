import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const origin = "https://barbeariasp.cullentech.com.br";
const publicPaths = ["/", "/termos", "/privacidade", "/regras-assinatura"];
const port = 46000 + (process.pid % 1000);
let server;

async function read(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" });
  return { response, text: await response.text() };
}

before(async () => {
  server = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_validation_only" },
    stdio: "ignore",
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { await read("/api/health"); return; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  throw new Error("SEO test server did not start");
});

after(() => server?.kill());

test("serves a real XML sitemap containing only the four canonical institutional URLs", async () => {
  const { response, text } = await read("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /xml/);
  const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, publicPaths.map(path => origin + path));
  assert.equal(new Set(urls).size, urls.length);
  assert.doesNotMatch(text, /<lastmod>/, "do not invent content modification dates");
});

test("serves robots as text, advertises the sitemap and keeps login and assets crawlable", async () => {
  const { response, text } = await read("/robots.txt");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/plain/);
  assert.match(text, /User-Agent: \*/i);
  assert.match(text, /Allow: \/\s/);
  assert.ok(text.includes(`Sitemap: ${origin}/sitemap.xml`));
  for (const route of ["painel", "plataforma", "api"]) assert.ok(text.includes(`Disallow: /${route}/`));
  assert.ok(text.includes("Allow: /plataforma/entrar$"));
  assert.doesNotMatch(text, /Disallow: \/(?:$|\s|_next|videos|entrar|cliente|cadastro-inicial|termos|privacidade|regras-assinatura)/m);
});

test("keeps public pages indexable with one canonical and preserves landing SEO", async () => {
  for (const path of publicPaths) {
    const { response, text } = await read(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-robots-tag"), null, path);
    assert.doesNotMatch(text, /<meta[^>]+name="robots"[^>]+noindex/);
    const canonicals = [...text.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(canonicals, [path === "/" ? origin : origin + path], path);
    assert.equal((text.match(/<title>/g) || []).length, 1);
    assert.equal((text.match(/name="description"/g) || []).length, 1);
    assert.match(text, /<html[^>]+lang="pt-BR"/);
    if (path === "/") {
      assert.match(text, /Sistema para Barbearia com Agenda Online \| BarbeariaSP/);
      for (const name of ["og:title", "og:description", "twitter:title", "twitter:description"]) {
        assert.equal((text.match(new RegExp(`(?:name|property)="${name}"`, "g")) || []).length, 1);
      }
      assert.equal((text.match(/name="google-site-verification"/g) || []).length, 1);
      assert.match(text, /<meta name="google-site-verification" content="eOwPNtBSxOKtaDZH3LDuSyBacVO6gJGK1BNexENQXsg"/);
      const json = text.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
      assert.equal(JSON.parse(json)["@type"], "SoftwareApplication");
    }
  }
});

test("marks operational routes noindex including redirects, descendants, queries and API errors", async () => {
  const routes = ["/painel", "/painel/agenda", "/plataforma", "/plataforma/entrar", "/entrar", "/entrar?next=%2Fpainel", "/cadastro-inicial", "/cliente/entrar", "/api/health", "/api/leads", "/meu-perfil", "/meu-perfil/privacidade", "/meus-agendamentos", "/convite/equipe", "/encerramento-conta", "/design/assinatura"];
  for (const path of routes) {
    const { response } = await read(path);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow", path);
    assert.notEqual(response.status, 500, path);
    if (["/painel", "/painel/agenda", "/plataforma"].includes(path)) assert.equal(response.status, 307, path);
    if (path === "/api/leads") assert.equal(response.status, 405, path);
  }
});
