# P0 Security Remediations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir AUTH-01 e produzir uma correção local verificável para AUTHZ-01, preservando os fluxos legítimos, e interromper ABUSE-01 em uma proposta técnica porque não existe regra comercial aprovada.

**Architecture:** A navegação pós-login será isolada em um helper puro que resolve o destino contra a origem e retorna somente caminhos internos permitidos. A edição de status de agendamentos passará por uma RPC `SECURITY DEFINER` com autorização explícita; a policy direta deixará de autorizar o profissional, mas continuará preservando cancelamento de cliente e administração owner/manager. ABUSE-01 não alterará produção nesta fase.

**Tech Stack:** Next.js 16.3.1, React 19.2.6, Node test runner, TypeScript, Supabase/PostgreSQL 17 e migrations SQL.

**Spec:** `C:/Users/calli/.codex/attachments/576f538b-ef32-4fcb-af07-03f9198b9965/pasted-text.txt`

## Global Constraints

- Trabalhar somente no worktree `C:/Users/calli/Documents/Codex/worktrees/barbeariasp-security-p0-remediations-20260907` e na branch `security/p0-remediations-20260907`.
- Partir de `f16252ff97edb4f064e4bee1e84510ba023e914e` e não incorporar alterações do redesign.
- Não fazer commit, push, PR, merge, deploy, migration remota ou alteração de dados reais.
- Não alterar migrations antigas; toda correção de schema deve estar em migration nova.
- Não implementar assinatura, pagamentos, e-mail, redesign, LGPD documental, headers, dependências ou hardening fora dos três achados.
- Usar testes antes da implementação quando o ambiente permitir e não mascarar falhas.

---

### Task 1: AUTH-01 — retorno interno seguro após login

**Files:**
- Create: `app/customer-return-path.mjs`
- Create: `tests/customer-return-path.test.mjs`
- Modify: `app/cliente/entrar/page.tsx`

**Interfaces:**
- Produces: `safeCustomerReturnPath(value: unknown, origin: string): string`.
- Default: `/meus-agendamentos`.
- Legitimate paths: somente `/meus-agendamentos`, `/meu-perfil` e `/meu-perfil/privacidade`, preservando query/hash internos quando existirem.

- [ ] **Step 1: escrever testes RED do helper público**

Casos literais válidos devem manter o caminho interno. URLs `http:`, `https:`, protocol-relative, barra invertida literal ou percent-encoded, dupla codificação que resulte em barra invertida, caracteres de controle, credenciais/host e origem diferente devem retornar `/meus-agendamentos`.

- [ ] **Step 2: executar `node --test tests/customer-return-path.test.mjs` e confirmar falha pela ausência do helper**

- [ ] **Step 3: implementar o helper mínimo**

Decodificar de forma limitada para detectar representações de `\\` e controles, validar também cada representação decodificada com `new URL(value, origin)`, exigir `url.origin === origin`, protocolo HTTP(S) e pathname presente na allowlist dos três callers reais. Retornar somente `pathname + search + hash` ou o default.

- [ ] **Step 4: integrar `app/cliente/entrar/page.tsx`**

Substituir a validação local pelo helper, passando `window.location.origin`, sem alterar o restante do fluxo Google/magic link/cadastro.

- [ ] **Step 5: executar os testes direcionados e confirmar GREEN**

Run: `node --test tests/customer-return-path.test.mjs tests/public-booking-access.test.mjs tests/public-slug-and-customer-rebooking.test.mjs`

- [ ] **Step 6: revisar diff e confirmar que não há mudança visual nem de autenticação fora do retorno**

Não criar commit.

### Task 2: AUTHZ-01 — atualização segura de status do agendamento

**Files:**
- Create: `supabase/migrations/<generated>_restrict_barber_appointment_updates.sql`
- Create: `tests/appointment-status-authorization-rls.sql`
- Modify: `app/painel/agenda/page.tsx`
- Modify: `tests/public-booking-access.test.mjs` somente se for necessário um teste de integração do caller.

