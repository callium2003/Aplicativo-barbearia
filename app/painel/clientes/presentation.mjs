export function clientInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("pt-BR");

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function clientEmptyMessage(searchTerm) {
  return String(searchTerm ?? "").trim()
    ? "Nenhum cliente corresponde à busca atual."
    : "Ainda não há clientes com agendamentos nesta barbearia.";
}
