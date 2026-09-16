-- As policies de appointments também consultam diretamente este limite para
-- preservar a janela operacional pós-vencimento. O papel authenticated precisa
-- executá-la para a avaliação da policy não interromper a leitura do cliente.
-- O schema private não é exposto pela API; não conceder acesso a anon ou public.
grant execute on function private.barbershop_agenda_operational_until(uuid) to authenticated;
