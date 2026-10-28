export async function loadPlatformAdministration(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) return { status: "unauthenticated" };

  const overview = await client.rpc("get_platform_barbershop_overview");
  if (overview.error?.message === "Acesso interno não autorizado") return { status: "forbidden" };
  if (overview.error) throw overview.error;

  return { status: "ready", barbershops: overview.data ?? [] };
}
