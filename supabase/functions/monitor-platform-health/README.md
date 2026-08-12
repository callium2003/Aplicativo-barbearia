# monitor-platform-health

Função de monitoramento operacional. O cron do Supabase chama a função a cada sete minutos; ela consulta `https://barbeariasp.cullentech.com.br/api/health` e envia alerta somente quando muda de estado: primeira falha ou recuperação.

## Segurança

- A função não aceita acesso público: requer o mesmo header `x-cron-secret` usado pelo worker de notificações.
- O destino técnico é mantido no Supabase Vault, no segredo `barbeariasp_platform_alert_recipient`, e não no Git.
- Os e-mails operacionais vêm apenas de `barbershops.notification_email` para barbearias ativas.
- O alerta não contém dados de cliente, agenda, token, chave ou conteúdo de e-mail.

## Configuração

Além dos três segredos já usados por `process-notifications`, definir no Supabase Vault:

```text
barbeariasp_platform_alert_recipient=<e-mail técnico autorizado>
```

Depois de aplicar a migration, o cron `barbeariasp-monitor-platform-health` deve estar ativo com a expressão `*/7 * * * *`.
