import { serverCard } from "../../../../utils/public-mcp";

export function GET() {
  return Response.json(serverCard, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "public, max-age=3600" } });
}
