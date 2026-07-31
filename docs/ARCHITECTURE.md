# Arquitetura

BarbeariaSP é uma aplicação web responsiva, sem aplicativo instalado. React/Next/Vinext/Vite compõem o frontend; `@supabase/supabase-js` é usado pelas telas. Supabase PostgreSQL é o banco principal e Supabase Auth atende Google e magic link.

## Componentes

| Componente | Estado | Responsabilidade |
|---|---|---|
| `app/` | IMPLEMENTADO | páginas públicas, autenticação e painel |
| `app/[slug]/page.tsx` | PARCIAL | página pública, serviços, disponibilidade e agendamento |
| `app/painel/` | PARCIAL | configuração e agenda; clientes/relatórios ainda fictícios |
| Supabase PostgreSQL | Principal | dados e RLS |
| `worker/index.ts` | Presente | participa do runtime/build Vinext |
| `db/index.ts`, Drizzle e D1 | Remanescente | não são o banco principal |

Cada registro operacional pertence a uma barbearia: ela é o tenant. RLS é obrigatório; filtros por `barbershop_id` no frontend não autorizam acesso. Papéis: `owner`, `manager`, `barber`; `customer` não é membro administrativo.

O slug público é `/{slug}`. A agenda considera expediente, serviços, profissionais, pausas e bloqueios. SQLs preservados descrevem proteção de sobreposição, validação de itens ativos, `audit_logs` e status `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`. A aplicação remota e os testes RLS A × B ainda aguardam homologação.

Trial/assinatura e `SubscriptionGate` são parciais; checkout/webhooks não existem. `worker/index.ts` participa do runtime/build; Drizzle/D1 são remanescentes e só devem ser removidos em limpeza coordenada após análise do build. Hostinger é pretendida, mas deploy, domínio, HTTPS, Auth URLs, e-mail, backups e monitoramento ainda não estão definidos/homologados.
