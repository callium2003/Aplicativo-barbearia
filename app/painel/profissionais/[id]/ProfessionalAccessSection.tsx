import type { Dispatch, SetStateAction } from "react";

import ActionFeedback from "../../ActionFeedback";
import type { FeedbackValue, FormSubmit } from "./professional-detail-shared";

type Props = {
  access: "active" | "pending" | "inactive" | "none";
  editingInvite: boolean;
  inviteEmail: string;
  inviteLink: string;
  pendingInvite?: { id: string; email_normalized: string; expires_at: string };
  professionalActive: boolean;
  shopName: string;
  setInviteEmail: Dispatch<SetStateAction<string>>;
  invite: FormSubmit;
  prepareInvitationChange: (email?: string) => void;
  reissueInvitation: () => Promise<void>;
  revokeInvitation: () => Promise<void>;
  copyInvitationLink: () => Promise<void>;
  toggleAccess: (status: "active" | "inactive") => Promise<void>;
  inviteFeedback: FeedbackValue;
  accessFeedback: FeedbackValue;
};

export default function ProfessionalAccessSection({
  access,
  editingInvite,
  inviteEmail,
  inviteLink,
  pendingInvite,
  professionalActive,
  shopName,
  setInviteEmail,
  invite,
  prepareInvitationChange,
  reissueInvitation,
  revokeInvitation,
  copyInvitationLink,
  toggleAccess,
  inviteFeedback,
  accessFeedback,
}: Props) {
  return (
    <details className="product-card management-professional-section">
      <summary>
        <span>
          <b>Acesso ao sistema</b>
          <small>{access === "active" ? "Acesso ativo" : access === "pending" ? "Convite pendente" : access === "inactive" ? "Acesso inativo" : "Sem acesso"}</small>
        </span>
        <span>＋</span>
      </summary>
      {(access === "none" || editingInvite) && (
        <form className="management-inline-form" onSubmit={invite}>
          <label className="product-field">
            <span>E-mail de acesso</span>
            <input className="product-input" type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <small>Pode ser diferente do e-mail de contato.</small>
          </label>
          <div className="management-action-area">
            <button className="product-button">{access === "pending" ? "Gerar novo link" : "Criar convite"}</button>
            <ActionFeedback {...inviteFeedback} />
          </div>
        </form>
      )}
      {pendingInvite && (
        <div className="management-section-note">
          <p>Convite pendente para {pendingInvite.email_normalized}. Validade: {new Date(pendingInvite.expires_at).toLocaleDateString("pt-BR")}.</p>
          {!editingInvite && <div className="management-invite-result-actions">
            <button className="product-button secondary" type="button" onClick={() => void reissueInvitation()}>Reenviar convite</button>
            <button className="product-button secondary" type="button" onClick={() => prepareInvitationChange(pendingInvite.email_normalized)}>Alterar e-mail</button>
            <button className="product-button danger" type="button" onClick={() => void revokeInvitation()}>Revogar convite</button>
          </div>}
        </div>
      )}
      {inviteLink && <div className="management-invite-result">
        <b>Link de convite individual:</b>
        <code className="management-invite-code">{inviteLink}</code>
        <div className="management-invite-result-actions">
          <button className="product-button secondary" type="button" onClick={() => void copyInvitationLink()}>Copiar link</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para acessar a equipe de ${shopName}. Use este link para aceitar: ${inviteLink}`)}`} target="_blank" rel="noreferrer" className="management-team-whatsapp-action">Enviar pelo WhatsApp</a>
        </div>
      </div>}
      <ActionFeedback {...inviteFeedback} />
      {access === "active" && <button className="product-button danger" type="button" onClick={() => void toggleAccess("inactive")}>Inativar acesso</button>}
      {access === "inactive" && professionalActive && <button className="product-button" type="button" onClick={() => void toggleAccess("active")}>Reativar acesso</button>}
      <ActionFeedback {...accessFeedback} />
    </details>
  );
}
