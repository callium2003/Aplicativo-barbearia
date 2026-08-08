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

Owner, manager e barber possuem preferências individuais por barbearia para:

- novo agendamento;
- confirmação;
- cancelamento;
- reagendamento;
- lembrete de 24h.

Cada evento pode ser habilitado separadamente para:

- dentro do sistema;
- e-mail.

As preferências ficam no final da página Configurações (`/painel/configurar#notificacoes`). A configuração de um usuário não altera a preferência de outros membros da equipe.

## Destinatários

- owner: eventos operacionais gerais da própria barbearia;
- manager ativo: eventos operacionais gerais da própria barbearia;
- barber ativo: eventos associados ao próprio `professional_id`;
- cliente autenticado: confirmações, alterações e lembrete pela arquitetura de notificação/e-mail.

## Fila de e-mail

A tabela `notification_outbox` suporta:

- múltiplos tipos de evento;
- deduplicação por destinatário/evento/agendamento/horário;
- `pending`, `processing`, `sent` e `failed`;
- número de tentativas;
- último erro;
- próxima tentativa;
- lock de processamento;
- backoff progressivo.

Owner e manager podem consultar o monitor da própria barbearia. Barber não tem acesso a esse monitor.

## Lembrete de 24 horas

`enqueue_due_appointment_reminders` procura atendimentos `scheduled` ou `confirmed` cuja execução esteja entre 23 e 24 horas à frente. A deduplicação evita que execuções repetidas criem o mesmo lembrete várias vezes.

## Diagnóstico do problema de entrega

Durante a homologação final, as notificações internas funcionavam, mas os e-mails não chegavam.

A investigação confirmou:

- `notification_outbox` recebia corretamente os eventos;
- destinatários e preferências estavam corretos;
- itens ficavam `pending` com `attempts = 0` e sem `last_error`;
- o Resend não registrava `POST /emails` durante os testes;
- `scripts/process-notifications.mjs` existia no repositório, mas nenhum processo executava o script automaticamente.

Causa: faltava um executor periódico da fila.

## Arquitetura ativa

A entrega foi ativada no próprio Supabase remoto para não depender do computador local, Antigravity ou Vercel:

`appointments → notification_outbox → pg_cron/pg_net → Edge Function process-notifications → Resend → destinatário`

### Componentes

- Edge Function: `process-notifications`;
- status: `ACTIVE` no projeto de homologação;
- Cron: `barbeariasp-process-notifications`;
- frequência: `* * * * *` (a cada minuto);
- `pg_cron`: habilitado;
- `pg_net`: instalado no schema `extensions`;
- remetente: `notificacoes@barbeariasp.cullentech.com.br`.

A Edge Function executa a mesma sequência conceitual do worker versionado:

1. valida que a chamada veio com o segredo correto do Cron;
2. enfileira lembretes de 24h vencendo na janela prevista;
3. reivindica mensagens pendentes por `claim_notification_outbox`;
4. envia pelo Resend;
5. finaliza cada item por `complete_notification_outbox` como sucesso ou falha;
6. preserva o backoff existente da fila.

## Segredos e segurança do worker

Dois valores ficam no Supabase Vault e nunca devem ser copiados para GitHub/documentação:

- `barbeariasp_resend_api_key`: chave dedicada de envio do Resend;
- `barbeariasp_notification_cron_secret`: segredo compartilhado para autenticar a chamada do Cron.

A função `public.get_notification_worker_secrets()` fornece os valores somente ao backend privilegiado. Grants confirmados:

- `postgres`: `EXECUTE`;
- `service_role`: `EXECUTE`.

Não há `EXECUTE` para `anon`, `authenticated` ou `PUBLIC`.

A Edge Function foi publicada com `verify_jwt=false` porque não representa uma chamada autenticada de usuário. A proteção é feita pelo segredo próprio do Cron antes das operações privilegiadas.

## Resend

Estado confirmado em 08/08/2026:

- domínio `barbeariasp.cullentech.com.br` verificado;
- remetente oficial `notificacoes@barbeariasp.cullentech.com.br`;
- Sending habilitado;
- Receiving desligado;
- Open Tracking desligado;
- Click Tracking desligado;
- DKIM verificado;
- SPF MX verificado;
- SPF TXT verificado;
- DMARC não confirmado nesta rodada.

A chave do worker foi criada com finalidade de envio e armazenada diretamente no Vault. Nenhum token/chave deve ser exibido em código, documentação ou logs de aplicação.

## Validação real de ponta a ponta

Após ativar o Cron:

- 18 mensagens antigas acumuladas foram mantidas, conforme decisão da proprietária;
- `notification_outbox` passou a mostrar 18 itens em `sent`;
- o Resend listou 18 e-mails;
- os 18 foram confirmados como `delivered`;
- os destinatários incluíram os e-mails usados na homologação;
- a proprietária confirmou o recebimento dos e-mails.

Isso concluiu a falha funcional restante identificada na rodada de homologação.

## Migrations

As migrations canônicas de notificações continuam:

- `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`;
- `20260808102128_index_notification_foreign_keys.sql`.

Histórico remoto canônico: 26 migrations.

A ativação do Cron/Edge Function/Vault/helper aconteceu depois e **não está ainda representada por uma migration adicional**.

## Worker versionado no repositório

`scripts/process-notifications.mjs` continua versionado e pode processar a mesma fila em ambiente server-side quando as variáveis necessárias existirem.

Ele não é mais o executor ativo da homologação. O executor ativo é a Edge Function Supabase.

O script permanece útil como:

- referência da lógica de entrega;
- fallback operacional/manual;
- base para testes e comparação;
- evidência versionada até a Edge Function ser consolidada no Git.

## Reprodutibilidade pendente

A Edge Function foi criada diretamente no Supabase remoto em 08/08/2026. Ainda é necessário, antes da produção definitiva:

1. versionar o código da função em `supabase/functions/process-notifications/` ou estrutura equivalente;
2. criar nova migration/infra declarativa para extensões, helper/grants e Cron, sem segredos;
3. documentar o provisionamento de `barbeariasp_resend_api_key` e `barbeariasp_notification_cron_secret` por ambiente sem incluir valores;
4. validar replay/deploy em ambiente descartável;
5. remover a diferença entre repositório e configuração remota.

Não reescrever as 26 migrations já aplicadas para incluir essas mudanças retroativamente.

## Advisors

Após a ativação:

- o Security Advisor inicialmente apontou `pg_net` no schema `public`;
- a extensão foi reinstalada/movida para `extensions`;
- esse alerta novo desapareceu.

Permanecem apenas avisos já conhecidos do projeto, como RLS habilitado sem policy em tabelas de acesso indireto, RPCs `SECURITY DEFINER` que precisam de revisão individual e proteção contra senhas vazadas desabilitada no Auth.

## Não incluído nesta fase

- push Web/PWA;
- WhatsApp Business API;
- envio automático de marketing;
- cobrança por mensagens;
- webhook de eventos do Resend para sincronizar bounce/complaint no banco;
- deploy do frontend/site público.

A arquitetura permite adicionar push e WhatsApp como novos canais sem alterar a agenda ou o modelo de eventos.
