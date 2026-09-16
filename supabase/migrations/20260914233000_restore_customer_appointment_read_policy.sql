-- A policy de SELECT de appointments consulta esta função para limitar a operação
-- da equipe após a expiração. O papel authenticated precisa executá-la para que a
-- própria política também possa liberar a leitura dos agendamentos do cliente.
-- O schema private não é exposto pela API; não conceder acesso a anon ou public.
grant execute on function private.can_operate_barbershop_agenda(uuid) to authenticated;
