-- A1/A2: o baseline concede EXECUTE por padrão diretamente a anon.
-- Revogar somente PUBLIC na migration original não remove esse grant herdado.
-- Reproduz em reconstruções a ACL já confirmada no remoto em 18/10/2026;
-- preserva autenticação, autorização interna e execução de authenticated/service_role.
revoke all on function public.get_barbershop_notification_email(uuid) from public, anon;
revoke all on function public.list_managed_professionals(uuid) from public, anon;
revoke all on function public.get_professional_details(uuid) from public, anon;
revoke all on function public.get_professional_schedule_mode(uuid) from public, anon;
revoke all on function public.my_owned_barbershop() from public, anon;
