export type ProfessionalProfileInput = { name: string; phone: string; instagramUrl: string };

export function validateProfessionalProfile(input: ProfessionalProfileInput): string | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) return "Informe um nome entre 2 e 120 caracteres.";
  const digits = input.phone.replace(/\D/g, "");
  if (input.phone.trim() && (digits.length < 10 || digits.length > 13)) return "Informe um telefone com 10 a 13 dígitos.";
  if (input.instagramUrl.trim()) {
    try {
      const url = new URL(input.instagramUrl);
      if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) throw new Error();
    } catch { return "Informe uma URL HTTPS válida do instagram.com."; }
  }
  return null;
}
