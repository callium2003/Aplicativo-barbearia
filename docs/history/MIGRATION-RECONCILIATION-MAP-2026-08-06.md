# Mapa de Reconciliação das Migrations — Etapa 2A

Data da verificação: **06/08/2026**  
Projeto Supabase: **Agendamento Barbearias**  
Project ref: `irszgnkzqseljowckrgz`  
Repositório: `callium2003/Aplicativo-barbearia`  
Branch documental: `docs/audit-remediation-plan-2026-08-06`

# 1. Objetivo

Registrar de forma rastreável a cadeia local de migrations e o histórico efetivamente registrado no Supabase remoto de homologação.

Este documento separa três evidências distintas:

1. arquivos SQL existentes no repositório;
2. registros presentes em `supabase_migrations.schema_migrations`;
3. estado atual dos objetos no catálogo PostgreSQL.

A existência atual de uma tabela, função, policy ou grant não comprova, sozinha, qual migration criou o objeto.

# 2. Escopo

Foram analisados:

- 15 arquivos em `supabase/migrations/*.sql`;
- 2 arquivos históricos em `supabase/migration-history/prebaseline-local/`;
- histórico Git dos arquivos;
- registros remotos de `supabase_migrations.schema_migrations`;
- metadados do catálogo PostgreSQL;
- documentação técnica existente.

# 3. Regras e limitações

A verificação foi somente leitura.

Não foram executados:

- `supabase db push`;
- `supabase db reset`;
- `supabase db pull`;
- `supabase migration repair`;
- migrations remotas;
- SQL DDL ou DML mutável;
- alterações em `schema_migrations`.

Nenhum arquivo SQL foi modificado nesta etapa.

# 4. Estado inicial do repositório

- Branch: `docs/audit-remediation-plan-2026-08-06`.
- Commit documental anterior verificado: `ccbc755987760345715251f829c14e6fce2f4f1b`.
- Mensagem: `docs: correct migration reconciliation evidence`.
- Repositório privado: `callium2003/Aplicativo-barbearia`.

# 5. Ambiente Supabase analisado

- Project ref: `irszgnkzqseljowckrgz`.
- Nome: `Agendamento Barbearias`.
- Região: `sa-east-1`.
- Estado verificado: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.

O histórico remoto abaixo foi obtido diretamente por consulta somente leitura à tabela `supabase_migrations.schema_migrations`.

# 6. Metodologia

A reconciliação utilizou:

- nome e versão dos arquivos locais;
- hash SHA-256 dos arquivos locais;
- commits de introdução no Git;
- versão e nome registrados no Supabase remoto;
- dependências observadas no SQL;
- estado atual dos objetos apenas como evidência complementar.

Correspondência de nome ou finalidade não significa igualdade byte a byte, porque o histórico remoto não fornece o conteúdo SQL completo ou hash comparável para cada registro.

# 7. Inventário completo das migrations locais

| Ordem | Arquivo local | SHA-256 |
|---:|---|---|
| 1 | `20260801001539_baseline_remote_schema.sql` | `ACC7AFE21DB1034C700E29A8DFB7CDAEC68A5FC7A06FE91B1E575B93F0B50C5E` |
| 2 | `20260802180056_customer_crm_vertical_slice.sql` | `CD012B9269160EA8AF160E82EDB36156504738A48ECB93CB09B26AB8761CE59D` |
| 3 | `20260803015008_fix_customer_phone_normalization.sql` | `3E8E05BB25880003949ACAA87F9F55030BEFE9CF04A9D1984FD8727835ABE6C8` |
| 4 | `20260803044908_add_barbershop_image_storage.sql` | `8CFA10CD7F1514B008C1FCE994EFDF93AA0D82D2B2A3B98165B873B55B07A09C` |
| 5 | `20260803045033_harden_barbershop_image_access.sql` | `5D31E45192E07C59F94ECA3CA767069CE70BF72AEF1058342D08ABF703F24F49` |
| 6 | `20260803071307_add_initial_registration_details.sql` | `0F715440E2830648A2807577DC657EBF3732EDF58CCFA407F7FFC578398519EE` |
| 7 | `20260803195045_fix_barbershop_image_upload_policy.sql` | `E3D3346E530BB9FCE9F956A73F650B76E0CF538A50C4B1A3BBE7BA8F18D318DA` |
| 8 | `20260803222030_install_customer_crm_booking.sql` | `ED57252B698C6F4CEB3A5648D46CA64F898E05F1E462DB7478D5991CDAB10795` |
| 9 | `20260803224530_secure_public_catalog_and_internal_trigger.sql` | `869E88FA61D535C2B72A96EAC6D01A07A6DC1DA140CA5DAA0F7F0BA32D974914` |
| 10 | `20260804013607_optimize_booking_intervals_10min.sql` | `01928DA6BC4FA6A54CAE1241FE40349B2893EF476F2844C3B72B6ED4097B25AF` |
| 11 | `20260804020000_add_team_invitations.sql` | `13E777C4B4FD5BB7086AFED0CB07A60BF95331F653C591A13145CE3373F0ECBE` |
| 12 | `20260804050000_add_professional_commission_rate.sql` | `9C2D389C1FF4AC9493612C91B6CBFB711832AA529542572227DC78B0EC7732CC` |
| 13 | `20260804060000_isolate_professional_commission.sql` | `FAE8E2C5198739FA0D3690B997A941CA85C796125150FDD399ABF7F5D8FA7A5B` |
| 14 | `20260804070000_harden_professional_commission_security.sql` | `2ADAF81D00E7988F26218707E3DEAEFB2CA381F775F04451A6AABF3B07A82E99` |
| 15 | `20260806050000_revoke_anon_commission_rpc_execute.sql` | `BED4049F153FF1FA1909F599595091692CE5AE52E128BE639C5C93C149D730E7` |

