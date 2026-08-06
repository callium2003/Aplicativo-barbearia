# Laudo Técnico de Auditoria de Segurança: Comissão por Profissional

**Data da Auditoria:** 2026-08-05  
**Ambiente de Validação:** Local (Contêiner PostgreSQL 15 `barbeariasp-pg-test-sec` + Node.js test runner)  
**Status no Supabase Remoto:** PENDENTE DE APLICAÇÃO (Nenhuma alteração enviada ou aplicada na nuvem/homologação remota)  

---

## 1. Contexto e Histórico de Commits

A validação técnica cobre o endurecimento e isolamento da configuração de comissão por profissional. Os commits no histórico local são:

- `acfb305` - `test: verify owner professional update result`
- `de34b62` - `docs: align commission audit evidence`
- `db32fde` - `test: finalize commission security validation`
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
   - **Evidência:** `ALTER TABLE public.professionals DROP COLUMN IF EXISTS commission_rate_percent;` na migration `20260804060000_isolate_professional_commission.sql`.
2. **Isolamento em tabela privada:**
   - **Evidência:** Tabela `public.professional_commission_settings` criada para armazenar `(professional_id PRIMARY KEY, barbershop_id, commission_rate_percent numeric(5,2), updated_at, updated_by)`.
3. **Revogação total de acesso direto (REVOKE):**
   - **Evidência:** `REVOKE ALL ON public.professional_commission_settings FROM anon, authenticated, PUBLIC;` na migration `20260804070000_harden_professional_commission_security.sql`.
4. **Encapsulamento por RPCs:**
   - **Evidência:** Todo acesso ocorre pelas RPCs `public.get_professional_commission_rates(p_barbershop_id uuid)` e `public.set_professional_commission_rate(p_professional_id uuid, p_commission_rate_percent_text text)`.
5. **Funções com `SECURITY DEFINER` e `search_path` isolado:**
   - **Evidência:** Ambas as RPCs utilizam `SECURITY DEFINER SET search_path TO ''` para prevenir ataques de Search Path Hijacking.
6. **Resolução de Tenant no Banco:**
   - **Evidência:** A RPC `set_professional_commission_rate` carrega o profissional em `v_prof` (`SELECT id, barbershop_id, name INTO v_prof FROM public.professionals WHERE id = p_professional_id;`) e valida a permissão via `private.current_barbershop_role(v_prof.barbershop_id)`.

### Validação Decimal e Rejeição de Anomalias (SQL + TS)
7. **Rejeição de Nulo / Vazio:** `NULL`, `''`, `'   '` -> Retorna exceção `Formato decimal inválido. Use até duas casas decimais com ponto (ex: 12.50).`.
8. **Rejeição de Negativos:** `'-1'` -> Retorna exceção `Formato decimal inválido`.
9. **Rejeição de Valores > 100:** `'100.01'` -> Retorna exceção `O percentual de comissão deve estar entre 0% e 100%`.
10. **Rejeição de Caracteres Alfanuméricos / Científicos:** `'abc'`, `'1e2'` -> Retorna exceção `Formato decimal inválido`.
11. **Rejeição de Sinal Positivo Prefixado:** `'+25'` -> Retorna exceção `Formato decimal inválido`.
12. **Rejeição de Múltiplos Separadores:** `'12.5.0'`, `'12,5.0'` -> Retorna exceção `Formato decimal inválido`.
13. **Rejeição de Frações com > 2 Casas Decimais:** `'12.500'`, `'12.501'` -> Retorna exceção `Formato decimal inválido`.
14. **Rejeição de Espaços Internos:** `'25 50'` -> Retorna exceção `Formato decimal inválido`.
15. **Rejeição de Separador Terminal / Deslocado:** `'25.,'`, `'25,.50'` -> Retorna exceção `Formato decimal inválido`.
16. **Aceitação de Inteiros Válidos:** `'0'`, `'25'`, `'100'` -> Sucesso (`numeric`).
17. **Aceitação de Ponto Decimal:** `'25.5'`, `'25.50'`, `'100.00'` -> Sucesso.
18. **Diferença de Comportamento de Vírgula (Frontend vs. SQL):** O TypeScript (`utils/commission.ts`) aceita vírgula ou ponto e converte vírgula para ponto. A RPC SQL exige expressão regular rígida `^\d+(\.\d{1,2})?$` com ponto; chamadas diretas ao banco enviando vírgula (ex: `'25,50'`) são expressamente rejeitadas sem normalização SQL.
19. **Testes Unitários TypeScript:** Executados via `npm test` (`tests/decimal-validation.test.ts`) e aprovados com 100% de sucesso.
20. **Importação com Extensão `.ts`:** O arquivo `tests/decimal-validation.test.ts` utiliza `import { normalizeCommissionRate } from '../utils/commission.ts';` respaldado por `"allowImportingTsExtensions": true` no `tsconfig.json`.

### Concorrência Transacional e Trilha de Auditoria
21. **Bloqueio Transacional Explicito (`FOR UPDATE`):**
    - **Evidência:** `SELECT commission_rate_percent INTO v_previous_rate FROM public.professional_commission_settings WHERE professional_id = p_professional_id FOR UPDATE;` na RPC `set_professional_commission_rate`.
22. **Enfileiramento de Atualizações Simultâneas:**
    - **Evidência:** Dois processos psql (`p1.sql` e `p2.sql`) executando requisições concorrentes na mesma linha. `p1.sql` obtém o lock e aguarda 3 segundos. `p2.sql` aguarda a liberação do lock.
