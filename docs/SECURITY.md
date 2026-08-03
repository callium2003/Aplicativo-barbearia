# Segurança

- Supabase RLS é obrigatório para isolamento entre tenants; filtros de frontend não substituem políticas.
- `service_role` é proibido no frontend e `user_metadata` não pode autorizar acesso.
- Funções administrativas de assinatura devem ser protegidas.
- Papéis: `owner`, `manager`, `barber`; `customer` não é membro administrativo.
- O cliente só deve ler seus próprios agendamentos e cancelar futuro próprio conforme política.
- PostgreSQL deve proteger agenda contra itens inativos, expediente inválido, pausas, bloqueios e sobreposição.
- `audit_logs` registra ações técnicas relevantes; views exigem revisão de RLS e `security_invoker`.
- Mudança de schema exige migration nova; não reescreva migrations preservadas.
- São proibidos comandos destrutivos no Supabase remoto e segredos no repositório.

Os SQLs estão em `supabase/migration-history/prebaseline-local/`; não os mova antes da homologação. A aplicação remota completa e os testes RLS A × B aguardam homologação.

Direcionamento futuro, não parecer jurídico: a barbearia pode ser controladora para finalidades próprias; a plataforma pode ser operadora em algumas operações e controladora quando definir finalidade própria. Consentimentos da barbearia e plataforma devem ser separados. Validação jurídica formal será necessária antes de produção.

## CRM e consentimentos

- `customers`, `barbershop_customers` e `customer_consents` usam RLS. Cliente lê apenas a própria identidade, relações e consentimentos; owner/manager só leem o CRM da sua barbearia; barber não recebe acesso direto ao CRM completo; anon não recebe dados privados.
- Consentimento de marketing da barbearia exige relacionamento com aquela barbearia. Consentimento da plataforma exige `barbershop_id` nulo. Owner/manager nunca lê consentimento de plataforma do cliente.
- A view de histórico usa `security_invoker`, portanto continua submetida à RLS das tabelas de origem. A helper privada que evita recursão de policy só responde ao papel existente da barbearia e tem `EXECUTE` limitado a `authenticated`.
- A trigger de criação de customer é `SECURITY DEFINER` apenas porque precisa vincular um agendamento do cliente a tabelas privadas sem conceder escrita direta ampla. Ela fixa `search_path`, confere `auth.uid()` e não é executável pelo público. A RPC de agendamento é `SECURITY INVOKER`.
- As RPCs públicas de agendamento e revogação continuam `SECURITY INVOKER`, mas têm `EXECUTE` revogado de `PUBLIC` e `anon`; somente `authenticated` pode chamá-las.
- Os eventos de consentimento usam versão `1.0` e origem controladas no servidor: `booking_form` para concessões do agendamento e `customer_settings` para revogações. A policy de escrita exige uma marca interna temporária da RPC, impedindo inserções diretas do navegador com origem ou versão forjada.
