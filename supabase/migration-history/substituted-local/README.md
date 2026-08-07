# Migrations locais substituídas

Esta pasta preserva migrations que existiram localmente durante o desenvolvimento, mas que **não correspondem a versões registradas no histórico remoto** do Supabase de homologação.

Elas não fazem parte da sequência executável em `supabase/migrations/` e não devem ser aplicadas depois do baseline.

Arquivos preservados:

- `20260802180056_customer_crm_vertical_slice.sql`
- `20260803015008_fix_customer_phone_normalization.sql`

Esses dois passos locais foram substituídos pela migration consolidada registrada remotamente como versão `20260803222030`, nome `20260803205726_install_customer_crm_booking`.

A movimentação para esta pasta foi feita sem alterar o conteúdo dos arquivos. O objetivo é impedir replay duplicado de objetos CRM e, ao mesmo tempo, manter evidência histórica.

Regras:

- não mover estes arquivos de volta para `supabase/migrations/`;
- não aplicar estes SQLs no remoto;
- não usar `migration repair` para tentar registrá-los retroativamente;
- o histórico remoto confirmado por `list_migrations` é a referência para versões aplicadas;
- migrations futuras devem receber nova versão e nunca reescrever migrations já aplicadas.
