const UNAUTHORIZED = "Acesso interno não autorizado";
const NOT_FOUND = "Barbearia não encontrada";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadPlatformAdministration(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) return { status: "unauthenticated" };

  const overview = await client.rpc("get_platform_barbershop_overview");
  if (overview.error?.message === UNAUTHORIZED) return { status: "forbidden" };
  if (overview.error) throw overview.error;

  return { status: "ready", barbershops: overview.data ?? [] };
}

function classify(results) {
  const failure = results.find((result) => result.error);
  if (!failure) return null;
  if (failure.error.message === UNAUTHORIZED) return { status: "forbidden" };
  if (failure.error.message === NOT_FOUND) return { status: "not_found" };
  throw failure.error;
}

async function withPlatformSession(client, barbershopId, load) {
  if (typeof barbershopId !== "string" || !UUID_PATTERN.test(barbershopId)) return { status: "not_found" };
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) return { status: "unauthenticated" };
  return load({ p_barbershop_id: barbershopId });
}

export function loadPlatformBarbershopDetail(client, barbershopId) {
  return withPlatformSession(client, barbershopId, async (args) => {
    const [detail, professionals, services] = await Promise.all([
      client.rpc("get_platform_barbershop_detail", args),
      client.rpc("list_platform_barbershop_professionals", args),
      client.rpc("list_platform_barbershop_services", args),
    ]);
    const blocked = classify([detail, professionals, services]);
    if (blocked) return blocked;
    const row = detail.data?.[0];
    if (!row) return { status: "not_found" };
    return { status: "ready", detail: row, professionals: professionals.data ?? [], services: services.data ?? [] };
  });
}

// Cada abertura destas seções é auditada no banco; a tela só chama por ação explícita.
export function loadPlatformBarbershopCustomers(client, barbershopId) {
  return withPlatformSession(client, barbershopId, async (args) => {
    const result = await client.rpc("list_platform_barbershop_customers", args);
    return classify([result]) ?? { status: "ready", customers: result.data ?? [] };
  });
}

export function loadPlatformBarbershopConsents(client, barbershopId) {
  return withPlatformSession(client, barbershopId, async (args) => {
    const result = await client.rpc("list_platform_barbershop_customer_consents", args);
    return classify([result]) ?? { status: "ready", consents: result.data ?? [] };
  });
}

export function exportPlatformBarbershopCustomers(client, barbershopId, format) {
  const normalizedFormat = typeof format === "string" ? format.trim().toLowerCase() : "";
  if (normalizedFormat !== "csv" && normalizedFormat !== "json") {
    return Promise.resolve({ status: "invalid_format" });
  }

  return withPlatformSession(client, barbershopId, async (args) => {
    const result = await client.rpc("export_platform_barbershop_customers", {
      ...args,
      p_format: normalizedFormat,
    });
    const blocked = classify([result]);
    if (blocked) return blocked;
    return { status: "ready", records: result.data ?? [] };
  });
}

