# Baseline Supabase e migrations

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`. Como o remoto não possuía registros em `supabase_migrations.schema_migrations`, `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro baseline ativo. Ele representa o schema, RLS, agenda e auditoria existentes naquele momento.

Os arquivos em `supabase/migration-history/prebaseline-local/` são evidência histórica preservada. Não fazem parte da sequência executável e não devem ser movidos ou aplicados depois do baseline.

## Sequência executável

1. `20260801001539_baseline_remote_schema.sql` — baseline remoto.
2. `20260802180056_customer_crm_vertical_slice.sql` — CRM isolado por tenant, consentimentos e histórico.
3. `20260803015008_fix_customer_phone_normalization.sql` — correção da normalização de telefone do cliente.
4. `20260803044908_add_barbershop_image_storage.sql` — bucket e regras iniciais da foto pública.
5. `20260803045033_harden_barbershop_image_access.sql` — endurecimento de atualização de foto e acesso ao Storage.
6. `20260803071307_add_initial_registration_details.sql` — dados do cadastro inicial e bloqueio de liberação do painel até a configuração mínima.
7. `20260803195045_fix_barbershop_image_upload_policy.sql` — correção da policy de upload para o prefixo da própria barbearia.
8. `20260803222030_install_customer_crm_booking.sql` — CRM transacional e agendamento autenticado por cliente, com consentimentos, histórico, conflito de horário e isolamento RLS.
9. `20260803224530_secure_public_catalog_and_internal_trigger.sql` — interface mínima do catálogo público para `anon` e restrição de execução da função interna de sincronização de cliente.
10. `20260804013607_optimize_booking_intervals_10min.sql` — geração de disponibilidade com inícios a cada 10 minutos, duração exata pela soma dos serviços selecionados e validação de 10 minutos no gatilho de agendamento mantendo a proteção GiST contra sobreposição.
11. `20260804020000_add_team_invitations.sql` — tabela `public.team_invitations`, constraints de papel/profissional, RLS e RPCs `create_team_invitation`, `get_invitation_details`, `accept_team_invitation` e `revoke_team_invitation`. Aplicada e homologada no Supabase de homologação (`irszgnkzqseljowckrgz`).
12. `20260804050000_add_professional_commission_rate.sql` — implementação inicial; adicionou a coluna em `professionals` e criou a versão inicial da RPC; posteriormente substituída pelas correções seguintes (não representa o desenho final).
13. `20260804060000_isolate_professional_commission.sql` — migrou a comissão para a tabela privada `public.professional_commission_settings`, removeu a coluna de `professionals`, criou o primeiro isolamento e removeu a policy ampla de manager.
14. `20260804070000_harden_professional_commission_security.sql` — removeu a assinatura antiga, eliminou duplicidade de tenant da tabela financeira, revogou acesso direto de leitura/escrita para roles do navegador (`anon`, `authenticated`, `PUBLIC`), consolidou as RPCs `get_professional_commission_rates` e `set_professional_commission_rate` com bloqueio transacional `FOR UPDATE` e definiu o modelo final de autorização.
15. `20260806050000_revoke_anon_commission_rpc_execute.sql` — revogou explicitamente o privilégio `EXECUTE` do papel `anon` nas duas RPCs de comissão, garantindo concessão exclusiva para `authenticated`. Aplicada no Supabase remoto de homologação (`irszgnkzqseljowckrgz`) em 2026-08-06 (versão registrada `20260806051055`) e validada tecnicamente pelo agente.

As quatro migrations de comissão (`20260804050000_add_professional_commission_rate.sql`, `20260804060000_isolate_professional_commission.sql`, `20260804070000_harden_professional_commission_security.sql` e `20260806050000_revoke_anon_commission_rpc_execute.sql`) foram aplicadas sequencialmente no Supabase remoto de homologação (`irszgnkzqseljowckrgz`) e validadas tecnicamente com sucesso pelo agente. O banco de produção permanece inalterado.


Migrations posteriores não substituem o baseline. A situação de aplicação de cada uma em qualquer ambiente remoto deve ser confirmada por operação somente-leitura antes de qualquer mudança. Não execute `db push`, `migration repair` ou reset apenas para atualizar documentação.

## Validação local conhecida

A reconstrução foi validada aplicando o SQL versionado do baseline diretamente no PostgreSQL local executado em Docker. Schema, RLS, policies, funções, triggers, índices e constraints foram criados; testes transacionais de isolamento e regras de agenda foram executados e os dados de teste descartados.

Há uma pendência do ambiente local: `supabase db reset --local` pode ficar preso durante a inicialização de porta/processo. Isso não altera a validade do baseline e deve ser investigado separadamente antes de depender desse comando em automações.
