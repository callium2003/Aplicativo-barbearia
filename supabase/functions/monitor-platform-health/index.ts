import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.97.0";

const FROM_EMAIL = "notificacoes@barbeariasp.cullentech.com.br";
const HEALTH_URL = "https://barbeariasp.cullentech.com.br/api/health";

type WorkerSecrets = {
  resend_api_key: string | null;
  cron_secret: string | null;
  platform_alert_recipient: string | null;
};

function getServiceRoleKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || null;
  } catch {
    return null;
  }
}

async function checkPlatformHealth() {
  try {
    const response = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.status !== "ok") {
      return { healthy: false, reason: `A rota de saúde respondeu HTTP ${response.status}.` };
    }

    return { healthy: true, reason: null };
  } catch {
    return { healthy: false, reason: "Não foi possível consultar a rota de saúde." };
  }
}

async function sendAlert(resendApiKey: string, recipients: string[], subject: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject, text }),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ ok: false, error: "Credenciais de serviço indisponíveis." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: secretRows, error: secretError } = await supabase.rpc("get_notification_worker_secrets");
  const secrets = secretRows?.[0] as WorkerSecrets | undefined;
  if (secretError || !secrets?.cron_secret || !secrets.resend_api_key) {
    return Response.json({ ok: false, error: "Configuração de monitoramento indisponível." }, { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== secrets.cron_secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkPlatformHealth();
  const { data: event, error: recordError } = await supabase.rpc("record_platform_health_check", {
    p_is_healthy: result.healthy,
    p_error: result.reason,
  });
  if (recordError) return Response.json({ ok: false, error: "Health record unavailable" }, { status: 500 });

  if (event === "none") {
    return Response.json({ ok: true, healthy: result.healthy, alert: "none" });
  }

  const { data: shops, error: shopsError } = await supabase
    .from("barbershops")
    .select("notification_email")
    .eq("active", true)
    .not("notification_email", "is", null);
  if (shopsError) return Response.json({ ok: false, error: "Recipient lookup unavailable" }, { status: 500 });

  const recipients = [...new Set([
    secrets.platform_alert_recipient?.trim(),
    ...(shops || []).map((shop) => shop.notification_email?.trim()),
  ].filter((email): email is string => Boolean(email)))];
  if (!recipients.length) {
    return Response.json({ ok: false, error: "Nenhum destinatário de alerta configurado." }, { status: 500 });
  }

  const timestamp = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const subject = event === "failed"
    ? "[Ação necessária] BarbeariaSP indisponível"
    : "[Recuperado] BarbeariaSP voltou a responder";
  const text = event === "failed"
    ? `A verificação automática detectou indisponibilidade da plataforma em ${timestamp}.\n\nMotivo: ${result.reason}\n\nAção: consulte o checklist de incidente e a Hostinger antes de comunicar clientes.`
    : `A verificação automática confirmou que a plataforma voltou a responder em ${timestamp}.\n\nAção: valide login e agendamento antes de encerrar o incidente.`;

  try {
    await sendAlert(secrets.resend_api_key, recipients, subject, text);
    return Response.json({ ok: true, healthy: result.healthy, alert: event, recipients: recipients.length });
  } catch {
    console.error("platform alert delivery failed", { code: "delivery_failed" });
    return Response.json({ ok: false, error: "Alert delivery failed" }, { status: 502 });
  }
});
