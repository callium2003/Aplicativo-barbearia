# Resend — notificações transacionais do BarbeariaSP

Este documento registra a configuração, arquitetura, segurança, operação e validação do Resend usado pelo BarbeariaSP para notificações transacionais do produto.

> Importante: o Resend descrito aqui é o canal de e-mail das notificações da aplicação (agendamento, confirmação, cancelamento, reagendamento e lembrete). Ele é separado do SMTP do Supabase Auth usado para magic links. A customização do SMTP do Auth é uma decisão de produção independente.

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
| Validação real | 18 e-mails processados e confirmados como `delivered` |

A proprietária confirmou o recebimento dos e-mails usados na homologação.

## DNS confirmado

A leitura atual do domínio no Resend confirma os seguintes registros sem que seja necessário versionar seus valores completos no repositório:

- DKIM TXT: host `resend._domainkey.barbeariasp` — `verified`;
- SPF MX: host `send.barbeariasp` — `verified`;
- SPF TXT: host `send.barbeariasp` — `verified`.

DMARC não foi verificado nesta rodada e não deve ser tratado como concluído até uma checagem específica.

## Chaves de API

Existem atualmente duas chaves nomeadas na conta do Resend:

- `BarbeariaSP Supabase Worker` — chave dedicada ao worker automático atual, com finalidade de envio e restrição ao domínio configurado;
- `BarbeariaSP Notifications` — chave criada anteriormente durante a preparação da integração.

O worker ativo usa a chave dedicada `BarbeariaSP Supabase Worker`, cujo valor está armazenado no Supabase Vault sob o nome:

`barbeariasp_resend_api_key`

Regras obrigatórias:

- nunca registrar o token real no GitHub;
- nunca colocar a chave em variável `VITE_*`;
- nunca expor a chave no navegador;
- nunca copiar o valor para migrations, testes, documentação ou logs;
- não remover/rotacionar uma chave sem verificar antes quais serviços dependem dela.

## Arquitetura ativa

Fluxo atual:

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

O job `barbeariasp-process-notifications` roda com a expressão:

```text
* * * * *
```

Ou seja, a fila é processada a cada minuto.

O envio não depende do computador local, Antigravity ou Vercel.

## Eventos que podem gerar e-mail

A arquitetura atual cobre:

- `new_appointment`;
- `appointment_confirmed`;
- `appointment_cancelled`;
- `appointment_rescheduled`;
- `appointment_reminder_24h`.

O envio depende das regras de destinatário e das preferências do canal `E-mail` configuradas para cada usuário/evento.

## Fila e estados

A tabela `notification_outbox` é a fonte operacional antes do Resend.

Estados principais:

- `pending`: aguardando processamento;
- `processing`: item reivindicado pelo worker;
- `sent`: o worker concluiu a chamada de envio com sucesso;
- `failed`: tentativa falhou e o item mantém informações para retry/backoff.

Também são registrados número de tentativas, erro mais recente, próxima tentativa e lock de processamento.

`sent` no Supabase indica que o worker obteve sucesso na chamada de envio. Para verificar a entrega final ao servidor do destinatário, consulte o status da mensagem no Resend, por exemplo `delivered`, `bounced`, `failed` ou `suppressed`.

## Edge Function `process-notifications`

A função ativa executa a sequência:

1. valida o segredo próprio do Cron;
2. enfileira lembretes de 24h vencendo na janela prevista;
3. reivindica itens por `claim_notification_outbox`;
4. envia cada item pela API do Resend;
5. conclui por `complete_notification_outbox` como sucesso ou falha;
6. preserva a estratégia de backoff da fila.

A Edge Function foi publicada com `verify_jwt=false` porque não recebe uma sessão de usuário. A autenticação da chamada é feita por um segredo próprio do Cron, verificado antes de qualquer operação privilegiada.

## Segredos no Supabase

O Supabase Vault contém os nomes operacionais:

- `barbeariasp_resend_api_key`;
- `barbeariasp_notification_cron_secret`.

A função `public.get_notification_worker_secrets()` fornece os valores somente ao backend privilegiado.

Privilégios confirmados para essa função:

- `postgres`: `EXECUTE`;
- `service_role`: `EXECUTE`.

Não há `EXECUTE` para `anon`, `authenticated` ou `PUBLIC`.

## Validação real de 08/08/2026

Antes da ativação automática:

- a fila recebia corretamente os eventos;
- os e-mails permaneciam `pending`;
- `attempts` permanecia em zero;
- não havia erro de destinatário ou preferência;
- o Resend não recebia chamadas `POST /emails`.

A causa foi identificada como ausência de um executor periódico do worker.

Depois da ativação da Edge Function e do Cron:

- 18 mensagens acumuladas foram mantidas e processadas;
- os 18 registros da fila passaram para `sent`;
- o Resend registrou as 18 mensagens;
- as 18 ficaram com status `delivered`;
- o recebimento foi confirmado pela proprietária.

Essa validação fechou o problema funcional de entrega de e-mail identificado na homologação.

## Como verificar se o envio está funcionando

### 1. Supabase — fila

Verifique `notification_outbox`:

