# monitor-platform-health

Função de monitoramento operacional. O cron do Supabase chama a função a cada sete minutos; ela consulta `https://barbeariasp.cullentech.com.br/api/health` e envia alerta somente quando muda de estado: primeira falha ou recuperação.

> **Limite explícito.** Esta função observa a resposta HTTP da aplicação e registra o resultado no banco. Ela não prova disponibilidade de Auth, Storage, Resend, Cron, fila de notificações, cobrança ou recuperação de backup. A lacuna operacional restante e seus critérios estão registrados como `OPS-01` na seção 48.5 da EFS.

## Segurança

- A função não aceita acesso público: requer o mesmo header `x-cron-secret` usado pelo worker de notificações e o compara com `BARBEARIASP_NOTIFICATION_CRON_SECRET` antes de inicializar o Postgres.
- O destino técnico é mantido no Supabase Vault, no segredo `barbeariasp_platform_alert_recipient`, e não no Git.
- O destino técnico é centralizado no Vault; a função não usa endereços de clientes nem depende de dados da agenda para alertar.
- O alerta não contém dados de cliente, agenda, token, chave ou conteúdo de e-mail.
- Depois da autenticação, o acesso administrativo ao banco usa a variável gerenciada `SUPABASE_DB_URL`, com prepared statements desativados e no máximo uma conexão por instância; nenhuma credencial é versionada.

## Configuração

Além dos três segredos já usados por `process-notifications`, definir no Supabase Vault:

```text
barbeariasp_platform_alert_recipient=<e-mail técnico autorizado>
```

Depois de aplicar a migration, o cron `barbeariasp-monitor-platform-health` deve estar ativo com a expressão `*/7 * * * *`.
