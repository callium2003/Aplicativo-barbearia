import { discoveryLinks, homepageMarkdown } from "../../utils/agent-content";

export function GET() {
  return new Response(homepageMarkdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", Link: discoveryLinks, Vary: "Accept" } });
}