**Interfaces:**
- Produces: `public.set_appointment_status(p_appointment_id uuid, p_status text) returns void`.
- RPC executável somente por `authenticated`.
- Profissional: somente agendamento atribuído ao profissional vinculado e apenas transições expostas pela agenda atual.
- Owner/manager: agendamento da própria barbearia e as mesmas transições expostas pela agenda atual.
- Cliente: continua cancelando pelo caminho existente, não por esta RPC.

- [ ] **Step 1: criar migration vazia pelo CLI**

Run: `npx supabase migration new restrict_barber_appointment_updates`

- [ ] **Step 2: escrever primeiro o teste SQL de autorização**

O roteiro transacional deve provar: profissional lê o próprio agendamento; alteração direta de PII/preço/horário falha; RPC permite mudança legítima de status; profissional de outro agendamento falha; owner/manager do tenant permanece autorizado; cliente continua cancelando somente o próprio agendamento; todas as alterações terminam em `ROLLBACK`.

- [ ] **Step 3: registrar a limitação RED do ambiente**

Tentar `npx supabase status`. Se Docker continuar indisponível, não aplicar a migration remotamente e registrar que o teste SQL não pôde ser executado.

- [ ] **Step 4: implementar a migration mínima**

Recriar `Authenticated can update allowed appointments` sem a condição do profissional. Criar RPC com `SECURITY DEFINER`, `SET search_path = ''`, `auth.uid()` obrigatório, `SELECT ... FOR UPDATE`, tenant/papel/profissional explícitos, allowlist de estados e transições, `REVOKE ALL FROM PUBLIC, anon` e `GRANT EXECUTE TO authenticated`.

- [ ] **Step 5: trocar o caller da agenda para a RPC**

Substituir `.from("appointments").update({ status }).eq("id", item.id)` por `supabase.rpc("set_appointment_status", { p_appointment_id: item.id, p_status: status })`, preservando mensagens e recarga.

- [ ] **Step 6: executar validações locais que não dependem do banco**

Run: `node --test tests/public-booking-access.test.mjs tests/financial-reporting.test.mjs tests/notifications.test.mjs tests/audit-coverage.test.mjs tests/supabase-migration-lineage.test.mjs`

Run: `npx tsc --noEmit --incremental false`

- [ ] **Step 7: revisar a migration contra grants, RLS, triggers, relatórios e notificações**

Não criar commit nem aplicar a migration no Supabase remoto.

### Task 3: ABUSE-01 — proposta técnica sem implementação

**Files:**
- No production files.
- Record the proposal in the final remediation report only.

**Interfaces:**
- Proposed rule for approval: no máximo três agendamentos futuros ativos por cliente em uma mesma barbearia; ativos são `scheduled` e `confirmed`; `cancelled`, `completed` e `no_show` não contam.

- [ ] **Step 1: confirmar que nenhuma documentação aprova um limite de reservas futuras**

- [ ] **Step 2: propor enforcement transacional no banco**

A futura implementação deve serializar por `(auth.uid(), barbershop_id)` antes da contagem, aplicar a regra no `book_customer_appointment`/trigger, manter outros clientes e tenants independentes e retornar código controlado ao frontend.

- [ ] **Step 3: parar esta parte sem editar código ou migrations**

Registrar como `blocked_pending_product_approval`, com os cinco casos de teste exigidos na especificação.

### Task 4: verificação integrada e revisão

**Files:**
- Review every changed file; no additional production scope.

- [ ] **Step 1: executar testes direcionados, typecheck, lint e `git diff --check`**

- [ ] **Step 2: executar `npm test` com variáveis carregadas somente no processo**

- [ ] **Step 3: executar revisão independente de bypass/regressão sobre o diff completo**

- [ ] **Step 4: confirmar que o checkout principal do redesign não mudou**

- [ ] **Step 5: entregar go/no-go para revisão humana sem commit, push, PR, merge ou deploy**