23. **Tempo de Bloqueio Medido:**
    - **Medição:** `P1 completed in 3869ms. P2 completed in 2678ms.` Confirmando que P2 foi segurado até P1 liberar o lock.
24. **Ausência de Deadlocks e Consistência da Sequência:**
    - Ambas as transações completaram com exit status `0`.
25. **Gravação Obrigatória em `audit_logs`:**
    - Cada execução bem-sucedida insere um registro com `action = 'set_professional_commission_rate'`.
26. **Captura Exata do Valor Anterior (`previous_rate`):**
    - `v_previous_rate` é lido sob o lock `FOR UPDATE` antes da escrita.
27. **Captura Exata do Valor Novo (`new_rate`):**
    - `v_parsed_rate` inserido no payload JSONB do log de auditoria.
28. **Sem Logs para Operações Rejeitadas:**
    - Tentativas inválidas lançam exceção antes do `INSERT INTO public.audit_logs`, não gerando ruído na auditoria.
29. **Verificação de Contagem de Logs Concorrentes:**
    - A suíte validou a criação exata de 3 logs sequenciais no cenário testado (`10.00` init, `20.00` p1, `30.00` p2).
30. **Validação do Log Delta P1:**
    - `previous_rate`: `10.00` -> `new_rate`: `20.00`.
31. **Validação do Log Delta P2:**
    - `previous_rate`: `20.00` -> `new_rate`: `30.00`.

### Matriz de Controle de Acesso (RLS e Roles)
32. **Proprietário (`owner`):** Permissão via RPC para visualizar e alterar comissões dos profissionais da própria barbearia.
33. **Gerente (`manager`):** Permissão via RPC para visualizar e alterar comissões na própria barbearia.
34. **Gerente Bloqueado contra Elevação de Privilégio na Tabela `professionals`:**
    - **Mecanismo:** Tentativa direta de `UPDATE public.professionals SET name = 'Hack'` ou `active = false` por manager não afeta registros (retorna `ROW_COUNT = 0`), pois o RLS da tabela `professionals` permite `UPDATE` exclusivamente para `owner`.
35. **Validação de Atualização do Owner com `GET DIAGNOSTICS ROW_COUNT`:**
    - **Mecanismo:** Teste do owner executa `UPDATE public.professionals SET name = 'Owner Changed' WHERE id = ...`, valida `GET DIAGNOSTICS v_rowcount = ROW_COUNT` sob `SET ROLE authenticated`, e confirma o valor alterado e a restauração sob `RESET ROLE` via `IS DISTINCT FROM`.
36. **Barbeiro (`barber`):** Tentativa de invocar `set_professional_commission_rate` lança erro `Sem permissão para alterar a comissão nesta barbearia.`.
37. **Cliente / Usuário sem Vínculo (`customer` / `unlinked`):** Bloqueio total via verificação de role na RPC.
38. **Anônimo (`anon`):** Execução revogada na RPC (`REVOKE EXECUTE ON FUNCTION public.set_professional_commission_rate FROM anon, PUBLIC;`).
39. **Acesso Direto à Tabela:** `SELECT`, `INSERT`, `UPDATE`, `DELETE` em `professional_commission_settings` retornam erro PostgreSQL `42501` (`permission denied for table professional_commission_settings`).

### Garantia de Execução e Limpeza
40. **Interrupção Imediata no Test Runner (`ON_ERROR_STOP`):**
    - **Evidência:** O runner `run-sql-tests.cjs` passa `-v ON_ERROR_STOP=1` em cada chamada do `psql`. O comportamento fail-fast foi validado em teste controlado com injeção de asserção impossível, interrompendo o processo Node.js com exit code 1.
41. **Remoção de Artefatos Temporários:**
    - Contêiner de testes PostgreSQL removido (`docker rm -f`).
    - Arquivos SQL de teste e arquivo `/tmp/p1_ready` excluídos.

---

## 3. Saída Bruta da Execução dos Testes

### A. Execução da Suíte SQL e RLS (`node run-sql-tests.cjs`)

```text
--- Running SQL & RLS Verification Suite ---

NOTICE:  SUCCESS: Estrutura, funções e acessos verificados.
NOTICE:  SUCCESS: Testes de Owner aprovados.
NOTICE:  SUCCESS: Testes de Manager aprovados.
NOTICE:  SUCCESS: Testes de Barber aprovados.
NOTICE:  SUCCESS: Testes de Cliente/Unlinked aprovados.
NOTICE:  SUCCESS: Testes de Anon aprovados.
NOTICE:  SUCCESS: Validações decimais aprovadas.

--- Running Concurrency Test ---
P1 completed in 3869ms. P2 completed in 2678ms.
NOTICE:  SUCCESS: Teste concorrente aprovado. Logs verificados e em ordem.

ALL SQL TESTS PASSED!
```

---

## 4. Estado Atual do Repositório (Git)

Saída de `git status --short`:
```text
(Sem qualquer saída - Repositório limpo)
```

Verificação de whitespace (`git diff --check`):
```text
git diff --check não encontrou erros de whitespace; o Git emitiu apenas aviso informativo de normalização LF/CRLF no Windows.
```

---

## 5. Ressalva Importante sobre Migrations e Deploy

> [!WARNING]
> **Nenhuma migration foi aplicada no ambiente Supabase remoto (Homologação ou Produção).**  
> Todas as validações descritas neste laudo foram conduzidas exclusivamente em contêiner local isolado. A aplicação no Supabase remoto permanece pendente e deve seguir o fluxo de homologação da plataforma quando formalmente autorizada.
