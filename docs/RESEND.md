# Resend — notificações transacionais do BarbeariaSP

Este documento registra a configuração, arquitetura, segurança, operação e validação do Resend usado pelo BarbeariaSP para notificações transacionais do produto.

> O Resend descrito aqui é o canal dos e-mails transacionais ao cliente (nova reserva, cancelamento, reagendamento e lembrete). Ele é separado do SMTP do Supabase Auth usado para magic links.

## Estado confirmado — evidências de 13 a 16/09/2026

| Item | Estado |
|---|---|
| Domínio | `barbeariasp.cullentech.com.br` |
| ID ativo do domínio | `3731b443-b8ca-49a4-a902-c1481868078a` |
| Status do domínio | `verified` no Resend após a sincronização DNS |
| Região | `sa-east-1` |
| Sending | habilitado |
| Receiving | desligado |
| Open Tracking | desligado |
| Click Tracking | desligado |
| Remetente configurado | `notificacoes@barbeariasp.cullentech.com.br` |
| DKIM | atendido pelo domínio verificado |
| Registros de envio | atendidos pelo domínio verificado |
| Domínio anterior | não listado como ativo na consulta de 13/09/2026 |
| Worker ativo | Supabase Edge Function `process-notifications` |
| Frequência | a cada minuto |
| Runtime versionado | sim — migrations 27 e 31 + `supabase/functions/process-notifications/` |
| Validação real do remetente | dois e-mails diretos de teste para `contato@cullentech.com.br` receberam estado `delivered` no Resend e apareceram na caixa correta |

Isso confirma domínio/remetente e a entrega desses testes diretos. Em 14/09/2026, a migration do fluxo cliente-only foi aplicada e a Edge Function foi publicada na versão 20.

> Atualização de rastreabilidade em 16/09/2026: a consulta remota de 14/09 confirmou `process-notifications` como `ACTIVE`, versão 20. O responsável homologou posteriormente, em caixa de destinatário, os conteúdos completos aprovados de **nova reserva** e **cancelamento**. Essa homologação não se estende ao lembrete, ao evento técnico de reagendamento nem ao bloqueio externo de respostas: não há nova evidência ponta a ponta desses três casos neste registro.

## DNS confirmado

- DKIM TXT: host `resend._domainkey.barbeariasp`;
- CNAME de retorno: host `rsend.barbeariasp` → `rsend-sae1.forge.rmta.net`;
- CNAME de envio: host `send.barbeariasp` → `send.forge.rmta.net`.

Esses registros pertencem somente ao subdomínio do Resend. Não alterar SPF/MX/DMARC do domínio principal, registros do site, `hostingermail`, `autodiscover`, `autoconfig` ou outros subdomínios. Os antigos MX/TXT em `send.barbeariasp` não coexistem com o CNAME de envio.

## Chaves de API

Existem duas chaves nomeadas na conta do Resend:

- `BarbeariaSP Supabase Worker` — chave dedicada ao worker automático atual;
- `BarbeariaSP Notifications` — chave criada anteriormente durante a preparação da integração.

O worker ativo usa `BarbeariaSP Supabase Worker`. O valor fica somente no Supabase Vault sob o nome:

`barbeariasp_resend_api_key`

Regras obrigatórias:

- nunca registrar o token real no GitHub;
- nunca colocar a chave em variável `NEXT_PUBLIC_*`;
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
- `appointment_cancelled`;
- `appointment_rescheduled`;
- `appointment_reminder_24h`.

Esses e-mails destinam-se somente ao cliente da reserva. Owner, gestor e profissional acompanham os eventos pela central interna e não possuem opção de e-mail de agenda. `appointment_confirmed` é legado histórico, não é gerado para novos eventos.

O remetente é `notificacoes@barbeariasp.cullentech.com.br` e os e-mails automáticos usam `Reply-To: nao-responda@barbeariasp.cullentech.com.br`. Assim, o botão Responder não aponta para `notificacoes@...`. A regra completa exige que a hospedagem de e-mail rejeite ou descarte recebimentos em ambos os endereços: `nao-responda@...` e `notificacoes@...`; esse bloqueio não é fornecido pelo Resend nem pelo código do worker. O texto orienta o cliente a não responder e a acessar a página pública da própria barbearia.

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

1. valida a assinatura HMAC, timestamp e nonce único do Cron;
2. enfileira lembretes de 24h;
3. reivindica itens com `claim_notification_outbox`;
4. envia pela API do Resend;
5. conclui por `complete_notification_outbox`;
6. preserva backoff/retry.

A Edge Function remota observada na auditoria de 13/09/2026 estava na versão 19. Em 14/09/2026, ela foi publicada como versão 20 `ACTIVE`, preservando `npm:postgres@3.4.3`, a conexão `SUPABASE_DB_URL`, a autenticação HMAC e `verify_jwt=false`, e acrescentando `Reply-To: nao-responda@barbeariasp.cullentech.com.br`. A leitura posterior do código remoto confirmou esse cabeçalho.

O deploy usa `verify_jwt=false` porque não recebe sessão de usuário. A proteção da integração servidor-servidor é uma assinatura HMAC do Cron, que inclui timestamp e nonce; a função rejeita requisições vencidas, assinaturas inválidas e nonces já usados antes de acessar a fila.

Procedimento de deploy: `supabase/functions/process-notifications/README.md`.

Ao aplicar a migration de proteção contra replay, a ordem é obrigatória: primeiro a migration, depois o deploy desta Edge Function e, por último, `select private.configure_notification_worker_cron();`. A migration não recria o job automaticamente, evitando que um Cron já assinado chame uma versão antiga da função.

## Configuração por ambiente no Supabase Vault

Três nomes são esperados:

- `barbeariasp_project_url` — URL do projeto Supabase do ambiente;
- `barbeariasp_resend_api_key` — chave do Resend;
- `barbeariasp_notification_cron_secret` — segredo de assinatura do Cron.

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

- validar o lembrete e o evento técnico de reagendamento ponta a ponta, quando esses fluxos forem colocados em operação;
- configurar e comprovar no provedor de e-mail a rejeição ou descarte de respostas para `nao-responda@barbeariasp.cullentech.com.br` e de mensagens recebidas em `notificacoes@barbeariasp.cullentech.com.br`;
- se houver nova alteração no worker, repetir um agendamento e cancelamento controlados, incluindo que a equipe não receba e-mail e que o cliente receba o conteúdo correto;
- confirmar a política de DMARC aplicável ao domínio principal, se for requisito;
- decidir se haverá webhook de entrega/bounce/complaint;
- definir política de retenção/observabilidade de logs;
- revisar se a chave antiga `BarbeariaSP Notifications` ainda é necessária antes de qualquer remoção;
- monitorar reputação/entregabilidade na entrada em produção.

## Documentos relacionados

- [Especificação funcional — seções 23, 30, 45 e 48](FUNCTIONAL-SPEC.md)
- [Baseline Supabase](SUPABASE_BASELINE.md)
- [Roadmap](ROADMAP.md)
