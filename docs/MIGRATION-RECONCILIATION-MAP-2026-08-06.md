# Mapa de Reconciliação das Migrations (06/08/2026) — Etapa 2A

# 1. Objetivo

Este documento apresenta o mapeamento completo, rastreável e baseado em evidências da cadeia de migrations do projeto **BarbeariaSP** (repositório local e projeto Supabase remoto `irszgnkzqseljowckrgz`). 

O objetivo exclusivo da **Etapa 2A** é realizar a análise estática e histórica do schema, identificando sobreposições de DDL, divergências de versão/timestamp entre arquivos locais e histórico remoto, riscos de replay em bancos vazios e classificações provisórias para cada migration. **Nenhum arquivo SQL foi alterado, nenhuma migration foi executada e nenhum comando mutável foi aplicado ao banco de dados.**

---

# 2. Escopo

A análise abrangeu:
1. 15 arquivos de migrations executáveis em `supabase/migrations/*.sql`;
2. 2 arquivos de migrations pré-baseline em `supabase/migration-history/prebaseline-local/`;
3. Histórico Git dos arquivos DDL (`git log --date=iso --name-status`);
4. Registros de versão de migrations no Supabase remoto (`supabase_migrations.schema_migrations`);
5. Metadados do catálogo PostgreSQL (`pg_catalog` e `information_schema`);
6. Relatórios prévios de auditoria ([AUDIT-PROFESSIONAL-COMMISSION-SECURITY.md](AUDIT-PROFESSIONAL-COMMISSION-SECURITY.md) e [AUDIT-REMEDIATION-PLAN-2026-08-06.md](AUDIT-REMEDIATION-PLAN-2026-08-06.md)).

---

# 3. Regras e limitações

- **Modo estritamente somente leitura (READ-ONLY):** Proibida qualquer operação DDL/DML mutável (`CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`, `supabase db push`, `migration repair`, `db reset`).
- **Nenhum descarte ou alteração de código SQL:** Arquivos locais e remotos permanecem intocados.
- **Classificações estritamente provisórias:** As classificações propostas são hipóteses técnicas sujeitas à aprovação humana e validação em ambiente descartável na futura Etapa 2B.
- **Preservação de privacidade:** Não foram consultadas nem registradas linhas com dados pessoais ou operacionais.

---

# 4. Estado inicial do repositório

- **Diretório local:** `C:\Users\calli\OneDrive\Documentos\Aplicativo barbearia\pagina barbearia\work\barbeariasp-platform`
- **Repositório remoto Git:** `callium2003/Aplicativo-barbearia` (privado)
- **Branch ativa:** `docs/audit-remediation-plan-2026-08-06`
- **HEAD inicial:** `ccbc755987760345715251f829c14e6fce2f4f1b` (`docs: correct migration reconciliation evidence`)
- **Status do Worktree:** Limpo (`nothing to commit, working tree clean`).

---

# 5. Ambiente Supabase analisado

- **Project Ref:** `irszgnkzqseljowckrgz`
- **Nome do Projeto:** `Agendamento Barbearias` (Homologação)
- **Estado do Schema Remoto:** Capturado inicialmente via `db pull` em 01/08/2026 (gerando o baseline `20260801001539`). As migrations posteriores de CRM, convites, Storage e comissão constam como aplicadas no ambiente remoto de homologação entre 02/08/2026 e 06/08/2026.

---

# 6. Metodologia

1. **Cálculo de hashes e metadados:** Extração automatizada de SHA-256 (64 caracteres), nomes e tamanhos em bytes via PowerShell `Get-FileHash`.
2. **Rastreamento Git:** Inspeção de commits de introdução, datas, autorias e renomeações em todo o histórico do Git (`git log --all --follow`).
3. **Inspeção DDL por Objetos:** Mapeamento de `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE` e funções RLS em cada migration.
4. **Matriz de Cruzamento Local × Remoto:** Comparação entre o timestamp/nome do arquivo local e a versão registrada na tabela `schema_migrations` do Supabase remoto.

---

# 7. Inventário completo das migrations locais

## Tabela Principal das Migrations Executáveis (15 Arquivos)

