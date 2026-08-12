# process-notifications

Edge Function responsável por consumir `notification_outbox`, enfileirar lembretes de 24 horas e enviar notificações transacionais pelo Resend.

## Segurança

A função é chamada pelo `pg_cron`/`pg_net`, não por uma sessão de usuário. Por isso o deploy remoto usa `verify_jwt=false` e a própria função valida o header `x-cron-secret` antes de executar operações privilegiadas.

Nunca coloque valores de segredos neste diretório, em migrations ou em arquivos versionados.

## Configuração necessária no Supabase Vault

Antes de configurar o Cron, o ambiente precisa conter estes nomes no Vault:

- `barbeariasp_project_url`: URL do projeto Supabase do ambiente;
- `barbeariasp_resend_api_key`: chave de envio do Resend do ambiente;
- `barbeariasp_notification_cron_secret`: segredo aleatório usado no header `x-cron-secret`.

Os valores são específicos de cada ambiente e não fazem parte do Git.

## Deploy

A partir da raiz do projeto, com o Supabase CLI autenticado e vinculado ao projeto correto:

```powershell
npx.cmd supabase functions deploy process-notifications --no-verify-jwt
```

O `--no-verify-jwt` é intencional: a autenticação desta integração servidor-servidor é feita pelo segredo próprio do Cron. Não remova a validação de `x-cron-secret` do código.

## Configurar/recriar o Cron

A migration `20260808183718_version_notification_worker_runtime.sql` cria `private.configure_notification_worker_cron()`.

Depois de provisionar os três valores do Vault, execute como administrador do banco:

```sql
select private.configure_notification_worker_cron();
```

Resultado esperado: `true`.

O job criado se chama `barbeariasp-process-notifications` e executa a cada minuto. A URL e o segredo são lidos do Vault por nome, sem valores hardcoded na migration.

## Validação

Confira:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'barbeariasp-process-notifications';
```

E valide a fila:

```sql
select status, count(*)
from public.notification_outbox
group by status
order by status;
```

Para o estado do domínio/remetente e troubleshooting do Resend, consulte `docs/RESEND.md`.
