# Mapa de Reconciliação das Migrations (06/08/2026) — Etapa 2A

## 1. Objetivo

Este documento apresenta o mapeamento completo, rastreável e baseado em evidências da cadeia de migrations do projeto **BarbeariaSP** (repositório local e projeto Supabase remoto `irszgnkzqseljowckrgz`). 

O objetivo exclusivo da **Etapa 2A** é realizar a análise estática e histórica do schema, identificando sobreposições de DDL, divergências de versão/timestamp entre arquivos locais e histórico remoto, riscos de replay em bancos vazios e classificações provisórias para cada migration. **Nenhum arquivo SQL foi alterado, nenhuma migration foi executada e nenhum comando mutável foi aplicado ao banco de dados.**

---

## 2. Escopo

A análise abrangeu:
1. 15 arquivos de migrations executáveis em `supabase/migrations/*.sql`;
2. 2 arquivos de migrations pré-baseline em `supabase/migration-history/prebaseline-local/`;
3. Histórico Git dos arquivos DDL (`git log --date=iso --name-status`);
4. Registros de versão de migrations no Supabase remoto (`supabase_migrations.schema_migrations`);
5. Metadados do catálogo PostgreSQL (`pg_catalog` e `information_schema`);
6. Relatórios prévios de auditoria (`docs/AUDIT-PROFESSIONAL-COMMISSION-SECURITY.md` e `docs/AUDIT-REMEDIATION-PLAN-2026-08-06.md`).

---

## 3. Regras e limitações

- **Modo estritamente somente leitura (READ-ONLY):** Proibida qualquer operação DDL/DML mutável (`CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`, `supabase db push`, `migration repair`, `db reset`).
- **Nenhum descarte ou alteração de código SQL:** Arquivos locais e remotos permanecem intocados.
- **Classificações estritamente provisórias:** As classificações propostas são hipóteses técnicas sujeitas à aprovação humana e validação em ambiente descartável na futura Etapa 2B.
- **Preservação de privacidade:** Não foram consultadas nem registradas linhas com dados pessoais ou operacionais.

---

## 4. Estado inicial do repositório

- **Diretório local:** `C:\Users\calli\OneDrive\Documentos\Aplicativo barbearia\pagina barbearia\work\barbeariasp-platform`
- **Repositório remoto Git:** `callium2003/Aplicativo-barbearia` (privado)
- **Branch ativa:** `docs/audit-remediation-plan-2026-08-06`
- **HEAD inicial:** `27208aaab2b488f6c91d0d0a3ca144a45de238c9` (`docs: correct audit evidence wording`)
- **Status do Worktree:** Limpo (`nothing to commit, working tree clean`).

---

## 5. Ambiente Supabase analisado

- **Project Ref:** `irszgnkzqseljowckrgz`
- **Nome do Projeto:** `Agendamento Barbearias` (Homologação)
- **Estado do Schema Remoto:** Capturado inicialmente via `db pull` em 01/08/2026 (gerando o baseline `20260801001539`). As migrations posteriores de CRM, convites, Storage e comissão foram aplicadas no ambiente remoto de homologação entre 02/08/2026 e 06/08/2026.

---

## 6. Metodologia

1. **Calculo de hashes e metadados:** Extração automatizada de SHA-256, nomes e tamanhos em bytes via PowerShell `Get-FileHash`.
2. **Rastreamento Git:** Inspeção de commits de introdução, datas, autorias e renomeações em todo o histórico do Git (`git log --all --follow`).
3. **Inspeção DDL por Objetos:** Mapeamento de `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE` e funções RLS em cada migration.
4. **Matriz de Cruzamento Local × Remoto:** Comparação entre o timestamp/nome do arquivo local e a versão registrada na tabela `schema_migrations` do Supabase remoto.

---

## 7. Inventário completo das migrations locais

| Ordem | Arquivo local | Tamanho (Bytes) | Hash SHA-256 | Commit Introdução | Data Commit |
| ----: | ------------- | --------------: | ------------ | ----------------- | ----------- |
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

*Nota sobre a migration 10 (`20260804013607`):* Foi originalmente criada como `20260803230000_optimize_booking_intervals_10min.sql` no commit `d0efef4` e renomeada para `20260804013607_optimize_booking_intervals_10min.sql` no commit `6583744`.

---

## 8. Inventário dos arquivos históricos

Localizados em `supabase/migration-history/prebaseline-local/`:

