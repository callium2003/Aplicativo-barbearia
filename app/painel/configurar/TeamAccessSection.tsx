import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from "react";

import { input, type Item, type Shop, type TeamInvitation, type TeamMember } from "./settings-shared";

type TeamAccessSectionProps = {
  shop: Shop;
  invitationMessage: string;
  generatedTokenLink: string | null;
  copyGeneratedLink: () => Promise<void>;
  copyLinkMessage: string;
  inviteFormRef: RefObject<HTMLFormElement | null>;
  handleCreateInvitation: FormEventHandler<HTMLFormElement>;
  inviteEmailInputRef: RefObject<HTMLInputElement | null>;
  inviteEmail: string;
  setInviteEmail: Dispatch<SetStateAction<string>>;
  inviteRole: "manager" | "barber";
  setInviteRole: Dispatch<SetStateAction<"manager" | "barber">>;
  inviteProfessionalId: string;
  setInviteProfessionalId: Dispatch<SetStateAction<string>>;
  professionals: Item[];
  teamInvitations: TeamInvitation[];
  handleRevokeInvitation: (id: string) => Promise<void>;
  teamMembers: TeamMember[];
  setTeamMemberAccess: (member: TeamMember, active: boolean) => Promise<void>;
};

export default function TeamAccessSection({
  shop,
  invitationMessage,
  generatedTokenLink,
  copyGeneratedLink,
  copyLinkMessage,
  inviteFormRef,
  handleCreateInvitation,
  inviteEmailInputRef,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteProfessionalId,
  setInviteProfessionalId,
  professionals,
  teamInvitations,
  handleRevokeInvitation,
  teamMembers,
  setTeamMemberAccess,
}: TeamAccessSectionProps) {
  return (
    <section className="configuration-card management-team-access" id="equipe-acessos">
      <header className="management-section-heading"><p>ACESSO AO PAINEL</p><h2>Equipe e convites</h2><span>Convide pessoas e acompanhe os vínculos desta barbearia.</span></header>
      <p className="management-team-intro">
        Convide membros para a equipe da barbearia. O vínculo é criado somente após o convidado aceitar o convite.
      </p>

      {invitationMessage && (
        <p role="status" className={`management-team-feedback ${invitationMessage.startsWith("Não foi") || invitationMessage.startsWith("Erro") ? "error" : "success"}`}>
          {invitationMessage}
        </p>
      )}

      {generatedTokenLink && (
        <div className="management-invite-result">
          <b>Link de convite individual criado:</b>
          <code
            role="button"
            tabIndex={0}
            aria-label="Copiar link de convite"
            title="Toque para copiar o link"
            onClick={() => void copyGeneratedLink()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void copyGeneratedLink();
              }
            }}
            className="management-invite-code"
          >
            {generatedTokenLink}
          </code>
          <div className="management-invite-result-actions">
            <button
              type="button"
              onClick={() => void copyGeneratedLink()}
              className="management-secondary-action"
            >
              Copiar link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para acessar a equipe de ${shop.name}! Acesse o link para aceitar: ${generatedTokenLink}`)}`}
              target="_blank"
              rel="noreferrer"
              className="management-team-whatsapp-action"
            >
              Enviar pelo WhatsApp
            </a>
          </div>
          {copyLinkMessage && (
            <p role="status" className="management-team-copy-feedback">
              {copyLinkMessage}
            </p>
          )}
        </div>
      )}

      <form ref={inviteFormRef} className="management-invite-form" id="novo-convite" onSubmit={handleCreateInvitation}>
        <b>Criar novo convite</b>
        <div className="management-invite-fields">
          <label>
            E-mail do convidado
            <input
              required
              ref={inviteEmailInputRef}
              type="email"
              style={input}
              value={inviteEmail}
              placeholder="funcionario@email.com"
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </label>
          <label>
            Papel de acesso
            <select
              style={input}
              value={inviteRole}
              onChange={(e) => {
                const role = e.target.value as "manager" | "barber";
                setInviteRole(role);
                if (role === "manager") setInviteProfessionalId("");
              }}
            >
              {shop.role === "owner" && <option value="manager">Gerente (Manager)</option>}
              <option value="barber">Barbeiro (Barber)</option>
            </select>
          </label>
          {inviteRole === "barber" && (
            <label>
              Profissional da agenda
              <select
                required
                style={input}
                value={inviteProfessionalId}
                onChange={(e) => setInviteProfessionalId(e.target.value)}
              >
                <option value="">Selecione o profissional...</option>
                {professionals
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
        <button className="management-primary-action management-invite-submit">Gerar link de convite</button>
      </form>

      {!!teamInvitations.length && (
        <div className="management-team-group">
          <h3>Convites pendentes</h3>
          <div className="management-team-list">
            {teamInvitations.map((inv) => (
              <div className="management-team-row" key={inv.id}>
                <div>
                  <b>{inv.email_normalized}</b> —{" "}
                  <span className="management-team-role">
                    {inv.role === "manager" ? "Gerente" : "Barbeiro"}
                  </span>
                  {inv.professionals?.name && (
                    <span> (Profissional: {inv.professionals.name})</span>
                  )}
                  <br />
                  <small>
                    Criado em: {new Date(inv.created_at).toLocaleDateString("pt-BR")} |
                    Expira em: {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevokeInvitation(inv.id)}
                  className="management-team-danger-action"
                >
                  Revogar convite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="management-team-group">
        <h3>Membros da equipe ativos</h3>
        <div className="management-team-list">
          {teamMembers.length === 0 ? (
            <p className="product-empty">Nenhum membro adicional de equipe cadastrado.</p>
          ) : (
            teamMembers.map((member) => (
              <div className="management-team-member" key={member.id}>
                <b className="management-team-role">
                  {member.role === "manager" ? "Gerente" : "Barbeiro"}
                </b>
                {member.professionals?.name && (
                  <span> — Profissional: {member.professionals.name}</span>
                )}
                <br />
                <small>Status: {member.status}</small>
                {shop.role === "owner" && (
                  <div className="management-team-member-actions">
                    <button
                      type="button"
                      onClick={() => void setTeamMemberAccess(member, member.status !== "active")}
                      className={member.status === "active" ? "management-team-danger-action" : "management-primary-action"}
                    >
                      {member.status === "active" ? "Desativar acesso" : "Ativar acesso"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
