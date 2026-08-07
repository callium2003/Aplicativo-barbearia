# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo. Ele representa o schema, RLS, agenda e auditoria existentes naquele momento.

Os arquivos em `supabase/migration-history/prebaseline-local/` são evidência histórica preservada. Não fazem parte da sequência executável e não devem ser movidos ou aplicados depois do baseline.

> [!WARNING]
> **ESTADO DE CONGELAMENTO E RECONCILIAÇÃO (06/08/2026):**
> A sequência local de migrations encontra-se sob processo de reconciliação. Não execute `supabase db push`, `supabase migration repair` ou `supabase db reset` no ambiente remoto. Nenhuma decisão de reparo manual foi tomada até o momento. A próxima tarefa autorizada será estritamente produzir o mapa formal de reconciliação das migrations sem alterar arquivos ou o banco remoto.

## Achados de reconciliação

1. **Sobreposição de DDL de CRM:** A migration `20260803222030_install_customer_crm_booking.sql` recria tipos, tabelas (`customers`, `barbershop_customers`, `customer_consents`), colunas, funções e RLS policies já introduzidas pelas migrations `20260802180056` e `20260803015008`. Uma execução limpa do zero falha com erro de objetos duplicados.
2. **Divergência entre arquivos locais e histórico remoto:** Diversas migrations locais foram aplicadas no Supabase remoto com marcas de tempo (timestamps) diferentes nos nomes dos arquivos registrados em `schema_migrations`.
   - Exemplo 1: Local `20260804020000_add_team_invitations.sql` vs Remoto `20260804043338 add_team_invitations`.
   - Exemplo 2: Local `20260804050000_add_professional_commission_rate.sql` vs Remoto `20260806040824 20260804050000_add_professional_commission_rate`.
   - Exemplo 3: Local `20260806050000_revoke_anon_commission_rpc_execute.sql` vs Remoto `20260806051055 20260806050000_revoke_anon_commission_rpc_execute`.

## Sequência local atual (Sob análise)

1. `20260801001539_baseline_remote_schema.sql` — baseline remoto.
2. `20260802180056_customer_crm_vertical_slice.sql` — CRM isolado por tenant, consentimentos e histórico.
3. `20260803015008_fix_customer_phone_normalization.sql` — correção da normalização de telefone do cliente.
4. `20260803044908_add_barbershop_image_storage.sql` — bucket e regras iniciais da foto pública.
5. `20260803045033_harden_barbershop_image_access.sql` — endurecimento de atualização de foto e acesso ao Storage.
6. `20260803071307_add_initial_registration_details.sql` — dados do cadastro inicial e bloqueio de liberação do painel até a configuração mínima.
7. `20260803195045_fix_barbershop_image_upload_policy.sql` — correção da policy de upload para o prefixo da própria barbearia.
8. `20260803222030_install_customer_crm_booking.sql` — CRM transacional e agendamento autenticado por cliente, com consentimentos, histórico, conflito de horário e isolamento RLS (Contém duplicação de DDL).
9. `20260803224530_secure_public_catalog_and_internal_trigger.sql` — interface mínima do catálogo público para `anon` e restrição de execução da função interna de sincronização de cliente.
10. `20260804013607_optimize_booking_intervals_10min.sql` — geração de disponibilidade com inícios a cada 10 minutos, duração exata pela soma dos serviços selecionados e validação de 10 minutos no gatilho de agendamento mantendo a proteção GiST contra sobreposição.
11. `20260804020000_add_team_invitations.sql` — tabela `public.team_invitations`, constraints de papel/profissional, RLS e RPCs de convite.
12. `20260804050000_add_professional_commission_rate.sql` — implementação inicial de comissão (substituída por migrations posteriores).
13. `20260804060000_isolate_professional_commission.sql` — migração para tabela privada `public.professional_commission_settings`.
14. `20260804070000_harden_professional_commission_security.sql` — consolidação de segurança, revogação de acesso direto e bloqueio `FOR UPDATE`.
15. `20260806050000_revoke_anon_commission_rpc_execute.sql` — revogação explícita de `EXECUTE` de `anon` nas RPCs financeiras.

## Status da Reconciliação (Etapa 2A Concluída)

O mapeamento somente leitura de todas as migrations locais e remotas foi concluído e detalhado em:
👉 [docs/MIGRATION-RECONCILIATION-MAP-2026-08-06.md](file:///c:/Users/calli/OneDrive/Documentos/Aplicativo%20barbearia/pagina%20barbearia/work/barbeariasp-platform/docs/MIGRATION-RECONCILIATION-MAP-2026-08-06.md)

Nenhuma alteração de arquivo SQL foi realizada, nenhuma migration foi executada e nenhuma decisão da Etapa 2B foi aplicada nesta fase.