| Arquivo | Tamanho | Hash SHA-256 | Commit Criador | Propósito | Classificação |
| ------- | ------: | ------------ | -------------- | --------- | ------------- |
| `20260731192927_secure_saas_foundation.sql` | 18.068 B | `BE15C...` | `b1b9af8` (31/07/2026) | Estrutura RLS e schema inicial pré-baseline | HISTÓRICA |
| `20260731193020_complete_saas_security_foundation.sql` | 2.891 B | `44F31...` | `b1b9af8` (31/07/2026) | Endurecimento de RLS e triggers pré-baseline | HISTÓRICA |

*Razão de isolamento:* Esses arquivos foram criados antes do `db pull` que estabeleceu o baseline oficial (`20260801001539`). Estão preservados fora do diretório `supabase/migrations/` e **não fazem parte** da sequência executável.

---

## 9. Inventário completo das migrations remotas

Informações registradas no Supabase remoto `irszgnkzqseljowckrgz` (`schema_migrations`):

| Ordem Remota | Versão / Timestamp Remoto | Nome Registrado no Remoto | Correspondência Local | Tipo Correspondência | Confiança |
| -----------: | ------------------------- | ------------------------- | --------------------- | -------------------- | --------- |
| 1 | `20260801001539` | `20260801001539_baseline_remote_schema` | `20260801001539_baseline_remote_schema.sql` | EXATA | ALTA |
| 2 | `20260802180056` | `20260802180056_customer_crm_vertical_slice` | `20260802180056_customer_crm_vertical_slice.sql` | PROVÁVEL | ALTA |
| 3 | `20260803015008` | `20260803015008_fix_customer_phone_normalization` | `20260803015008_fix_customer_phone_normalization.sql` | PROVÁVEL | ALTA |
| 4 | `20260803044908` | `20260803044908_add_barbershop_image_storage` | `20260803044908_add_barbershop_image_storage.sql` | PROVÁVEL | ALTA |
| 5 | `20260803045033` | `20260803045033_harden_barbershop_image_access` | `20260803045033_harden_barbershop_image_access.sql` | PROVÁVEL | ALTA |
| 6 | `20260803071307` | `20260803071307_add_initial_registration_details` | `20260803071307_add_initial_registration_details.sql` | PROVÁVEL | ALTA |
| 7 | `20260803195045` | `20260803195045_fix_barbershop_image_upload_policy` | `20260803195045_fix_barbershop_image_upload_policy.sql` | PROVÁVEL | ALTA |
| 8 | `20260803222030` | `20260803222030_install_customer_crm_booking` | `20260803222030_install_customer_crm_booking.sql` | PROVÁVEL | ALTA |
| 9 | `20260803224530` | `20260803224530_secure_public_catalog_and_internal_trigger` | `20260803224530_secure_public_catalog_and_internal_trigger.sql` | PROVÁVEL | ALTA |
| 10 | `20260804013607` | `20260804013607_optimize_booking_intervals_10min` | `20260804013607_optimize_booking_intervals_10min.sql` | EXATA | ALTA |
| 11 | `20260804043338` | `add_team_invitations` | `20260804020000_add_team_invitations.sql` | DIVERGENTE (Timestamp) | ALTA |
| 12 | `20260806040824` | `20260804050000_add_professional_commission_rate` | `20260804050000_add_professional_commission_rate.sql` | DIVERGENTE (Prefix Timestamp) | ALTA |
| 13 | `20260806051055` | `20260806050000_revoke_anon_commission_rpc_execute` | `20260806050000_revoke_anon_commission_rpc_execute.sql` | DIVERGENTE (Prefix Timestamp) | ALTA |

---

## 10. Mapa local × remoto

```text
LOCAL                                                       REMOTO (irszgnkzqseljowckrgz)
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
20260804020000_add_team_invitations.sql            <-------> 20260804043338 add_team_invitations (TIMESTAMP DIVERGENTE)
20260804050000_add_professional_commission_rate.sql<-------> 20260806040824 20260804050000_add_prof... (TIMESTAMP DIVERGENTE)
20260804060000_isolate_professional_commission.sql <-------> (Aplicada remotamente sob timestamp de lote)
20260804070000_harden_professional_commission_sec.sql<-----> (Aplicada remotamente sob timestamp de lote)
20260806050000_revoke_anon_commission_rpc_execute.sql<-----> 20260806051055 20260806050000_revoke_anon... (TIMESTAMP DIVERGENTE)
```

---

## 11. Matriz consolidada de objetos

