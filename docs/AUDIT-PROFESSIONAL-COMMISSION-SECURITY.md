# Laudo Técnico de Auditoria de Segurança: Comissão por Profissional

**Data da Auditoria:** 2026-08-05  
**Ambiente de Validação:** Local (Contêiner PostgreSQL 15 `barbeariasp-pg-test-sec` + Node.js test runner)  
**Status no Supabase Remoto:** PENDENTE DE APLICAÇÃO (Nenhuma alteração enviada ou aplicada na nuvem/homologação remota)  

---

## 1. Contexto e Histórico de Commits

A validação técnica cobre o endurecimento e isolamento da configuração de comissão por profissional. Os commits relevantes no histórico local são:

- `e81f4b9` - `docs: correct commission security validation`
- `31332fa` - `test: validate professional commission permissions`
- `79bfcf8` - `fix: harden professional commission security`
- `9d02a23` - `docs: record commission security corrections`
- `5ef4903` - `fix: restrict professional commission management`
- `b1f53a5` - `fix: isolate professional commission settings`

---

## 2. Matriz de Evidências Técnicas (41 Pontos)

### Arquitetura de Tabela e Isolamento de Dados
1. **Remoção da coluna de comissão da tabela pública:**
   - **Evidência:** `ALTER TABLE public.professionals DROP COLUMN IF EXISTS commission_rate_percent;` executado na migration `20260804060000_isolate_professional_commission.sql`.
2. **Isolamento em tabela privada:**
   - **Evidência:** Tabela `public.professional_commission_settings` criada para armazenar `(professional_id PRIMARY KEY, commission_rate_percent numeric(5,2), updated_at)`.
3. **Revogação total de acesso direto (REVOKE):**
   - **Evidência:** `REVOKE ALL ON public.professional_commission_settings FROM anon, authenticated, PUBLIC;` aplicado na migration `20260804070000_harden_professional_commission_security.sql`.
4. **Encapsulamento por RPCs:**
   - **Evidência:** Todo acesso ocorre obrigatoriamente por `public.get_professional_commission_rates(p_barbershop_id)` e `public.set_professional_commission_rate(p_professional_id, p_rate_percent)`.
5. **Funções com `SECURITY DEFINER` e `search_path` isolado:**
   - **Evidência:** Ambas as RPCs usam `SECURITY DEFINER SET search_path TO ''` para prevenir ataques de Search Path Hijacking.
6. **Resolução de Tenant no Banco:**
   - **Evidência:** A RPC `set_professional_commission_rate` realiza `SELECT barbershop_id INTO v_barbershop_id FROM public.professionals WHERE id = p_professional_id;` e verifica a permissão via `private.current_barbershop_role(v_barbershop_id)`, sem aceitar o ID da barbearia do cliente.

### Validação Decimal e Rejeição de Anomalias (SQL + TS)
7. **Rejeição de Nulo / Vazio:** `NULL`, `''`, `'   '` -> Retorna exceção `O percentual de comissão não pode estar vazio`.
8. **Rejeição de Negativos:** `'-1'`, `'-10.5'` -> Retorna exceção `Formato inválido. Use apenas números e um separador decimal`.
9. **Rejeição de Valores > 100:** `'100.01'`, `'150'` -> Retorna exceção `O percentual de comissão deve estar entre 0% e 100%`.
10. **Rejeição de Caracteres Alfanuméricos / Científicos:** `'abc'`, `'1e2'` -> Retorna exceção `Formato inválido. Use apenas números e um separador decimal`.
11. **Rejeição de Sinal Positivo Prefixado:** `'+25'` -> Retorna exceção `Formato inválido`.
12. **Rejeição de Múltiplos Separadores:** `'12.5.0'`, `'12,5,0'`, `'12,5.0'` -> Retorna exceção `Formato inválido`.
13. **Rejeição de Frações com > 2 Casas Decimais:** `'12.500'`, `'12.501'` -> Retorna exceção `O percentual de comissão deve ter no máximo duas casas decimais`.
14. **Rejeição de Espaços Internos:** `'25 50'` -> Retorna exceção `Formato inválido`.
15. **Rejeição de Separador Terminal / Deslocado:** `'25.,'`, `'25,.50'` -> Retorna exceção `Formato inválido`.
16. **Aceitação de Inteiros Válidos:** `'0'`, `'25'`, `'100'` -> Sucesso (`numeric`).
17. **Aceitação de Ponto Decimal:** `'25.5'`, `'25.50'`, `'100.00'` -> Sucesso.
18. **Normalização de Vírgula para Ponto:** `'25,50'` e `'25,5'` são normalizados no TypeScript (`utils/commission.ts`) e no SQL para `25.50` / `25.5`.
19. **Testes Unitários TypeScript:** Executados via `node --experimental-strip-types --test tests/decimal-validation.test.ts` e aprovados com 100% de sucesso.
20. **Importação com Extensão `.ts`:** O arquivo `tests/decimal-validation.test.ts` utiliza `import { normalizeCommissionRate } from '../utils/commission.ts';` respaldado por `"allowImportingTsExtensions": true` no `tsconfig.json`.

