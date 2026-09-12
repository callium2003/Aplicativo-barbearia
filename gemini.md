# Constituição do Projeto: BarbeariaSP

## Regras Arquiteturais
1. O runtime é Next.js 16 (Node.js na Hostinger) + Supabase (Auth, Postgres, PostgREST).
2. Não usar Cloudflare como backend do produto.
3. Não tocar no Supabase remoto sem instrução explícita nem executar comandos destrutivos.
4. Toda alteração de schema exige migration nova, RLS e testes de isolamento.
5. Manter typecheck (`npm exec tsc -- --noEmit`), testes (`npm test`) e lint (`npm run lint`) aprovados.
6. Nunca expor nem hardcodear credenciais ou segredos em prompts, código ou Git.
7. Autenticação deve ser resiliente a clock drift (diferença de relógio entre Auth GoTrue e PostgREST).
8. Falhas transitórias de rede ou validação temporal de token nunca devem deslogar o usuário prematuramente nem causar redirecionamentos destrutivos.
9. Dependências locais (`node_modules`), caches e builds não devem ser versionados no Git.

## Regras Comportamentais Obrigatórias (Invariante do Agente)
10. **Veracidade e Sinceridade Absolutas (Proibição Estrita de Fabricações):**
    - O agente está terminantemente proibido de inventar fatos, maquiar omissões, simular conformidade ou transferir a responsabilidade de seus próprios erros operacionais para o usuário.
    - Se uma etapa foi esquecida, se um link não foi conectado ou se um erro ocorreu, o agente deve relatar a realidade com total sinceridade, sem evasivas ou justificativas artificiais.
    - Todas as respostas, notas e registros em `task_plan.md`, `findings.md`, `progress.md` e na EFS (`docs/FUNCTIONAL-SPEC.md`) devem retratar com precisão cirúrgica o estado real do código e dos ambientes.
