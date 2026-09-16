# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo.

Os arquivos em `supabase/migration-history/prebaseline-local/` e `supabase/migration-history/substituted-local/` são evidência histórica e não fazem parte da sequência executável.

## Reconciliação

Em 2026-08-07, o histórico remoto de homologação `irszgnkzqseljowckrgz` foi reconciliado com a pasta `supabase/migrations/` sem reescrever SQL aplicado e sem manipular diretamente `supabase_migrations.schema_migrations`.

Depois da reconciliação foram acrescentadas migrations de comissão/relatórios, conta de cliente, notificações e, em 08/08/2026, a infraestrutura reproduzível do worker de e-mail. Em 16/08/2026, a proteção contra repetição de chamadas do worker foi adicionada como migration nova, sem reescrever o histórico.

A sequência executável continha **54 migrations** na revisão de 06/09/2026. Essa contagem é histórica; a fotografia atual está na seção seguinte.

## Estado de reconciliação atual — 16/09/2026

Esta é a fotografia operacional para retomar o trabalho; a EFS, especialmente a seção 48, continua sendo a referência de produto e homologação.

- a pasta executável local contém **77** migrations SQL;
- a leitura do catálogo do projeto remoto compartilhado confirmou **77** registros de migration;
- a igualdade de contagem não autoriza `db push`, `migration repair`, renomear arquivos nem editar `schema_migrations`: as versões remotas abaixo foram atribuídas no momento de aplicação e devem permanecer reconciliadas por mapeamento;
- as migrations locais abaixo foram aplicadas ao remoto sob versões atribuídas pelo serviço, diferentes do prefixo de arquivo local. Não renomear os arquivos para “alinhar” o histórico nem manipular `schema_migrations`:

| Arquivo local versionado | Registro remoto confirmado | Situação |
|---|---|---|
| `20260914080833_customer_only_appointment_emails.sql` | `20260914080833_customer_only_appointment_emails` | Aplicada; atualização de texto e destinatário de e-mails de agenda |
| `20260914053427_enforce_subscription_expiry_agenda_access.sql` | `20260914084133_enforce_subscription_expiry_agenda_access` | Aplicada; bloqueio de novas reservas e acesso limitado à agenda após expiração |
| `20260914055200_prioritize_subscription_expiry_public_message.sql` | `20260914230625_prioritize_subscription_expiry_public_message` | Aplicada; mensagem de assinatura vencida prevalece sobre a de configuração incompleta |
| `20260914233000_restore_customer_appointment_read_policy.sql` | `20260914233030_restore_customer_appointment_read_policy` | Aplicada; restaura somente a execução autenticada da função usada pela policy de leitura de appointments |
| `20260914234500_restore_agenda_cutoff_policy_function_access.sql` | `20260914233420_restore_agenda_cutoff_policy_function_access` | Aplicada; restaura somente a execução autenticada do limite operacional usado diretamente pelas policies de appointments |
| `20260915113000_enable_rls_for_new_public_tables.sql` | `20260915111629_enable_rls_for_new_public_tables` | Aplicada; habilita RLS automaticamente em novas tabelas públicas |
| `20260915114500_revoke_default_data_api_grants.sql` | `20260915111729_revoke_default_data_api_grants` | Aplicada; revoga grants padrão de Data API para objetos futuros |
| `20260915130000_harden_delete_customer_account_jwt.sql` | `20260915114617_harden_delete_customer_account_jwt` | Aplicada; endurece o fluxo de exclusão de conta do cliente |
| `20260915140000_public_booking_abuse_protection.sql` | `20260915211138_public_booking_abuse_protection` | Aplicada; proteção contra abuso na reserva pública |
| `20260915150000_reconcile_team_member_operational_status.sql` | `20260916005312_reconcile_team_member_operational_status` | Aplicada; reconciliação de estado operacional da equipe |
| `20260915160000_optimize_deactivation_review_and_consent_policy.sql` | `20260916014849_optimize_deactivation_review_and_consent_policy` | Aplicada; corrige os avisos de performance então identificados |
| `20260912150000_export_barbershop_operational_data.sql` | `20260916014911_export_barbershop_operational_data` | Aplicada; exportação operacional por barbearia |
| `20260915170000_install_notification_retention.sql` | `20260916015029_install_notification_retention` | Aplicada; retenção de notificações |

