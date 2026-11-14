import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "../../../utils/supabase-config.ts";
import { validateLeadPayload, type LeadInput } from "../../../utils/leads.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: LeadInput;
    try {
      body = (await request.json()) as LeadInput;
    } catch {
      return Response.json({ success: false, error: "Formato de requisição inválido." }, { status: 400 });
    }

    const validation = validateLeadPayload(body);
    if (!validation.valid) {
      return Response.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Se for bot detectado pelo honeypot, responde sucesso silencioso
    if (validation.lead.isBot) {
      return Response.json({ success: true, message: "Recebemos sua mensagem com sucesso!" }, { status: 200 });
    }

    const lead = validation.lead;
    const config = getPublicSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      console.error("[Leads API] SUPABASE_SERVICE_ROLE_KEY ausente.");
      return Response.json(
        {
          success: false,
          error: "Serviço temporariamente indisponível. Tente novamente mais tarde.",
        },
        { status: 500 },
      );
    }
    const client = createClient(config.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await client.from("platform_leads").insert({
      full_name: lead.fullName,
      whatsapp: lead.whatsapp,
      barbershop_name: lead.barbershopName,
      team_size: lead.teamSize,
      city_state: lead.cityState,
      notes: lead.notes,
      source: "landing_page",
    });

    if (error) {
      console.error("[Leads API] Erro ao persistir lead:", error.message);
      return Response.json(
        {
          success: false,
          error: "Não foi possível registrar seu contato no momento. Por favor, tente novamente em alguns instantes.",
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        success: true,
        message: "Obrigado! Recebemos suas informações e entraremos em contato rapidamente pelo WhatsApp.",
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error("[Leads API] Erro inesperado:", err);
    return Response.json(
      { success: false, error: "Não foi possível enviar a mensagem no momento. Tente novamente mais tarde." },
      { status: 500 },
    );
  }
}