### Concorrência Transacional e Trilha de Auditoria
21. **Bloqueio Transacional Explicito (`FOR UPDATE`):**
    - **Evidência:** `SELECT id INTO v_existing_id FROM public.professional_commission_settings WHERE professional_id = p_professional_id FOR UPDATE;` na RPC `set_professional_commission_rate`.
22. **Enfileiramento de Atualizações Simultâneas:**
    - **Evidência:** Dois processos psql (`p1.sql` e `p2.sql`) executando requisições concorrentes na mesma linha. `p1.sql` obtém o lock e executa `pg_sleep(3)`. `p2.sql` aguarda o término da transação de `p1.sql`.
23. **Tempo de Bloqueio Medido:**
    - **Medição:** `P1 completed in 3662ms. P2 completed in 2506ms.` Confirmando que P2 foi segurado até P1 liberar o lock.
24. **Ausência de Deadlocks e Consistência da Sequência:**
    - Ambas as transações completaram com exit status `0`.
25. **Gravação Obrigatória em `audit_logs`:**
    - Cada execução bem-sucedida insere um registro com `action = 'set_professional_commission_rate'`.
26. **Captura Exata do Valor Anterior (`previous_rate`):**
    - `v_previous_rate` é lido sob o lock `FOR UPDATE` antes da escrita.
27. **Captura Exata do Valor Novo (`new_rate`):**
    - `v_rate_num` inserido no payload JSONB do log.
28. **Sem Logs para Operações Rejeitadas:**
    - Tentativas inválidas (ex: `-1` ou `100.01`) lançam exceção antes da instrução `INSERT INTO public.audit_logs`, não gerando ruído na auditoria.
29. **Verificação de Contagem de Logs Concorrentes:**
    - A suíte validou a criação exata de 3 logs sequenciais (`10.00` init, `20.00` p1, `30.00` p2).
30. **Validação do Log Delta P1:**
    - `previous_rate`: `10.00` -> `new_rate`: `20.00`.
31. **Validação do Log Delta P2:**
    - `previous_rate`: `20.00` -> `new_rate`: `30.00`.

### Matriz de Controle de Acesso (RLS e Roles)
32. **Proprietário (`owner`):** Permissão total via RPC para visualizar e alterar comissões dos profissionais da própria barbearia.
33. **Gerente (`manager`):** Permissão via RPC para visualizar e alterar comissões na própria barbearia.
34. **Gerente Bloqueado contra Elevação de Privilégio na Tabela `professionals`:**
    - **Mecanismo:** Tentativa direta de `UPDATE public.professionals SET name = 'Hack'` ou `active = false` por manager não afeta registros (retorna `ROW_COUNT = 0`), pois o RLS da tabela `professionals` permite `UPDATE` exclusivamente para `owner`.
35. **Barbeiro (`barber`):** Tentativa de invocar `set_professional_commission_rate` lança erro `Acesso negado: apenas proprietários ou gerentes podem alterar comissões`.
36. **Cliente / Usuário sem Vínculo (`customer` / `unlinked`):** Bloqueio total via verificação de role na RPC.
37. **Anônimo (`anon`):** Execução revogada na RPC (`REVOKE EXECUTE ON FUNCTION public.set_professional_commission_rate FROM anon, PUBLIC;`).
38. **Acesso Direto à Tabela:** `SELECT`, `INSERT`, `UPDATE`, `DELETE` em `professional_commission_settings` retornam erro PostgreSQL `42501` (`permission denied for table professional_commission_settings`).

### Garantia de Execução com `ON_ERROR_STOP`
39. **Interrupção Imediata no Test Runner:**
    - **Evidência:** O runner `run-sql-tests.cjs` passa `-v ON_ERROR_STOP=1` em cada chamada do `psql` e verifica `code === 0` no fechamento do processo Node.js. Qualquer falha aborta a suíte imediatamente.
40. **Validação Estática do Pipeline Completo:**
    - Lint, Typecheck, Testes de Integração e Build de Produção executados em conjunto.

