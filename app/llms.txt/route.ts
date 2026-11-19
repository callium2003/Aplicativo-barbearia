import { llmsText } from "../../utils/agent-content";

export function GET() {
  return new Response(llmsText, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
