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
