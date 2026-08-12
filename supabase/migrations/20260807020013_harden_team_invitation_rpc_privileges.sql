-- Restringe as RPCs administrativas de convite a usuários autenticados.
-- A RPC pública get_invitation_details permanece inalterada neste lote,
-- pois ainda é usada antes do login pelo fluxo atual.

revoke execute on function public.create_team_invitation(uuid, text, text, uuid) from public;
revoke execute on function public.create_team_invitation(uuid, text, text, uuid) from anon;
grant execute on function public.create_team_invitation(uuid, text, text, uuid) to authenticated;

revoke execute on function public.accept_team_invitation(text) from public;
revoke execute on function public.accept_team_invitation(text) from anon;
grant execute on function public.accept_team_invitation(text) to authenticated;

revoke execute on function public.revoke_team_invitation(uuid) from public;
revoke execute on function public.revoke_team_invitation(uuid) from anon;
grant execute on function public.revoke_team_invitation(uuid) to authenticated;
