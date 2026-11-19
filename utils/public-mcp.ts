import { executePublicTool, publicTools, siteOrigin } from "./agent-content.ts";

export const serverInfo = { name: "barbeariasp-public", title: "BarbeariaSP — informações públicas", version: "1.0.0", websiteUrl: siteOrigin };
export const capabilities = { tools: {} };
const versions = ["2025-11-25", "2025-06-18"];
export const serverCard = {
  // Identifier from SEP-1649; the proposal's remote validation schema is not published.
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  version: "1.0", protocolVersion: versions[0], serverInfo,
  description: "Consulta pública de produto e planos do BarbeariaSP, sem acesso a contas, reservas ou pagamentos.",
  documentationUrl: `${siteOrigin}/llms.txt`,
  transport: { type: "streamable-http", endpoint: `${siteOrigin}/mcp` },
  capabilities, authentication: { required: false, schemes: [] }, tools: publicTools,
};

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function error(code: number, message: string, id: unknown = null, status = 400) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleMcp(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const localOrigin = new URL(request.url);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(localOrigin.hostname);
  if (origin && origin !== (local ? localOrigin.origin : siteOrigin)) return error(-32000, "Origem não permitida.", null, 403);
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  const protocol = request.headers.get("mcp-protocol-version");
  if (protocol && !versions.includes(protocol)) return error(-32600, "Versão de protocolo não suportada.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error(-32600, "Use application/json.", null, 415);
  const accept = request.headers.get("accept") ?? "";
  if (!["application/json", "text/event-stream"].every(type => accept.includes(type))) return error(-32600, "Accept deve incluir application/json e text/event-stream.", null, 406);
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return error(-32600, "Mensagem muito grande.", null, 413);
  let message: unknown;
  const reader = request.body?.getReader();
  try {
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); return error(-32600, "Mensagem muito grande.", null, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    message = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return error(-32700, "JSON inválido."); }
  finally { reader?.releaseLock(); }
  if (!object(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string" || (message.params !== undefined && !object(message.params)) || ("id" in message && typeof message.id !== "string" && !(typeof message.id === "number" && Number.isFinite(message.id)))) return error(-32600, "Mensagem JSON-RPC inválida.");
  // No state or server-to-client messages: notifications are acknowledged, never executed.
  if (!("id" in message)) return new Response(null, { status: 202 });
  const { id, method } = message;
  const params = object(message.params) ? message.params : {};
  let result: unknown;
  if (method === "initialize") {
    if (typeof params.protocolVersion !== "string" || !object(params.capabilities) || !object(params.clientInfo) || typeof params.clientInfo.name !== "string" || typeof params.clientInfo.version !== "string") return error(-32602, "Parâmetros de inicialização inválidos.", id);
    result = { protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0], capabilities, serverInfo };
  } else if (method === "ping") result = {};
  else if (method === "tools/list") result = { tools: publicTools };
  else if (method === "tools/call") {
    if (typeof params.name !== "string") return error(-32602, "Ferramenta inválida.", id);
    try { result = executePublicTool(params.name, params.arguments ?? {}); }
    catch { return error(-32602, "Ferramenta ou argumentos inválidos.", id); }
  } else return error(-32601, "Método não suportado.", id, 200);
  return Response.json({ jsonrpc: "2.0", id, result }, { headers: { "Cache-Control": "no-store" } });
}
