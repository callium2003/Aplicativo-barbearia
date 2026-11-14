export const SUPPORT_WHATSAPP_NUMBER = "5511930443535";

export function buildSupportNewTicketWhatsAppUrl(subject: string, shopName?: string | null): string {
  const normalizedSubject = subject.trim() || "Novo Chamado";
  const text = `Olá! Estou abrindo um chamado de suporte sobre: "${normalizedSubject}" para a barbearia ${shopName ?? ""}. Gostaria de enviar evidências e prints de tela.`;
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function buildSupportActiveTicketWhatsAppUrl(
  ticketId: string,
  subject: string,
  shopName?: string | null
): string {
  const protocol = ticketId.slice(0, 8).toUpperCase();
  const text = `Olá! Gostaria de enviar evidências/prints sobre o chamado #${protocol} ("${subject}") da barbearia ${shopName ?? ""}.`;
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
