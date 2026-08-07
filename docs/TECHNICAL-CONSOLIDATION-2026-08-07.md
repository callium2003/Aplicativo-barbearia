# Consolidação técnica — 2026-08-07

## Objetivo

Confirmar que as correções técnicas realizadas em branches separadas não ficaram isoladas ou perdidas antes de continuar a evolução do BarbeariaSP.

Branch técnica atual:

```text
chore/reconcile-supabase-migrations-2026-08-07
```

Esta branch permanece separada da `main`; não houve merge, PR ou deploy nesta verificação.

## Correções confirmadas na linha atual

As comparações do GitHub mostraram que a branch atual contém integralmente as seguintes linhas anteriores (`behind_by = 0` em relação a cada uma):

| Linha anterior | Resultado |
|---|---|
| `fix/storage-delete-policy-2026-08-06` | contida na linha atual |
| `fix/team-invitations-table-privileges-2026-08-06` | contida na linha atual |
| `fix/team-invitation-rpc-privileges-2026-08-06` | contida na linha atual |
| `fix/invitation-token-privacy-2026-08-06` | contida na linha atual |
| `fix/role-permission-matrix-2026-08-06` | contida na linha atual |
| `fix/professional-schedule-manager-and-performance-2026-08-06` | contida na linha atual |

Portanto, as correções de Storage, convites, privacidade de token, matriz de permissões, agenda/performance, CI/dependências, remoção Drizzle/D1 e reconciliação de migrations estão na mesma linha técnica atual.

## Branch antiga de auditoria

A branch:

```text
docs/audit-remediation-plan-2026-08-06
```

se separou antes das correções e contém alterações antigas de documentação que já não representam o estado atual. Ela não foi mesclada integralmente para evitar regredir README, arquitetura, segurança, roadmap e baseline.

Dois documentos úteis como fotografia histórica foram preservados sem alteração em:

```text
docs/history/AUDIT-REMEDIATION-PLAN-2026-08-06.md
docs/history/MIGRATION-RECONCILIATION-MAP-2026-08-06.md
```

`docs/history/README.md` deixa explícito que esses arquivos são históricos e não substituem a documentação vigente.

## Estado resultante

Não foi necessário juntar código de branches antigas: as correções relevantes já eram ancestrais da linha atual.

A branch técnica atual pode ser tratada como a linha consolidada de continuidade para os próximos trabalhos, até que seja tomada uma decisão explícita sobre PR/merge para `main` e publicação.

## Limites preservados

Nesta consolidação não houve:

- mudança no Supabase;
- alteração de dados;
- mudança na Hostinger ou DNS;
- PR;
- merge em `main`;
- deploy.
