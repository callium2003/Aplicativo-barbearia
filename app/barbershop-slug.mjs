export const BARBERSHOP_NAME_CONFLICT_MESSAGE =
  "Esse nome já existe. Por favor, escolha outro nome para sua barbearia.";

export function makeBarbershopSlug(name) {
  return (
    String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "barbearia"
  );
}

export function isBarbershopSlugConflict(error) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code || "") : "";
  // Esta leitura serve apenas para classificar a restrição internamente.
  // Nenhum detalhe do provedor é registrado ou apresentado à pessoa usuária.
  const constraintDetail =
    "details" in error ? String(error.details || "") : "";
  return code === "23505" && constraintDetail.includes("barbershops_slug_key");
}
