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
