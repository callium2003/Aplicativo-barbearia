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