- novos itens devem aparecer conforme os eventos;
- normalmente devem sair de `pending` em até cerca de um minuto;
- `attempts` deve avançar quando houver processamento;
- erros devem ficar registrados quando a tentativa falhar.

### 2. Supabase — Cron/Edge Function

Confirme:

- job `barbeariasp-process-notifications` ativo;
- frequência `* * * * *`;
- Edge Function `process-notifications` em estado ativo;
- `pg_cron` habilitado;
- `pg_net` instalado no schema `extensions`.

### 3. Resend

No Resend, confirme:

- existência da mensagem em Emails/Logs;
- destinatário e assunto esperados;
- status final, preferencialmente `delivered`;
- ausência de bounce/suppression/failure.

### 4. Caixa do destinatário

Por fim, confirme o recebimento na caixa de entrada e, se necessário, em spam/lixo eletrônico.

## Diagnóstico rápido

### Item `pending` com `attempts = 0`

Provável causa: o Cron/Edge Function não está executando ou não está alcançando a fila.

Verificar:

- job ativo;
- Edge Function ativa;
- `pg_net`/`pg_cron`;
- segredo do Cron;
- logs da função.

### Item `failed`

Verificar `last_error` e depois conferir no Resend:

- chave de API;
- domínio/remetente;
- destinatário;
- limite/restrição de envio;
- resposta da API.

### Supabase mostra `sent`, mas o destinatário não recebeu

Consultar a mensagem no Resend.

- `delivered`: o servidor do destinatário aceitou; conferir spam/regras da caixa;
- `bounced`: analisar bounce;
- `suppressed`: verificar motivo de supressão;
- `failed`: analisar erro de entrega.

### Não existe chamada de envio no Resend

Se a fila cresce, mas o Resend não registra requisições, investigar primeiro o executor (Cron/Edge Function), e não DNS ou caixa do usuário.

### Resposta de autorização da Edge Function

Investigar divergência do segredo do Cron. Não desabilitar a validação como atalho.

## Monitoramento e limitações atuais

O BarbeariaSP ainda não possui webhook do Resend sincronizando automaticamente eventos como:

- `email.delivered`;
- `email.bounced`;
- `email.complained`;
- `email.failed`;
- `email.suppressed`.

Por isso, o estado `sent` da fila e o status final do Resend são camadas distintas. A validação final de entrega continua sendo feita no Resend.

Uma evolução futura pode adicionar webhook server-side para registrar bounce, complaint e suppression no banco e melhorar a observabilidade do painel.

## Diferença entre Resend e Supabase Auth

O sistema possui dois conceitos de e-mail diferentes:

### Notificações do BarbeariaSP

Exemplos:

- novo agendamento;
- confirmação;
- cancelamento;
- reagendamento;
- lembrete.

Fluxo:

`Supabase notification_outbox → Edge Function → Resend`.

### E-mails de autenticação

Exemplo:

- magic link.

São enviados pelo Supabase Auth. Um SMTP customizado para Auth pode ser configurado futuramente, mas não é requisito para a arquitetura de notificações descrita neste documento.

## Reprodutibilidade pendente

O ambiente remoto está funcionando, porém a ativação operacional feita em 08/08/2026 ainda possui drift em relação ao repositório.

Ainda deve ser versionado antes da produção definitiva:

1. código da Edge Function em `supabase/functions/process-notifications/` ou estrutura equivalente;
2. nova migration/infra declarativa para `pg_cron`, `pg_net`, grants/helper e job, sem segredos;
3. instrução de provisionamento dos dois segredos por ambiente;
4. teste de deploy/replay em ambiente descartável.

As 26 migrations canônicas já aplicadas não devem ser reescritas retroativamente.

O arquivo `scripts/process-notifications.mjs` permanece versionado como implementação equivalente/manual e referência da lógica de processamento.

## Segurança operacional

- segredos nunca entram em Git;
- somente backend privilegiado acessa a chave de envio;
- `anon`/`authenticated` não recebem acesso ao helper de segredos;
- o remetente deve permanecer dentro do domínio verificado;
- a chave ativa deve permanecer com privilégio mínimo de envio;
- qualquer rotação de chave exige atualização segura no Vault;
- não registrar corpo/token sensível desnecessariamente em logs;
- manter tracking de abertura/clique desligado enquanto essa for a decisão de privacidade do produto.

## Pendências do Resend antes da produção definitiva

- confirmar DMARC, caso seja requisito de produção;
- decidir se haverá webhook de entrega/bounce/complaint;
- definir política de retenção/observabilidade de logs;
- versionar a Edge Function e a infraestrutura operacional do worker;
- revisar se a chave antiga `BarbeariaSP Notifications` ainda é necessária antes de qualquer remoção;
- manter monitoramento de reputação/entregabilidade durante a entrada em produção.

## Documentos relacionados

- [Notificações](NOTIFICATIONS-2026-08-08.md)
- [Arquitetura](ARCHITECTURE.md)
- [Segurança](SECURITY.md)
- [Baseline Supabase](SUPABASE_BASELINE.md)
- [Roadmap](ROADMAP.md)
