type InvitationEmail = {
  email_normalized?: string;
  email_matches_authenticated_user?: boolean | null;
};

export function invitationEmailMismatch(authenticated: boolean, invitation: InvitationEmail | null, userEmail: string | null): boolean {
  if (!authenticated || !invitation) return false;
  if (typeof invitation.email_matches_authenticated_user === 'boolean') return !invitation.email_matches_authenticated_user;
  // O gateway consulta como serviço e retorna endereço mascarado, sem identidade.
  // Somente a RPC de aceite pode confirmar o destinatário nesse caso.
  const email = invitation.email_normalized;
  if (!email?.includes('@') || email.includes('*') || !userEmail) return false;
  return userEmail.toLowerCase() !== email.toLowerCase();
}
