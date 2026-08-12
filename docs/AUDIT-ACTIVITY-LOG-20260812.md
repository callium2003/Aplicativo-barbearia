# Auditoria do histórico de ações — diagnóstico inicial

Data: 12/08/2026
Escopo: registro de ações por usuário, identificação do ator, cobertura dos fluxos e proteção da tabela `public.audit_logs`.
Método: inspeção somente leitura do código, migrations e catálogo remoto do Supabase. Nenhuma alteração foi feita nesta etapa.

## Evidências remotas

- `public.audit_logs` existe com RLS habilitado e sem `FORCE ROW LEVEL SECURITY`.
- Existem 13 registros no banco.
- Os 13 registros possuem `actor_user_id`; não há registro com ator nulo.
- Os eventos existentes são: `set_professional_commission_rate`, `create_team_invitation`, `accept_team_invitation`, `team_member_created` e `revoke_team_invitation`.
- Existe somente um gatilho de auditoria automático: `audit_team_member_change` em `team_members` para `INSERT` e `UPDATE`.
- A política de leitura permite apenas o papel `owner` da barbearia.
- A tabela possui grants amplos para `anon` e `authenticated` (incluindo `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE`). O RLS impede o uso pelas políticas atuais, mas os grants devem ser reduzidos como hardening explícito.

## Cobertura identificada

| Área | Evidência atual | Diagnóstico |
|---|---|---|
| Equipe e convites | Funções e gatilho gravam auditoria | Cobertura parcial, aparentemente funcionando |
| Comissões | Funções registram alteração de taxa e pagamento | Cobertura existente |
| Permissões | Função de alteração de perfil grava auditoria | Cobertura existente |
| Agendamentos | Existem alterações diretas de status no cliente/painel | Não foi identificado mecanismo geral de auditoria |
| Agenda profissional | Horários, pausas e bloqueios são alterados diretamente | Não foi identificado mecanismo geral de auditoria |
| Perfil da barbearia | Há função de atualização com evento de perfil em parte do fluxo | Necessário confirmar todos os caminhos |
| Serviços e preços | Alterações diretas no painel | Não foi identificado mecanismo geral de auditoria |
| Profissionais | Cadastro/edição e foto | Não foi identificado mecanismo geral de auditoria geral |
| Clientes | Perfil e dados de CRM | Não foi identificado mecanismo geral de auditoria geral |
| Notificações | Marcação de leitura e preferências | Não foi identificado mecanismo geral de auditoria |

## Conclusão preliminar

O problema não é, neste momento, perda do usuário por causa de `localStorage`: os eventos que existem no banco foram gravados com ator identificado. A causa mais provável da percepção de “log incompleto” é a cobertura desigual: somente algumas operações geram auditoria.

A sessão do Supabase ainda precisa ser testada em separado para casos de sessão expirada ou renovação falha, mas isso é uma trilha de autenticação e não substitui a auditoria no banco.

## Pontos de segurança encontrados para tratamento posterior

Os advisors de segurança do Supabase também apontaram:

- a visão `public.public_professionals` como security-definer;
- funções security-definer expostas a papéis autenticados ou anônimos, algumas intencionais e outras que precisam de revisão;
- tabelas com RLS habilitado sem políticas (`appointment_commissions`, `notification_preferences` e `professional_commission_settings`);
- proteção contra senhas vazadas desabilitada.

Esses pontos não foram alterados nesta auditoria porque o objetivo desta etapa foi diagnóstico e não correção imediata.

## Implementação iniciada em 12/08/2026

- Migração `20260812100000_add_audit_coverage.sql` aplicada no Supabase.
- Criado escritor privado `private.write_audit_log`.
- Criado gatilho privado genérico para mudanças de linha.
- Gatilhos adicionados a agendamentos, barbearia, dados cadastrais, horários, profissionais, serviços e preferências.
- Grants de escrita para `anon` e `authenticated` removidos da tabela `audit_logs`.
- Teste transacional com `ROLLBACK` confirmou que uma atualização de serviço gera o evento `services.update` sem persistir dados de teste.
- Teste estrutural automatizado adicionado em `tests/audit-coverage.test.mjs`.
- Migração adicional `20260812103000_add_customer_audit_trigger.sql` aplicada para registrar alterações de perfil do cliente por barbearia relacionada.