| Ordem | Arquivo local | Tamanho (Bytes) | Hash SHA-256 Completo (64 caracteres) | Commit Introdução | Data Commit |
| ----: | ------------- | --------------: | ------------------------------------- | ----------------- | ----------- |
| 1 | `20260801001539_baseline_remote_schema.sql` | 59.792 | `ACC7AFE21DB1034C700E29A8DFB7CDAEC68A5FC7A06FE91B1E575B93F0B50C5E` | `1fd88a6` | 2026-07-31 21:48:02 -0300 |
| 2 | `20260802180056_customer_crm_vertical_slice.sql` | 17.471 | `CD012B9269160EA8AF160E82EDB36156504738A48ECB93CB09B26AB8761CE59D` | `34fa346` | 2026-08-02 21:35:01 -0300 |
| 3 | `20260803015008_fix_customer_phone_normalization.sql` | 2.306 | `3E8E05BB25880003949ACAA87F9F55030BEFE9CF04A9D1984FD8727835ABE6C8` | `69e6a68` | 2026-08-03 00:29:30 -0300 |
| 4 | `20260803044908_add_barbershop_image_storage.sql` | 2.732 | `8CFA10CD7F1514B008C1FCE994EFDF93AA0D82D2B2A3B98165B873B55B07A09C` | `563c3e7` | 2026-08-03 17:08:11 -0300 |
| 5 | `20260803045033_harden_barbershop_image_access.sql` | 1.527 | `5D31E45192E07C59F94ECA3CA767069CE70BF72AEF1058342D08ABF703F24F49` | `563c3e7` | 2026-08-03 17:08:11 -0300 |
| 6 | `20260803071307_add_initial_registration_details.sql` | 2.313 | `0F715440E2830648A2807577DC657EBF3732EDF58CCFA407F7FFC578398519EE` | `563c3e7` | 2026-08-03 17:08:11 -0300 |
| 7 | `20260803195045_fix_barbershop_image_upload_policy.sql` | 850 | `E3D3346E530BB9FCE9F956A73F650B76E0CF538A50C4B1A3BBE7BA8F18D318DA` | `563c3e7` | 2026-08-03 17:08:11 -0300 |
| 8 | `20260803222030_install_customer_crm_booking.sql` | 19.081 | `ED57252B698C6F4CEB3A5648D46CA64F898E05F1E462DB7478D5991CDAB10795` | `81ba9cb` | 2026-08-03 20:18:19 -0300 |
| 9 | `20260803224530_secure_public_catalog_and_internal_trigger.sql` | 5.054 | `869E88FA61D535C2B72A96EAC6D01A07A6DC1DA140CA5DAA0F7F0BA32D974914` | `81ba9cb` | 2026-08-03 20:18:19 -0300 |
| 10 | `20260804013607_optimize_booking_intervals_10min.sql` | 8.162 | `01928DA6BC4FA6A54CAE1241FE40349B2893EF476F2844C3B72B6ED4097B25AF` | `d0efef4` | 2026-08-03 22:14:20 -0300 |
| 11 | `20260804020000_add_team_invitations.sql` | 14.085 | `13E777C4B4FD5BB7086AFED0CB07A60BF95331F653C591A13145CE3373F0ECBE` | `7dbf392` | 2026-08-04 00:47:58 -0300 |
| 12 | `20260804050000_add_professional_commission_rate.sql` | 3.091 | `9C2D389C1FF4AC9493612C91B6CBFB711832AA529542572227DC78B0EC7732CC` | `b4eb76f` | 2026-08-04 01:58:59 -0300 |
| 13 | `20260804060000_isolate_professional_commission.sql` | 7.084 | `FAE8E2C5198739FA0D3690B997A941CA85C796125150FDD399ABF7F5D8FA7A5B` | `b1f53a5` | 2026-08-04 15:28:31 -0300 |
| 14 | `20260804070000_harden_professional_commission_security.sql` | 5.472 | `2ADAF81D00E7988F26218707E3DEAEFB2CA381F775F04451A6AABF3B07A82E99` | `79bfcf8` | 2026-08-04 21:08:59 -0300 |
| 15 | `20260806050000_revoke_anon_commission_rpc_execute.sql` | 825 | `BED4049F153FF1FA1909F599595091692CE5AE52E128BE639C5C93C149D730E7` | `2364003` | 2026-08-06 02:13:48 -0300 |

*Nota sobre a migration 10:* Criada originalmente como `20260803230000_optimize_booking_intervals_10min.sql` no commit `d0efef4` e renomeada para `20260804013607_optimize_booking_intervals_10min.sql` no commit `6583744`.

## Detalhamento dos 14 Campos Exigidos por Migration

A seguir está o detalhamento, campo por campo, das 15 migrations executáveis:

1. **`20260801001539_baseline_remote_schema.sql`**
   - Versão local: `20260801001539`
   - Objetivo: Estabelecer a baseline do schema remoto capturado via `db pull` em 01/08/2026.
   - Objetos afetados: Extensions (`pgcrypto`, `pg_trgm`, `btree_gist`), Tabelas (`barbershops`, `professionals`, `services`, `business_hours`, `appointments`, `audit_logs`), Types (`appointment_status`, `team_role`), Funções, Triggers e RLS Policies.
   - Operações principais: `CREATE EXTENSION`, `CREATE TYPE`, `CREATE TABLE`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE POLICY`, `GRANT`.
   - Dependências: Nenhuma (é a baseline).
   - Idempotência: Contém `CREATE TABLE`, `CREATE TYPE` diretos (sem defensivas).
   - Risco de replay: Baixo se for o primeiro SQL em banco limpo.
   - Sobreposição: Nenhuma.
   - Registro remoto: `20260801001539_baseline_remote_schema` (EXATA POR IDENTIDADE DO REGISTRO).
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CANÔNICA`.
   - Confiança: ALTA.
   - Observações: Representa o marco zero oficial da sequência.

2. **`20260802180056_customer_crm_vertical_slice.sql`**
   - Versão local: `20260802180056`
   - Objetivo: Introduzir a estrutura inicial de CRM, consentimentos e histórico de clientes.
   - Objetos afetados: Type `customer_consent_type`, Tabelas `customers`, `barbershop_customers`, `customer_consents`, Coluna `appointments.customer_global_id`, View `barbershop_customer_history`, RPCs de agendamento e consentimento.
   - Operações principais: `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE`, `CREATE VIEW`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE POLICY`, `GRANT`.
   - Dependências: `20260801001539_baseline_remote_schema.sql`.
   - Idempotência: `CREATE TYPE` e `CREATE TABLE` sem defensivas `IF NOT EXISTS`.
   - Risco de replay: Alto (recriado por `20260803222030`).
   - Sobreposição: Sobreposta totalmente pela migration `20260803222030`.
   - Registro remoto: `20260802180056_customer_crm_vertical_slice`.
   - Estado do objeto remoto: Presente (versão mais recente de DDL).
   - Classificação proposta: `SUBSTITUÍDA` (candidata a ser retirada da sequência executável na Etapa 2B).
   - Confiança: ALTA.
   - Observações: Conteúdo DDL absorvido pela migration consolidada `20260803222030`.

3. **`20260803015008_fix_customer_phone_normalization.sql`**
   - Versão local: `20260803015008`
   - Objetivo: Corrigir a expressão regular usada na sincronização transacional do cliente, recalcular telefones existentes e restaurar os privilégios necessários ao funcionamento da view com `security_invoker`.
   - Objetos afetados: `public.sync_customer_for_appointment()`, `public.customers.phone_normalized`, privilégios de leitura das tabelas usadas pela view `security_invoker` (`appointment_services`, `appointments`, `customers`, `barbershop_customers`, `customer_consents`).
   - Operações principais: `CREATE OR REPLACE FUNCTION public.sync_customer_for_appointment()`, `REVOKE ALL` da função para `PUBLIC`, `GRANT SELECT` em `appointment_services` para `authenticated`, `GRANT SELECT` em tabelas CRM e de agendamento para `anon`, `UPDATE public.customers` para recalcular `phone_normalized`.
   - Dependências: `20260802180056_customer_crm_vertical_slice.sql`.
   - Idempotência: `CREATE OR REPLACE FUNCTION`.
   - Risco de replay: Baixo para funções, mas desnecessária se `20260802180056` for removida.
   - Sobreposição: Absorvida funcionalmente por `20260803222030`.
   - Registro remoto: `20260803015008_fix_customer_phone_normalization`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `SUBSTITUÍDA`.
   - Confiança: ALTA.
   - Observações: Absorvida pela versão consolidada do CRM.

4. **`20260803044908_add_barbershop_image_storage.sql`**
   - Versão local: `20260803044908`
   - Objetivo: Criar bucket `barbershop-images` e políticas de Storage.
   - Objetos afetados: `storage.buckets`, `storage.objects` (policies INSERT, SELECT, DELETE).
   - Operações principais: `INSERT INTO storage.buckets`, `CREATE POLICY`.
   - Dependências: Schema de Storage Supabase.
   - Idempotência: Usa `ON CONFLICT DO NOTHING` para o bucket.
   - Risco de replay: Baixo.
   - Sobreposição: Ajustada por `03045033` e `03195045`.
   - Registro remoto: `20260803044908_add_barbershop_image_storage`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CANÔNICA`.
   - Confiança: ALTA.
   - Observações: Define a base do Storage de fotos.

