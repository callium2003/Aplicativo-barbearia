# Findings - Investigação de Autenticação Supabase (PGRST303)

## Descoberta 1: Contexto e Commits Recentes
- Três commits recentes foram feitos localmente para tentar contornar falhas de verificação de acesso:
  - `6af215f`: recupera falhas de lookup no `SubscriptionGate` em vez de deslogar e forçar redirect para `/entrar`.
  - `fb2bd36`: adiciona loop de retry para erro `PGRST303` ("JWT issued at future") em `getPanelContext` com 2s/4s de espera.
  - `27fcb44`: adiciona `await supabase.auth.refreshSession()` antes de esperar no loop de retry de `getPanelContext`.
- No ambiente Hostinger (produção), o deploy atual (`01a0773d-5881-709e-aafa-1a7daf78e78d`) foi feito no commit `0c6dc08`, ou seja, **antes** desses três commits!
- Na versão atualmente em produção:
  - Se a consulta falhar com `PGRST303`, o `SubscriptionGate` captura o erro no bloco `catch`, executa `await supabase.auth.signOut({ scope: "local" })` e redireciona imediatamente para `window.location.replace("/entrar")`.
  - Isso explica com 100% de exatidão o sintoma de "fica em Verificando seu acesso... ou retorna para /entrar" na produção.

## Descoberta 2: Causa Raiz do Erro PostgREST `PGRST303` ("JWT issued at future")
- O PostgREST valida a claim `iat` (issued at) do JWT emitido pelo Supabase Auth (GoTrue).
- Se `iat > now()` do servidor de banco de dados/PostgREST (mesmo que por frações de segundo, 100ms a 1s de clock drift entre a VM do Auth e a VM do PostgREST/Postgres), o PostgREST rejeita a requisição com:
  `HTTP 401 Unauthorized`
  `code: PGRST303`
  `message: JWT issued at future`
- O PostgREST não aplica tolerância de clock skew por padrão quando o token tem `iat` no futuro.
- Se o cliente chama `refreshSession()` imediatamente no primeiro erro, o Auth emite um novo token com o timestamp atual do Auth, que ainda pode estar à frente do PostgREST se houver skew de alguns segundos.

## Descoberta 3: Concorrência e Múltiplas Chamadas ao `getPanelContext`
- Ao carregar `/painel`:
  - `SubscriptionGate` (no `layout.tsx`) executa `getPanelContext(supabase)`.
  - Simultaneamente, `Painel` (`page.tsx`) executa `getPanelContext(supabase)`.
  - Ambos disparam requisições `supabase.from("barbershops").select(...)` em paralelo.
  - Se a primeira tentativa falhar em ambos, há 2 chamadas de `refreshSession()` e retries concorrentes.