# 8. Inventário dos arquivos históricos

| Arquivo histórico | SHA-256 | Situação |
|---|---|---|
| `20260731192927_secure_saas_foundation.sql` | `809975CE863C29D5ED1241331C13CC03EF8AF24B769D1EE5A9298B59896FF8EE` | Histórico pré-baseline; fora da sequência executável |
| `20260731193020_complete_saas_security_foundation.sql` | `911B48CC672263E5FDE80DA6CD1A09DAEA006D527C5E19EBEE52BE93A241B3F3` | Histórico pré-baseline; fora da sequência executável |

# 9. Histórico remoto verdadeiro

A consulta ao Supabase remoto retornou exatamente 13 registros:

| Ordem | Versão remota | Nome registrado remotamente |
|---:|---|---|
| 1 | `20260801001539` | `baseline_remote_schema` |
| 2 | `20260803044908` | `add_barbershop_image_storage` |
| 3 | `20260803045033` | `harden_barbershop_image_access` |
| 4 | `20260803071307` | `add_initial_registration_details` |
| 5 | `20260803195045` | `fix_barbershop_image_upload_policy` |
| 6 | `20260803222030` | `20260803205726_install_customer_crm_booking` |
| 7 | `20260803224530` | `20260803230000_secure_public_catalog_and_internal_trigger` |
| 8 | `20260804013607` | `20260803230000_optimize_booking_intervals_10min` |
| 9 | `20260804043338` | `add_team_invitations` |
| 10 | `20260806040824` | `20260804050000_add_professional_commission_rate` |
| 11 | `20260806040831` | `20260804060000_isolate_professional_commission` |
| 12 | `20260806040839` | `20260804070000_harden_professional_commission_security` |
| 13 | `20260806051055` | `20260806050000_revoke_anon_commission_rpc_execute` |

Correção principal em relação à versão anterior deste mapa:

- `20260804060000` possui registro remoto próprio em `20260806040831`;
- `20260804070000` possui registro remoto próprio em `20260806040839`;
- `20260802180056` não possui registro remoto atual;
- `20260803015008` não possui registro remoto atual.

# 10. Mapa local × remoto

| Migration local | Registro remoto correspondente | Tipo de correspondência |
|---|---|---|
| `20260801001539_baseline_remote_schema.sql` | `20260801001539 baseline_remote_schema` | Versão correspondente |
| `20260802180056_customer_crm_vertical_slice.sql` | Nenhum registro | Ausente remotamente |
| `20260803015008_fix_customer_phone_normalization.sql` | Nenhum registro | Ausente remotamente |
| `20260803044908_add_barbershop_image_storage.sql` | `20260803044908 add_barbershop_image_storage` | Versão correspondente |
| `20260803045033_harden_barbershop_image_access.sql` | `20260803045033 harden_barbershop_image_access` | Versão correspondente |
| `20260803071307_add_initial_registration_details.sql` | `20260803071307 add_initial_registration_details` | Versão correspondente |
| `20260803195045_fix_barbershop_image_upload_policy.sql` | `20260803195045 fix_barbershop_image_upload_policy` | Versão correspondente |
| `20260803222030_install_customer_crm_booking.sql` | `20260803222030 20260803205726_install_customer_crm_booking` | Versão igual; nome divergente |
| `20260803224530_secure_public_catalog_and_internal_trigger.sql` | `20260803224530 20260803230000_secure_public_catalog_and_internal_trigger` | Versão igual; nome divergente |
| `20260804013607_optimize_booking_intervals_10min.sql` | `20260804013607 20260803230000_optimize_booking_intervals_10min` | Versão igual; nome divergente |
| `20260804020000_add_team_invitations.sql` | `20260804043338 add_team_invitations` | Timestamp divergente; correspondência lógica provável |
| `20260804050000_add_professional_commission_rate.sql` | `20260806040824 20260804050000_add_professional_commission_rate` | Timestamp divergente; correspondência lógica provável |
| `20260804060000_isolate_professional_commission.sql` | `20260806040831 20260804060000_isolate_professional_commission` | Timestamp divergente; correspondência lógica provável |
| `20260804070000_harden_professional_commission_security.sql` | `20260806040839 20260804070000_harden_professional_commission_security` | Timestamp divergente; correspondência lógica provável |
| `20260806050000_revoke_anon_commission_rpc_execute.sql` | `20260806051055 20260806050000_revoke_anon_commission_rpc_execute` | Timestamp divergente; correspondência lógica provável |