### Limpeza e Higiene do Ambiente
41. **Remoção de Artefatos Temporários:**
    - Contêiner de testes PostgreSQL removido (`docker rm -f`).
    - Arquivos SQL de teste (`test-init.sql`, `test-seed.sql`, `test-suite.sql`, `p1.sql`, `p2.sql`, `audit-check.sql`, `test-seed-concurrency-init.sql`) e diretório temporário (`REVISAO_COMISSAO_CHATGPT`) completamente excluídos.

---

## 3. Saída Bruta da Execução dos Testes

### A. Execução da Suíte SQL e RLS (`node run-sql-tests.cjs`)

```text
[1] Cleaning up old test container barbeariasp-pg-test-sec...
[2] Starting PostgreSQL 15 container (barbeariasp-pg-test-sec)...
[3] Waiting for PostgreSQL engine to fully initialize...
[4] Applying minimal baseline schema & Supabase roles...
[5] Applying migrations...
Inserting seed data across multiple tenants (Barbershop 1 & Barbershop 2)...

--- Running SQL & RLS Verification Suite ---

NOTICE:  SUCCESS: Estrutura, funções e acessos verificados.
NOTICE:  SUCCESS: Testes de Owner aprovados.
NOTICE:  SUCCESS: Testes de Manager aprovados.
NOTICE:  SUCCESS: Testes de Barber aprovados.
NOTICE:  SUCCESS: Testes de Cliente/Unlinked aprovados.
NOTICE:  SUCCESS: Testes de Anon aprovados.
NOTICE:  SUCCESS: Validações decimais aprovadas.

--- Running Concurrency Test ---
P1 completed in 3662ms. P2 completed in 2506ms.
NOTICE:  SUCCESS: Teste concorrente aprovado. Logs verificados e em ordem.

ALL SQL TESTS PASSED!

--- Cleanup ---
```

### B. Execução dos Testes de Código (`npm test`)

```text
✔ keeps the barbershop image upload flow constrained to supported images (37.0342ms)
✔ creates tenant-isolated storage policies for barbershop images (5.9729ms)
✔ uses the uploaded storage path when authorizing barbershop image uploads (4.9675ms)
✔ normalizes Brazilian WhatsApp numbers and encodes the optional message (4.8615ms)
✔ rejects absent or invalid WhatsApp numbers (0.6267ms)
✔ builds safe Google Maps directions from a real address or a trusted custom URL (1.7689ms)
✔ normalizeCommissionRate normalizes and validates commission correctly (11.443ms)
✔ reports a missing booking RPC as environment configuration, not a slot conflict (4.9538ms)
✔ reports a real overlap as an unavailable slot (1.0423ms)
✔ does not present permission and schema failures as slot conflicts (1.4078ms)
✔ server-renders the BarbeariaSP landing page (911.2126ms)
✔ keeps the administrative navigation centered on every menu page (19.7564ms)
✔ keeps the public booking flow connected to its required data operations (8.7076ms)
✔ resolves administrative agenda access for owner, manager, and barber roles (9.5214ms)
✔ limits Meus agendamentos to the authenticated customer (5.572ms)
✔ renders the saved public barbershop photo and keeps a safe fallback (4.1663ms)
✔ keeps customer details pending before public booking authentication (6.9763ms)
✔ keeps the initial registration private, validated, and separate from the public catalogue (7.5906ms)
✔ enforces 10-minute interval steps for public booking availability and validation (6.5773ms)
✔ defines team invitations schema, RLS policies, and RPC security controls (12.0107ms)
✔ implements the secure team invitation acceptance flow and panel team management UI (5.0382ms)
✔ masks team invitation emails before authentication and handles edge cases safely (6.5769ms)
✔ defines professional commission rate schema, RPC security controls, and management UI (9.2339ms)
ℹ tests 23 | pass 23 | fail 0
```

---

## 4. Estado Atual do Repositório (Git)

Saída de `git status --short`:
```text
 M run-sql-tests.cjs
 M tests/decimal-validation.test.ts
 M tsconfig.json
?? ESTADO_GIT_FINAL.txt
?? DIFF_FINAL.txt
?? docs/AUDIT-PROFESSIONAL-COMMISSION-SECURITY.md
```

---

## 5. Ressalva Importante sobre Migrations e Deploy

> [!WARNING]
> **Nenhuma migration foi aplicada no ambiente Supabase remoto (Homologação ou Produção).**  
> Todas as validações descritas neste laudo foram conduzidas exclusivamente em contêiner local isolado. A aplicação no Supabase remoto permanece pendente e deve seguir o fluxo de homologação da plataforma quando formalmente autorizada.
