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

## CRM de clientes

`customers` concentra a identidade global associada ao usuário do Auth quando houver login. `barbershop_customers` é a relação isolada por tenant; não guarda contadores mutáveis. A view `barbershop_customer_history`, com `security_invoker`, calcula visitas, primeira e última visita e receita a partir de `appointments` e dos snapshots de `appointment_services`.

`book_customer_appointment` é uma RPC `SECURITY INVOKER`: insere o agendamento usando as validações e a exclusão de conflito já existentes. O trigger vincula o customer e a barbearia, e a mesma transação registra apenas os opt-ins informados. `customer_consents` guarda cada concessão ou revogação como um evento separado, com versão `1.0` e origem definidas no servidor.

## Contato e localização

Os links de contato e localização são construídos no frontend por `app/contact-links.mjs`: WhatsApp usa somente números brasileiros normalizados em `wa.me`; Maps usa rota pública do Google Maps a partir do endereço cadastrado. Não há API, chave, geocodificação, mapa incorporado nem mensagem automática. A página pública usa apenas o WhatsApp da barbearia; o CRM usa o telefone do cliente que owner e manager já podem ler pelas políticas existentes.
