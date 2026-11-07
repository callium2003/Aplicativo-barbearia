export interface LeadInput {
  fullName?: string;
  whatsapp?: string;
  barbershopName?: string;
  teamSize?: string;
  cityState?: string;
  notes?: string;
  websiteHoneypot?: string;
}

export interface ValidatedLead {
  fullName: string;
  whatsapp: string;
  barbershopName: string;
  teamSize: string;
  cityState: string;
  notes: string;
  isBot: boolean;
}

export type LeadValidationResult =
  | { valid: true; lead: ValidatedLead }
  | { valid: false; error: string };

export function validateLeadPayload(input: LeadInput | null | undefined): LeadValidationResult {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Dados inválidos." };
  }

  // Detecção silenciosa de bots via honeypot
  if (input.websiteHoneypot && input.websiteHoneypot.trim().length > 0) {
    return {
      valid: true,
      lead: {
        fullName: "Bot",
        whatsapp: "0000000000",
        barbershopName: "Bot Shop",
        teamSize: "1",
        cityState: "",
        notes: "",
        isBot: true,
      },
    };
  }

  const fullName = input.fullName?.trim() || "";
  const whatsappDigits = input.whatsapp?.replace(/\D/g, "") || "";
  const barbershopName = input.barbershopName?.trim() || "";
  const teamSize = input.teamSize?.trim() || "1-3";
  const cityState = input.cityState?.trim() || "";
  const notes = input.notes?.trim() || "";

  if (fullName.length < 2) {
    return { valid: false, error: "Por favor, informe seu nome completo." };
  }

  if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
    return {
      valid: false,
      error: "Informe um número de WhatsApp válido com DDD (ex: 11999999999).",
    };
  }

  if (barbershopName.length < 2) {
    return { valid: false, error: "Por favor, informe o nome da sua barbearia." };
  }

  return {
    valid: true,
    lead: {
      fullName,
      whatsapp: whatsappDigits,
      barbershopName,
      teamSize,
      cityState,
      notes,
      isBot: false,
    },
  };
}