O estado acima substitui a fotografia parcial de 14/09. A Edge Function `process-notifications` foi consultada em 14/09 como `ACTIVE`, versão 20, com `verify_jwt=false` por desenho de integração Cron/HMAC; esse registro não substitui a validação ponta a ponta de e-mail descrita em `RESEND.md`.

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
31. `20260811120000_prevent_staff_self_booking.sql`
32. `20260811123000_enforce_staff_self_booking_trigger.sql`
33. `20260812051000_add_platform_health_monitoring.sql`
34. `20260812070000_manage_team_member_access.sql`
35. `20260812080000_add_my_professional_profile_rpc.sql`
36. `20260812083000_add_public_professionals_view.sql`
37. `20260812100000_add_audit_coverage.sql`
38. `20260812103000_add_customer_audit_trigger.sql`
39. `20260812120000_harden_public_professionals_view.sql`
40. `20260812133000_record_marketing_opt_out_on_booking.sql`
41. `20260812140000_add_customer_marketing_preferences.sql`
42. `20260812141000_fix_customer_consent_booking_policy.sql`
43. `20260812142000_restore_public_catalog_anon_grants.sql`
44. `20260816071507_harden_notification_worker_request_auth.sql`
45. `20260817090000_decouple_marketing_consent_from_booking.sql`
46. `20260818163652_harden_privacy_inputs_and_image_urls.sql`
47. `20260819041728_harden_customer_privacy_rights.sql`
48. `20260824085258_restrict_customer_privacy_request_grants.sql`
49. `20260824091124_restore_notification_worker_hmac_auth.sql`
50. `20260828022404_fix_customer_preference_and_account_retention.sql`
51. `20260828165046_add_commission_period_bulk_payment.sql`
52. `20260906005431_close_notification_nonce_expiry_window.sql`

Alguns nomes contêm um segundo timestamp porque a primeira parte é a versão realmente registrada pelo Supabase e a segunda preserva o nome histórico passado ao `apply_migration`.

No catálogo remoto, as migrations 50, 51 e 52 estão registradas, respectivamente, como `20260828024733`, `20260828213008` e `20260906042028`. Os arquivos locais preservam os timestamps em que foram gerados no repositório.

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

Estado remoto validado em 06/09/2026:

- função `process-notifications` versão 18;
- status `ACTIVE`;
- `postgres@3.4.3` fixado, usando `SUPABASE_DB_URL`, `prepare=false` e uma conexão por instância;
- `verify_jwt=false` no deploy por se tratar de integração servidor-servidor;
- assinatura HMAC-SHA-256 em `x-cron-signature`, calculada sobre timestamp, nonce, método e caminho da requisição;
- segredo HMAC lido do ambiente da Edge Function e validado antes de abrir a conexão Postgres.
- execução automática validada com HTTP 200, fila vazia e nenhum erro de enfileiramento de lembretes.

## Migration 20260816071507 — proteção contra repetição do worker

`20260816071507_harden_notification_worker_request_auth.sql` protege o job `barbeariasp-process-notifications` contra replay de uma chamada válida capturada:

- Cron envia `x-cron-timestamp`, `x-cron-nonce` UUID e `x-cron-signature` HMAC-SHA-256;
- a Edge Function aceita somente timestamps dentro de cinco minutos;
- `public.claim_notification_worker_request(uuid,bigint)` registra o nonce de modo atômico antes de consultar ou enviar e-mail;
- uma repetição, assinatura inválida ou chamada vencida recebe HTTP 401;
- o acesso à função de claim fica exclusivamente com `service_role`.

A ordem segura de atualização é: migration, deploy da Edge Function compatível e `select private.configure_notification_worker_cron();`. A validação remota registrada confirmou uma chamada sem assinatura com HTTP 401 e duas execuções válidas do Cron com HTTP 200.