function sanitizeCell(val) {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function formatConsentBoolean(val) {
  if (val === true) return "Sim";
  if (val === false) return "Não";
  return "Não informado";
}

export function serializeCustomersToCsv(records = []) {
  const headers = [
    "ID do Cliente",
    "Nome",
    "E-mail",
    "Telefone",
    "Vinculado Desde",
    "Marketing Barbearia",
    "Versão Barbearia",
    "Origem Barbearia",
    "Data Consentimento Barbearia",
    "Marketing Plataforma",
    "Versão Plataforma",
    "Origem Plataforma",
    "Data Consentimento Plataforma",
  ];

  const rows = records.map((r) => [
    sanitizeCell(r.customer_id),
    sanitizeCell(r.name),
    sanitizeCell(r.email),
    sanitizeCell(r.phone),
    sanitizeCell(r.related_since),
    sanitizeCell(formatConsentBoolean(r.barbershop_marketing_granted)),
    sanitizeCell(r.barbershop_marketing_version),
    sanitizeCell(r.barbershop_marketing_source),
    sanitizeCell(r.barbershop_marketing_changed_at),
    sanitizeCell(formatConsentBoolean(r.platform_marketing_granted)),
    sanitizeCell(r.platform_marketing_version),
    sanitizeCell(r.platform_marketing_source),
    sanitizeCell(r.platform_marketing_changed_at),
  ].join(","));

  return [headers.join(","), ...rows].join("\r\n");
}

export function serializeCustomersToJson(records = [], meta = {}) {
  const envelope = {
    barbershop_id: meta.barbershopId ?? null,
    exported_at: meta.exportedAt ?? new Date().toISOString(),
    total_records: records.length,
    customers: records,
  };
  return JSON.stringify(envelope, null, 2);
}

export function reactivatePlatformBarbershopByAgreement(client, barbershopId, { durationDays, reason, condition }) {
  const days = Number(durationDays);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return Promise.resolve({
      status: "invalid_input",
      error: "Período de ativação inválido. Informe um valor inteiro entre 1 e 365 dias.",
    });
  }

  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  if (cleanReason.length < 3) {
    return Promise.resolve({
      status: "invalid_input",
      error: "Motivo da reativação é obrigatório (mínimo de 3 caracteres).",
    });
  }

  const cleanCondition = typeof condition === "string" ? condition.trim() : "";
  if (cleanCondition.length < 3) {
    return Promise.resolve({
      status: "invalid_input",
      error: "Condição comercial é obrigatória (mínimo de 3 caracteres).",
    });
  }

  return withPlatformSession(client, barbershopId, async (args) => {
    const result = await client.rpc("reactivate_platform_barbershop_by_agreement", {
      ...args,
      p_duration_days: days,
      p_reason: cleanReason,
      p_condition: cleanCondition,
    });
    const blocked = classify([result]);
    if (blocked) return blocked;
    return { status: "success" };
  });
}

export function suspendPlatformBarbershop(client, barbershopId, { reason }) {
  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  if (cleanReason.length < 3) {
    return Promise.resolve({
      status: "invalid_input",
      error: "Motivo da suspensão é obrigatório (mínimo de 3 caracteres).",
    });
  }

  return withPlatformSession(client, barbershopId, async (args) => {
    const result = await client.rpc("suspend_platform_barbershop", {
      ...args,
      p_reason: cleanReason,
    });
    const blocked = classify([result]);
    if (blocked) return blocked;
    return { status: "success" };
  });
}

export function validateTicketInput({ subject, description, categoryId }) {
  const cleanSubject = typeof subject === "string" ? subject.trim() : "";
  if (cleanSubject.length < 5) {
    throw new Error("Assunto do chamado deve ter pelo menos 5 caracteres.");
  }
  const cleanDescription = typeof description === "string" ? description.trim() : "";
  if (cleanDescription.length < 10) {
    throw new Error("Descrição do chamado deve ter pelo menos 10 caracteres.");
  }
  const cleanCategory = typeof categoryId === "string" ? categoryId.trim() : "";
  if (!cleanCategory) {
    throw new Error("Categoria é obrigatória.");
  }
  return {
    subject: cleanSubject,
    description: cleanDescription,
    categoryId: cleanCategory,
  };
}

export function formatTicketStatus(status) {
  switch (status) {
    case "open": return "Aberto";
    case "in_progress": return "Em atendimento";
    case "waiting_client": return "Aguardando barbearia";
    case "resolved": return "Resolvido";
    case "closed": return "Encerrado";
    default: return status;
  }
}

export function formatTicketPriority(priority) {
  switch (priority) {
    case "low": return "Baixa";
    case "normal": return "Normal";
    case "high": return "Alta";
    case "urgent": return "Urgente";
    default: return priority;
  }
}

export function calculateTicketSlaStatus(firstResponseDueAt, firstRespondedAt, status) {
  if (firstRespondedAt) {
    return {
      state: "responded_on_time",
      label: "Respondido no prazo",
      color: "success",
    };
  }

  if (status === "resolved" || status === "closed") {
    return {
      state: "concluded",
      label: "Concluído",
      color: "neutral",
    };
  }

  if (!firstResponseDueAt) {
    return {
      state: "unknown",
      label: "SLA indefinido",
      color: "neutral",
    };
  }

  const now = new Date().getTime();
  const due = new Date(firstResponseDueAt).getTime();
  const diffMs = due - now;

  if (diffMs <= 0) {
    return {
      state: "breached",
      label: "SLA de 1 dia útil expirado",
      color: "danger",
    };
  }

  const hoursRemaining = Math.floor(diffMs / (3600 * 1000));
  if (hoursRemaining < 4) {
    return {
      state: "due_soon",
      label: `Vence em ${hoursRemaining}h`,
      color: "warning",
    };
  }

  return {
    state: "on_time",
    label: "Prazo: até 1 dia útil",
    color: "info",
  };
}

