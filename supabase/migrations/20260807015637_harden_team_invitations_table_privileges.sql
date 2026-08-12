-- Reduz os privilégios diretos da tabela de convites.
-- As alterações continuam sendo feitas exclusivamente pelas RPCs existentes.

revoke all privileges on table public.team_invitations from public;
revoke all privileges on table public.team_invitations from anon;

revoke insert, update, delete, truncate, references, trigger
on table public.team_invitations
from authenticated;

grant select on table public.team_invitations to authenticated;
