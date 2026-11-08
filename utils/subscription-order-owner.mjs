const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Identification only. The eventual write must independently authorize in the database.
export async function resolveSubscriptionOrderOwner(client) {
  const { data, error } = await client.auth.getUser();
  if (error?.name === "AuthSessionMissingError") return { status: "unauthenticated" };
  if (error) throw error;
  if (!data?.user) return { status: "unauthenticated" };
  const result = await client.rpc("my_owned_barbershop");
  if (result.error) throw result.error;
  if (!Array.isArray(result.data) || result.data.length > 1) throw new Error("Resposta de propriedade inválida");
  if (result.data.length === 0) return { status: "forbidden" };
  const id = result.data[0]?.id;
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Resposta de propriedade inválida");
  return { status: "ready", barbershopId: id };
}
