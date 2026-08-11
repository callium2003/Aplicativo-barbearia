import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight availability probe for uptime monitors.
 *
 * It intentionally checks only whether this Next.js instance can serve a
 * request: monitoring must not expose database details, credentials, tenant
 * data, or the state of individual customer operations.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", checkedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
