# Notificações — entrega técnica e ativação de 08/08/2026

## Escopo fechado

Esta entrega implementa e ativa o bloco combinado de notificações dentro do sistema e por e-mail. Push do navegador e WhatsApp automático permanecem fora desta fase.

## Central interna

- sino no topo do painel;
- contador de não lidas;
- histórico das notificações mais recentes;
- filtro `Todas` / `Não lidas`;
- marcação individual e em lote como lida;
- atualização em tempo real via Supabase Realtime;
- acesso RLS limitado ao próprio `recipient_user_id`.

A página `/painel/notificacoes` é uma Central/histórico. Ela não contém mais a edição de preferências.

## Preferências

Owner, manager e barber possuem preferências individuais por barbearia para novo agendamento, confirmação, cancelamento, reagendamento e lembrete de 24h. Cada evento pode ser habilitado separadamente para `Dentro do sistema` e `E-mail`.

As preferências ficam no final da página Configurações (`/painel/configurar#notificacoes`). A configuração de um usuário não altera a preferência de outros membros da equipe.

## Destinatários

- owner: eventos operacionais gerais da própria barbearia;
- manager ativo: eventos operacionais gerais da própria barbearia;
- barber ativo: eventos associados ao próprio `professional_id`;
- cliente autenticado: confirmações, alterações e lembrete pela arquitetura de notificação/e-mail.

## Fila de e-mail

A tabela `notification_outbox` suporta múltiplos tipos de evento, deduplicação, estados `pending`/`processing`/`sent`/`failed`, tentativas, último erro, próxima tentativa, lock de processamento e backoff progressivo. Owner e manager podem consultar o monitor da própria barbearia; barber não tem acesso a esse monitor.

## Lembrete de 24 horas

`enqueue_due_appointment_reminders` procura atendimentos `scheduled` ou `confirmed` cuja execução esteja entre 23 e 24 horas à frente. A deduplicação evita que execuções repetidas criem o mesmo lembrete várias vezes.

## Diagnóstico do problema de entrega

Durante a homologação final, as notificações internas funcionavam, mas os e-mails não chegavam. A investigação confirmou que `notification_outbox` recebia corretamente os eventos, mas os itens permaneciam `pending` com `attempts = 0` e o Resend não recebia `POST /emails`. O script `scripts/process-notifications.mjs` existia, porém nenhum executor periódico o chamava.

Causa: faltava um executor automático da fila.

## Arquitetura ativa e versionada

Fluxo atual:

`appointments → notification_outbox → pg_cron/pg_net → Edge Function process-notifications → Resend → destinatário`

Componentes:

- Edge Function `process-notifications`, ativa no remoto e versionada em `supabase/functions/process-notifications/index.ts`;
- dependência `@supabase/supabase-js` fixada em `2.97.0` na Edge Function;
- Cron `barbeariasp-process-notifications` com frequência `* * * * *`;
- `pg_cron` habilitado;
- `pg_net` instalado no schema `extensions`;
- migration `20260808183718_version_notification_worker_runtime.sql` para helper/grants/extensões e configuração reproduzível do Cron;
- remetente `notificacoes@barbeariasp.cullentech.com.br`.

A Edge Function:

1. valida o segredo próprio do Cron;
2. enfileira lembretes de 24h;
3. reivindica mensagens por `claim_notification_outbox`;
4. envia pelo Resend;
5. finaliza por `complete_notification_outbox`;
6. preserva o backoff existente.

## Vault e segurança do worker

Três valores são provisionados por ambiente no Supabase Vault e nunca entram no Git:

- `barbeariasp_project_url`: URL do projeto Supabase do ambiente;
- `barbeariasp_resend_api_key`: chave dedicada do Resend;
- `barbeariasp_notification_cron_secret`: segredo da chamada Cron → Edge Function.

`public.get_notification_worker_secrets()` expõe apenas a chave do Resend e o segredo do Cron ao backend privilegiado. `EXECUTE` está permitido para `postgres` e `service_role`, e revogado de `PUBLIC`, `anon` e `authenticated`.

`private.configure_notification_worker_cron()` verifica se os três valores do Vault estão disponíveis, remove eventual job anterior com o mesmo nome e recria o Cron sem URL ou segredo hardcoded na migration.

A Edge Function usa `verify_jwt=false` porque não recebe sessão de usuário; a chamada servidor-servidor é autenticada pelo header `x-cron-secret` antes de operações privilegiadas. O procedimento de deploy está em `supabase/functions/process-notifications/README.md`.

## Resend

A operação detalhada do provedor, incluindo domínio/DNS, chaves por nome, segurança, monitoramento e troubleshooting, está em [RESEND.md](RESEND.md).

Estado confirmado em 08/08/2026:

- domínio `barbeariasp.cullentech.com.br` verificado;
- remetente oficial `notificacoes@barbeariasp.cullentech.com.br`;
- Sending habilitado;
- Receiving desligado;
- Open/Click Tracking desligados;
- DKIM verificado;
- SPF MX/TXT verificados;
- DMARC não confirmado nesta rodada.

## Validação real de ponta a ponta

Após ativar o Cron:

- 18 mensagens antigas acumuladas foram mantidas;
- 18 itens passaram para `sent` no Supabase;
- o Resend listou as 18 mensagens como `delivered`;
- a proprietária confirmou o recebimento.

Após versionar a infraestrutura:

- a Edge Function remota passou para versão 2 e permaneceu `ACTIVE`;
- o Cron foi recriado usando `barbeariasp_project_url` e o segredo por nome no Vault;
- uma chamada de validação retornou HTTP 200 com `claimed: 0`, `sent: 0`, `failed: 0` e nenhum erro de lembrete, sem gerar novo e-mail.

## Migrations

Migrations canônicas relacionadas às notificações:

- `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`;
- `20260808102128_index_notification_foreign_keys.sql`;
- `20260808183718_version_notification_worker_runtime.sql`.

Histórico remoto canônico: **27 migrations**.

## Worker alternativo

`scripts/process-notifications.mjs` continua versionado como fallback/manual e referência equivalente da lógica de fila. O executor ativo de homologação é a Edge Function Supabase.

## Reprodutibilidade

O drift operacional identificado após a primeira ativação foi resolvido em 08/08/2026:

- código da Edge Function está no Git;
- migration 27 representa extensões, helper/grants e configuração do Cron;
- o job não contém URL específica do projeto;
- os valores variáveis por ambiente ficam apenas no Vault;
- o diretório da função contém instruções de deploy e provisionamento.

O que permanece necessariamente externo ao Git são **os valores** dos três itens do Vault. Em um novo ambiente, provisionar esses valores e executar `select private.configure_notification_worker_cron();`.

## Advisors

O Security Advisor foi executado após a migration 27. A nova infraestrutura não adicionou warning público para `get_notification_worker_secrets`; o alerta anterior de `pg_net` no schema `public` permanece corrigido com a extensão em `extensions`.

Permanecem avisos já conhecidos do projeto, como RLS habilitado sem policy em tabelas de acesso indireto, RPCs `SECURITY DEFINER` do produto para revisão individual e proteção contra senhas vazadas desabilitada no Auth.

## Não incluído nesta fase

- push Web/PWA;
- WhatsApp Business API;
- envio automático de marketing;
- cobrança por mensagens;
- webhook de eventos do Resend para sincronizar bounce/complaint no banco;
- deploy do frontend/site público.

A arquitetura permite adicionar push e WhatsApp como novos canais sem alterar a agenda ou o modelo de eventos.
