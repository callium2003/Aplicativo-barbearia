# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo.

Os arquivos em `supabase/migration-history/prebaseline-local/` e `supabase/migration-history/substituted-local/` são evidência histórica e não fazem parte da sequência executável.

## Reconciliação de 2026-08-07

O histórico remoto de homologação `irszgnkzqseljowckrgz` continha 21 versões quando foi reconciliado. A pasta `supabase/migrations/` foi alinhada sem alterar SQL de migrations aplicadas e sem modificar diretamente `supabase_migrations.schema_migrations`.

Depois da reconciliação, cinco funcionalidades/correções acrescentaram novas migrations canônicas:

- `20260807044250_add_appointment_commission_ledger_and_financial_reports.sql`: ledger de comissão, repasses e relatório financeiro inicial;
- `20260807070808_add_customer_account_and_complete_management_reports.sql`: perfil de cliente autenticado e relatório gerencial completo;
- `20260807070958_fix_management_report_service_revenue_share.sql`: correção separada da participação de receita por serviço;
- `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`: Central de Notificações, preferências, eventos da agenda, fila de e-mail, lembrete 24h, monitor e RPCs de worker;
- `20260808102128_index_notification_foreign_keys.sql`: índices de apoio para as novas FKs de notificações.

O histórico remoto passou a **26 versões** e continua com 26 migrations canônicas em 08/08/2026. A ativação operacional do worker de e-mail feita posteriormente no mesmo dia não criou uma 27ª migration; ela está documentada separadamente abaixo como drift operacional temporário a ser versionado.

## Sequência executável canônica

1. `20260801001539_baseline_remote_schema.sql`
2. `20260803044908_add_barbershop_image_storage.sql`
3. `20260803045033_harden_barbershop_image_access.sql`
4. `20260803071307_add_initial_registration_details.sql`
5. `20260803195045_fix_barbershop_image_upload_policy.sql`
6. `20260803222030_20260803205726_install_customer_crm_booking.sql`
7. `20260803224530_20260803230000_secure_public_catalog_and_internal_trigger.sql`
8. `20260804013607_20260803230000_optimize_booking_intervals_10min.sql`
9. `20260804043338_add_team_invitations.sql`
10. `20260806040824_20260804050000_add_professional_commission_rate.sql`
11. `20260806040831_20260804060000_isolate_professional_commission.sql`
12. `20260806040839_20260804070000_harden_professional_commission_security.sql`
13. `20260806051055_20260806050000_revoke_anon_commission_rpc_execute.sql`
14. `20260807015209_fix_barbershop_image_delete_policy.sql`
15. `20260807015637_harden_team_invitations_table_privileges.sql`
16. `20260807020013_harden_team_invitation_rpc_privileges.sql`
17. `20260807020457_harden_public_invitation_details.sql`
18. `20260807022443_implement_role_permission_matrix.sql`
19. `20260807022720_preserve_safe_manager_profile_updates.sql`
20. `20260807025705_optimize_rls_and_foreign_key_indexes.sql`
21. `20260807030613_allow_barber_self_schedule_management.sql`
22. `20260807044250_add_appointment_commission_ledger_and_financial_reports.sql`
23. `20260807070808_add_customer_account_and_complete_management_reports.sql`
24. `20260807070958_fix_management_report_service_revenue_share.sql`
25. `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`
26. `20260808102128_index_notification_foreign_keys.sql`

Alguns nomes contêm um segundo timestamp porque a primeira parte é a versão realmente registrada pelo Supabase e a segunda preserva o nome histórico passado ao `apply_migration`.

## Dados de homologação — limpeza e novo ciclo em 08/08/2026

Antes da rodada final de homologação, os registros de teste foram removidos de forma controlada:

- as 22 tabelas do schema `public` ficaram zeradas;
- usuários/identidades/sessões de Auth foram removidos;
- objetos do bucket `barbershop-images` foram removidos pela interface/API apropriada de Storage;
- migrations, tabelas, RLS, RPCs, bucket e demais estruturas foram preservados.

Depois da limpeza, a proprietária criou uma nova barbearia e um novo cliente e refez os fluxos principais. Portanto, o ambiente **não deve ser interpretado como vazio atualmente**; a limpeza foi um marco de homologação, não um estado permanente.

## Cliente e relatórios

### `save_my_customer_profile(text,text)`

- exige `auth.uid()`;
- valida nome e celular/WhatsApp;
- normaliza telefone;
- usa o e-mail de `auth.users`;
- cria/atualiza somente o perfil associado ao próprio `auth_user_id`;
- `anon` e `PUBLIC` não possuem `EXECUTE`.

### `get_barbershop_management_report(uuid,date,date,uuid)`

- exige autenticação;
- aceita somente `owner` ou `manager` da barbearia solicitada;
- restringe consulta a no máximo 367 dias;
- valida o profissional contra o tenant;
- retorna agenda/status, faturamento/ticket, comissão, clientes novos/recorrentes/reagendados, desempenho de profissionais, ocupação, serviços, clientes, cancelamentos e detalhamento de atendimentos.

A taxa de ocupação usa minutos reservados divididos por minutos efetivamente disponíveis, considerando horários da barbearia/profissional, pausas recorrentes e bloqueios pontuais.

Esse fluxo foi homologado funcionalmente pela proprietária em 08/08/2026 após conclusão de atendimentos reais de teste.

## Notificações — migrations canônicas

### Tabelas

- `user_notifications`: Central de Notificações dentro do produto. RLS permite a cada usuário somente ler e marcar como lidas as próprias notificações.
- `notification_preferences`: preferências por barbearia, usuário, evento e canal. Não possui acesso direto do navegador; leitura/escrita passam por RPCs autenticadas.
- `notification_outbox`: fila de e-mail com múltiplos eventos, deduplicação, processamento, tentativas e backoff.

