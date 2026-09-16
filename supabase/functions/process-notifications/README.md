# process-notifications

Edge Function responsável por consumir `notification_outbox`, enfileirar lembretes de 24 horas elegíveis e enviar e-mails transacionais ao cliente pelo Resend. A regra de destinatário e o texto são definidos no banco: owner, gestor e profissional recebem somente a central interna da aplicação.

O envelope automático usa `notificacoes@barbeariasp.cullentech.com.br` como remetente e define `Reply-To: nao-responda@barbeariasp.cullentech.com.br`. O texto orienta o cliente a não responder e aponta para a página pública da própria barbearia. A hospedagem de e-mail deve rejeitar/descartar recebimentos destinados a `nao-responda@...` e a `notificacoes@...`; esse bloqueio de entrada é uma configuração externa à Edge Function.

> **Estado de homologação em 16/09/2026.** O responsável homologou o recebimento dos conteúdos de nova reserva e cancelamento. Lembrete, evento técnico de reagendamento e bloqueio externo de respostas ainda não possuem nova evidência ponta a ponta neste registro. Consulte `docs/RESEND.md`; a EFS, seção 48, é a fonte de pendências do produto.

## Segurança

A função é chamada pelo `pg_cron`/`pg_net`, não por uma sessão de usuário. Por isso o deploy remoto usa `verify_jwt=false`; a própria função valida uma assinatura HMAC com timestamp e nonce antes de executar operações privilegiadas. Cada nonce só pode ser aceito uma vez, impedindo replay mesmo durante a janela de validade.

O runtime valida a assinatura usando `BARBEARIASP_NOTIFICATION_CRON_SECRET`, configurado como Edge Function Secret, antes de inicializar o Postgres. Somente uma chamada autenticada usa `SUPABASE_DB_URL` para chamar as funções SQL pelo Postgres.js, com prepared statements desativados e no máximo uma conexão por instância. Nenhuma credencial de banco é armazenada no código ou no repositório.

Nunca coloque valores de segredos neste diretório, em migrations ou em arquivos versionados.

## Configuração necessária no Supabase Vault

Antes de configurar o Cron, o ambiente precisa conter estes nomes no Vault:

- `barbeariasp_project_url`: URL do projeto Supabase do ambiente;
- `barbeariasp_resend_api_key`: chave de envio do Resend do ambiente;
- `barbeariasp_notification_cron_secret`: segredo aleatório usado para assinar as chamadas do Cron.

Os valores são específicos de cada ambiente e não fazem parte do Git.

O mesmo valor de `barbeariasp_notification_cron_secret` precisa ser configurado como Edge Function Secret com o nome `BARBEARIASP_NOTIFICATION_CRON_SECRET`. O Vault permite que o `pg_cron` assine a chamada; o Edge Secret permite que a função rejeite a chamada antes de abrir o banco.

## Deploy

A partir da raiz do projeto, com o Supabase CLI autenticado e vinculado ao projeto correto:

```powershell
npx.cmd supabase functions deploy process-notifications --no-verify-jwt
```

O `--no-verify-jwt` é intencional: a autenticação desta integração servidor-servidor é feita pela assinatura HMAC do Cron. Não remova a validação de assinatura, timestamp e nonce do código.

### Ordem obrigatória para a proteção contra replay

Ao aplicar a migration `20260816071507_harden_notification_worker_request_auth.sql`, siga esta ordem para não deixar o Cron chamando uma versão incompatível:

1. aplique a migration no banco;
2. publique esta versão da Edge Function;
3. execute `select private.configure_notification_worker_cron();` como administrador do banco.

A migration cria a nova autenticação, mas não recria o job automaticamente. O terceiro passo passa o Cron a enviar a assinatura HMAC, timestamp e nonce aceitos pela nova função.

## Configurar/recriar o Cron

A migration `20260808183718_version_notification_worker_runtime.sql` cria `private.configure_notification_worker_cron()`.

Depois de provisionar os três valores do Vault — e após publicar a Edge Function compatível — execute como administrador do banco:

```sql
select private.configure_notification_worker_cron();
```

Resultado esperado: `true`.

O job criado se chama `barbeariasp-process-notifications` e executa a cada minuto. A URL e o segredo são lidos do Vault por nome, sem valores hardcoded na migration. Cada chamada contém `x-cron-timestamp`, `x-cron-nonce` e `x-cron-signature`; a assinatura expira em cinco minutos e o nonce é reivindicado atomicamente no banco.

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

## Fotografia de integração — 14/09/2026

O projeto Supabase remoto compartilhado foi consultado em modo somente leitura: `process-notifications` está `ACTIVE`, versão 20, com `verify_jwt=false` e autenticação HMAC preservada. A versão remota corresponde à atualização que define `Reply-To: nao-responda@barbeariasp.cullentech.com.br` e ao fluxo de e-mails de agenda somente para o cliente.

Isto não substitui a homologação de entrega, do conteúdo visual na caixa do cliente ou do bloqueio de mensagens recebidas. Os eventos de nova reserva e cancelamento foram homologados posteriormente pelo responsável; para qualquer mudança futura, repita essa validação e valide também os casos ainda sem evidência, conforme `docs/RESEND.md`. Não enviar e-mail de teste, alterar Vault, Resend, DNS, Hostinger ou publicar a função sem autorização operacional explícita.
