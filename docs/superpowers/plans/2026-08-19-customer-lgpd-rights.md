# Direitos do titular do cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir que um cliente autenticado exporte seus próprios dados e encerre a própria conta com anonimização e protocolo seguro.

**Architecture:** uma migration cria a tabela de protocolos, RPCs autenticadas e RLS. A página de privacidade usa somente essas interfaces. Uma Edge Function de escopo mínimo remove o usuário de Auth somente depois da anonimização transacional no banco.

**Tech Stack:** Next.js 16, React 19, Supabase Postgres/RLS/Auth/Edge Functions, Node test runner e Supabase CLI local.

**Spec:** `docs/superpowers/specs/2026-08-19-customer-lgpd-rights-design.md`

## Global Constraints

- Criar uma migration nova com timestamp gerado pelo Supabase CLI; não alterar migrations existentes.
- Não aplicar migration, deploy ou merge remoto.
- Nenhuma interface pública recebe `customer_id` ou chave administrativa.
- Ativar RLS antes das policies e conceder somente os privilégios necessários.
- Encerramento exige autenticação não renovada por `token_refresh` nos últimos 15 minutos.
- Os testes SQL usam apenas dados fictícios e terminam com `ROLLBACK`.

---

### Task 1: Contratos de regressão para direitos do cliente

**Files:**
- Create: `tests/customer-privacy-rights.test.mjs`
- Create: `tests/customer-privacy-rights-rls.sql`
- Modify: `package.json`

**Interfaces:**
- Consumes: migration `harden_customer_privacy_rights`, RPCs `export_my_customer_data()` e `anonymize_my_customer_account()`.
- Produces: contratos estáticos e SQL para o lote.

- [ ] **Step 1: Escrever o teste Node que exige a página, migration e Function**

```js
assert.match(migration, /enable row level security/i);
assert.match(migration, /export_my_customer_data/);
assert.match(edgeFunction, /getUser\(token\)/);
assert.doesNotMatch(edgeFunction, /user_id/);
```

- [ ] **Step 2: Executar o teste e confirmar falha pela ausência dos arquivos/contratos**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: FAIL porque migration, página e Edge Function ainda não existem.

- [ ] **Step 3: Escrever o roteiro SQL transacional**

```sql
begin;
-- criar dois titulares e dois tenants fictícios
-- trocar request.jwt.claims entre os titulares
-- verificar RLS, exportação, reautenticação e anonimização
rollback;
```

- [ ] **Step 4: Executar o teste Node e confirmar que ainda falha até a implementação**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: FAIL pelos contratos ainda ausentes.

### Task 2: Migration de protocolos, exportação e anonimização

**Files:**
- Create: `supabase/migrations/<timestamp>_harden_customer_privacy_rights.sql`
- Modify: `tests/customer-privacy-rights.test.mjs`
- Test: `tests/customer-privacy-rights-rls.sql`

**Interfaces:**
- Consumes: `public.customers`, `public.appointments`, `public.customer_consents`, `public.barbershop_customers`, `public.notification_outbox`, `public.audit_logs`.
- Produces: `public.customer_privacy_requests`, `public.export_my_customer_data()`, `public.anonymize_my_customer_account()`.

- [ ] **Step 1: Executar o teste de contrato antes da migration**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: FAIL porque a migration ainda não satisfaz os contratos.

- [ ] **Step 2: Implementar tabela e RLS antes das policies**

```sql
create table public.customer_privacy_requests (...);
alter table public.customer_privacy_requests enable row level security;
create policy "Customer reads own privacy requests" ...;
revoke all on table public.customer_privacy_requests from public, anon;
grant select on table public.customer_privacy_requests to authenticated;
```

- [ ] **Step 3: Implementar RPCs com titular pelo token e grants mínimos**

```sql
create function public.export_my_customer_data() returns jsonb ...;
create function public.anonymize_my_customer_account() returns table (...) ...;
revoke all on function ... from public, anon;
grant execute on function ... to authenticated;
```

