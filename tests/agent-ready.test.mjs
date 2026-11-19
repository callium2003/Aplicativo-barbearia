import assert from "node:assert/strict";
import { test } from "node:test";
import { prefersMarkdown, publicGraph, homepageMarkdown, publicTools, executePublicTool } from "../utils/agent-content.ts";
import { subscriptionPlans } from "../utils/subscription-plans.ts";
import { handleMcp, serverCard } from "../utils/public-mcp.ts";
import { publicSlugExists } from "../utils/public-slug.ts";

test("negotiates Markdown explicitly, respecting quality and HTML preference", () => {
  for (const accept of ["text/markdown", "text/markdown, text/html;q=0.8", "TEXT/MARKDOWN; charset=utf-8"]) assert.equal(prefersMarkdown(accept), true);
  for (const accept of [null, "*/*", "text/html", "text/markdown;q=0", "text/markdown;q=0.5,text/html", "text/markdown;q=0, */*;q=1"]) assert.equal(prefersMarkdown(accept), false);
});

test("graph identifies the confirmed entity and FAQ without fabricated profiles or offers", () => {
  const graph = publicGraph([["Pergunta?", "Resposta."]]);
  const nodes = graph["@graph"];
  assert.deepEqual(nodes.slice(0, 4).map(node => node["@type"]), ["Organization", "WebSite", "SoftwareApplication", "FAQPage"]);
  assert.deepEqual(nodes[0].sameAs, ["https://www.instagram.com/barbeariasp.app/"]);
  assert.equal(nodes[0].email, "contato@cullentech.com.br");
  assert.equal(nodes[2].offers.length, subscriptionPlans.length);
  assert.equal(nodes[3].mainEntity[0].acceptedAnswer.text, "Resposta.");
  for (const plan of subscriptionPlans) assert.ok(homepageMarkdown.includes((plan.priceCents / 100).toFixed(2)));
  const video = nodes.find(node => node["@type"] === "VideoObject");
  assert.equal(video?.duration, "PT1M");
  assert.match(video?.contentUrl ?? "", /barbeariasp-apresentacao\.mp4$/);
  assert.ok(nodes.some(node => node["@type"] === "ImageObject"));
  assert.match(homepageMarkdown, /marketing-demo\/gestao-agenda.jpg/);
});

const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const rpc = (body, extra = {}) => handleMcp(new Request("https://barbeariasp.cullentech.com.br/mcp", { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) }));

test("MCP initializes, lists and executes the actual public tools", async () => {
  assert.equal(serverCard.$schema, "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json");
  const init = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
  assert.equal(init.status, 200);
  assert.deepEqual((await init.json()).result.capabilities, { tools: {} });
  const list = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
  assert.deepEqual(list.result.tools, publicTools);
  for (const tool of publicTools) {
    const result = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: tool.name, arguments: {} } })).json();
    assert.deepEqual(result.result, executePublicTool(tool.name, {}));
    assert.equal(tool.annotations.readOnlyHint, true);
  }
  assert.equal((await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
});

test("MCP rejects cross-origin, invalid payload, unsupported methods and extra inputs", async () => {
  assert.equal((await rpc({}, { origin: "https://evil.example" })).status, 403);
  assert.equal((await rpc({}, { "mcp-protocol-version": "1900-01-01" })).status, 400);
  assert.equal((await handleMcp(new Request("https://barbeariasp.cullentech.com.br/mcp"))).status, 405);
  assert.equal((await rpc([])).status, 400);
  const invalid = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: publicTools[0].name, arguments: { tenant: "private" } } })).json();
  assert.equal(invalid.error.code, -32602);
  assert.throws(() => executePublicTool("delete_booking", {}));
});

test("public slug validation distinguishes absence from backend failure and uses public projection only", async () => {
  const config = { url: "https://public.example", publishableKey: "public-test-key" };
  assert.equal(await publicSlugExists("missing.txt", config, async () => { throw new Error("must not fetch"); }), false);
  assert.equal(await publicSlugExists("missing", config, async input => {
    assert.match(String(input), /public_barbershop_pages/);
    assert.match(String(input), /select=slug/);
    return Response.json([]);
  }), false);
  assert.equal(await publicSlugExists("demo", config, async () => Response.json([{ slug: "demo" }])), true);
  await assert.rejects(publicSlugExists("demo", config, async () => Response.json({}, { status: 503 })), /indisponível/);
});