5. **`20260803045033_harden_barbershop_image_access.sql`**
   - Versão local: `20260803045033`
   - Objetivo: Endurecer acesso à foto da barbearia e criar RPC de atualização de URL.
   - Objetos afetados: RPC `public.set_barbershop_photo_url(uuid, text)`.
   - Operações principais: `CREATE OR REPLACE FUNCTION`, `GRANT`.
   - Dependências: `20260803044908_add_barbershop_image_storage.sql`.
   - Idempotência: `CREATE OR REPLACE FUNCTION`.
   - Risco de replay: Baixo.
   - Sobreposição: Nenhuma.
   - Registro remoto: `20260803045033_harden_barbershop_image_access`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CORRETIVA`.
   - Confiança: ALTA.
   - Observações: Endurece a escrita da foto via RPC.

6. **`20260803071307_add_initial_registration_details.sql`**
   - Versão local: `20260803071307`
   - Objetivo: Adicionar detalhes do cadastro inicial e RPC de conclusão de onboarding.
   - Objetos afetados: Coluna `barbershops.initial_registration_completed`, Tabela `public.barbershop_registration_details`, RPC `public.complete_initial_registration(...)`.
   - Operações principais: `ALTER TABLE ADD COLUMN`, `CREATE TABLE`, `CREATE FUNCTION`, `CREATE POLICY`, `GRANT`.
   - Dependências: `20260801001539_baseline_remote_schema.sql`.
   - Idempotência: Contém `CREATE TABLE IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS`.
   - Risco de replay: Baixo.
   - Sobreposição: Nenhuma.
   - Registro remoto: `20260803071307_add_initial_registration_details`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CANÔNICA`.
   - Confiança: ALTA.
   - Observações: Essencial para a trava de onboarding do painel.

