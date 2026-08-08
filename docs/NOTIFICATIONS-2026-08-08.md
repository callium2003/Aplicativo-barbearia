# Notificações — entrega técnica de 08/08/2026

## Escopo fechado

Esta entrega implementa o bloco combinado de notificações sem ativar push do navegador ou WhatsApp automático nesta fase.

### Central interna

- sino no topo do painel;
- contador de não lidas;
- histórico das 25 notificações mais recentes;
- marcação individual e em lote como lida;
- atualização em tempo real via Supabase Realtime;
- acesso RLS limitado ao próprio `recipient_user_id`.

### Preferências

Owner, manager e barber possuem preferências individuais por barbearia para:

- novo agendamento;
- confirmação;
- cancelamento;
- reagendamento;
- lembrete de 24h.

Cada evento pode ser habilitado separadamente para:

- dentro do sistema;
- e-mail.

A configuração de um usuário não altera a preferência de outros membros da equipe.

### Destinatários

- owner: eventos operacionais gerais da própria barbearia;
- manager ativo: eventos operacionais gerais da própria barbearia;
- barber ativo: eventos associados ao próprio `professional_id`;
- cliente autenticado: confirmação, alterações e lembrete pela arquitetura de notificação/e-mail.

### Fila de e-mail

A tabela `notification_outbox` foi reaproveitada e ampliada. Ela agora suporta:

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

`enqueue_due_appointment_reminders` procura atendimentos `scheduled` ou `confirmed` cuja execução esteja entre 23 e 24 horas à frente. A deduplicação evita que execuções repetidas do worker criem o mesmo lembrete várias vezes.

## Worker para hospedagem

`scripts/process-notifications.mjs` foi preparado para execução periódica no servidor. Ele usa apenas credenciais de servidor e nunca a publishable key para operações privilegiadas.

Variáveis necessárias na publicação:

- `SUPABASE_URL` ou `VITE_SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `RESEND_API_KEY`;
- `NOTIFICATION_FROM_EMAIL`.

Comando previsto para cron:

`npm run notifications:process`

Sugestão operacional futura: execução a cada 5 minutos. A configuração do cron e dos segredos não foi feita nesta entrega porque ainda não existe publicação Hostinger ativa.

## Migrations

- `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`;
- `20260808102128_index_notification_foreign_keys.sql`.

Histórico remoto após a entrega: 26 migrations.

## Testes remotos

Foram validados em transações com rollback:

- owner lê as cinco preferências padrão;
- owner altera a própria preferência;
- owner acessa o monitor de entrega da própria barbearia;
- barber lê as próprias preferências;
- barber não vê notificações de outros usuários por RLS;
- barber não acessa o monitor administrativo;
- dispatch de evento cria notificações deduplicadas;
- nenhuma preferência de teste ficou persistida.

## Advisors

O Performance Advisor inicialmente apontou cinco FKs novas sem índice. A migration corretiva `20260808102128` adicionou os índices. Depois disso, os avisos de FK sem índice desapareceram e restaram somente `unused_index` INFO.

No Security Advisor, `notification_preferences` aparece como RLS sem policy porque acesso direto de browser foi deliberadamente revogado; a tabela é operada pelas RPCs autenticadas. As RPCs públicas de preferências/monitor aparecem no aviso genérico de `SECURITY DEFINER`, mas validam `auth.uid()`, vínculo com tenant e papel quando necessário. As RPCs de worker são `service_role` only.

## Não incluído nesta fase

- push Web/PWA;
- WhatsApp Business API;
- envio automático de marketing;
- cobrança por mensagens;
- configuração de domínio/remetente/Resend;
- cron Hostinger;
- deploy.

A arquitetura permite adicionar push e WhatsApp como novos canais sem alterar a agenda ou o modelo de eventos.