/**
 * @param {any} client
 * @param {{
 *   barbershopId: string,
 *   categoryId: string,
 *   subject: string,
 *   description: string,
 *   priority?: string,
 *   contactChannel?: string | null,
 *   attachmentUrl?: string | null
 * }} params
 */
export async function createPlatformSupportTicket(client, { barbershopId, categoryId, subject, description, priority = "normal", contactChannel = null, attachmentUrl = null }) {
  const validated = validateTicketInput({ subject, description, categoryId });
  const { data, error } = await client.rpc("create_platform_support_ticket", {
    p_barbershop_id: barbershopId,
    p_category_id: validated.categoryId,
    p_subject: validated.subject,
    p_description: validated.description,
    p_priority: priority,
    p_contact_channel: contactChannel ? String(contactChannel).trim() : null,
    p_attachment_url: attachmentUrl ? String(attachmentUrl).trim() : null,
  });
  if (error) throw error;
  return { status: "success", ticketId: data };
}

/**
 * @param {any} client
 * @param {{
 *   ticketId: string,
 *   message: string,
 *   attachmentUrl?: string | null,
 *   status?: string | null
 * }} params
 */
export async function replyPlatformSupportTicket(client, { ticketId, message, attachmentUrl = null, status = null }) {
  const cleanMessage = typeof message === "string" ? message.trim() : "";
  const cleanAttachment = typeof attachmentUrl === "string" ? attachmentUrl.trim() : null;
  if (cleanMessage.length < 2 && !cleanAttachment) {
    throw new Error("Mensagem ou anexo de evidência é obrigatório.");
  }
  const { data, error } = await client.rpc("reply_platform_support_ticket", {
    p_ticket_id: ticketId,
    p_message: cleanMessage,
    p_attachment_url: cleanAttachment,
    p_status: status ? String(status).trim() : null,
  });
  if (error) throw error;
  return { status: "success", messageId: data };
}

/**
 * @param {any} client
 * @param {{
 *   ticketId: string,
 *   resolutionSummary: string,
 *   status?: string
 * }} params
 */
export async function closePlatformSupportTicket(client, { ticketId, resolutionSummary, status = "closed" }) {
  const cleanSummary = typeof resolutionSummary === "string" ? resolutionSummary.trim() : "";
  if (cleanSummary.length < 5) {
    throw new Error("O resumo da resolução deve ter pelo menos 5 caracteres.");
  }
  const { error } = await client.rpc("close_platform_support_ticket", {
    p_ticket_id: ticketId,
    p_resolution_summary: cleanSummary,
    p_status: status ? String(status).trim() : "closed",
  });
  if (error) throw error;
  return { status: "success" };
}

export async function updatePlatformSupportTicketStatus(client, { ticketId, status, assignedTo = null }) {
  const { error } = await client.rpc("update_platform_support_ticket_status", {
    p_ticket_id: ticketId,
    p_status: status,
    p_assigned_to: assignedTo,
  });
  if (error) throw error;
  return { status: "success" };
}

export async function listBarbershopSupportTickets(client, barbershopId) {
  const { data, error } = await client.rpc("list_barbershop_support_tickets", {
    p_barbershop_id: barbershopId,
  });
  if (error) throw error;
  return { status: "ready", tickets: data ?? [] };
}

export async function listAllPlatformSupportTickets(client, { status = null, barbershopId = null } = {}) {
  const { data, error } = await client.rpc("list_all_platform_support_tickets", {
    p_status: status,
    p_barbershop_id: barbershopId,
  });
  if (error) throw error;
  return { status: "ready", tickets: data ?? [] };
}

export async function loadPlatformFaq(client) {
  const [categoriesRes, articlesRes] = await Promise.all([
    client.from("platform_faq_categories").select("*").order("sort_order", { ascending: true }),
    client.from("platform_faq_articles").select("*").order("sort_order", { ascending: true }),
  ]);
  if (categoriesRes.error) throw categoriesRes.error;
  if (articlesRes.error) throw articlesRes.error;
  return {
    categories: categoriesRes.data ?? [],
    articles: articlesRes.data ?? [],
  };
}

