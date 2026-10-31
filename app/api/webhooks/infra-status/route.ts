import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateInfraWebhookPayload } from "@/utils/platform-administration.mjs";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(req: Request) {
  try {
    const configuredSecret =
      process.env.INFRA_WEBHOOK_SECRET ||
      process.env.BARBEARIASP_NOTIFICATION_CRON_SECRET;

    if (!configuredSecret) {
      return NextResponse.json(
        { error: "Receptor de webhooks não configurado no servidor." },
        { status: 503 }
      );
    }

    const headerSecret =
      req.headers.get("x-infra-webhook-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";

    if (!headerSecret || !safeCompare(headerSecret, configuredSecret)) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Corpo da requisição deve ser um JSON válido." },
        { status: 400 }
      );
    }

    const validated = validateInfraWebhookPayload(rawBody);

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuração do Supabase indisponível no servidor." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await adminClient.rpc("ingest_platform_infra_webhook", {
      p_provider: validated.provider,
      p_service_name: validated.service,
      p_status: validated.status,
      p_title: validated.title,
      p_description: validated.description,
      p_metadata: validated.metadata,
    });

    if (error) {
      return NextResponse.json(
        { error: `Falha ao processar webhook no banco: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, data },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "Método não permitido. Utilize POST para emitir alertas de webhook." },
    { status: 405 }
  );
}

