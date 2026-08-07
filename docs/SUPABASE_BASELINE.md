# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo.

Os arquivos em `supabase/migration-history/prebaseline-local/` e `supabase/migration-history/substituted-local/` são evidência histórica e não fazem parte da sequência executável.

## Reconciliação de 2026-08-07

O histórico remoto de homologação `irszgnkzqseljowckrgz` continha 21 versões quando foi reconciliado. A pasta `supabase/migrations/` foi alinhada sem alterar SQL de migrations aplicadas e sem modificar diretamente `supabase_migrations.schema_migrations`.

Depois da reconciliação, três funcionalidades acrescentaram novas migrations canônicas:

- `20260807044250_add_appointment_commission_ledger_and_financial_reports.sql`: ledger de comissão, repasses e relatório financeiro inicial;
- `20260807070808_add_customer_account_and_complete_management_reports.sql`: perfil de cliente autenticado e relatório gerencial completo;
- `20260807070958_fix_management_report_service_revenue_share.sql`: correção separada da participação de receita por serviço. A migration anterior já estava registrada quando o erro de execução foi detectado e, portanto, não foi reescrita.

O histórico remoto passou a **24 versões**.

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

Alguns nomes contêm um segundo timestamp porque a primeira parte é a versão realmente registrada pelo Supabase e a segunda preserva o nome histórico passado ao `apply_migration`.

## Histórico remoto confirmado em 2026-08-07

| Versão | Nome remoto |
|---|---|
| `20260801001539` | `baseline_remote_schema` |
| `20260803044908` | `add_barbershop_image_storage` |
| `20260803045033` | `harden_barbershop_image_access` |
| `20260803071307` | `add_initial_registration_details` |
| `20260803195045` | `fix_barbershop_image_upload_policy` |
| `20260803222030` | `20260803205726_install_customer_crm_booking` |
| `20260803224530` | `20260803230000_secure_public_catalog_and_internal_trigger` |
| `20260804013607` | `20260803230000_optimize_booking_intervals_10min` |
| `20260804043338` | `add_team_invitations` |
| `20260806040824` | `20260804050000_add_professional_commission_rate` |
| `20260806040831` | `20260804060000_isolate_professional_commission` |
| `20260806040839` | `20260804070000_harden_professional_commission_security` |
| `20260806051055` | `20260806050000_revoke_anon_commission_rpc_execute` |
| `20260807015209` | `fix_barbershop_image_delete_policy` |
| `20260807015637` | `harden_team_invitations_table_privileges` |
| `20260807020013` | `harden_team_invitation_rpc_privileges` |
| `20260807020457` | `harden_public_invitation_details` |
| `20260807022443` | `implement_role_permission_matrix` |
| `20260807022720` | `preserve_safe_manager_profile_updates` |
| `20260807025705` | `optimize_rls_and_foreign_key_indexes` |
| `20260807030613` | `allow_barber_self_schedule_management` |
| `20260807044250` | `add_appointment_commission_ledger_and_financial_reports` |
| `20260807070808` | `add_customer_account_and_complete_management_reports` |
| `20260807070958` | `fix_management_report_service_revenue_share` |

## Novas RPCs de cliente e relatórios

### `save_my_customer_profile(text,text)`

- exige `auth.uid()`;
- valida nome e celular/WhatsApp;
- normaliza o telefone;
- usa o e-mail de `auth.users`;
- cria/atualiza somente o perfil associado ao próprio `auth_user_id`;
- `anon` e `PUBLIC` não possuem `EXECUTE`; `authenticated` possui acesso porque a função valida a identidade dentro do banco.

### `get_barbershop_management_report(uuid,date,date,uuid)`

- exige autenticação;
- aceita somente `owner` ou `manager` da barbearia solicitada;
- restringe a consulta a no máximo 367 dias;
- valida o profissional contra o tenant;
- retorna agenda/status, faturamento/ticket, comissão, clientes novos/recorrentes/reagendados, desempenho de profissionais, ocupação, serviços, clientes, cancelamentos e detalhamento de atendimentos.

A taxa de ocupação usa minutos reservados divididos por minutos efetivamente disponíveis, considerando horários da barbearia/profissional, pausas recorrentes e bloqueios pontuais.

## Validações remotas de 2026-08-07

Foram executados cenários transacionais no Supabase de homologação:

- owner recebeu JSON gerencial válido com arrays de profissionais, serviços, clientes e agendamentos;
- barber foi bloqueado com `Sem permissão para consultar os relatórios desta barbearia.`;
- a disponibilidade futura de profissionais produziu `available_minutes` coerentes para o cálculo de ocupação;
- `save_my_customer_profile` aceitou nome + WhatsApp válido e normalizou `(11) 99999-8888` para `11999998888`;
- telefone inválido foi rejeitado;
- as escritas de teste foram executadas dentro de transações com `ROLLBACK`, sem persistência de cliente fictício.

A primeira execução do relatório revelou uma expressão inválida de janela dentro de `jsonb_agg` no cálculo de participação de receita. Como a migration 23 já constava no histórico remoto, foi aplicada a migration 24 corretiva em vez de editar a migration existente.

## Advisors após as novas migrations

O Performance Advisor não introduziu alertas de schema novos além de índices ainda sem uso em homologação.

O Security Advisor continua exibindo:

- INFO `RLS Enabled No Policy` nas tabelas financeiras que deliberadamente não permitem acesso direto da aplicação;
- warnings genéricos de RPCs `SECURITY DEFINER` executáveis por `authenticated`. As RPCs administrativas relevantes validam `auth.uid()`, papel e tenant; as RPCs de perfil validam que o usuário altera apenas o próprio cadastro; `anon` permanece revogado nas novas RPCs;
- warning independente de `Leaked Password Protection Disabled` no Auth, pendência de configuração da plataforma.

Referências do Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Regras para migrations

- Não alterar migrations já aplicadas.
- Não manipular diretamente `supabase_migrations.schema_migrations`.
- Não usar `migration repair`, `db push` ou reset para mascarar divergência.
- Consultar o histórico remoto antes de novas aplicações.
- Novas mudanças de schema devem ser migrations novas e validadas.
- Conteúdo em `migration-history/` é somente histórico.

## Replay local

A reconciliação garante ordem/versionamento canônicos, mas ainda não equivale a uma prova completa de `supabase db reset --local` das 24 migrations. O replay integral deve ser testado em ambiente descartável. Existe uma pendência conhecida do Docker/Supabase local, que já ficou preso na inicialização de porta/processo; isso deve ser tratado separadamente sem tocar no remoto de homologação.