export async function loadPlatformTicketMessages(client, ticketId) {
  const { data, error } = await client
    .from("platform_support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return { messages: data ?? [] };
}

export function validateIncidentInput({ serviceName, severity, title, description }) {
  const validServices = ["api", "database", "auth", "storage", "notifications", "booking_gateway", "cron_jobs"];
  const validSeverities = ["info", "low", "medium", "high", "critical"];
  const cleanService = typeof serviceName === "string" ? serviceName.trim().toLowerCase() : "";
  if (!validServices.includes(cleanService)) {
    throw new Error("Serviço monitorado inválido.");
  }
  const cleanSeverity = typeof severity === "string" ? severity.trim().toLowerCase() : "medium";
  if (!validSeverities.includes(cleanSeverity)) {
    throw new Error("Severidade inválida.");
  }
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (cleanTitle.length < 5) {
    throw new Error("Título do incidente deve ter pelo menos 5 caracteres.");
  }
  const cleanDesc = typeof description === "string" ? description.trim() : "";
  if (cleanDesc.length < 10) {
    throw new Error("Descrição do incidente deve ter pelo menos 10 caracteres.");
  }
  return {
    serviceName: cleanService,
    severity: cleanSeverity,
    title: cleanTitle,
    description: cleanDesc,
  };
}

export function validateIncidentNote(note) {
  const clean = typeof note === "string" ? note.trim() : "";
  if (clean.length < 2) {
    throw new Error("Observação deve ter pelo menos 2 caracteres.");
  }
  return clean;
}

export function formatIncidentSeverity(severity) {
  const map = {
    critical: { label: "Crítica", color: "danger" },
    high: { label: "Alta", color: "warning" },
    medium: { label: "Média", color: "bronze" },
    low: { label: "Baixa", color: "info" },
    info: { label: "Informativa", color: "neutral" },
  };
  return map[severity] ?? { label: "Média", color: "bronze" };
}

export function formatIncidentStatus(status) {
  const map = {
    open: "Aberto",
    acknowledged: "Reconhecido",
    investigating: "Em Investigação",
    resolved: "Resolvido",
    closed: "Encerrado",
  };
  return map[status] ?? "Aberto";
}

export function formatServiceName(service) {
  const map = {
    api: "API Principal",
    database: "Banco de Dados Postgres",
    auth: "Autenticação GoTrue",
    storage: "Armazenamento Storage",
    notifications: "Fila de Notificações (Outbox)",
    booking_gateway: "Gateway de Agendamento",
    cron_jobs: "Tarefas Agendadas (Cron)",
  };
  return map[service] ?? service;
}

export async function listPlatformOperationalIncidents(client, { status = null, serviceName = null, severity = null } = {}) {
  const { data, error } = await client.rpc("list_platform_operational_incidents", {
    p_status: status,
    p_service_name: serviceName,
    p_severity: severity,
  });
  if (error) throw error;
  return { status: "ready", incidents: data ?? [] };
}

export async function getPlatformOperationalIncidentDetail(client, incidentId) {
  const { data, error } = await client.rpc("get_platform_operational_incident_detail", {
    p_incident_id: incidentId,
  });
  if (error) throw error;
  return { status: "ready", incident: data };
}

export async function acknowledgePlatformOperationalIncident(client, incidentId) {
  const { error } = await client.rpc("acknowledge_platform_operational_incident", {
    p_incident_id: incidentId,
  });
  if (error) throw error;
  return { status: "success" };
}

export async function assignPlatformOperationalIncident(client, { incidentId, assignedTo }) {
  const { error } = await client.rpc("assign_platform_operational_incident", {
    p_incident_id: incidentId,
    p_assigned_to: assignedTo,
  });
  if (error) throw error;
  return { status: "success" };
}

export async function addPlatformOperationalIncidentNote(client, { incidentId, note }) {
  const cleanNote = validateIncidentNote(note);
  const { data, error } = await client.rpc("add_platform_operational_incident_note", {
    p_incident_id: incidentId,
    p_note: cleanNote,
  });
  if (error) throw error;
  return { status: "success", noteId: data };
}

/**
 * @param {any} client
 * @param {{ incidentId: string, resolutionNote?: string | null }} params
 */
export async function resolvePlatformOperationalIncident(client, { incidentId, resolutionNote = null }) {
  const cleanNote = typeof resolutionNote === "string" && resolutionNote.trim() ? resolutionNote.trim() : null;
  const { error } = await client.rpc("resolve_platform_operational_incident", {
    p_incident_id: incidentId,
    p_resolution_note: cleanNote,
  });
  if (error) throw error;
  return { status: "success" };
}

export async function createPlatformOperationalIncident(client, { serviceName, severity = "medium", title, description, barbershopId = null, metadata = {} }) {
  const validated = validateIncidentInput({ serviceName, severity, title, description });
  const { data, error } = await client.rpc("create_platform_operational_incident", {
    p_service_name: validated.serviceName,
    p_severity: validated.severity,
    p_title: validated.title,
    p_description: validated.description,
    p_barbershop_id: barbershopId,
    p_metadata: metadata,
  });
  if (error) throw error;
  return { status: "success", incidentId: data };
}

export async function loadPlatformIncidentNotes(client, incidentId) {
  const { data, error } = await client
    .from("platform_operational_incident_notes")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return { notes: data ?? [] };
}

/**
 * Resolves an attachment reference (storage path, legacy public URL, or signed URL)
 * into a temporary authorized signed URL using the current Supabase session.
 *
 * @param {any} client Supabase client instance
 * @param {string | null | undefined} pathOrUrl Raw stored path or legacy public URL
 * @param {number} [expiresInSeconds=3600] Duration in seconds (default: 1 hour)
 * @returns {Promise<string | null>}
 */
export async function getAttachmentSignedUrl(client, pathOrUrl, expiresInSeconds = 3600) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // Preserve data URLs and blob URLs (local previews)
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // Extract relative storage path
  let storagePath = trimmed;
  if (storagePath.includes("/support-attachments/")) {
    storagePath = storagePath.split("/support-attachments/")[1].split("?")[0];
  } else if (storagePath.startsWith("support-attachments/")) {
    storagePath = storagePath.slice("support-attachments/".length).split("?")[0];
  }

  storagePath = storagePath.replace(/^\/+/, "");
  if (!storagePath) return null;

  try {
    const { data, error } = await client.storage
      .from("support-attachments")
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return trimmed;
    }
    return data.signedUrl;
  } catch {
    return trimmed;
  }
}

