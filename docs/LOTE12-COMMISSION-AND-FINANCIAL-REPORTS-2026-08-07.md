# Lote 12 — comissão automática e relatórios financeiros reais

Data: 2026-08-07

## Objetivo

Substituir os relatórios demonstrativos por dados reais e transformar a configuração de percentual de comissão em cálculo financeiro efetivo por atendimento concluído.

Linha técnica:

```text
feat/commission-ledger-financial-reports-2026-08-07
```

Nenhuma publicação, PR ou integração com Hostinger foi realizada.

## Banco de dados

Migration aplicada no Supabase remoto de homologação:

```text
20260807044250_add_appointment_commission_ledger_and_financial_reports.sql
```

O histórico remoto passou de 21 para 22 migrations.

### Registro financeiro por atendimento

Foi criada `public.appointment_commissions` para armazenar, no momento da conclusão:

- atendimento;
- barbearia;
- profissional;
- nome do profissional em snapshot;
- serviços em snapshot;
- data/hora do atendimento;
- valor bruto;
- percentual de comissão vigente;
- valor da comissão;
- estado do repasse (`pending` ou `paid`);
- data e usuário que marcaram o pagamento.

A tabela possui RLS habilitado e todo acesso direto de `anon` e `authenticated` foi revogado. O frontend não consulta essa tabela diretamente.

### Cálculo automático

O trigger `sync_appointment_commission_after_status_change` chama `private.sync_appointment_commission()` quando o status do atendimento muda.

Quando muda para `completed`:

1. lê a taxa vigente em `professional_commission_settings`;
2. congela o valor do atendimento e a taxa;
3. calcula `round(gross_amount * commission_rate_percent / 100, 2)`;
4. cria o repasse como `pending`.

Alterações posteriores na taxa do profissional não alteram registros antigos.

Se um atendimento concluído ainda pendente for reaberto, o registro financeiro é removido. Se o repasse já estiver `paid`, a reabertura é bloqueada para preservar consistência financeira.

## RPCs financeiras

### `get_barbershop_financial_report`

Disponível somente para usuário autenticado com papel `owner` ou `manager` no tenant solicitado.

Retorna por período:

- atendimentos concluídos;
- receita bruta;
- ticket médio;
- comissão total;
- comissão pendente;
- comissão paga;
- receita após comissões;
- cancelamentos;
- no-show;
- consolidação por profissional;
- lista dos repasses por atendimento.

### `set_appointment_commission_payment_status`

Permite a owner/manager alternar um repasse entre:

```text
pending
paid
```

Ao marcar como pago grava `paid_at`, `paid_by` e uma entrada em `audit_logs`. Ao voltar para pendente, os campos de pagamento são limpos e a mudança também é auditada.

As duas funções revogam explicitamente `EXECUTE` de `PUBLIC` e `anon`, concedendo-o a `authenticated`. Cada função ainda valida `auth.uid()` e o papel do usuário na barbearia antes de acessar dados.

## Testes remotos transacionais

Todos os cenários abaixo foram executados com `ROLLBACK`, sem deixar dados de teste financeiros persistidos.

### Cálculo

Um atendimento com valor de:

```text
R$ 55,00
```

e taxa temporária de:

```text
12,50%
```

gerou:

```text
R$ 6,88
```

O valor calculado coincidiu exatamente com o valor esperado e nasceu como `pending`.

### Relatório

Com um atendimento concluído dentro da transação, owner recebeu relatório com:

```text
completed_appointments = 1
gross_revenue = 55.00
professional_rows = 1
commission_rows = 1
```

### Isolamento

- barber recebeu `Sem permissão para consultar os relatórios desta barbearia.`;
- leitura direta de `appointment_commissions` como `authenticated` recebeu `permission denied`;
- os privilégios das RPCs mostram `EXECUTE` somente para `authenticated`, sem `anon`;
- a alteração de repasse para `paid` foi observada pela própria RPC de relatório, sem liberar SELECT direto na tabela;
- ao fim dos rollbacks, `appointment_commissions` permaneceu com zero linhas criadas pelos testes.

## Interface

`app/painel/relatorios/page.tsx` deixou de usar números fixos de demonstração.

A tela consulta `get_barbershop_financial_report` e apresenta períodos:

- Hoje;
- Esta semana;
- Este mês.

Exibe:

- atendimentos concluídos;
- receita bruta;
- ticket médio;
- comissões totais e pendentes;
- receita após comissão;
- cancelamentos e no-show;
- resultado por profissional;
- repasses individuais.

Cada repasse possui ação `Marcar como pago` ou `Voltar para pendente`, chamando exclusivamente a RPC segura.

Barber continua redirecionado para a própria agenda e não entra na área de relatórios financeiros.

## Testes automatizados

Foi criado:

```text
tests/financial-reporting.test.mjs
```

Ele cobre:

- estrutura do ledger;
- snapshot e fórmula de comissão;
- restrição de acesso direto;
- autorização das RPCs;
- bloqueio de `anon`;
- presença das métricas reais na interface;
- ausência dos antigos números demonstrativos.

O teste de linhagem das migrations foi atualizado para exigir a nova versão `20260807044250`.

Na primeira execução do workflow temporário, todos os passos técnicos passaram — 32/32 testes, typecheck, lint sem erros e build — mas o workflow não conseguiu gravar seu arquivo final porque a branch estava recebendo atualizações de documentação em paralelo. Isso é uma concorrência de escrita do GitHub, não falha de código. Uma execução final é disparada após a consolidação documental.

## Advisors

O Security Advisor reporta como INFO `RLS Enabled No Policy` em `appointment_commissions`. Isso é intencional: não existe policy porque `anon` e `authenticated` não devem acessar a tabela diretamente.

Também reporta genericamente RPCs `SECURITY DEFINER` executáveis por `authenticated`. Neste caso a exposição é intencional e limitada: cada RPC valida `auth.uid()` e exige `owner`/`manager` no tenant antes de ler ou alterar dados. `anon` não possui `EXECUTE`.

Referências do Supabase Advisor:

- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

O Performance Advisor não apontou novos problemas estruturais; apenas índices ainda sem uso, esperado imediatamente após criação e num ambiente com poucos dados.

## Não realizado neste lote

- nenhum deploy;
- nenhuma alteração Hostinger/DNS;
- nenhum PR;
- nenhuma integração com versão oficial/publicada;
- nenhum `npm audit fix`;
- nenhuma aprovação indiscriminada de scripts de instalação.