- [ ] **Step 4: Executar contratos e roteiro SQL local**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: PASS; depois executar o roteiro por `psql` contra o Supabase local e confirmar `ROLLBACK`.

### Task 3: Edge Function de remoção de Auth

**Files:**
- Create: `supabase/functions/delete-my-customer-account/index.ts`
- Modify: `tests/customer-privacy-rights.test.mjs`

**Interfaces:**
- Consumes: Bearer JWT, `anonymize_my_customer_account()` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente da Function.
- Produces: resposta técnica sem PII e remoção idempotente do Auth após a RPC.

- [ ] **Step 1: Adicionar asserções para rejeitar `user_id` de entrada e exigir JWT**

```js
assert.match(edgeFunction, /Authorization/);
assert.match(edgeFunction, /getUser\(token\)/);
assert.doesNotMatch(edgeFunction, /requestBody\.user_id/);
```

- [ ] **Step 2: Executar o teste e confirmar falha pela Function ausente**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: FAIL com arquivo ausente.

- [ ] **Step 3: Implementar Function mínima**

```ts
const { data } = await authClient.auth.getUser(token);
await customerClient.rpc("anonymize_my_customer_account");
await adminClient.auth.admin.deleteUser(data.user.id);
```

- [ ] **Step 4: Executar o teste de contrato**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: PASS.

### Task 4: Página autenticada de privacidade

**Files:**
- Create: `app/meu-perfil/privacidade/page.tsx`
- Modify: `app/meu-perfil/page.tsx`
- Modify: `tests/customer-privacy-rights.test.mjs`

**Interfaces:**
- Consumes: `export_my_customer_data()`, `customer_privacy_requests` (somente SELECT) e `delete-my-customer-account`.
- Produces: download local de JSON, protocolos visíveis ao dono e chamada de exclusão reautenticada.

- [ ] **Step 1: Exigir rota, retorno ao perfil e uso das RPCs no teste**

```js
assert.match(page, /export_my_customer_data/);
assert.match(page, /delete-my-customer-account/);
assert.match(page, /Voltar ao perfil/);
```

- [ ] **Step 2: Executar teste e confirmar falha porque a página não existe**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: FAIL com arquivo ausente.

- [ ] **Step 3: Implementar carregamento autenticado, resumo, download e encerramento**

```tsx
const { data } = await supabase.rpc("export_my_customer_data");
const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
await supabase.functions.invoke("delete-my-customer-account");
```

- [ ] **Step 4: Executar contratos e typecheck focal**

Run: `node --experimental-strip-types --test tests/customer-privacy-rights.test.mjs`

Expected: PASS.

### Task 5: Documentação e verificação de release

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `docs/PRONTIDAO-LGPD-E-DOCUMENTOS-LEGAIS.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/PRIVACY-HARDENING-20260818.md`

**Interfaces:**
- Consumes: comportamento final da migration e página.
- Produces: registro claro de exportação, anonimização, retenção pendente e revisão jurídica.

- [ ] **Step 1: Documentar o que é exportado, anonimizado e preservado**

```markdown
Snapshots de serviço, horário, profissional e valor permanecem sem identificação.
Prazos definitivos dependem de política de retenção e revisão jurídica.
```

- [ ] **Step 2: Executar toda a validação exigida**

Run: `git diff --check; npm.cmd exec tsc -- --noEmit; npm.cmd run lint; npm.cmd test; aplicar somente a migration nova em uma instância local atualizada; executar o SQL transacional; supabase db lint --local`

Expected: sucesso ou registro separado de warnings preexistentes.

- [ ] **Step 3: Revisar e publicar somente os arquivos do lote**

```powershell
git add -- <allowlist>
git commit -m "feat(privacy): implementar direitos do titular"
git push -u origin codex/customer-lgpd-rights
```