/**
 * Sanitizes and repairs notification titles and bodies that may have suffered from
 * transport or storage encoding corruption (mojibake / Unicode replacement characters \uFFFD).
 *
 * @param {string | null | undefined} text Raw notification title or body
 * @returns {string} Sanitized text with proper Portuguese accents
 */
export function sanitizeNotificationText(text) {
  if (!text || typeof text !== "string") return "";
  let s = text;

  // 1. Exact sentence replacements for known system notifications
  if (/solicita.*aberta.*SLA.*1.*dia.*Nossa equipe/i.test(s)) {
    return "Sua solicitação foi aberta com SLA de 1 dia útil. Nossa equipe já foi alertada.";
  }
  if (/equipe.*enviou.*atualiza.*chamado/i.test(s)) {
    return "A equipe técnica enviou uma atualização no seu chamado.";
  }

  // 2. Common words with replacement characters (\uFFFD or stripped mojibake)
  s = s.replace(/conclu[^\w\s]*do/gi, "concluído");
  s = s.replace(/t[^\w\s]*cnica/gi, "técnica");
  s = s.replace(/atualiza[^\w\s]*o/gi, "atualização");
  s = s.replace(/solicita[^\w\s]*o/gi, "solicitação");
  s = s.replace(/\b[^\w\s]*til\b/gi, "útil");
  s = s.replace(/\bj[^\w\s]+\b/gi, "já");
  s = s.replace(/notifica[^\w\s]*o/gi, "notificação");
  s = s.replace(/configura[^\w\s]*o/gi, "configuração");
  s = s.replace(/opera[^\w\s]*o/gi, "operação");
  s = s.replace(/informa[^\w\s]*o/gi, "informação");
  s = s.replace(/aten[^\w\s]*o/gi, "atenção");
  s = s.replace(/hor[^\w\s]*rio/gi, "horário");
  s = s.replace(/servi[^\w\s]*o/gi, "serviço");
  s = s.replace(/\bn[^\w\s]*o\b/gi, "não");

  // 3. Latin1-as-UTF8 double-byte sequences
  s = s.replace(/\u00C3\u00A7\u00C3\u00A3/g, "çã")
       .replace(/\u00C3\u00A7/g, "ç")
       .replace(/\u00C3\u00A3/g, "ã")
       .replace(/\u00C3\u00A9/g, "é")
       .replace(/\u00C3\u00AA/g, "ê")
       .replace(/\u00C3\u00AD/g, "í")
       .replace(/\u00C3\u00B3/g, "ó")
       .replace(/\u00C3\u00B4/g, "ô")
       .replace(/\u00C3\u00BA/g, "ú")
       .replace(/\u00C3\u00A1/g, "á")
       .replace(/\u00C2\u00A7/g, "§")
       .replace(/\u00C2/g, "");

  // 4. Remove any lone orphan replacement characters
  s = s.replace(/\uFFFD+/g, "");

  return s;
}