7. **`20260803195045_fix_barbershop_image_upload_policy.sql`**
   - Versão local: `20260803195045`
   - Objetivo: Corrigir a policy de upload do Storage para o prefixo do próprio tenant.
   - Objetos afetados: `storage.objects` INSERT policy.
   - Operações principais: `DROP POLICY IF EXISTS`, `CREATE POLICY`.
   - Dependências: `20260803044908_add_barbershop_image_storage.sql`.
   - Idempotência: `DROP POLICY IF EXISTS`.
   - Risco de replay: Baixo.
   - Sobreposição: Ajusta a policy criada em `03044908`.
   - Registro remoto: `20260803195045_fix_barbershop_image_upload_policy`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CORRETIVA`.
   - Confiança: ALTA.
   - Observações: Corrige a inserção no bucket por tenant.

8. **`20260803222030_install_customer_crm_booking.sql`**
   - Versão local: `20260803222030`
   - Objetivo: Instalar a versão consolidada do CRM e agendamento autenticado.
   - Objetos afetados: Type `customer_consent_type`, Tabelas `customers`, `barbershop_customers`, `customer_consents`, Coluna `appointments.customer_global_id`, View `barbershop_customer_history`, RPC `book_customer_appointment(...)`.
   - Operações principais: `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE`, `CREATE VIEW`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE POLICY`, `GRANT`.
   - Dependências: `20260801001539_baseline_remote_schema.sql`.
   - Idempotência: Não possui `IF NOT EXISTS` nos `CREATE TABLE`/`CREATE TYPE`.
   - Risco de replay: Bloqueador se executada após `20260802180056`.
   - Sobreposição: Recria os objetos de `20260802180056` e `20260803015008`.
   - Registro remoto: `20260803222030_install_customer_crm_booking`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CANÔNICA`.
   - Confiança: ALTA.
   - Observações: Representa o CRM consolidado oficial.

9. **`20260803224530_secure_public_catalog_and_internal_trigger.sql`**
   - Versão local: `20260803224530`
   - Objetivo: Restringir exposição pública do catálogo e proteger a função interna de sincronização.
   - Objetos afetados: `public.sync_customer_for_appointment()`, `public.get_public_availability(text, date, uuid[])`, `public.public_barbershop_pages`, `public.public_barbershop_services`, privilégios anônimos das tabelas operacionais (`business_hours`, `professional_hours`, `professional_breaks`, `professional_time_blocks`, `team_members`).
   - Operações principais: `REVOKE EXECUTE`, `GRANT SELECT`, `GRANT SELECT (active) ON barbershops`, `CREATE OR REPLACE FUNCTION`, `REVOKE ALL FROM anon`.
   - Dependências: `20260803222030_install_customer_crm_booking.sql`.
   - Idempotência: `CREATE OR REPLACE FUNCTION`, `REVOKE`, `GRANT`.
   - Risco de replay: Baixo.
   - Sobreposição: Nenhuma.
   - Registro remoto: `20260803224530_secure_public_catalog_and_internal_trigger`.
   - Estado do objeto remoto: Presente.
   - Classificação proposta: `CORRETIVA`.
   - Confiança: ALTA.
   - Observações: Protege a superfície pública anônima.

10. **`20260804013607_optimize_booking_intervals_10min.sql`**
    - Versão local: `20260804013607`
    - Objetivo: Otimizar intervalos de agendamento para 10 minutos e validar duração exata por serviços.
    - Objetos afetados: RPC `get_public_availability`, `book_customer_appointment`, Constraint GiST `appointments_no_overlapping_slots`.
    - Operações principais: `CREATE OR REPLACE FUNCTION`, `ALTER TABLE`.
    - Dependências: `20260803222030_install_customer_crm_booking.sql`.
    - Idempotência: `CREATE OR REPLACE FUNCTION`.
    - Risco de replay: Baixo.
    - Sobreposição: Atualiza as RPCs de agendamento e disponibilidade.
    - Registro remoto: `20260804013607_optimize_booking_intervals_10min` (EXATA POR IDENTIDADE DO REGISTRO).
    - Estado do objeto remoto: Presente.
    - Classificação proposta: `CORRETIVA`.
    - Confiança: ALTA.
    - Observações: Ajusta a granularidade dos horários.

11. **`20260804020000_add_team_invitations.sql`**
    - Versão local: `20260804020000`
    - Objetivo: Criar sistema seguro de convites de equipe com tokens SHA-256.
    - Objetos afetados: Tabela `public.team_invitations`, RPCs `create_team_invitation`, `get_invitation_details`, `accept_team_invitation`, `revoke_team_invitation`.
    - Operações principais: `CREATE TABLE`, `CREATE POLICY`, `CREATE FUNCTION`, `GRANT`.
    - Dependências: `20260801001539_baseline_remote_schema.sql`.
    - Idempotência: `CREATE TABLE IF NOT EXISTS`.
    - Risco de replay: Baixo.
    - Sobreposição: Nenhuma.
    - Registro remoto: `20260804043338 add_team_invitations` (PROVÁVEL — TIMESTAMP DIVERGENTE - timestamp local `020000` vs remoto `043338`).
    - Estado do objeto remoto: Presente.
    - Classificação proposta: `CANÔNICA`.
    - Confiança: ALTA para a correspondência lógica, NÃO COMPROVADA BYTE A BYTE.
    - Observações: A finalidade, o nome lógico e os objetos remotos são compatíveis com o arquivo local, mas o timestamp registrado é diferente e o histórico remoto não contém hash do SQL. A correspondência é considerada provável, não exata.

12. **`20260804050000_add_professional_commission_rate.sql`**
    - Versão local: `20260804050000`
    - Objetivo: Adicionar coluna transitória de comissão em `professionals`.
    - Objetos afetados: Coluna `professionals.commission_rate_percent`, RPCs iniciais de comissão.
    - Operações principais: `ALTER TABLE ADD COLUMN`, `CREATE FUNCTION`.
    - Dependências: `20260801001539_baseline_remote_schema.sql`.
    - Idempotência: `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
    - Risco de replay: Médio (modelo transitório descartado pela migration seguinte).
    - Sobreposição: Coluna removida por `20260804060000`.
    - Registro remoto: `20260806040824 20260804050000_add_professional_commission_rate` (PROVÁVEL — PREFIX TIMESTAMP).
    - Estado do objeto remoto: A coluna foi removida posteriormente no remoto.
    - Classificação proposta: `PENDENTE DE DECISÃO`.
    - Confiança: ALTA.
    - Observações: Modelo transitório. Permanece uma dependência mecânica da migration `04060000` no SQL atual. Poderá ser retirada apenas se a cadeia de comissão for consolidada ou reescrita e validada em banco descartável.

13. **`20260804060000_isolate_professional_commission.sql`**
    - Versão local: `20260804060000`
    - Objetivo: Migrar a comissão para a tabela privada `professional_commission_settings` e remover a coluna de `professionals`.
    - Objetos afetados: Tabela privada `public.professional_commission_settings`, Coluna `professionals.commission_rate_percent` (DROP), RPCs `get_professional_commission_rates`, `set_professional_commission_rate`.
    - Operações principais: `CREATE TABLE`, `INSERT INTO`, `ALTER TABLE DROP COLUMN`, `CREATE OR REPLACE FUNCTION`.
    - Dependências: `20260804050000_add_professional_commission_rate.sql` (Lê a coluna `commission_rate_percent` antes de deletar).
    - Idempotência: `CREATE TABLE IF NOT EXISTS`.
    - Risco de replay: Alto se `04050000` não tiver sido executada previamente no SQL atual.
    - Sobreposição: Reorganizada e endurecida por `04070000`.
    - Registro remoto: AUSENTE REMOTAMENTE COMO REGISTRO INDIVIDUAL.
    - Estado do objeto remoto: Tabela `professional_commission_settings` existe no remoto.
    - Classificação proposta: `CANÔNICA`.
    - Confiança: MÉDIA.
    - Observações: Sua classificação permanece provisória. Na Etapa 2B, a cadeia poderá ser consolidada, mas no estado atual do SQL ela é necessária e pertence à sequência executável.

