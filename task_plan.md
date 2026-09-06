# Plano de Tarefa - Investigação e Correção de Autenticação BarbeariaSP (PGRST303)

## Objetivo
Investigar e corrigir a causa raiz do erro de autenticação pós-login com Google no BarbeariaSP, onde a requisição à Data API do Supabase (`/rest/v1/barbershops`) falha com HTTP 401 `code: PGRST303`, `message: JWT issued at future`, deixando a interface presa em "Verificando seu acesso..." ou redirecionando de volta para `/entrar`.

---

## Fases do Protocolo V.L.A.E.G.

### Fase 1: V - Visão & Lógica
- [x] Identificar o sintoma relatado e o erro exato (`PGRST303: JWT issued at future`).
- [x] Analisar os commits recentes locais (`6af215f`, `fb2bd36`, `27fcb44`) e comparar com o ambiente Hostinger.
- [ ] Investigar a discrepância temporal (clock skew) entre Supabase Auth (GoTrue), PostgREST e o cliente/servidor.
- [ ] Analisar o ciclo de vida do token JWT emitido após OAuth e o tratamento no cliente `@supabase/supabase-js`.
- [ ] Mapear todas as chamadas no frontend que disparam requisições autenticadas logo após o redirect (`/painel`, `SubscriptionGate`, `getPanelContext`).

### Fase 2: L - Link & Conectividade
- [ ] Validar a comunicação com o projeto Supabase `irszgnkzqseljowckrgz`.
- [ ] Verificar headers de resposta, relógio do servidor Supabase (PostgREST) vs timestamp do token.
- [ ] Testar se o erro é reproduzível com chamadas controladas à API.

### Fase 3: A - Arquitetura & Implementação
- [ ] Definir a estratégia determinística e resiliente de tratamento de clock skew para JWTs:
  - Compensação de clock skew ou retry com backoff exponencial inteligente.
  - Sincronização e validação de sessão antes da primeira requisição de dados.
  - Proteção contra loops de logout / redirect em cascata entre `SubscriptionGate` e `Painel`.
- [ ] Implementar a solução mantendo compatibilidade total com testes existentes e regras de segurança.
- [ ] Adicionar/atualizar testes automatizados que cubram o cenário real de `JWT issued at future` e recuperação suave.

### Fase 4: E - Estilo & UX
- [ ] Garantir que o estado de carregamento e transição pós-login seja elegante e não cause flash de erro ou telas presas.
- [ ] Mensagens de feedback amigáveis em caso de atraso na validação do token.

### Fase 5: G - Gatilho & Validação
- [ ] Executar suíte completa de testes (`npm test`), typecheck (`tsc --noEmit`) e lint (`npm run lint`).
- [ ] Verificar build de produção (`npm run build`).
- [ ] Documentar o diagnóstico e a solução completa para o usuário e para o registro de manutenção.