/**
 * Formata o status de sondagem do Sentinela com rótulo e cor semântica.
 * @param {string} status Status de saúde ('healthy', 'degraded', 'down')
 * @returns {{ label: string, color: 'success' | 'warning' | 'danger' | 'neutral' }}
 */
export function formatSentinelStatus(status) {
  const map = {
    healthy: { label: "Operacional", color: "success" },
    degraded: { label: "Degradado", color: "warning" },
    down: { label: "Instável", color: "danger" },
  };
  return map[status] || { label: "Desconhecido", color: "neutral" };
}

/**
 * Valida o payload recebido no endpoint de webhooks de infraestrutura externa.
 * @param {any} body Corpo da requisição HTTP
 * @returns {{ provider: string, service: string, status: string, title: string, description: string, metadata: object }}
 */
export function validateInfraWebhookPayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo do webhook deve ser um objeto JSON válido.");
  }

  const validServices = ["api", "database", "auth", "storage", "notifications", "booking_gateway", "cron_jobs"];
  const service = typeof body.service === "string" ? body.service.trim().toLowerCase() : "";
  if (!validServices.includes(service)) {
    throw new Error(`Serviço de infraestrutura inválido: ${body.service}`);
  }

  const rawStatus = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  let status = "healthy";
  if (["down", "outage", "major_outage", "critical", "failed", "unhealthy"].includes(rawStatus)) {
    status = "down";
  } else if (["degraded", "partial_outage", "minor_outage", "investigating"].includes(rawStatus)) {
    status = "degraded";
  } else if (["healthy", "up", "operational", "resolved", "none"].includes(rawStatus)) {
    status = "healthy";
  } else {
    throw new Error(`Status de infraestrutura não reconhecido: ${body.status}`);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 5) {
    throw new Error("Título do alerta de infraestrutura deve ter pelo menos 5 caracteres.");
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 10) {
    throw new Error("Descrição do alerta de infraestrutura deve ter pelo menos 10 caracteres.");
  }

  const provider = typeof body.provider === "string" && body.provider.trim() ? body.provider.trim().toLowerCase() : "generic";
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

  return { provider, service, status, title, description, metadata };
}

/**
 * Executa o registro de uma sondagem do Sentinela Operacional no Postgres via RPC.
 */
export async function recordServiceSentinelProbe(client, { serviceName, isHealthy, latencyMs = null, error = null, metadata = {} }) {
  const { data, error: rpcError } = await client.rpc("record_service_sentinel_probe", {
    p_service_name: serviceName,
    p_is_healthy: Boolean(isHealthy),
    p_latency_ms: typeof latencyMs === "number" ? Math.max(0, Math.round(latencyMs)) : null,
    p_error: typeof error === "string" && error.trim() ? error.trim() : null,
    p_metadata: metadata && typeof metadata === "object" ? metadata : {},
  });
  if (rpcError) throw rpcError;
  return data;
}

/**
 * Consulta o panorama atual de monitoramento do Sentinela para todos os serviços essenciais.
 */
export async function getPlatformSentinelOverview(client) {
  const { data, error } = await client.rpc("get_platform_sentinel_overview");
  if (error) throw error;
  return { status: "ready", services: data ?? [] };
}

/**
 * Ingesta um webhook de infraestrutura externa via RPC.
 */
export async function ingestPlatformInfraWebhook(client, { provider, serviceName, status, title, description, metadata = {} }) {
  const { data, error } = await client.rpc("ingest_platform_infra_webhook", {
    p_provider: provider,
    p_service_name: serviceName,
    p_status: status,
    p_title: title,
    p_description: description,
    p_metadata: metadata,
  });
  if (error) throw error;
  return data;
}