14. **`20260804070000_harden_professional_commission_security.sql`**
    - Versão local: `20260804070000`
    - Objetivo: Consolidar a segurança financeira: revogar acesso direto, implementar bloqueio `FOR UPDATE` e auditoria em `audit_logs`.
    - Objetos afetados: Tabela `professional_commission_settings` (REVOKE ALL), Coluna `barbershop_id` (DROP), RPCs `get_professional_commission_rates`, `set_professional_commission_rate`.
    - Operações principais: `REVOKE ALL`, `ALTER TABLE DROP COLUMN`, `CREATE OR REPLACE FUNCTION`.
    - Dependências: `20260804060000_isolate_professional_commission.sql`.
    - Idempotência: `CREATE OR REPLACE FUNCTION`, `REVOKE`.
    - Risco de replay: Baixo se a tabela privada já existir.
    - Sobreposição: Consolida as RPCs de comissão.
    - Registro remoto: AUSENTE REMOTAMENTE COMO REGISTRO INDIVIDUAL.
    - Estado do objeto remoto: Presente (estrutura final ativa).
    - Classificação proposta: `CORRETIVA`.
    - Confiança: ALTA.
    - Observações: Define o modelo de segurança e auditoria final da comissão.

15. **`20260806050000_revoke_anon_commission_rpc_execute.sql`**
    - Versão local: `20260806050000`
    - Objetivo: Revogar explicitamente o privilégio `EXECUTE` do papel `anon` nas RPCs de comissão.
    - Objetos afetados: RPCs `get_professional_commission_rates`, `set_professional_commission_rate`.
    - Operações principais: `REVOKE EXECUTE ON FUNCTION ... FROM anon, PUBLIC`.
    - Dependências: `20260804070000_harden_professional_commission_security.sql`.
    - Idempotência: `REVOKE` é idempotente.
    - Risco de replay: Baixo.
    - Sobreposição: Ajuste fino de permissão em `public`.
    - Registro remoto: `20260806051055 20260806050000_revoke_anon_commission_rpc_execute` (PROVÁVEL — PREFIX TIMESTAMP - timestamp remoto `051055`).
    - Estado do objeto remoto: Presente.
    - Classificação proposta: `CORRETIVA`.
    - Confiança: ALTA.
    - Observações: Elimina o alerta do Security Advisor.

---

# 8. Inventário dos arquivos históricos

Localizados em `supabase/migration-history/prebaseline-local/`:

| Arquivo | Tamanho | Hash SHA-256 Completo (64 caracteres) | Commit Criador | Propósito | Classificação |
| ------- | ------: | ------------------------------------- | -------------- | --------- | ------------- |
| `20260731192927_secure_saas_foundation.sql` | 18.068 B | `809975CE863C29D5ED1241331C13CC03EF8AF24B769D1EE5A9298B59896FF8EE` | `b1b9af8` (31/07/2026) | Estrutura RLS e schema inicial pré-baseline | `HISTÓRICA FORA DA SEQUÊNCIA` |
| `20260731193020_complete_saas_security_foundation.sql` | 2.891 B | `911B48CC672263E5FDE80DA6CD1A09DAEA006D527C5E19EBEE52BE93A241B3F3` | `b1b9af8` (31/07/2026) | Endurecimento de RLS e triggers pré-baseline | `HISTÓRICA FORA DA SEQUÊNCIA` |

*Razão de isolamento:* Esses dois arquivos foram criados antes do `db pull` que estabeleceu o baseline oficial (`20260801001539`). Estão preservados fora do diretório `supabase/migrations/` e **não fazem parte** da sequência executável.

---

# 9. Inventário completo das migrations remotas

Informações registradas no Supabase remoto `irszgnkzqseljowckrgz` (`schema_migrations`):

| Ordem Remota | Versão / Timestamp Remoto | Nome Registrado no Remoto | Correspondência Local | Tipo Correspondência | Confiança |
| -----------: | ------------------------- | ------------------------- | --------------------- | -------------------- | --------- |
| 1 | `20260801001539` | `20260801001539_baseline_remote_schema` | `20260801001539_baseline_remote_schema.sql` | EXATA POR IDENTIDADE DO REGISTRO | ALTA |
| 2 | `20260802180056` | `20260802180056_customer_crm_vertical_slice` | `20260802180056_customer_crm_vertical_slice.sql` | PROVÁVEL | ALTA |
| 3 | `20260803015008` | `20260803015008_fix_customer_phone_normalization` | `20260803015008_fix_customer_phone_normalization.sql` | PROVÁVEL | ALTA |
| 4 | `20260803044908` | `20260803044908_add_barbershop_image_storage` | `20260803044908_add_barbershop_image_storage.sql` | PROVÁVEL | ALTA |
| 5 | `20260803045033` | `20260803045033_harden_barbershop_image_access` | `20260803045033_harden_barbershop_image_access.sql` | PROVÁVEL | ALTA |
| 6 | `20260803071307` | `20260803071307_add_initial_registration_details` | `20260803071307_add_initial_registration_details.sql` | PROVÁVEL | ALTA |
| 7 | `20260803195045` | `20260803195045_fix_barbershop_image_upload_policy` | `20260803195045_fix_barbershop_image_upload_policy.sql` | PROVÁVEL | ALTA |
| 8 | `20260803222030` | `20260803222030_install_customer_crm_booking` | `20260803222030_install_customer_crm_booking.sql` | PROVÁVEL | ALTA |
| 9 | `20260803224530` | `20260803224530_secure_public_catalog_and_internal_trigger` | `20260803224530_secure_public_catalog_and_internal_trigger.sql` | PROVÁVEL | ALTA |
| 10 | `20260804013607` | `20260804013607_optimize_booking_intervals_10min` | `20260804013607_optimize_booking_intervals_10min.sql` | EXATA POR IDENTIDADE DO REGISTRO | ALTA |
| 11 | `20260804043338` | `add_team_invitations` | `20260804020000_add_team_invitations.sql` | PROVÁVEL — TIMESTAMP DIVERGENTE | ALTA (Lógica) |
| 12 | `20260806040824` | `20260804050000_add_professional_commission_rate` | `20260804050000_add_professional_commission_rate.sql` | PROVÁVEL — PREFIX TIMESTAMP | ALTA |
| 13 | `20260806051055` | `20260806050000_revoke_anon_commission_rpc_execute` | `20260806050000_revoke_anon_commission_rpc_execute.sql` | PROVÁVEL — PREFIX TIMESTAMP | ALTA |

