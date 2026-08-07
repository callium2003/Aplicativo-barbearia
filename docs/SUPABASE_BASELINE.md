# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo. Ele representa o schema, RLS, agenda e auditoria existentes naquele momento.

Os arquivos em `supabase/migration-history/prebaseline-local/` são evidência histórica anterior ao baseline. Os arquivos em `supabase/migration-history/substituted-local/` preservam migrations locais posteriores que foram substituídas por uma migration consolidada registrada no remoto. Nenhum desses diretórios históricos faz parte da sequência executável.

## Reconciliação de 2026-08-07

O histórico remoto de homologação do projeto `irszgnkzqseljowckrgz` foi consultado em modo somente leitura e contém 21 versões. A pasta `supabase/migrations/` foi alinhada a essas versões sem alterar o conteúdo SQL das migrations já aplicadas e sem modificar `supabase_migrations.schema_migrations`.

A reconciliação corrigiu apenas o versionamento local:

- `20260802180056_customer_crm_vertical_slice.sql` e `20260803015008_fix_customer_phone_normalization.sql` foram retirados da sequência executável e preservados em `supabase/migration-history/substituted-local/`, pois nunca foram registrados como versões remotas independentes;
- a migration CRM consolidada continua sendo a versão remota `20260803222030`;
- migrations de catálogo, intervalos, convites e comissão que haviam sido aplicadas remotamente sob versões posteriores foram renomeadas localmente para usar exatamente as versões registradas pelo Supabase;
- nenhuma migration aplicada teve seu SQL reescrito.

## Sequência executável canônica

A sequência em `supabase/migrations/` deve corresponder ao histórico remoto abaixo:

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

Alguns nomes acima contêm um segundo timestamp. Isso é intencional: a primeira parte do nome do arquivo é a **versão realmente registrada pelo Supabase**; a segunda parte preserva o nome passado ao `apply_migration` quando aquela mudança foi aplicada.

## Histórico remoto confirmado em 2026-08-07

| Versão remota | Nome registrado no Supabase |
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

## Regras de segurança para migrations

- Não altere migrations já aplicadas no remoto.
- Não manipule diretamente `supabase_migrations.schema_migrations`.
- Não use `migration repair`, `db push` ou reset para mascarar divergência de histórico.
- Antes de aplicar uma nova migration, confirme o histórico remoto em modo somente leitura.
- Toda mudança futura de schema deve ser uma migration nova, com testes de RLS/isolamento quando aplicável.
- O conteúdo em `migration-history/` é somente histórico e nunca deve entrar no replay executável.

## Validação local conhecida

O baseline original já havia sido validado aplicando seu SQL diretamente em PostgreSQL local executado em Docker. Schema, RLS, policies, funções, triggers, índices e constraints foram criados; testes transacionais de isolamento e regras de agenda foram executados e os dados de teste descartados.

A reconciliação de 2026-08-07 resolve a divergência de **versões/ordem dos arquivos** em relação ao histórico remoto, mas não deve ser confundida com uma prova completa de `supabase db reset --local` de todas as 21 migrations. Essa prova de replay limpo continua sendo uma validação separada e só deve ser executada em ambiente descartável, sem tocar no remoto de homologação.

Há uma pendência conhecida do ambiente local: `supabase db reset --local` já ficou preso durante a inicialização de porta/processo. Esse problema de Docker/Supabase local deve ser tratado separadamente antes de depender do comando em automações.