### Eventos

- `new_appointment`;
- `appointment_confirmed`;
- `appointment_cancelled`;
- `appointment_rescheduled`;
- `appointment_reminder_24h`.

O trigger `private.queue_appointment_notifications()` reage a criação e alterações relevantes de `appointments` e delega para `private.dispatch_appointment_event(...)`.

### RPCs versionadas pelas migrations de notificações

- `get_my_notification_preferences(uuid)`;
- `save_my_notification_preference(uuid,text,boolean,boolean)`;
- `get_notification_delivery_monitor(uuid,integer)`;
- `enqueue_due_appointment_reminders(integer)`;
- `claim_notification_outbox(integer)`;
- `complete_notification_outbox(uuid,boolean,text)`.

`user_notifications` foi incluída em `supabase_realtime` para atualizar o sino sem recarregar a página.

## Ativação operacional do e-mail — 08/08/2026

Depois de confirmar que a fila estava sendo preenchida corretamente, mas permanecia `pending` com zero tentativas, foi identificado que nenhum worker automático estava executando `scripts/process-notifications.mjs`.

A solução operacional ativada no Supabase remoto foi:

1. Edge Function `process-notifications` publicada e marcada `ACTIVE`;
2. extensão `pg_cron` habilitada;
3. extensão `pg_net` habilitada no schema `extensions`;
4. Cron `barbeariasp-process-notifications` criado com expressão `* * * * *` (a cada minuto);
5. chave de envio dedicada do Resend armazenada no Vault sob o nome `barbeariasp_resend_api_key`;
6. segredo próprio do Cron armazenado no Vault sob o nome `barbeariasp_notification_cron_secret`;
7. função `public.get_notification_worker_secrets()` criada para leitura server-side dos valores, com `EXECUTE` somente para `service_role` e `postgres`;
8. Edge Function configurada para validar o segredo do Cron antes de usar operações privilegiadas;
9. remetente `notificacoes@barbeariasp.cullentech.com.br` utilizado para envio.

Nenhum valor de segredo/chave deve ser versionado ou transcrito em documentação.

A configuração específica do Resend, incluindo DNS, chaves por nome, segurança e troubleshooting, está em [RESEND.md](RESEND.md).

### Validação real

Após a primeira execução automática:

- `notification_outbox` registrou 18 itens em `sent`;
- o Resend listou 18 mensagens e marcou todas como `delivered`;
- a proprietária confirmou o recebimento dos e-mails.

Isso valida o fluxo completo:

`appointments → notification_outbox → pg_cron/pg_net → Edge Function → Resend → destinatário`.

## Drift operacional temporário e reprodutibilidade

A sequência canônica de 26 migrations **não contém ainda** os objetos operacionais criados diretamente no remoto para ativar o worker em 08/08/2026:

- habilitação/configuração de `pg_cron` e `pg_net`;
- função `public.get_notification_worker_secrets()`;
- job `barbeariasp-process-notifications`;
- configuração/nome dos segredos do Vault (nunca os valores);
- código-fonte da Edge Function `process-notifications`.

`scripts/process-notifications.mjs` já está versionado e representa a lógica equivalente de processamento da fila, mas não é o executor ativo no remoto.

Antes da produção definitiva, essa diferença deve ser eliminada criando uma implementação reprodutível no repositório, preferencialmente com:

- código da função em `supabase/functions/process-notifications/` (ou estrutura adotada pelo projeto);
- migration/infra declarativa para extensões, grants/helper e job, sem incluir segredos;
- instruções de provisionamento dos segredos por ambiente;
- teste/validação após deploy.

Não criar migration retroativa que altere a história já aplicada; criar nova migration para qualquer DDL que deva ser versionado.

## Resend — estado confirmado

- domínio `barbeariasp.cullentech.com.br` verificado;
- Sending habilitado;
- Receiving desligado;
- remetente `notificacoes@barbeariasp.cullentech.com.br`;
- DKIM verificado;
- SPF MX/TXT verificados;
- tracking de abertura e clique desligado;
- DMARC não confirmado nesta rodada e não deve ser assumido como validado.

Para detalhes operacionais, consulte [RESEND.md](RESEND.md).

## Advisors

O Security Advisor foi executado após a ativação do worker.

O alerta de `pg_net` no schema `public` apareceu durante a primeira instalação e foi corrigido reinstalando/movendo a extensão para `extensions`.

Permanecem:

- INFO `RLS Enabled No Policy` em `notification_preferences`, `appointment_commissions` e `professional_commission_settings`; o acesso direto do navegador é deliberadamente restrito/revogado e a operação ocorre por RPC/backend;
- warnings de RPCs `SECURITY DEFINER` acessíveis por `anon`/`authenticated`, que permanecem no backlog para revisão individual de exposição e validações internas;
- warning `Leaked Password Protection Disabled` no Auth.

A nova função `get_notification_worker_secrets()` não aparece como publicamente executável; os privilégios confirmados são `postgres` e `service_role`.

## Regras para migrations

- Não alterar migrations já aplicadas.
- Não manipular diretamente `supabase_migrations.schema_migrations`.
- Não usar `migration repair`, `db push` ou reset para mascarar divergência.
- Consultar o histórico remoto antes de novas aplicações.
- Novas mudanças de schema devem ser migrations novas e validadas.
- Conteúdo em `migration-history/` é somente histórico.
- Segredos nunca entram em migration ou Git.

## Replay local

A reconciliação garante ordem/versionamento canônicos, mas ainda não equivale a uma prova completa de `supabase db reset --local` das 26 migrations. Além disso, o worker remoto atual possui objetos operacionais ainda não versionados. O replay integral deve ser testado em ambiente descartável depois que essa diferença for consolidada no repositório.