*Nota de salvaguarda de evidência:* O histórico remoto em `schema_migrations` não armazena hash de conteúdo para comprovar igualdade byte a byte do SQL. A correspondência é inferida pela identidade de nome e timestamp.

---

# 10. Mapa local × remoto

```text
LOCAL (supabase/migrations/)                                REMOTO (irszgnkzqseljowckrgz)
--------------------------------------------------          --------------------------------------------------
20260801001539_baseline_remote_schema.sql          <=======> 20260801001539_baseline_remote_schema (EXATA)
20260802180056_customer_crm_vertical_slice.sql     <=======> 20260802180056_customer_crm_vertical_slice (PROVÁVEL)
20260803015008_fix_customer_phone_normalization.sql<=======> 20260803015008_fix_customer_phone_normalization (PROVÁVEL)
20260803044908_add_barbershop_image_storage.sql    <=======> 20260803044908_add_barbershop_image_storage (PROVÁVEL)
20260803045033_harden_barbershop_image_access.sql  <=======> 20260803045033_harden_barbershop_image_access (PROVÁVEL)
20260803071307_add_initial_registration_details.sql<=======> 20260803071307_add_initial_registration_details (PROVÁVEL)
20260803195045_fix_barbershop_image_upload_policy.sql<======> 20260803195045_fix_barbershop_image_upload_policy (PROVÁVEL)
20260803222030_install_customer_crm_booking.sql    <=======> 20260803222030_install_customer_crm_booking (PROVÁVEL)
20260803224530_secure_public_catalog_and_trigger.sql<=======> 20260803224530_secure_public_catalog_and_trigger (PROVÁVEL)
20260804013607_optimize_booking_intervals_10min.sql<=======> 20260804013607_optimize_booking_intervals_10min (EXATA)
20260804020000_add_team_invitations.sql            <-------> 20260804043338 add_team_invitations (PROVÁVEL - TIMESTAMP DIVERGENTE)
20260804050000_add_professional_commission_rate.sql<-------> 20260806040824 20260804050000_add_prof... (PROVÁVEL - PREFIX TIMESTAMP)
20260804060000_isolate_professional_commission.sql <-------> (Ausente remotamente como registro individual)
20260804070000_harden_professional_commission_sec.sql<-----> (Ausente remotamente como registro individual)
20260806050000_revoke_anon_commission_rpc_execute.sql<-----> 20260806051055 20260806050000_revoke_anon... (PROVÁVEL - PREFIX TIMESTAMP)
```

---

# 11. Matriz consolidada de objetos (Com Assinaturas Completas)

| Objeto | Tipo | Criado em | Alterado em | Dependência | Estado Remoto | Risco Replay |
| ------ | ---- | --------- | ----------- | ----------- | ------------- | ------------ |
| `customer_consent_type` | TYPE (ENUM) | `20260802180056` | Recriado em `20260803222030` | Nenhuma | Presente | BLOQUEADOR se faltar `IF NOT EXISTS` |
| `public.customers` | TABLE | `20260802180056` | Recriado em `20260803222030` | Schema public | Presente | BLOQUEADOR sem `CREATE TABLE IF NOT EXISTS` |
| `public.barbershop_customers` | TABLE | `20260802180056` | Recriado em `20260803222030` | `barbershops`, `customers` | Presente | BLOQUEADOR sem `CREATE TABLE IF NOT EXISTS` |
| `public.customer_consents` | TABLE | `20260802180056` | Recriado em `20260803222030` | `barbershops`, `customers` | Presente | BLOQUEADOR sem `CREATE TABLE IF NOT EXISTS` |
| `appointments.customer_global_id` | COLUMN | `20260802180056` | Re-adicionado em `20260803222030` | `appointments`, `customers` | Presente | Médio |
| `barbershop_customer_history` | VIEW | `20260802180056` | `CREATE OR REPLACE` em `20260803222030` | `appointments`, `barbershop_customers` | Presente | Baixo (`CREATE OR REPLACE`) |
| `barbershops.initial_registration_completed` | COLUMN | `20260803071307` | - | `barbershops` | Presente | Baixo (`ADD COLUMN IF NOT EXISTS`) |
| `public.barbershop_registration_details` | TABLE | `20260803071307` | - | `barbershops` | Presente | Baixo (`CREATE TABLE IF NOT EXISTS`) |
| `public.team_invitations` | TABLE | `20260804020000` | - | `barbershops`, `professionals` | Presente | Baixo |
| `public.professional_commission_settings` | TABLE (PRIVADA) | `20260804060000` | RLS revogada em `20260804070000` | `barbershops`, `professionals` | Presente | Baixo |
| `storage.objects` DELETE policy | POLICY | `20260803044908` | Ambiguidade de `name` mantida em `DELETE` | `storage.objects`, `public.barbershops` | Presente | Médio (falha em exclusão de foto) |
| `public.get_professional_commission_rates(uuid)` | FUNCTION (RPC) | `20260804050000` | Recriada em `04060000`, `04070000`; EXECUTE revogado em `06050000` | `professional_commission_settings` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.set_professional_commission_rate(uuid, text)` | FUNCTION (RPC) | `20260804050000` | Recriada em `04060000`, `04070000`; EXECUTE revogado em `06050000` | `professional_commission_settings`, `audit_logs` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.create_team_invitation(uuid, text, text, uuid)` | FUNCTION (RPC) | `20260804020000` | - | `team_invitations`, `team_members` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.get_invitation_details(text)` | FUNCTION (RPC) | `20260804020000` | - | `team_invitations`, `barbershops` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.accept_team_invitation(text)` | FUNCTION (RPC) | `20260804020000` | - | `team_invitations`, `team_members` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.revoke_team_invitation(uuid)` | FUNCTION (RPC) | `20260804020000` | - | `team_invitations` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.book_customer_appointment(...)` | FUNCTION (RPC) | `20260802180056` | Recriada em `03222030`, `04013607` | `appointments`, `customers`, `services` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.get_public_availability(text, date, uuid[])` | FUNCTION (RPC) | `20260801001539` | Recriada em `03224530`, `04013607` | `business_hours`, `appointments` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.set_barbershop_photo_url(uuid, text)` | FUNCTION (RPC) | `20260803045033` | - | `barbershops` | Presente | Baixo (`CREATE OR REPLACE`) |
| `public.sync_customer_for_appointment()` | FUNCTION (TRIGGER) | `20260802180056` | Recriada em `03015008`, `03222030`, `03224530` | `appointments`, `customers` | Presente | Baixo (`CREATE OR REPLACE`) |

