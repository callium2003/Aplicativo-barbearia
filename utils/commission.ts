export function normalizeCommissionRate(rawRate: string): string | { error: string } {
  let rate = rawRate.trim();
  if (rate === "") {
    return { error: "O campo de comissão não pode estar vazio." };
  }
  
  if (rate.split(/[,.]/).length > 2 || /\s/.test(rate) || /[^0-9.,]/.test(rate)) {
    return { error: "Formato inválido. Use apenas números e um separador decimal." };
  }
  
  rate = rate.replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(rate)) {
    return { error: "O percentual de comissão deve ter no máximo duas casas decimais." };
  }

  const cleanRate = Number(rate);
  if (isNaN(cleanRate) || cleanRate < 0 || cleanRate > 100) {
    return { error: "O percentual de comissão deve estar entre 0% e 100%." };
  }

  return rate;
}
