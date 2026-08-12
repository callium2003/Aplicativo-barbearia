# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo.

Os arquivos em `supabase/migration-history/prebaseline-local/` e `supabase/migration-history/substituted-local/` são evidência histórica e não fazem parte da sequência executável.

## Reconciliação

Em 2026-08-07, o histórico remoto de homologação `irszgnkzqseljowckrgz` foi reconciliado com a pasta `supabase/migrations/` sem reescrever SQL aplicado e sem manipular diretamente `supabase_migrations.schema_migrations`.

Depois da reconciliação foram acrescentadas migrations de comissão/relatórios, conta de cliente, notificações e, em 08/08/2026, a infraestrutura reproduzível do worker de e-mail.

O repositório contém **30 migrations canônicas**. As duas migrations de perfil público do profissional foram aplicadas remotamente com versões atribuídas pela integração; a numeração do arquivo local deve ser preservada como fonte de código.

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
27. `20260808183718_version_notification_worker_runtime.sql`
28. `20260810150000_harden_registration_details_owner_only.sql`
29. `20260810170000_add_professional_public_profile.sql`
30. `20260810171000_harden_professional_profile_photo_path.sql`

Alguns nomes contêm um segundo timestamp porque a primeira parte é a versão realmente registrada pelo Supabase e a segunda preserva o nome histórico passado ao `apply_migration`.

## Dados de homologação — limpeza e novo ciclo em 08/08/2026

Antes da rodada final, os dados de teste foram removidos de forma controlada:

- 22 tabelas do schema `public` ficaram zeradas;
- usuários, identidades e sessões de Auth foram removidos;
- objetos do bucket `barbershop-images` foram removidos pela interface/API apropriada de Storage;
- migrations, tabelas, RLS, RPCs, bucket e demais estruturas foram preservados.

Depois da limpeza, uma nova barbearia e um novo cliente foram criados e os fluxos principais foram homologados novamente. Portanto, a limpeza foi um marco de teste e não representa o estado atual do banco.

## Cliente e relatórios

### `save_my_customer_profile(text,text)`

- exige `auth.uid()`;
- valida nome e celular/WhatsApp;
- normaliza telefone;
- usa o e-mail de `auth.users`;
- cria/atualiza somente o perfil do próprio `auth_user_id`;
- `anon` e `PUBLIC` não possuem `EXECUTE`.

### `get_barbershop_management_report(uuid,date,date,uuid)`

- exige autenticação;
- aceita somente `owner` ou `manager` da barbearia solicitada;
- limita a consulta a 367 dias;
- valida profissional contra o tenant;
- retorna agenda/status, faturamento/ticket, comissão, clientes, ocupação, serviços, cancelamentos e detalhamento dos atendimentos.

O fluxo foi homologado funcionalmente em 08/08/2026 após conclusão de atendimentos de teste.

## Notificações — base funcional

Tabelas principais:

- `user_notifications` — Central de Notificações;
- `notification_preferences` — preferências por usuário/evento/canal;
- `notification_outbox` — fila de e-mail com deduplicação, tentativas e backoff.

Eventos:

- `new_appointment`;
- `appointment_confirmed`;
- `appointment_cancelled`;
- `appointment_rescheduled`;
- `appointment_reminder_24h`.

RPCs do worker:

- `enqueue_due_appointment_reminders(integer)`;
- `claim_notification_outbox(integer)`;
- `complete_notification_outbox(uuid,boolean,text)`.

`user_notifications` participa de `supabase_realtime` para atualização do sino.

## Migration 27 — runtime reproduzível do worker

`20260808183718_version_notification_worker_runtime.sql` foi aplicada em 08/08/2026 para eliminar o drift entre o remoto e o repositório.

Ela versiona:

- `pg_cron`;
- `pg_net` no schema `extensions`;
- `public.get_notification_worker_secrets()` com `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`, e concedido a `service_role`;
- `private.configure_notification_worker_cron()`;
- job `barbeariasp-process-notifications` executado a cada minuto.

O job não contém project ref nem segredo hardcoded. Ele lê por nome no Vault:

- `barbeariasp_project_url`;
- `barbeariasp_notification_cron_secret`.

A chave do Resend é lida pela Edge Function por meio de `barbeariasp_resend_api_key`.

Os **valores** desses itens são configuração de ambiente e nunca entram em migration ou Git.

## Edge Function versionada

A função ativa está versionada em:

`supabase/functions/process-notifications/index.ts`

Estado remoto após consolidação:

- função `process-notifications` versão 2;
- status `ACTIVE`;
- `@supabase/supabase-js@2.97.0` fixado;
- `verify_jwt=false` no deploy por se tratar de integração servidor-servidor;
- autenticação própria pelo header `x-cron-secret`.

O procedimento de deploy/provisionamento está em `supabase/functions/process-notifications/README.md`.

## Validação da infraestrutura

Após a migration 27:

- o Cron ficou ativo com expressão `* * * * *`;
- a URL passou a ser obtida de `barbeariasp_project_url` no Vault;
- uma chamada real à Edge Function retornou HTTP 200;
- resposta: `claimed: 0`, `sent: 0`, `failed: 0`, sem erro de lembrete;
- nenhum e-mail novo foi criado nessa validação porque a fila estava vazia.

A validação anterior do canal continua válida: 18 mensagens acumuladas foram processadas, ficaram `sent` no Supabase e `delivered` no Resend, com recebimento confirmado.

Detalhes do provedor: [RESEND.md](RESEND.md).

## Reprodutibilidade por ambiente

O código e o DDL estão versionados. Em um novo ambiente ainda é necessário provisionar, fora do Git, os valores:

- `barbeariasp_project_url`;
- `barbeariasp_resend_api_key`;
- `barbeariasp_notification_cron_secret`.

Depois, execute como administrador:

```sql
select private.configure_notification_worker_cron();
```

Resultado esperado: `true`.

Isso não é mais drift de código/schema: são apenas valores externos por ambiente, como esperado para segredos/configuração.

## Advisors

O Security Advisor foi executado após a migration 27.

A nova infraestrutura não criou warning público para `get_notification_worker_secrets`, e `pg_net` permanece no schema `extensions`.

Permanecem avisos anteriores do projeto:

- INFO `RLS Enabled No Policy` em `notification_preferences`, `appointment_commissions` e `professional_commission_settings`;
- warnings de RPCs `SECURITY DEFINER` do produto acessíveis por `anon`/`authenticated`, que precisam de revisão individual;
- `Leaked Password Protection Disabled` no Auth.

Referências:

- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Regras para migrations

- não alterar migrations já aplicadas;
- não manipular diretamente `supabase_migrations.schema_migrations`;
- não usar `migration repair`, `db push` ou reset para mascarar divergência;
- consultar o histórico remoto antes de novas aplicações;
- novas mudanças de schema devem ser migrations novas e validadas;
- segredos nunca entram em migration ou Git.

## Replay local

O histórico canônico agora contém 30 migrations e o runtime do worker está representado no repositório. O replay integral ainda deve ser validado em ambiente descartável antes da produção definitiva, principalmente porque o ambiente local de homologação tem componentes desabilitados por limitação de recursos.