Os advisors de segurança continuam exibindo alertas preexistentes fora desta entrega, especialmente a visão pública de profissionais, funções `SECURITY DEFINER` expostas e tabelas com RLS sem políticas. Eles permanecem registrados para tratamento separado.

## Auditoria de segurança complementar — 12/08/2026

- Revisão estática de 69 arquivos SQL e das definições remotas não confirmou vulnerabilidade de média ou alta severidade nem acesso cross-tenant.
- A visão `public.public_professionals`, que era o alerta concreto de bypass de RLS, foi endurecida com `security_invoker=true` e grants de colunas públicas; telefone e campos privados não ficam disponíveis ao visitante.
- As funções `SECURITY DEFINER` administrativas revisadas exigem `auth.uid()` e validam papel/barbearia. As funções públicas de disponibilidade e convite usam token/slug como entrada pública intencional e não retornam dados internos indevidos.
- As tabelas com RLS sem políticas não possuem grants para `anon`/`authenticated`; são acessadas por funções protegidas. O advisor permanece informativo, não uma abertura de dados.
- Permanecem como hardening de baixa prioridade: validar origem exata das URLs de fotos em vez de apenas o trecho do caminho e rejeitar arrays de serviços duplicados na disponibilidade pública.
- A proteção de senhas vazadas do Supabase é uma configuração do Auth que deve ser ativada no painel, não por migration de dados.

## Próxima etapa recomendada

1. Fechar a matriz de operações e definir quais ações são obrigatórias para auditoria.
2. Testar cada fluxo autenticado com owner, manager, barber e customer.
3. Criar uma função privada única de gravação de auditoria, com ator obtido no banco.
4. Mover operações sensíveis para funções transacionais quando necessário.
5. Reduzir grants da tabela `audit_logs` para o mínimo necessário.
6. Criar testes que falhem quando uma operação obrigatória não gerar auditoria ou gravar o ator errado.
7. Só então publicar a correção e repetir a homologação.

## Matriz da segunda etapa

| Operação observada no sistema | Caminho atual | Auditoria encontrada | Classificação |
|---|---|---|---|
| Criar, aceitar e revogar convite | RPC no banco | Sim | Coberto |
| Ativar/desativar acesso da equipe | RPC + gatilho em `team_members` | Sim | Coberto, validar metadados |
| Alterar comissão profissional | RPC | Sim | Coberto |
| Alterar status de pagamento/comissão | RPC | Sim | Coberto |
| Alterar perfil/permissão da barbearia | RPC de perfil | Sim em um caminho | Cobertura parcial |
| Criar agendamento | RPC `book_customer_appointment` | Não encontrado | Lacuna prioritária |
| Cancelar agendamento pelo cliente | `appointments.update` direto | Não encontrado | Lacuna prioritária |
| Alterar status na agenda do painel | `appointments.update` direto | Não encontrado | Lacuna prioritária |
| Alterar dados cadastrais da barbearia | `barbershops.update` direto | Não encontrado | Lacuna prioritária |
| Alterar dados completos da barbearia | `barbershop_registration_details.update` | Não encontrado | Lacuna prioritária |
| Criar/editar/desativar serviço | `services.insert/update` direto | Não encontrado | Lacuna prioritária |
| Criar/editar/desativar profissional | `professionals.insert/update` direto | Não encontrado | Lacuna prioritária |
| Alterar horários comerciais | `business_hours.upsert` direto | Não encontrado | Lacuna prioritária |
| Alterar horários, pausas e bloqueios profissionais | Tabelas de agenda diretamente | Não encontrado | Lacuna prioritária |
| Atualizar perfil do cliente | RPC `save_my_customer_profile` | Não encontrado | Lacuna média |
| Atualizar perfil do profissional | RPC `update_my_professional_profile` | Não encontrado | Lacuna média |
| Alterar preferências de notificação | RPC `save_my_notification_preference` | Não encontrado | Lacuna média |
| Marcar notificação como lida | `user_notifications.update` direto | Não encontrado | Baixa prioridade ou excluir do escopo |

### Resultado da matriz

Há uma diferença clara entre as operações protegidas e as operações auditadas. As políticas RLS controlam quem pode alterar os dados, mas RLS não cria histórico automaticamente. Para resolver o problema de forma definitiva, as operações prioritárias devem registrar auditoria na mesma transação da alteração, com o ator obtido no banco.