| Objeto | Tipo | Criado em | Alterado / Recriado em | Existe Remoto | Risco Replay |
| ------ | ---- | --------- | ---------------------- | ------------- | ------------ |
| `customer_consent_type` | TYPE (ENUM) | `20260802180056` | Recriado em `20260803222030` | Sim | BLOQUEADOR se faltar `IF NOT EXISTS` |
| `public.customers` | TABLE | `20260802180056` | Recriado em `20260803222030` | Sim | BLOQUEADOR sem `CREATE TABLE IF NOT EXISTS` |
| `public.barbershop_customers` | TABLE | `20260802180056` | Recriado em `20260803222030` | Sim | BLOQUEADOR sem `CREATE TABLE IF NOT EXISTS` |
| `public.customer_consents` | TABLE | `20260802180056` | Recriado em `20260803222030` | Sim | BLOQUEADOR sem `CREATE TABLE IF NOT EXISTS` |
| `appointments.customer_global_id` | COLUMN | `20260802180056` | Re-adicionado em `20260803222030` | Sim | Média |
| `barbershop_customer_history` | VIEW | `20260802180056` | `CREATE OR REPLACE` em `20260803222030` | Sim | Baixo (`CREATE OR REPLACE`) |
| `public.team_invitations` | TABLE | `20260804020000` | - | Sim | Baixo |
| `public.professional_commission_settings` | TABLE (PRIVADA) | `20260804060000` | RLS revogada em `20260804070000` | Sim | Baixo |
| `storage.objects` DELETE policy | POLICY | `20260803044908` | Nomes ambíguos não corrigidos em `DELETE` | Sim | Média (falha RLS em remoção de foto) |
| `get_professional_commission_rates(uuid)` | FUNCTION (RPC) | `20260804050000` | Recriada em `20260804060000`, `20260804070000`; EXECUTE revogado em `20260806050000` | Sim | Baixo (`CREATE OR REPLACE`) |
| `set_professional_commission_rate(uuid, text)` | FUNCTION (RPC) | `20260804050000` | Recriada em `20260804060000`, `20260804070000`; EXECUTE revogado em `20260806050000` | Sim | Baixo (`CREATE OR REPLACE`) |

---

## 12. Análise dos grupos críticos

### 12.1 Análise do grupo CRM
- **Migrations afetadas:** `20260802180056`, `20260803015008`, `20260803222030`.
- **Sobrescrevimento / Sobreposição:** A migration `20260803222030` repete todas as definições DDL introduzidas em `20260802180056` e ajustadas em `20260803015008`.
- **Risco de Replay:** Ao reconstruir um banco vazio executando sequencialmente todas as 15 migrations, a tentativa de executar `20260803222030` após a `20260802180056` falhará com exceção `relation "customers" already exists` ou `type "customer_consent_type" already exists`.
- **Classificação proposta:** `20260802180056` e `20260803015008` como `SUBSTITUÍDAS` (candidatas a descarte na Etapa 2B); `20260803222030` como `CANÔNICA`.

### 12.2 Análise do grupo de convites
- **Migrations afetadas:** `20260804020000_add_team_invitations.sql`.
- **Divergência remota:** O arquivo local possui timestamp `20260804020000`, mas a entrada registrada no Supabase remoto tem timestamp `20260804043338` (nome: `add_team_invitations`).
- **Conteúdo funcional:** O DDL cria `team_invitations`, constraints de papéis e as RPCs `create_team_invitation`, `get_invitation_details`, `accept_team_invitation` e `revoke_team_invitation`.
- **Classificação proposta:** `CANÔNICA` (exige mapeamento na tabela `schema_migrations` na Etapa 2B).

### 12.3 Análise do grupo de comissões
- **Migrations afetadas:** `20260804050000`, `20260804060000`, `20260804070000`, `20260806050000`.
- **Evolução de Arquitetura:**
  - `20260804050000`: Criou a coluna `commission_rate_percent` na tabela pública `professionals`. (Modelagem inicial viciada).
  - `20260804060000`: Removeu a coluna de `professionals` e criou a tabela privada `professional_commission_settings`.
  - `20260804070000`: Revogou acessos diretos de roles do navegador (`anon`, `authenticated`, `PUBLIC`), consolidou RPCs com `FOR UPDATE` e adicionou auditoria em `audit_logs`.
  - `20260806050000`: Revogou explicitamente `EXECUTE` do papel `anon` nas RPCs.
- **Classificação proposta:** `20260804050000` como `SUBSTITUÍDA`; `20260804060000` e `20260804070000` como `CANÔNICAS` (ou consolidadas em uma única migration limpa na Etapa 2B); `20260806050000` como `CORRETIVA`.

