import { createClient } from "@supabase/supabase-js";

const DEFAULT_TIMEOUT_MS = 6000;

function sanitizeError(err) {
  if (!err) return "Erro desconhecido";
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/(?:sb_secret_|sb_publishable_|eyJ)[A-Za-z0-9_.-]+/g, "[redigido]");
}

function withTimeout(promise, ms, name) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Tempo limite excedido (${ms}ms) para ${name}`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://barbeariasp.cullentech.com.br";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configuração de banco incompleta: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exitCode = 1;
} else {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function probeApi() {
    const start = performance.now();
    try {
      const res = await fetch(`${siteUrl}/api/health`, {
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        headers: { "Cache-Control": "no-cache" },
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        return { isHealthy: false, latencyMs, error: `HTTP ${res.status}` };
      }
      const data = await res.json().catch(() => null);
      if (data?.status !== "ok") {
        return { isHealthy: false, latencyMs, error: "Resposta inesperada da rota de saúde" };
      }
      return { isHealthy: true, latencyMs, error: null };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return { isHealthy: false, latencyMs, error: sanitizeError(err) };
    }
  }

  async function probeDatabase() {
    const start = performance.now();
    try {
      const { error } = await withTimeout(
        supabase.from("barbershops").select("id").limit(1),
        DEFAULT_TIMEOUT_MS,
        "consulta ao banco"
      );
      const latencyMs = Math.round(performance.now() - start);
      if (error) {
        return { isHealthy: false, latencyMs, error: sanitizeError(error.message) };
      }
      return { isHealthy: true, latencyMs, error: null };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return { isHealthy: false, latencyMs, error: sanitizeError(err) };
    }
  }

  async function probeStorage() {
    const start = performance.now();
    try {
      const { error } = await withTimeout(
        supabase.storage.listBuckets(),
        DEFAULT_TIMEOUT_MS,
        "listagem de buckets de storage"
      );
      const latencyMs = Math.round(performance.now() - start);
      if (error) {
        return { isHealthy: false, latencyMs, error: sanitizeError(error.message) };
      }
      return { isHealthy: true, latencyMs, error: null };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return { isHealthy: false, latencyMs, error: sanitizeError(err) };
    }
  }

  async function probeNotifications() {
    const start = performance.now();
    try {
      const { error } = await withTimeout(
        supabase.from("user_notifications").select("id").limit(1),
        DEFAULT_TIMEOUT_MS,
        "consulta de notificações"
      );
      const latencyMs = Math.round(performance.now() - start);
      if (error) {
        return { isHealthy: false, latencyMs, error: sanitizeError(error.message) };
      }
      return { isHealthy: true, latencyMs, error: null };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return { isHealthy: false, latencyMs, error: sanitizeError(err) };
    }
  }

  async function main() {
    console.log(`[Sentinela] Iniciando ciclo de sondagem autônoma em ${new Date().toISOString()}...`);

    const probes = [
      { name: "api", fn: probeApi },
      { name: "database", fn: probeDatabase },
      { name: "storage", fn: probeStorage },
      { name: "notifications", fn: probeNotifications },
    ];

    const results = [];

    for (const p of probes) {
      const check = await p.fn();
      try {
        const { data, error } = await withTimeout(
          supabase.rpc("record_service_sentinel_probe", {
            p_service_name: p.name,
            p_is_healthy: check.isHealthy,
            p_latency_ms: check.latencyMs,
            p_error: check.error,
            p_metadata: { source: "daemon", checked_at: new Date().toISOString() },
          }),
          DEFAULT_TIMEOUT_MS,
          `gravação de sondagem para ${p.name}`
        );

        if (error) {
          console.error(`[Sentinela] Erro ao gravar sondagem de ${p.name}:`, sanitizeError(error.message));
          results.push({ service: p.name, ...check, action: "rpc_error", details: error.message });
        } else {
          const action = data?.action_taken;
          if (action === "incident_opened") {
            console.warn(`🚨 [Sentinela] Incidente AUTO-ABERTO para ${p.name}! (Falhas consecutivas: ${data.consecutive_failures})`);
          } else if (action === "incident_resolved") {
            console.log(`✅ [Sentinela] Incidente AUTO-RESOLVIDO para ${p.name}! (Sucessos consecutivos: ${data.consecutive_successes})`);
          } else {
            const icon = check.isHealthy ? "🟢" : "⚠️";
            console.log(`${icon} [Sentinela] ${p.name}: ${check.isHealthy ? "Saudável" : "Falha"} (${check.latencyMs}ms)`);
          }
          results.push({ service: p.name, ...check, action, rpcData: data });
        }
      } catch (rpcErr) {
        console.error(`[Sentinela] Exceção na chamada de sondagem de ${p.name}:`, sanitizeError(rpcErr));
        results.push({ service: p.name, ...check, action: "exception", details: sanitizeError(rpcErr) });
      }
    }

    const hasFailure = results.some((r) => r.action === "rpc_error" || r.action === "exception");
    if (hasFailure) {
      console.error("[Sentinela] Ciclo concluído com falhas de comunicação ou gravação.");
      process.exitCode = 1;
    } else {
      console.log(`[Sentinela] Ciclo concluído. Probes processadas: ${results.length}.`);
    }
  }

  await main();
}
