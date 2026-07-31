# Serviço de notificações por e-mail

`notify.php` recebe um webhook autenticado do Supabase e envia o aviso pelo SMTP da conta oficial do BarbeariaSP.

## Segurança

- O arquivo real de configuração deve ficar em `private/config.php`, fora da pasta pública do site. No Hostinger, esta pasta fica ao lado de `public_html`.
- Nunca envie, versione ou publique esse arquivo.
- O endpoint recusa chamadas sem uma chave secreta correta no cabeçalho.
- A chave `service_role` fica somente em `private/config.php`, para registrar sucesso ou falha na fila.

## Publicação posterior

1. Subir `email-service/notify.php` para uma pasta pública protegida no Hostinger.
2. Criar `private/config.php` fora de `public_html`, baseado em `config.example.php`.
3. Configurar no Supabase um Database Webhook de INSERT para `notification_outbox`, com o cabeçalho personalizado `X-BarbeariaSP-Webhook-Secret` e o mesmo segredo salvo no arquivo privado.
4. Enviar uma reserva de teste e confirmar o recebimento e a atualização do status da fila.