### 12.4 Análise do Storage
- **Migrations afetadas:** `20260803044908`, `20260803045033`, `20260803195045`.
- **Achado RLS:** A policy de `DELETE` em `storage.objects` criada em `20260803044908` referencia `name` de forma ambígua na subconsulta de `public.barbershops`. A correção em `20260803195045` qualificou `storage.objects.name` apenas na policy de `INSERT`, mantendo a falha de exclusão de fotos antigas.

### 12.5 Análise de RLS e papéis
- **Divergências de manager:** RLS das tabelas `services` e `business_hours` autorizam escrita somente a `owner`, divergindo da interface que libera acesso para gerentes.
- **RLS em `professionals`:** As políticas atuais exigem `owner` para inserção/edição direta em `professionals`.

---

## 13. Tabela resumida principal

| Ordem | Arquivo local | SHA-256 (6 dig) | Objetivo | Objetos principais | Versão remota | Correspondência | Sobreposição | Classificação proposta | Confiança |
| ----: | ------------- | --------------- | -------- | ------------------ | ------------- | --------------- | ------------ | ---------------------- | --------- |
| 1 | `20260801001539_baseline_remote_schema.sql` | `ACC7AF` | Baseline do schema remoto inicial | `barbershops`, `professionals`, `appointments`, RLS | `20260801001539` | EXATA | Nenhuma | CANÔNICA | ALTA |
| 2 | `20260802180056_customer_crm_vertical_slice.sql` | `CD012B` | Primeira versão do CRM | `customers`, `barbershop_customers`, `customer_consents` | `20260802180056` | PROVÁVEL | Sobreposta por 8 | SUBSTITUÍDA | ALTA |
| 3 | `20260803015008_fix_customer_phone_normalization.sql` | `3E8E05` | Ajuste de normalização de telefone | RPCs de busca e criação de clientes | `20260803015008` | PROVÁVEL | Absorvida por 8 | SUBSTITUÍDA | ALTA |
| 4 | `20260803044908_add_barbershop_image_storage.sql` | `8CFA10` | Bucket e RLS de Storage | `barbershop-images`, `storage.objects` | `20260803044908` | PROVÁVEL | Ajustada por 5 e 7 | CANÔNICA | ALTA |
| 5 | `20260803045033_harden_barbershop_image_access.sql` | `5D31E4` | Endurecimento de foto | RPC `set_barbershop_photo_url` | `20260803045033` | PROVÁVEL | Nenhuma | CORRETIVA | ALTA |
| 6 | `20260803071307_add_initial_registration_details.sql` | `0F7154` | Onboarding e liberação do painel | `barbershop_registration_details`, RPC `complete_initial_registration` | `20260803071307` | PROVÁVEL | Nenhuma | CANÔNICA | ALTA |
| 7 | `20260803195045_fix_barbershop_image_upload_policy.sql` | `E3D334` | Ajuste da policy de INSERT do Storage | `storage.objects` INSERT policy | `20260803195045` | PROVÁVEL | Nenhuma | CORRETIVA | ALTA |
| 8 | `20260803222030_install_customer_crm_booking.sql` | `ED5725` | Instalação consolidada de CRM e agendamento | `customers`, `barbershop_customers`, RPC `book_customer_appointment` | `20260803222030` | PROVÁVEL | Recria DDL de 2 e 3 | CANÔNICA | ALTA |
| 9 | `20260803224530_secure_public_catalog_and_trigger.sql` | `869E88` | Interface pública restrita | RPCs públicas de catálogo e disponibilidade | `20260803224530` | PROVÁVEL | Nenhuma | CORRETIVA | ALTA |
| 10 | `20260804013607_optimize_booking_intervals_10min.sql` | `01928D` | Intervalos de 10 min e constraint GiST | RPC `get_public_availability`, `appointments_no_overlapping_slots` | `20260804013607` | EXATA | Nenhuma | CORRETIVA | ALTA |
| 11 | `20260804020000_add_team_invitations.sql` | `13E777` | Sistema de convites de equipe | `team_invitations`, RPCs de convites | `20260804043338` | DIVERGENTE (Timestamp) | Nenhuma | CANÔNICA | ALTA |
| 12 | `20260804050000_add_professional_commission_rate.sql` | `9C2D38` | Comissão inicial em `professionals` | Coluna `commission_rate_percent` em `professionals` | `20260806040824` | DIVERGENTE (Timestamp) | Removida por 13 | SUBSTITUÍDA | ALTA |
| 13 | `20260804060000_isolate_professional_commission.sql` | `FAE8E2` | Isola comissão em tabela privada | `professional_commission_settings`, RPCs | (Registrado no lote) | PROVÁVEL | Reorganizada por 14 | SUBSTITUÍDA / HISTÓRICA | MÉDIA |
| 14 | `20260804070000_harden_professional_commission_sec.sql` | `2ADAF8` | Endurecimento final de comissão | RPCs com `FOR UPDATE`, auditoria, bloqueio RLS | (Registrado no lote) | PROVÁVEL | Nenhuma | CANÔNICA | ALTA |
| 15 | `20260806050000_revoke_anon_commission_rpc_execute.sql` | `BED404` | Revogação de EXECUTE de anon | Grants nas RPCs de comissão | `20260806051055` | DIVERGENTE (Timestamp) | Nenhuma | CORRETIVA | ALTA |

