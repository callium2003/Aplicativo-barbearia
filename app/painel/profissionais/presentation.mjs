function searchable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filterProfessionals(professionals, searchTerm, status) {
  const query = searchable(searchTerm);

  return professionals.filter((professional) => {
    const matchesStatus = status === "all"
      || (status === "active" && professional.active)
      || (status === "inactive" && !professional.active);
    const matchesSearch = !query
      || searchable(`${professional.name} ${professional.phone ?? ""}`).includes(query);

    return matchesStatus && matchesSearch;
  });
}

export function professionalAccessState(professionalId, members, invitations, now = Date.now()) {
  const membership = members.find((member) => member.professional_id === professionalId);
  if (membership?.status === "active") return "active";
  if (membership) return "inactive";

  const hasValidInvitation = invitations.some((invitation) => (
    invitation.professional_id === professionalId
    && invitation.status === "pending"
    && Date.parse(invitation.expires_at) > now
  ));

  return hasValidInvitation ? "pending" : "none";
}

export function professionalInitials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PR";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("pt-BR");
  return parts.slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR");
}

export function teamEmptyMessage(hasFilters) {
  return hasFilters
    ? "Nenhum profissional corresponde aos filtros atuais."
    : "Cadastre o primeiro profissional da equipe.";
}

export function professionalCreatePayload({ barbershopId, name, phone, contactEmail }) {
  const normalizedName = String(name ?? "").trim().replace(/\s+/g, " ");
  const normalizedPhone = String(phone ?? "").replace(/\D/g, "");
  const normalizedEmail = String(contactEmail ?? "").trim().toLocaleLowerCase("pt-BR");

  if (normalizedName.length < 2 || normalizedName.length > 120) {
    throw new Error("Informe um nome entre 2 e 120 caracteres.");
  }
  if (normalizedPhone && (normalizedPhone.length < 10 || normalizedPhone.length > 13)) {
    throw new Error("Informe um telefone válido com DDD.");
  }
  if (normalizedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error("Informe um e-mail de contato válido.");
  }

  return {
    p_barbershop_id: barbershopId,
    p_name: normalizedName,
    p_phone: normalizedPhone || null,
    p_contact_email: normalizedEmail || null,
  };
}
export function professionalSaveError(error) {
  const allowed = ["O nome deve ter entre 2 e 120 caracteres.", "Telefone inválido.", "E-mail de contato inválido.", "URL do Instagram inválida.", "URL da foto inválida.", "Sem permissão para editar este profissional."];
  // Return application-owned copy only; unknown provider details stay private.
  return allowed.find((message) => error?.message === message)
    ?? "Não foi possível salvar os dados do profissional. Tente novamente.";
}
