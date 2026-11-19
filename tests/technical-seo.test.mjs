import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const origin = "https://barbeariasp.cullentech.com.br";
const publicPaths = ["/", "/termos", "/privacidade", "/regras-assinatura", "/sobre", "/contato"];
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

test("serves a real XML sitemap containing only the approved canonical institutional URLs", async () => {
  const { response, text } = await read("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /xml/);
  const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, publicPaths.map(path => origin + path));
  assert.equal(new Set(urls).size, urls.length);
  assert.equal([...text.matchAll(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)].length, publicPaths.length, "every URL declares its versioned content date");
  assert.equal([...text.matchAll(/<image:loc>/g)].length, 14);
  assert.ok(text.includes(`<video:content_loc>${origin}/videos/barbeariasp-apresentacao.mp4</video:content_loc>`));
});

test("serves robots as text, advertises the sitemap and keeps login and assets crawlable", async () => {
  const { response, text } = await read("/robots.txt");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/plain/);
  assert.match(text, /User-Agent: \*/i);
  assert.match(text, /^Content-Signal: search=yes, ai-train=no$/m);
  assert.match(text, /Allow: \/\s/);
  assert.ok(text.includes(`Sitemap: ${origin}/sitemap.xml`));
  for (const route of ["painel", "plataforma", "api"]) assert.ok(text.includes(`Disallow: /${route}/`));
  assert.ok(text.includes("Allow: /plataforma/entrar$"));
  assert.doesNotMatch(text, /Disallow: \/(?:$|\s|_next|videos|entrar|cliente|cadastro-inicial|termos|privacidade|regras-assinatura)/m);
});

test("serves agent resources with real media and negotiates the homepage representation", async () => {
  const llms = await read("/llms.txt");
  assert.equal(llms.response.status, 200);
  assert.match(llms.response.headers.get("content-type"), /text\/plain/);
  assert.match(llms.text, /^# BarbeariaSP\n/);
  assert.match(llms.text, /^> /m);
  for (const path of ["/sobre", "/contato", "/termos"]) assert.ok(llms.text.includes(`${origin}${path}`));
  const md = await fetch(`http://127.0.0.1:${port}/`, { headers: { Accept: "text/markdown" } });
  assert.equal(md.status, 200);
  assert.match(md.headers.get("content-type"), /text\/markdown/);
  assert.match(md.headers.get("vary"), /Accept/i);
  assert.match(await md.text(), /^# BarbeariaSP/);
  const home = await read("/");
  assert.match(home.response.headers.get("link"), /llms\.txt.*rel="describedby"/);
  assert.match(home.response.headers.get("vary"), /Accept/i);
  for (const path of ["/sobre", "/contato", "/termos"]) assert.ok(home.text.includes(`href="${path}"`));
  assert.ok(home.text.includes("mailto:contato@cullentech.com.br"));
  const graph = JSON.parse(home.text.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1])["@graph"];
  for (const type of ["Organization", "WebSite", "SoftwareApplication", "FAQPage", "ImageObject", "VideoObject"]) assert.ok(graph.some(node => node["@type"] === type), type);
  const card = await read("/.well-known/mcp/server-card.json");
  assert.equal(card.response.status, 200);
  const data = JSON.parse(card.text);
  assert.equal(data.transport.endpoint, `${origin}/mcp`);
  assert.equal(data.tools.length, 2);
  const mcp = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "http-test", method: "tools/call", params: { name: "list_subscription_plans", arguments: {} } }),
  });
  assert.equal(mcp.status, 200);
  const plans = JSON.parse((await mcp.json()).result.content[0].text);
  assert.equal(plans.plans.length, 6);
  for (const path of ["/videos/barbeariasp-apresentacao-poster.jpg", "/marketing-demo/gestao-agenda.jpg"]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /image\/jpeg/);
    await response.body.cancel();
  }
});

test("missing resource URLs return HTTP404, including single-segment routes", async () => {
  for (const path of ["/missing-audit-page.txt", "/missing-audit-page/child"]) assert.equal((await read(path)).response.status, 404, path);
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
      assert.ok(JSON.parse(json)["@graph"].some(node => node["@type"] === "SoftwareApplication"));
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