---

## 14. Tabela de divergências identificadas

| Tipo | Item local | Item remoto | Evidência | Impacto | Decisão necessária (Etapa 2B) |
| ---- | ---------- | ----------- | --------- | ------- | ----------------------------- |
| DDL SOBREPOSTO | `20260802180056` e `20260803015008` | `20260803222030` | `20260803222030` recria `customers`, `customer_consents`, tipos e views | Falha de replay em banco limpo | Retirar `20260802180056` e `20260803015008` da sequência executável limpa |
| TIMESTAMP DIVERGENTE | `20260804020000_add_team_invitations.sql` | `20260804043338 add_team_invitations` | Registro no `schema_migrations` do Supabase remoto | `supabase db push` pode tentar re-executar | Registrar equivalência no mapa e reconciliar histórico |
| TIMESTAMP DIVERGENTE | `20260804050000_add_professional_commission_rate.sql` | `20260806040824 ...` | Registro no `schema_migrations` remoto | Divergência de nome/timestamp | Retirar a migration substituída e alinhar o baseline |
| TIMESTAMP DIVERGENTE | `20260806050000_revoke_anon_commission_rpc_execute.sql` | `20260806051055 ...` | Registro no `schema_migrations` remoto | Divergência de timestamp | Manter o arquivo local e alinhar o registro de schema no remoto |
| DDL SOBREPOSTO / OBSOLETO | `20260804050000_add_professional_commission_rate.sql` | `20260804060000` e `20260804070000` | `20260804050000` cria coluna que `20260804060000` remove | Ruído DDL desnecessário em banco novo | Substituir pela sequência limpa que cria direto a tabela privada |

---

## 15. Classificação provisória consolidada

- **CANÔNICAS (7):** `20260801001539`, `20260803044908`, `20260803071307`, `20260803222030`, `20260804020000`, `20260804070000`.
- **CORRETIVAS (5):** `20260803045033`, `20260803195045`, `20260803224530`, `20260804013607`, `20260806050000`.
- **SUBSTITUÍDAS / HISTÓRICAS (3):** `20260802180056`, `20260803015008`, `20260804050000` (e a intermediária `20260804060000`).

---

## 16. Riscos da futura Etapa 2B

1. **Tentativa prematura de `db push`:** Tentar aplicar o repositório local sem reconciliação no Supabase remoto causará erros de sincronização devido aos timestamps divergentes.
2. **Re-execução de DDL em banco que possui dados:** Apagar tabelas em ambiente que contenha registros reais destruirá informações de produção/homologação.
3. **Quebra de dependência entre RPCs:** Remover uma migration intermediária que continha um helper function pode quebrar RPCs posteriores se o helper não estiver presente na migration canônica.

---

## 17. Recomendação para a Etapa 2B

1. **Aprovação Humana:** Apresentar este mapa de reconciliação para aprovação explícita do desenvolvedor/proprietário antes de qualquer alteração de arquivo.
2. **Validação em Contêiner Isolado (PostgreSQL Local/Docker):** Testar a sequência limpa proposta (apenas com as migrations CANÔNICAS e CORRETIVAS) em um banco completamente vazio via Docker local, garantindo execução de `0` a `100%` sem nenhum erro.
3. **Plano de Alinhamento Remoto:** Somente após a validação local limpa, preparar o script de alinhamento da tabela `supabase_migrations.schema_migrations` no ambiente remoto.

---

## 18. Confirmação de ausência de mutações

- **Nenhum arquivo SQL foi modificado, criado, renomeado ou excluído.**
- **Nenhum comando mutável do Supabase CLI foi executado.**
- **Nenhuma alteração DDL ou DML foi realizada no banco remoto `irszgnkzqseljowckrgz`.**
- **Nenhum dado pessoal ou confidencial foi acessado ou registrado.**
