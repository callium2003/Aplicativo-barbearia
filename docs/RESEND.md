# Resend — notificações transacionais do BarbeariaSP

Este documento registra a configuração, arquitetura, segurança, operação e validação do Resend usado pelo BarbeariaSP para notificações transacionais do produto.

> O Resend descrito aqui é o canal das notificações da aplicação (agendamento, confirmação, cancelamento, reagendamento e lembrete). Ele é separado do SMTP do Supabase Auth usado para magic links.

## Estado confirmado em 08/08/2026

| Item | Estado |
|---|---|
| Domínio | `barbeariasp.cullentech.com.br` |
| Status do domínio | verificado |
| Região | `sa-east-1` |
| Sending | habilitado |
| Receiving | desligado |
| Open Tracking | desligado |
| Click Tracking | desligado |
| Remetente oficial | `notificacoes@barbeariasp.cullentech.com.br` |
| DKIM | verificado |
| SPF MX | verificado |
| SPF TXT | verificado |
| DMARC | não confirmado nesta rodada |
| Worker ativo | Supabase Edge Function `process-notifications` |
| Frequência | a cada minuto |
| Runtime versionado | sim — migration 27 + `supabase/functions/process-notifications/` |
| Validação real | 18 e-mails `delivered` + validação HTTP 200 com fila vazia |

A proprietária confirmou o recebimento dos e-mails usados na homologação.

## DNS confirmado

- DKIM TXT: host `resend._domainkey.barbeariasp` — `verified`;
- SPF MX: host `send.barbeariasp` — `verified`;
- SPF TXT: host `send.barbeariasp` — `verified`.

DMARC não foi confirmado nesta rodada e não deve ser tratado como concluído até checagem específica.

## Chaves de API

Existem duas chaves nomeadas na conta do Resend:

- `BarbeariaSP Supabase Worker` — chave dedicada ao worker automático atual;
- `BarbeariaSP Notifications` — chave criada anteriormente durante a preparação da integração.

O worker ativo usa `BarbeariaSP Supabase Worker`. O valor fica somente no Supabase Vault sob o nome:

`barbeariasp_resend_api_key`

Regras obrigatórias:

- nunca registrar o token real no GitHub;
- nunca colocar a chave em variável `VITE_*`;
- nunca expor a chave no navegador;
- nunca copiar o valor para migrations, testes, documentação ou logs;
- não remover/rotacionar uma chave sem verificar dependências.

## Arquitetura ativa

```text
appointments
  ↓
private.queue_appointment_notifications()
  ↓
notification_outbox
  ↓
pg_cron + pg_net
  ↓
Supabase Edge Function process-notifications
  ↓
Resend API
  ↓
servidor de e-mail do destinatário
```

O job `barbeariasp-process-notifications` roda com `* * * * *`, portanto a fila é processada a cada minuto. O envio não depende do computador local, Antigravity ou Vercel.

## Eventos que podem gerar e-mail

- `new_appointment`;
- `appointment_confirmed`;
- `appointment_cancelled`;
- `appointment_rescheduled`;
- `appointment_reminder_24h`.

O envio depende das regras de destinatário e das preferências do canal `E-mail`.

## Fila e estados

`notification_outbox` é a fonte operacional antes do Resend:

- `pending`: aguardando processamento;
- `processing`: item reivindicado;
- `sent`: a chamada ao Resend foi concluída com sucesso;
- `failed`: tentativa falhou e permanece sujeita ao retry/backoff.

`sent` no Supabase não é sinônimo de entrega final. Para isso, consulte o estado no Resend, por exemplo `delivered`, `bounced`, `failed` ou `suppressed`.

## Edge Function `process-notifications`

Código versionado:

`supabase/functions/process-notifications/index.ts`

A função:

1. valida `x-cron-secret`;
2. enfileira lembretes de 24h;
3. reivindica itens com `claim_notification_outbox`;
4. envia pela API do Resend;
5. conclui por `complete_notification_outbox`;
6. preserva backoff/retry.

A versão remota ativa é a versão 2 e usa `npm:@supabase/supabase-js@2.97.0` fixado.

O deploy usa `verify_jwt=false` porque não recebe sessão de usuário. A proteção da integração servidor-servidor é o segredo próprio do Cron, validado antes de operações privilegiadas.

Procedimento de deploy: `supabase/functions/process-notifications/README.md`.

## Configuração por ambiente no Supabase Vault

Três nomes são esperados:

- `barbeariasp_project_url` — URL do projeto Supabase do ambiente;
- `barbeariasp_resend_api_key` — chave do Resend;
- `barbeariasp_notification_cron_secret` — segredo do Cron.

Os valores não são versionados.

