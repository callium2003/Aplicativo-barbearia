# Lote 0 — verificação automatizada

A reconciliação do histórico de migrations foi validada em ambiente limpo.

Passaram com sucesso:

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
- verificação de que `supabase/migrations/` contém exatamente as 21 versões registradas no Supabase remoto de homologação em 2026-08-07.

Nenhuma alteração foi feita no banco Supabase por este workflow.