---

# 12. Análise do grupo CRM

- **Migrations envolvidas:** `20260802180056_customer_crm_vertical_slice.sql`, `20260803015008_fix_customer_phone_normalization.sql`, `20260803222030_install_customer_crm_booking.sql`.
- **Objetos DDL duplicados:** A migration `20260803222030` recria o enum `customer_consent_type`, as tabelas `customers`, `barbershop_customers`, `customer_consents`, a coluna `appointments.customer_global_id`, a view `barbershop_customer_history`, triggers e RPCs de agendamento/consentimento.
- **Correção funcional absorvida:** A migration `20260803222030` absorve a expressão correta de normalização de telefone (`regexp_replace(phone, '\D', '', 'g')`), o recálculo da coluna `phone_normalized` e a versão final de `sync_customer_for_appointment()`.
- **Divergência de Grants:** A migration `03015008` continha concessões de `GRANT` para `anon` e `authenticated` para apoiar a view `security_invoker`. A migration consolidada `20260803222030` repensa a superfície de segurança e restringe chamadas diretas do público. *A migration consolidada absorve a correção funcional de normalização e o recálculo dos telefones, mas não reproduz literalmente todos os grants da migration corretiva. Os grants devem ser comparados pelo estado de segurança final pretendido, e não somente por equivalência textual.*
- **Classificação provisória sustentada:** `20260802180056` e `20260803015008` classificadas provisoriamente como `SUBSTITUÍDAS`. A confirmação dessa retirada da sequência executável limpa exigirá testes de regressão na Etapa 2B.

---

# 13. Análise do grupo de convites

- **Migration envolvida:** `20260804020000_add_team_invitations.sql`.
- **Divergência de registro remoto:** O arquivo local possui timestamp `20260804020000`, enquanto o registro remoto na tabela `schema_migrations` possui timestamp `20260804043338` (nome: `add_team_invitations`).
- **Tipo de correspondência:** `PROVÁVEL — TIMESTAMP DIVERGENTE`.
- **Confiança:** `ALTA` para a correspondência lógica, `NÃO COMPROVADA BYTE A BYTE`.
- **Análise da correspondência:** A finalidade, o nome lógico e os objetos remotos são compatíveis com o arquivo local, mas o timestamp registrado é diferente e o histórico remoto não contém hash do SQL. A correspondência é considerada provável, não exata.
- **Classificação proposta:** `CANÔNICA`.

---

# 14. Análise do grupo de comissões

- **Migrations envolvidas:**
  - `20260804050000_add_professional_commission_rate.sql`
  - `20260804060000_isolate_professional_commission.sql`
  - `20260804070000_harden_professional_commission_security.sql`
  - `20260806050000_revoke_anon_commission_rpc_execute.sql`
- **Cadeia de dependência mecânica no SQL atual:**
  ```text
  20260804050000
      cria professionals.commission_rate_percent

  20260804060000
      lê professionals.commission_rate_percent
      cria professional_commission_settings
      migra os valores
      remove professionals.commission_rate_percent

  20260804070000
      pressupõe professional_commission_settings existente
      remove barbershop_id
      endurece grants e RPCs

  20260806050000
      revoga explicitamente EXECUTE de anon
  ```
- **Conclusões sobre dependências:**
  - `04070000` não pode executar em banco vazio sem `04060000`.
  - `04060000` não pode executar sem a coluna criada por `04050000`, a menos que seu código SQL seja reescrito para omitir a leitura da coluna deletada em instalações do zero.
  - Classificar `04060000` como `HISTÓRICA` ou `SUBSTITUÍDA` é incorreto no estado atual.
  - Classificar `04050000` como removível sem explicar a necessidade de reescrever `04060000` também é incorreto.
- **Classificação provisória mínima:**
  - `20260804050000`: `PENDENTE DE DECISÃO` (Modelo transitório, mas permanece uma dependência mecânica da migration `04060000` no SQL atual. Poderá ser retirada apenas se a cadeia de comissão for consolidada ou reescrita e validada em banco descartável.)
  - `20260804060000`: `CANÔNICA` (Cria a tabela financeira privada e migra os dados; necessária na sequência executável atual.)
  - `20260804070000`: `CORRETIVA` (Endurece e depende da tabela criada pela migration anterior.)
  - `20260806050000`: `CORRETIVA` (Revoga `EXECUTE` de `anon`).

---

# 15. Análise do Storage

- **Migrations envolvidas:** `20260803044908`, `20260803045033`, `20260803195045`.
- **Achado RLS:** A policy de `DELETE` em `storage.objects` criada em `20260803044908` referencia `name` de forma ambígua em subconsulta. A correção em `20260803195045` qualificou `storage.objects.name` apenas na policy de `INSERT`. A qualificação de `DELETE` permanece pendente para correção em Etapa futura.

---

# 16. Análise de RLS e papéis

- **Permissões de Manager:** A interface administrativa expõe cadastros de serviços e horários para o papel `manager`, mas as RLS policies de `services` e `business_hours` autorizam escrita somente para `owner`.
- **RLS em `professionals`:** A tabela `professionals` autoriza escrita direta somente a `owner`. A ausência de `user_id` em `professionals` é por desenho (o vínculo é via `team_members`).

---

# 17. Sobreposições e conflitos de replay

- **Conflito CRM:** Tentar rodar `02180056` e depois `03222030` em banco limpo interrompe a execução com erro de objeto já existente (`customers`).
- **Conflito Comissão:** Remover `04050000` sem alterar `04060000` faz a migration `04060000` falhar por tentar ler a coluna `commission_rate_percent` que não teria sido criada.

