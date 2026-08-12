## BarbeariaSP

Leia `README.md` e `docs/` antes de trabalhar. Antes de editar, execute `git status --short` e `git log -1 --oneline`.

- Não toque no Supabase remoto sem instrução explícita nem execute comandos destrutivos.
- Não altere migrations antigas nem mova SQLs em `supabase/migration-history/prebaseline-local/`.
- Mudanças de schema exigem migration nova, RLS e testes de isolamento.
- Trabalhe por funcionalidades verticais e preserve comportamento homologado.
- Não introduza novos erros de lint; corrija lint nos arquivos tocados.
- Mantenha typecheck (`npm exec tsc -- --noEmit`), testes e build aprovados.
- Não implemente pagamento sem decisão explícita.
- Não use segredos em prompts, código ou Git.
- Não crie commit, push ou deploy sem autorização explícita.

## Segurança (adicionado em 2026-08-12)

- Valide sempre inputs de usuário (Zod, Yup, ou schema equivalente) antes de usar em queries ou APIs.
- Nunca exponha dados sensíveis (CPF, e-mail, telefone) em logs, erros ou respostas de API sem necessidade.
- Use prepared statements/parameterized queries em todas as operações de banco.
- Revise políticas de RLS do Supabase antes de criar novas tabelas ou queries.
- Não hardcode URLs de API, chaves ou tokens — use variáveis de ambiente validadas no schema do Zod.
- Em caso de dúvida sobre segurança, pare e peça orientação explícita.
## Segurança do Supabase (adicionado em 2026-08-12)

- Toda nova tabela deve ter RLS habilitado (`ENABLE ROW LEVEL SECURITY`) antes de criar políticas.
- Políticas de RLS devem usar `private.current_barbershop_role()` ou equivalente para isolar por barbearia.
- Funções RPC sensíveis devem usar `REVOKE ALL FROM PUBLIC/ anon` antes de `GRANT EXECUTE TO authenticated`.
- Views expostas para `anon` não podem conter dados pessoais (CPF, e-mail, telefone, endereço).
- Tokens de convite devem ter expiração e serem invalidados após uso.
- Antes de criar nova função `SECURITY DEFINER`, validar que não há vazamento de dados via RLS bypass.
