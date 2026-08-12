# Lote 0 — reconciliação do histórico de migrations Supabase

Data: 2026-08-07

Branch:

```text
chore/reconcile-supabase-migrations-2026-08-07
```

Base:

```text
chore/remove-drizzle-d1-legacy-2026-08-07
```

## Objetivo

Eliminar a divergência entre os nomes/versões existentes em `supabase/migrations/` e o histórico realmente registrado no Supabase remoto de homologação, sem reescrever SQL aplicado e sem alterar o banco remoto.

## Histórico remoto consultado

A operação somente-leitura `list_migrations` confirmou 21 versões no projeto Supabase `irszgnkzqseljowckrgz`:

```text
20260801001539
20260803044908
20260803045033
20260803071307
20260803195045
20260803222030
20260803224530
20260804013607
20260804043338
20260806040824
20260806040831
20260806040839
20260806051055
20260807015209
20260807015637
20260807020013
20260807020457
20260807022443
20260807022720
20260807025705
20260807030613
```

## Divergências encontradas

### CRM preliminar

Os arquivos locais:

```text
20260802180056_customer_crm_vertical_slice.sql
20260803015008_fix_customer_phone_normalization.sql
```

nunca foram registrados como versões remotas independentes. Eles foram substituídos pelo passo consolidado registrado como:

```text
20260803222030 / 20260803205726_install_customer_crm_booking
```

Os dois arquivos preliminares foram movidos, sem alteração de conteúdo, para:

```text
supabase/migration-history/substituted-local/
```

### Versões locais diferentes das versões remotas

Os seguintes arquivos já representavam SQL aplicado, mas carregavam localmente o timestamp lógico/original em vez da versão efetivamente registrada pelo Supabase:

```text
20260804020000_add_team_invitations.sql
20260804050000_add_professional_commission_rate.sql
20260804060000_isolate_professional_commission.sql
20260804070000_harden_professional_commission_security.sql
20260806050000_revoke_anon_commission_rpc_execute.sql
```

Também havia migrations cujo número principal já coincidia com o remoto, mas cujo nome não preservava exatamente o nome registrado via `apply_migration`.

## Correção aplicada

Os arquivos foram renomeados reutilizando os mesmos blobs Git, portanto com zero alteração de SQL:

```text
20260803222030_20260803205726_install_customer_crm_booking.sql
20260803224530_20260803230000_secure_public_catalog_and_internal_trigger.sql
20260804013607_20260803230000_optimize_booking_intervals_10min.sql
20260804043338_add_team_invitations.sql
20260806040824_20260804050000_add_professional_commission_rate.sql
20260806040831_20260804060000_isolate_professional_commission.sql
20260806040839_20260804070000_harden_professional_commission_security.sql
20260806051055_20260806050000_revoke_anon_commission_rpc_execute.sql
```

A comparação Git registrou essas operações como `renamed`, com `0 additions`, `0 deletions` e `0 changes` no conteúdo das migrations.

## Proteção contra regressão

Foi adicionado:

```text
tests/supabase-migration-lineage.test.mjs
```

O teste exige que `supabase/migrations/` contenha exatamente as 21 migrations canônicas e garante que as versões preliminares `20260802180056` e `20260803015008` não retornem à sequência executável.

O teste foi incorporado ao comando `npm test`.

## O que não foi feito

Este lote não executou:

```text
supabase migration repair
supabase db push
supabase db reset
```

Também não houve:

- edição manual de `supabase_migrations.schema_migrations`;
- DDL no Supabase remoto;
- alteração ou exclusão de dados de homologação;
- deploy;
- alteração de Hostinger/DNS;
- PR ou merge para `main`.

## Limite desta reconciliação

O histórico de arquivos agora está alinhado às versões remotas. Isso remove a divergência conhecida de versionamento.

Uma prova de replay completo das 21 migrations em um banco vazio continua sendo uma etapa separada. Ela deve ser feita somente em ambiente descartável/local ou em uma branch de banco destinada a teste, nunca resetando o Supabase remoto de homologação apenas para validar histórico.

## Referência

A sequência canônica completa e a tabela versão/nome remoto estão em:

```text
docs/SUPABASE_BASELINE.md
```
