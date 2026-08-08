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
- `20260808102128_index_notification_foreign_keys.sql`: índices de apoio para as novas FKs de notificações, aplicados após o Performance Advisor apontar lacunas.

O histórico remoto passou a **26 versões**.

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

## Histórico remoto confirmado

As 24 versões anteriores permanecem inalteradas. Em 2026-08-08 foram adicionadas:

| Versão | Nome remoto |
|---|---|
| `20260808093323` | `add_notification_center_preferences_and_delivery_queue` |
| `20260808102128` | `index_notification_foreign_keys` |

Nenhuma migration aplicada foi reescrita e nenhum ajuste foi feito diretamente em `supabase_migrations.schema_migrations`.

## Cliente e relatórios

### `save_my_customer_profile(text,text)`

- exige `auth.uid()`;
- valida nome e celular/WhatsApp;
- normaliza o telefone;
- usa o e-mail de `auth.users`;
- cria/atualiza somente o perfil associado ao próprio `auth_user_id`;
- `anon` e `PUBLIC` não possuem `EXECUTE`.

### `get_barbershop_management_report(uuid,date,date,uuid)`

- exige autenticação;
- aceita somente `owner` ou `manager` da barbearia solicitada;
- restringe a consulta a no máximo 367 dias;
- valida o profissional contra o tenant;
- retorna agenda/status, faturamento/ticket, comissão, clientes novos/recorrentes/reagendados, desempenho de profissionais, ocupação, serviços, clientes, cancelamentos e detalhamento de atendimentos.

A taxa de ocupação usa minutos reservados divididos por minutos efetivamente disponíveis, considerando horários da barbearia/profissional, pausas recorrentes e bloqueios pontuais.

## Notificações — 2026-08-08

### Tabelas

- `user_notifications`: Central de Notificações dentro do produto. RLS permite a cada usuário somente ler e marcar como lidas as próprias notificações.
- `notification_preferences`: preferências por barbearia, usuário, evento e canal. Não possui acesso direto do navegador; leitura/escrita passam por RPCs autenticadas.
- `notification_outbox`: fila de e-mail existente foi ampliada para múltiplos eventos, deduplicação, usuário destinatário, processamento, tentativas e backoff.

### Eventos

- `new_appointment`;
- `appointment_confirmed`;
- `appointment_cancelled`;
- `appointment_rescheduled`;
- `appointment_reminder_24h`.

O trigger `private.queue_appointment_notifications()` reage a criação e alterações relevantes de `appointments` e delega para `private.dispatch_appointment_event(...)`. Dono e gerente recebem os eventos gerais; o barbeiro vinculado recebe os eventos do próprio profissional; o cliente autenticado entra na arquitetura de confirmação/alterações/lembrete.

### RPCs

- `get_my_notification_preferences(uuid)`: owner/manager/barber lê as próprias preferências apenas para barbearia à qual pertence;
- `save_my_notification_preference(uuid,text,boolean,boolean)`: altera apenas as preferências do próprio `auth.uid()`;
- `get_notification_delivery_monitor(uuid,integer)`: somente owner/manager do tenant;
- `enqueue_due_appointment_reminders(integer)`: somente `service_role`;
- `claim_notification_outbox(integer)`: somente `service_role`;
- `complete_notification_outbox(uuid,boolean,text)`: somente `service_role`.

`user_notifications` foi incluída em `supabase_realtime` para atualizar o sino sem recarregar a página.

### Worker de e-mail

`scripts/process-notifications.mjs` está versionado para o ambiente hospedado. Ele:

1. enfileira lembretes de 24h vencendo na janela prevista;
2. reivindica mensagens pendentes com `FOR UPDATE SKIP LOCKED`;
3. envia pelo Resend;
4. registra `sent` ou `failed`;
5. usa backoff progressivo para novas tentativas.

A ativação real exige `SUPABASE_URL` (ou `VITE_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL` no servidor. Nenhum segredo está versionado no GitHub.

## Validações remotas

Foram executados cenários transacionais no Supabase de homologação:

- owner recebeu as cinco preferências padrão e conseguiu habilitar e-mail dentro de transação revertida;
- owner viu somente notificações permitidas por RLS e conseguiu acessar o monitor de entregas;
- barber recebeu as cinco preferências padrão, sem acesso direto a notificações de outros usuários;
- barber foi bloqueado do monitor de entregas administrativas;
- dispatch de evento produziu notificações deduplicadas;
- nenhuma preferência de teste ficou persistida por causa do `ROLLBACK`.

O Performance Advisor inicialmente apontou FKs novas sem índices. A migration `20260808102128` corrigiu essas lacunas. Após ela, sobraram apenas `unused_index` INFO, esperado em homologação com baixo volume.

## Advisors

O Security Advisor continua exibindo:

- INFO `RLS Enabled No Policy` em `notification_preferences`, `appointment_commissions` e `professional_commission_settings`; nessas tabelas o acesso direto do navegador é deliberadamente revogado e a operação ocorre por RPC/servidor;
- warnings genéricos de RPCs `SECURITY DEFINER` executáveis por `authenticated`; as RPCs novas de notificações validam `auth.uid()`, vínculo com a barbearia e, para o monitor, papel owner/manager; as RPCs do worker são exclusivas de `service_role`;
- warning independente de `Leaked Password Protection Disabled` no Auth.

Referências do Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy, https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Regras para migrations

- Não alterar migrations já aplicadas.
- Não manipular diretamente `supabase_migrations.schema_migrations`.
- Não usar `migration repair`, `db push` ou reset para mascarar divergência.
- Consultar o histórico remoto antes de novas aplicações.
- Novas mudanças de schema devem ser migrations novas e validadas.
- Conteúdo em `migration-history/` é somente histórico.

## Replay local

A reconciliação garante ordem/versionamento canônicos, mas ainda não equivale a uma prova completa de `supabase db reset --local` das 26 migrations. O replay integral deve ser testado em ambiente descartável. Existe uma pendência conhecida do Docker/Supabase local, que deve ser tratada separadamente sem tocar no remoto de homologação.