---

# 18. Migrations locais sem correspondência remota individual

As migrations locais abaixo não possuem registros com seus timestamps exatos na tabela `schema_migrations` do Supabase remoto de homologação:
1. `20260804060000_isolate_professional_commission.sql`
2. `20260804070000_harden_professional_commission_security.sql`

- **Tipo de correspondência:** `AUSENTE REMOTAMENTE COMO REGISTRO INDIVIDUAL` (ou `ORIGEM REMOTA INDETERMINADA`).
- **Análise de Evidência:** Os objetos finais no banco remoto (tabela `professional_commission_settings`, RLS e RPCs com `FOR UPDATE` e revogação de `anon`) são compatíveis com o resultado dessas migrations. Porém, a existência do objeto no catálogo remoto não comprova qual migration o criou. Não há evidência suficiente no histórico remoto para afirmar que foram aplicadas "sob timestamp de lote". O registro remoto `20260806040824` não prova, sozinho, que contém o conteúdo integral das três migrations.

---

# 19. Migrations remotas sem correspondência local

- **Resultado da análise:** Nenhuma entrada remota em `schema_migrations` está sem correspondência lógica no repositório local (`0` entradas ausentes). Todas as 13 entradas remotas possuem correspondente direto ou provável entre as 15 migrations executáveis locais, variando apenas o timestamp registrado.

---

# 20. Classificação provisória

A distribuição das **15 migrations executáveis** no repositório local é:

```text
CANÔNICAS: 6
CORRETIVAS: 6
SUBSTITUÍDAS: 2
PENDENTES DE DECISÃO: 1
TOTAL EXECUTÁVEL: 15

HISTÓRICAS FORA DA SEQUÊNCIA (em prebaseline-local): 2
```

## Distribuição detalhada provisória:

- **CANÔNICAS (6):**
  - `20260801001539_baseline_remote_schema.sql`
  - `20260803044908_add_barbershop_image_storage.sql`
  - `20260803071307_add_initial_registration_details.sql`
  - `20260803222030_install_customer_crm_booking.sql`
  - `20260804020000_add_team_invitations.sql`
  - `20260804060000_isolate_professional_commission.sql`

- **CORRETIVAS (6):**
  - `20260803045033_harden_barbershop_image_access.sql`
  - `20260803195045_fix_barbershop_image_upload_policy.sql`
  - `20260803224530_secure_public_catalog_and_internal_trigger.sql`
  - `20260804013607_optimize_booking_intervals_10min.sql`
  - `20260804070000_harden_professional_commission_security.sql`
  - `20260806050000_revoke_anon_commission_rpc_execute.sql`

- **SUBSTITUÍDAS (2):**
  - `20260802180056_customer_crm_vertical_slice.sql`
  - `20260803015008_fix_customer_phone_normalization.sql`

- **PENDENTE DE DECISÃO (1):**
  - `20260804050000_add_professional_commission_rate.sql` (Modelo transitório, mantido como dependência mecânica da `04060000` no SQL atual até definição da estratégia da Etapa 2B).

- **HISTÓRICAS FORA DA SEQUÊNCIA (2):**
  - `20260731192927_secure_saas_foundation.sql` (em `prebaseline-local/`)
  - `20260731193020_complete_saas_security_foundation.sql` (em `prebaseline-local/`)

---

# 21. Riscos da futura Etapa 2B

1. **Risco de Replay por Quebra de Dependência:** Remover `04050000` sem reescrever a leitura de `04060000` causará erro na reconstituição do banco limpo.
2. **Risco de Desalinhamento do Histórico Remoto:** A execução direta de `supabase db push` causará rejeição devido às divergências de timestamps (`04020000` vs `04043338`, etc.).
3. **Risco de Perda de Trilha de Auditoria Remota:** Tentar modificar a tabela `schema_migrations` no remoto de forma precipitada pode comprometer a rastreabilidade das migrations já homologadas.

---

# 22. Questões não resolvidas

1. **Estratégia de Consolidação da Comissão:** Definir se a migration `04050000` será mantida na sequência executável limpa para satisfazer a `04060000`, ou se `04060000` e `04070000` serão consolidadas em uma única migration limpa de criação direta da tabela privada.
2. **Aprovação Humana da Reconciliação Remota:** Definir a estratégia aprovada para registrar a equivalência dos timestamps divergentes no ambiente remoto do Supabase.

---

# 23. Recomendação para a Etapa 2B

1. **Validação Preliminar em Contêiner Isolado (Docker/PostgreSQL local):** Testar a execução sequencial limpa em um banco de dados totalmente limpo e descartável, confirmando a aprovação de `0` a `100%` antes de tocar em qualquer arquivo oficial ou ambiente remoto.
2. **Submissão para Aprovação:** Apresentar a proposta de reconciliação para aprovação explícita da equipe/proprietário antes da execução da Etapa 2B.

---

# 24. Evidências coletadas

- Hashes SHA-256 completos de todas as 15 migrations executáveis e 2 históricas extraídos via `Get-FileHash`.
- Histórico Git rastreado via `git log --all --follow --date=iso --name-status`.
- Laudo técnico prévio registrado em [AUDIT-PROFESSIONAL-COMMISSION-SECURITY.md](AUDIT-PROFESSIONAL-COMMISSION-SECURITY.md).
- Plano de remediação registrado em [AUDIT-REMEDIATION-PLAN-2026-08-06.md](AUDIT-REMEDIATION-PLAN-2026-08-06.md).

---

# 25. Confirmação de ausência de mutações

- **Nenhum arquivo SQL foi alterado, renomeado, movido ou excluído.**
- **Nenhum comando mutável do Supabase CLI foi executado (`db push`, `db reset`, `migration repair`, `db pull`).**
- **Nenhuma alteração DDL ou DML foi realizada no banco remoto `irszgnkzqseljowckrgz`.**
- **Nenhum dado pessoal ou confidencial foi acessado ou registrado.**
