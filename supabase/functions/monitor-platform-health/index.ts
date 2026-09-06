import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.3";

const FROM_EMAIL = "notificacoes@barbeariasp.cullentech.com.br";
const HEALTH_URL = "https://barbeariasp.cullentech.com.br/api/health";

type WorkerSecrets = {
  resend_api_key: string | null;
  cron_secret: string | null;
  platform_alert_recipient: string | null;
};

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
const sql = databaseUrl
  ? postgres(databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  })
  : null;

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

  if (!sql) {
    return Response.json({ ok: false, error: "Credenciais de banco indisponíveis." }, { status: 500 });
  }

  let secrets: WorkerSecrets | undefined;
  try {
    const secretRows = await sql<WorkerSecrets[]>`
      select * from public.get_notification_worker_secrets()
    `;
    secrets = secretRows[0];
  } catch {
    console.error("platform monitor configuration lookup failed", { code: "db_query_failed" });
    return Response.json({ ok: false, error: "Configuração de monitoramento indisponível." }, { status: 500 });
  }
  if (!secrets?.cron_secret || !secrets.resend_api_key) {
    return Response.json({ ok: false, error: "Configuração de monitoramento indisponível.", code: "secret_values_unavailable" }, { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== secrets.cron_secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkPlatformHealth();
  let event: string;
  try {
    const rows = await sql<Array<{ event: string }>>`
      select public.record_platform_health_check(
        ${result.healthy},
        ${result.reason}
      ) as event
    `;
    event = rows[0]?.event || "none";
  } catch {
    return Response.json({ ok: false, error: "Health record unavailable" }, { status: 500 });
  }

  if (event === "none") {
    return Response.json({ ok: true, healthy: result.healthy, alert: "none" });
  }

  let shops: Array<{ notification_email: string | null }>;
  try {
    shops = await sql<Array<{ notification_email: string | null }>>`
      select notification_email
      from public.barbershops
      where active = true
        and notification_email is not null
    `;
  } catch {
    return Response.json({ ok: false, error: "Recipient lookup unavailable" }, { status: 500 });
  }

  const recipients = [...new Set([
    secrets.platform_alert_recipient?.trim(),
    ...shops.map((shop) => shop.notification_email?.trim()),
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