O procedimento de deploy/provisionamento está em `supabase/functions/process-notifications/README.md`.

## Migration 20260906005431 — fechamento do limite de replay

`20260906005431_close_notification_nonce_expiry_window.sql` foi aplicada remotamente em 06/09/2026, sob a versão atribuída `20260906042028`. Ela rejeita valores nulos e timestamps com diferença maior ou igual a 300 segundos antes de limpar ou inserir nonces.

A prova remota controlada confirmou que:

- uma requisição no limite exato de 300 segundos é recusada;
- um nonce novo e dentro da janela é aceito;
- a repetição do mesmo nonce é recusada;
- os registros criados pela prova foram removidos;
- `anon` e `authenticated` não têm `EXECUTE`, enquanto `service_role` tem;
- as execuções automáticas posteriores continuaram retornando HTTP 200.

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

## Hardening P0 em 15/09/2026

A Edge Function remota `delete-my-customer-account` foi publicada na versão 8 `ACTIVE` com `verify_jwt = false`. A opção legada da plataforma não é a barreira de autenticação desta operação destrutiva: o handler extrai apenas o bearer, chama `auth.getUser(token)` e recusa token ausente/inválido e `user.is_anonymous` antes de enumerar Storage, chamar RPC ou excluir a identidade. O identificador da conta é obtido somente da identidade validada.

O teste dirigido incluiu uma identidade anônima e confirmou HTTP 401 com a única operação `getUser`; não houve execução real de exclusão, anonimização ou remoção de arquivos.

Na mesma inspeção, a configuração remota **Automatically expose new tables** da Data API estava ligada. Para aplicar a proteção sem depender do bloqueio inicial da interface, foram aplicadas as migrations `20260915113000_enable_rls_for_new_public_tables.sql` e `20260915114500_revoke_default_data_api_grants.sql`, registradas remotamente como `20260915111629_enable_rls_for_new_public_tables` e `20260915111729_revoke_default_data_api_grants`. A primeira instala um event trigger que habilita RLS somente para futuras tabelas do schema `public`; a segunda remove para futuras tabelas e sequências os grants padrão de DML/uso a `anon`, `authenticated` e `service_role`. Leitura remota confirmou o event trigger habilitado e os ACLs padrão sem os privilégios de Data API revogados. Tabelas, sequências e grants existentes foram preservados. Em seguida, o responsável desligou manualmente o toggle visual no Dashboard e forneceu captura atual com o controle desativado e sem alteração pendente para salvar. Não foi aplicada a opção ampla de endurecimento da Data API nem modificados schemas públicos existentes fora do escopo.

O Security Advisor foi executado novamente depois da migration 52; a revisão de grants e a prova funcional também foram repetidas após a aplicação.

A nova infraestrutura não criou warning público para `get_notification_worker_secrets`, e `pg_net` permanece no schema `extensions`.

Permanecem avisos anteriores do projeto:

- INFO `RLS Enabled No Policy` em `notification_preferences`, `appointment_commissions` e `professional_commission_settings`;
- warnings de RPCs `SECURITY DEFINER` do produto acessíveis por `anon`/`authenticated`, que precisam de revisão individual;
- `Leaked Password Protection Disabled` no Auth.

Em 16/09, a migration de performance eliminou os três avisos então encontrados para a desativação, a revisão e o consentimento. O catálogo ainda pode listar índices não utilizados como informação; isso não justifica removê-los sem dados de uso suficientes. Alertas genéricos de `SECURITY DEFINER`, RLS sem policy e proteção contra senha vazada continuam exigindo análise individual, não uma alteração automática.

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

A pasta executável local contém 77 migrations SQL e o catálogo remoto contém 77 registros na fotografia de 16/09/2026. As correspondências de versões atribuídas remotamente estão registradas nesta página; não transforme essa equivalência de inventário em permissão para reescrever histórico. O runtime do worker está representado no repositório e a proteção de replay foi validada no ambiente remoto. O replay integral da sequência completa ainda deve ser validado em ambiente descartável antes de uma nova produção, principalmente porque o ambiente local de homologação tem componentes desabilitados por limitação de recursos.