O histórico remoto não contém hash que permita declarar igualdade byte a byte para as correspondências lógicas.

# 11. Matriz consolidada de objetos

| Grupo | Objetos principais | Evidência atual |
|---|---|---|
| Baseline | barbearias, profissionais, serviços, agenda, equipe, RLS | Representado pelo baseline remoto |
| CRM | `customer_consent_type`, `customers`, `barbershop_customers`, `customer_consents`, `appointments.customer_global_id`, view e RPCs | Estado remoto compatível com a instalação consolidada `20260803222030` |
| Storage | bucket `barbershop-images` e policies em `storage.objects` | Bucket e policies presentes; DELETE ainda incorreto |
| Cadastro inicial | `barbershops.initial_registration_completed`, `barbershop_registration_details` | Presentes; migration remota `20260803071307` |
| Convites | `team_invitations` e quatro RPCs | Presentes; grants anônimos ainda pendentes de correção |
| Comissão | coluna transitória, tabela privada e RPCs | Estado final presente; quatro registros remotos separados |

# 12. Análise do grupo CRM

Migrations locais envolvidas:

- `20260802180056_customer_crm_vertical_slice.sql`;
- `20260803015008_fix_customer_phone_normalization.sql`;
- `20260803222030_install_customer_crm_booking.sql`.

O histórico remoto atual não registra as duas primeiras. Registra apenas a instalação consolidada em `20260803222030`.

A execução local das três, em sequência, continua com risco bloqueador de objetos duplicados porque a consolidada recria enum, tabelas, coluna, triggers, policies, funções e view já introduzidos pela primeira migration.

A migration de normalização corrige `public.sync_customer_for_appointment()`, recalcula `customers.phone_normalized` e ajusta grants. A consolidada absorve a correção funcional, mas os grants devem ser avaliados pelo estado final pretendido e por testes de segurança.

# 13. Análise do grupo de convites

Migration local:

- `20260804020000_add_team_invitations.sql`.

Registro remoto:

- `20260804043338 add_team_invitations`.

A correspondência é lógica e provável, com timestamp divergente. Não é possível declarar igualdade byte a byte apenas pelo histórico remoto.

O estado remoto verificado mantém `EXECUTE` para `anon` nas RPCs administrativas de convite, assunto destinado à Etapa 3.

# 14. Análise do grupo de comissões

Cadeia local atual:

```text
20260804050000
  cria professionals.commission_rate_percent

20260804060000
  lê a coluna transitória
  cria professional_commission_settings
  migra os valores
  remove a coluna transitória

20260804070000
  depende da tabela criada anteriormente
  remove barbershop_id da tabela privada
  endurece grants e RPCs

20260806050000
  revoga EXECUTE de anon nas RPCs financeiras
```

Histórico remoto verdadeiro:

| Migration local | Registro remoto |
|---|---|
| `20260804050000` | `20260806040824` |
| `20260804060000` | `20260806040831` |
| `20260804070000` | `20260806040839` |
| `20260806050000` | `20260806051055` |

As quatro etapas possuem registros remotos separados. A cadeia local continua mecanicamente dependente e não deve ser reduzida sem reescrita e teste em ambiente descartável.

# 15. Análise do Storage

Migrations locais:

- `20260803044908_add_barbershop_image_storage.sql`;
- `20260803045033_harden_barbershop_image_access.sql`;
- `20260803195045_fix_barbershop_image_upload_policy.sql`.

As três possuem registros remotos com as mesmas versões locais.

A policy de `DELETE` ainda referencia o nome da barbearia no cálculo de pasta, em vez de usar o caminho de `storage.objects.name`. A correção pertence a uma etapa técnica posterior e não foi aplicada nesta reconciliação documental.

# 16. Análise de RLS e papéis

O estado remoto verificado confirma:

- escrita direta em `professionals` restrita ao owner;
- escrita em `services` restrita ao owner;
- escrita em `business_hours` restrita ao owner;
- manager com acesso de leitura administrativa em áreas específicas;
- divergência entre UI e RLS ainda pendente de decisão formal.

