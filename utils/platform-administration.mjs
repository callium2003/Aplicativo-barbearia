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
