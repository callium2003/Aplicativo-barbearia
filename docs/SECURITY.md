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
