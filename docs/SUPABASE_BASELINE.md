# Baseline Supabase

Em 2026-08-01, o schema remoto foi capturado pelo fluxo oficial `supabase db pull`.
O remoto não possuía registros em `supabase_migrations.schema_migrations`; por isso o
arquivo `supabase/migrations/20260801001539_baseline_remote_schema.sql` é o primeiro e
único baseline ativo. Ele representa o schema completo, incluindo as proteções de RLS,
agenda e auditoria existentes no remoto nesse momento.

Os arquivos em `supabase/migration-history/prebaseline-local/` são evidência histórica
preservada e não fazem parte da sequência executável. Não os mova nem execute após o
baseline: o estado deles já está incorporado ao baseline. A ordem histórica é:

1. `20260731192927_secure_saas_foundation.sql`
2. `20260731193020_complete_saas_security_foundation.sql`
3. `20260801001539_baseline_remote_schema.sql` (única migration ativa)

Migrations futuras devem receber novo timestamp em `supabase/migrations/` e ser testadas
contra uma reconstrução local Docker antes de qualquer envio ao remoto.

## Validação local

A reconstrução foi validada aplicando o SQL versionado do baseline diretamente no
PostgreSQL local executado em Docker. O schema, RLS, policies, funções, triggers,
índices e constraints foram criados com sucesso; os testes transacionais de isolamento
entre tenants e regras de agenda foram executados nesse banco e descartados ao final.

Há uma pendência restrita ao ambiente atual: o fluxo automatizado
`supabase db reset --local` fica preso durante a inicialização de porta/processo local.
Essa pendência não altera o baseline e deve ser investigada separadamente antes de
depender desse comando em automações locais.
