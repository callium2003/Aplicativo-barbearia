import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "notificacoes@barbeariasp.cullentech.com.br";

if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!resendApiKey) throw new Error("RESEND_API_KEY is required to deliver notification emails");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function sendEmail(item) {
  const payload = item.payload || {};
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail || item.sender_email,
      to: [item.recipient_email],
      subject: payload.title || "Atualização do seu agendamento",
      text: payload.body || "Há uma atualização no seu agendamento no BarbeariaSP.",
    }),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
}

async function main() {
  const { error: reminderError } = await supabase.rpc("enqueue_due_appointment_reminders", { p_limit: 300 });
  if (reminderError) console.error("reminder enqueue failed", { code: "operation_failed" });

  const { data: claimed, error: claimError } = await supabase.rpc("claim_notification_outbox", { p_limit: 60 });
  if (claimError) throw claimError;

  let sent = 0;
  let failed = 0;
  for (const item of claimed || []) {
    try {
      await sendEmail(item);
      const { error } = await supabase.rpc("complete_notification_outbox", { p_id: item.id, p_success: true, p_error: null });
      if (error) throw error;
      sent += 1;
    } catch {
      failed += 1;
      await supabase.rpc("complete_notification_outbox", { p_id: item.id, p_success: false, p_error: "delivery_failed" });
      console.error("delivery failed", { code: "delivery_failed" });
    }
  }
  console.log(JSON.stringify({ claimed: (claimed || []).length, sent, failed }));
}

await main();