# 17. Sobreposições e conflitos de replay

## CRM

Executar `20260802180056` e depois `20260803222030` em banco vazio provoca risco de `already exists` em tipos, tabelas, triggers e policies.

## Comissão

Retirar `20260804050000` sem reescrever `20260804060000` quebra a leitura da coluna transitória. Retirar `20260804060000` quebra a dependência de `20260804070000`.

## Histórico remoto

Os timestamps divergentes impedem assumir que `db push` reconhecerá automaticamente equivalência entre todos os arquivos locais e registros remotos.

# 18. Migrations locais sem correspondência remota

As migrations locais sem registro remoto atual são:

1. `20260802180056_customer_crm_vertical_slice.sql`;
2. `20260803015008_fix_customer_phone_normalization.sql`.

Elas são candidatas provisórias a serem preservadas como histórico fora da futura sequência executável, desde que a instalação consolidada seja validada em banco descartável e cubra o comportamento final necessário.

# 19. Migrations remotas sem correspondência local

Não foi identificada entrada remota sem correspondência lógica local.

Existem divergências de versão ou nome, mas todas as 13 entradas remotas podem ser relacionadas a arquivos locais conhecidos.

# 20. Classificação provisória

## Migrations executáveis locais

- **CANÔNICAS (6)**
  - `20260801001539_baseline_remote_schema.sql`
  - `20260803044908_add_barbershop_image_storage.sql`
  - `20260803071307_add_initial_registration_details.sql`
  - `20260803222030_install_customer_crm_booking.sql`
  - `20260804020000_add_team_invitations.sql`
  - `20260804060000_isolate_professional_commission.sql`

- **CORRETIVAS (6)**
  - `20260803045033_harden_barbershop_image_access.sql`
  - `20260803195045_fix_barbershop_image_upload_policy.sql`
  - `20260803224530_secure_public_catalog_and_internal_trigger.sql`
  - `20260804013607_optimize_booking_intervals_10min.sql`
  - `20260804070000_harden_professional_commission_security.sql`
  - `20260806050000_revoke_anon_commission_rpc_execute.sql`

- **SUBSTITUÍDAS PROVISORIAMENTE (2)**
  - `20260802180056_customer_crm_vertical_slice.sql`
  - `20260803015008_fix_customer_phone_normalization.sql`

- **PENDENTE DE DECISÃO (1)**
  - `20260804050000_add_professional_commission_rate.sql`

Total: 15 migrations executáveis locais.

## Históricas fora da sequência

- 2 arquivos pré-baseline.

# 21. Riscos da futura Etapa 2B

1. remover migrations CRM sem confirmar todos os objetos, grants e comportamentos da consolidada;
2. quebrar a cadeia de comissão ao remover uma etapa transitória sem reescrever dependências;
3. executar `db push` diante de timestamps divergentes;
4. alterar precipitadamente `schema_migrations` e perder rastreabilidade;
5. validar apenas existência de objetos, sem testes RLS e funcionais.

# 22. Questões não resolvidas

1. manter a cadeia completa de comissão ou consolidá-la para instalações novas;
2. preservar as duas migrations CRM antigas fora da sequência executável;
3. escolher a forma suportada de reconciliar arquivos locais e histórico remoto;
4. definir os testes obrigatórios antes de qualquer ajuste remoto;
5. aprovar a matriz owner/manager antes de alterar RLS.

# 23. Recomendação para a Etapa 2B

A Etapa 2B deve ocorrer primeiro em ambiente local e descartável:

1. copiar a sequência proposta para um contexto de teste sem alterar o remoto;
2. aplicar do zero;
3. registrar a primeira falha real;
4. ajustar a proposta de sequência;
5. repetir até execução completa;
6. executar testes de isolamento tenant A × B e papéis;
7. produzir plano de reconciliação remota separado;
8. solicitar aprovação explícita antes de qualquer mudança no Supabase.

# 24. Evidências coletadas

- hashes SHA-256 dos arquivos locais;
- histórico Git;
- consulta somente leitura a `supabase_migrations.schema_migrations`;
- catálogo PostgreSQL;
- policies e grants remotos;
- documentação de auditoria existente;
- registro da verificação no Linear `CAL-5`.

# 25. Confirmação de ausência de mutações

Durante a correção deste histórico:

- nenhum arquivo SQL foi alterado;
- nenhuma migration foi aplicada;
- nenhum comando mutável do Supabase foi executado;
- nenhum registro de `schema_migrations` foi alterado;
- nenhum dado de clientes, agendamentos ou barbearias foi consultado;
- o banco remoto permaneceu inalterado.

A Etapa 2A permanece documental. A Etapa 2B ainda não foi iniciada.