`public.get_notification_worker_secrets()` fornece somente a chave do Resend e o segredo do Cron para o backend privilegiado. `EXECUTE` está permitido para `postgres` e `service_role`, e revogado de `PUBLIC`, `anon` e `authenticated`.

A migration `20260808183718_version_notification_worker_runtime.sql` cria `private.configure_notification_worker_cron()`. Essa função valida os três itens do Vault e recria o job sem project ref ou segredo hardcoded.

Em um novo ambiente, após provisionar os três valores:

```sql
select private.configure_notification_worker_cron();
```

Resultado esperado: `true`.

## Validação real de 08/08/2026

Antes da ativação automática:

- a fila recebia os eventos;
- os e-mails permaneciam `pending`;
- `attempts` ficava em zero;
- o Resend não recebia `POST /emails`.

Depois da ativação:

- 18 mensagens acumuladas foram processadas;
- 18 registros ficaram `sent` no Supabase;
- 18 mensagens ficaram `delivered` no Resend;
- o recebimento foi confirmado.

Depois da consolidação/versionamento:

- migration 27 aplicada;
- Cron recriado usando valores do Vault por nome;
- Edge Function versão 2 `ACTIVE`;
- chamada de validação retornou HTTP 200 com `claimed: 0`, `sent: 0`, `failed: 0` e sem erro de lembrete;
- nenhum e-mail adicional foi gerado nessa validação porque a fila estava vazia.

## Como verificar o envio

### Supabase — fila

- novos itens devem surgir conforme os eventos;
- normalmente devem sair de `pending` em até cerca de um minuto;
- `attempts` avança quando há processamento;
- erros ficam registrados em caso de falha.

### Supabase — Cron/Edge Function

Confirme:

- job `barbeariasp-process-notifications` ativo;
- frequência `* * * * *`;
- Edge Function `process-notifications` ativa;
- `pg_cron` habilitado;
- `pg_net` no schema `extensions`.

### Resend

Confirme destinatário, assunto, status final e ausência de bounce/suppression/failure.

## Diagnóstico rápido

### `pending` com `attempts = 0`

Investigue primeiro Cron/Edge Function, segredo, `pg_net`/`pg_cron` e logs da função.

### `failed`

Verifique `last_error`, chave, domínio/remetente, destinatário e resposta da API.

### Supabase `sent`, mas destinatário não recebeu

Consulte o Resend:

- `delivered`: servidor aceitou; conferir spam/regras da caixa;
- `bounced`: analisar bounce;
- `suppressed`: analisar supressão;
- `failed`: analisar falha.

### Nenhuma chamada no Resend

Se a fila cresce e não há requisição no Resend, investigar o executor antes de DNS ou caixa do destinatário.

### 401 na Edge Function

Investigar divergência do segredo do Cron. Não remover a validação como atalho.

## Monitoramento e limitações atuais

Ainda não existe webhook do Resend sincronizando automaticamente:

- `email.delivered`;
- `email.bounced`;
- `email.complained`;
- `email.failed`;
- `email.suppressed`.

Uma evolução futura pode registrar esses eventos no banco para melhorar observabilidade.

## Resend x Supabase Auth

Notificações do BarbeariaSP usam:

`notification_outbox → Edge Function → Resend`.

Magic links são enviados pelo Supabase Auth. SMTP customizado do Auth é uma decisão separada de produção.

## Reprodutibilidade

O drift de código/schema identificado após a primeira ativação foi resolvido:

- Edge Function versionada;
- migration 27 aplicada e versionada;
- job configurável por Vault;
- instrução de deploy/provisionamento versionada;
- testes automatizados verificam ausência de chave `re_...` e project ref hardcoded na migration.

Somente os valores por ambiente permanecem fora do Git, como esperado para segredos/configuração.

## Segurança operacional

- segredos nunca entram em Git;
- somente backend privilegiado acessa a chave de envio;
- `anon`/`authenticated` não acessam o helper de segredos;
- o remetente permanece no domínio verificado;
- a chave ativa deve manter privilégio mínimo de envio;
- qualquer rotação exige atualização segura no Vault;
- tracking de abertura/clique permanece desligado enquanto essa for a decisão do produto.

## Pendências do Resend antes da produção definitiva

- confirmar DMARC, se for requisito;
- decidir se haverá webhook de entrega/bounce/complaint;
- definir política de retenção/observabilidade de logs;
- revisar se a chave antiga `BarbeariaSP Notifications` ainda é necessária antes de qualquer remoção;
- monitorar reputação/entregabilidade na entrada em produção.

## Documentos relacionados

- [Notificações](NOTIFICATIONS-2026-08-08.md)
- [Arquitetura](ARCHITECTURE.md)
- [Segurança](SECURITY.md)
- [Baseline Supabase](SUPABASE_BASELINE.md)
- [Roadmap](ROADMAP.md)
