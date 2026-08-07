# Plano de Correção e Auditoria Técnica (06/08/2026)

## 1. Objetivo

Este documento estabelece o registro consolidado da auditoria técnica realizada em 6 de agosto de 2026 no projeto **BarbeariaSP**, documentando o estado real do código e do banco de dados, os achados classificados por severidade, o plano aprovado de remediação em etapas e a ordem estrita de execução para estabilização do ambiente antes da retomada de novas funcionalidades de produto.

## 2. Escopo da auditoria

A auditoria abrangeu:
- Estrutura de banco de dados, RLS e RPCs no Supabase PostgreSQL;
- Cadeia de migrations locais em `supabase/migrations/` e histórico remoto;
- Fluxo de autenticação, convites de equipe e controle de tokens;
- Storage de imagens em `barbershop-images` e políticas de acessos/exclusão;
- Controle de acesso, papéis (`owner`, `manager`, `barber`, `customer`) e divergências entre interface e RLS;
- Testes automatizados, validação de tipos, lint e esteira de CI/CD.

## 3. Fontes analisadas

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/FUNCTIONAL-SPEC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/DECISIONS.md`
- `docs/SUPABASE_BASELINE.md`
- `AGENTS.md`
- `package.json`
- `supabase/migrations/*.sql`
- `tests/*`
- Logs do PostgreSQL / Supabase Security Advisor de 06/08/2026.

## 4. Estado do repositório

- Repositório local: `C:\Users\calli\OneDrive\Documentos\Aplicativo barbearia\pagina barbearia\work\barbeariasp-platform`
- Repositório remoto: `callium2003/Aplicativo-barbearia` (privado)
- Branch de trabalho para documentação: `docs/audit-remediation-plan-2026-08-06`
- Alterações preexistentes: Trabalho do Codex preservado integralmente, sem revert ou descarte de código.
- Testes e scripts locais: `package.json` possui scripts de `typecheck`, `test`, `lint` e `build`.

## 5. Estado do Supabase de homologação

- Projeto de homologação remoto: `irszgnkzqseljowckrgz`.
- Migrations de comissão (`20260804050000`, `20260804060000`, `20260804070000` e `20260806050000`) aplicadas e validadas tecnicamente pelo agente.
- Divergência de versionamento entre nomes dos arquivos SQL locais e registros na tabela `supabase_migrations.schema_migrations` do ambiente remoto.

## 6. Achados por severidade

### BLOQUEADOR

#### 6.1 Cadeia de migrations não reconciliada
As migrations de CRM apresentam sobreposição de objetos DDL:
- `20260802180056_customer_crm_vertical_slice.sql`
- `20260803015008_fix_customer_phone_normalization.sql`
- `20260803222030_install_customer_crm_booking.sql`

A migration `20260803222030` recria objetos já definidos nas migrations anteriores, incluindo:
- Tipo `customer_consent_type`;
- Tabelas `customers`, `barbershop_customers` e `customer_consents`;
- Coluna `appointments.customer_global_id`;
- Funções, triggers, RLS policies e view de histórico;
- RPCs de agendamento e consentimento.

*Impacto:* A execução sequencial a partir de um banco vazio falha devido a objetos duplicados.

#### 6.2 Divergência entre versões locais e histórico remoto
Os prefixos numéricos e nomes dos arquivos locais diferem dos registros de migrations no Supabase remoto.

Exemplos identificados:
- Local: `20260804020000_add_team_invitations.sql` vs Remoto: `20260804043338 add_team_invitations`
- Local: `20260804050000_add_professional_commission_rate.sql` vs Remoto: `20260806040824 20260804050000_add_professional_commission_rate`
- Local: `20260806050000_revoke_anon_commission_rpc_execute.sql` vs Remoto: `20260806051055 20260806050000_revoke_anon_commission_rpc_execute`

*Impacto:* Executar `supabase db push` ou `supabase migration repair` sem um mapeamento formal pode corromper a rastreabilidade do schema remoto.

---

### ALTA

#### 6.3 Token bruto de convite em URL e logs
A página `/convite/equipe?token=<TOKEN>` repassa o token bruto via parâmetro de consulta em URLs usadas como `redirectTo` no Google OAuth e Magic Link.

*Impacto:* Risco de exposição do token em logs de autenticação, logs de servidores/API, histórico do navegador, ferramentas de analytics, cabeçalhos `Referer` e links compartilhados.

#### 6.4 RPCs administrativas de convite executáveis por `anon`
O Supabase Security Advisor indicou que as seguintes funções `SECURITY DEFINER` possuem permissão de execução concedida ao papel `anon`:
- `create_team_invitation(uuid, text, text, uuid)`
- `accept_team_invitation(text)`
- `revoke_team_invitation(uuid)`

Embora haja verificação de `auth.uid()` no corpo, o papel anônimo não deve possuir privilégios `EXECUTE` em rotinas administrativas `SECURITY DEFINER`.

#### 6.5 `get_invitation_details` retorna e-mail completo ao anônimo
A RPC pública de consulta de convite devolve `email_normalized` em texto limpo para o navegador antes da autenticação, contrariando o requisito de exibir somente o e-mail mascarado publicamente.

#### 6.6 Policy de exclusão da foto antiga no Storage
A política de `DELETE` na tabela `storage.objects` contém referência ambígua à coluna `name` em uma subconsulta com `public.barbershops`. O upload de nova foto e a atualização do campo `photo_url` funcionam (`upsert: false`), porém a limpeza do arquivo antigo falha, podendo acumular objetos órfãos no bucket.

#### 6.7 Divergência entre interface e RLS para manager
A interface administrativa permite que gerentes (`manager`) acessem áreas de gestão de serviços e horários da barbearia. No entanto, as RLS policies das tabelas `services` e `business_hours` autorizam escrita somente ao proprietário (`owner`).

#### 6.8 Erro RLS observado em `professionals`
Logs do PostgreSQL registraram a violação: `new row violates row-level security policy for table "professionals"`. A causa decorre da ausência da coluna `user_id` em `professionals` e da falta de permissão de escrita para gerentes na política da tabela `professionals`.

#### 6.9 Ausência de CI obrigatória
O repositório possui rotinas de teste e validação em `package.json`, mas não há diretório `.github/workflows` nem esteira de Integração Contínua (CI) vinculada ao GitHub.

---

### MÉDIA

#### 6.10 Alertas de desempenho e banco de dados
- Chaves estrangeiras sem índices suplementares;
- Índice duplicado na tabela `business_hours`;
- Múltiplas RLS policies permissivas em uma mesma tabela;
- Avaliação linha a linha em políticas de consentimento;
- Índices criados ainda sem uso registrado pelo otimizador.

#### 6.11 Pendências de produção e produto
- Relatórios financeiros reais e cálculo de margem/ticket médio;
- Cálculo transacional e repasse de comissão por atendimento;
- Controle de no-show e cancelamentos estruturados;
- Filtros, segmentos de clientes, campanhas de marketing e exportação CSV;
- Integração com gateway de pagamento e assinaturas;
- Envio de notificações e e-mails transacionais (SMTP profissional, SPF, DKIM, DMARC);
- Configuração de domínio customizado e redirects de produção;
- Rotinas de backup, testes de restauração e monitoramento/observabilidade;
- Termos de uso, política de privacidade e conformidade com LGPD.

---

## 7. Diferenças entre documentação e ambiente

| Item | Documentação Anterior | Estado Real Observado |
|---|---|---|
| Migration de CRM | Apresentada como sequência contínua | `20260803222030` duplica DDL das migrations `20260802180056` e `20260803015008` |
| Versões de Migration | Arquivos locais pareciam idênticos ao remoto | Nomes de arquivos locais e timestamps remotos divergem |
| RPCs de Convite | Indicadas como seguras | Possuem privilégio `EXECUTE` concedido ao papel `anon` |
| Detalhes de Convite | Descritas como entregando e-mail mascarado | RPC `get_invitation_details` retorna e-mail completo |
| Deletar Foto Storage | Considerada funcionando | Policy de `DELETE` falha devido a qualificação ambígua de `storage.objects.name` |
| Permissões de Manager | Interface libera gestão operacional | RLS de `services`, `business_hours` e `professionals` bloqueia manager |
| Integração Contínua | Scripts declarados no package.json | Diretório `.github/workflows` inexistente |

---

## 8. Plano aprovado de correções

### Etapa 0 — Preservação
- Registrar branch, commit e alterações locais;
- Garantir a preservação do trabalho preexistente sem descarte de código;
- Proibir comandos mutáveis ou destrutivos.

### Etapa 1 — Documentação (ESTA TAREFA)
- Registrar o resultado da auditoria e alinhar a documentação do projeto;
- Criar o presente documento `AUDIT-REMEDIATION-PLAN-2026-08-06.md`;
- Não declarar problemas técnicos como já corrigidos.

### Etapa 2 — Reconciliação de migrations
- **2A. Mapeamento:** Elaborar tabela detalhada correlacionando arquivos locais, objetos criados, versão remota, dependências e classificação (CANÔNICA, SUBSTITUÍDA, HISTÓRICA, CORRETIVA, PENDENTE).
- **2B. Sequência:** Isolar migrations substituídas, validar a ordem limpa em banco descartável e garantir reprodutibilidade do zero.

### Etapa 3 — Segurança dos convites
- Remover o token bruto das URLs de redirecionamento (`redirectTo`);
- Revogar o privilégio `EXECUTE` de `anon` e `PUBLIC` nas RPCs de convite;
- Retornar apenas e-mail mascarado na consulta anônima da RPC `get_invitation_details`;
- Revisar convites antigos eventualmente expostos.

### Etapa 4 — Storage
- Qualificar explicitamente `storage.objects.name` na policy de `DELETE` em `barbershop-images`;
- Validar exclusão e substituição de fotos sem acúmulo de arquivos órfãos.

### Etapa 5 — Matriz de permissões
Aprovar formalmente a matriz de autorização por papel:

| Operação | Owner | Manager | Barber |
|---|---:|---:|---:|
| Editar dados da barbearia | Sim | Sim | Não |
| Criar e editar serviços | Sim | Sim | Não |
| Editar horários gerais | Sim | Sim | Não |
| Criar profissionais | Sim | Não | Não |
| Alterar nome ou status de profissional | Sim | Não | Não |
| Configurar agenda profissional | Sim | Sim | Própria futuramente |
| Configurar comissão | Sim | Sim | Não |
| Convidar manager | Sim | Não | Não |
| Convidar barber | Sim | Sim | Não |
| Ver CRM completo | Sim | Sim | Não |
| Ver agenda completa | Sim | Sim | Não |
| Ver própria agenda | Sim | Sim | Sim |

### Etapa 6 — Alinhamento de frontend e RLS
- Ajustar RLS de `services`, `business_hours` e `professionals` para suportar as operações permitidas ao gerente;
- Criar RPCs com escopo limitado onde apropriado, sem utilizar políticas permissivas amplas.

### Etapa 7 — CI e testes
- Criar workflow em `.github/workflows/ci.yml` executando `npm ci`, `npm run typecheck`, `npm test`, `npm run lint` e `npm run build`;
- Escrever testes automatizados de isolamento de tenants (A x B), permissões por papel, Storage, convites e RPCs financeiras.

### Etapa 8 — Desempenho e limpeza
- Criar índices para chaves estrangeiras;
- Eliminar índices duplicados e reorganizar RLS policies redundantes;
- Limpeza coordenada de artefatos remanescentes de Drizzle/D1.

### Etapa 9 — Funcionalidades
- Retomar o desenvolvimento de funcionalidades de produto (cálculo de comissão, repasses, relatórios reais, cobrança) somente após a conclusão e validação das Etapas 0 a 8.

---

## 9. Critérios de conclusão por etapa

- **Etapa 1:** Documentação atualizada, revisada e commitada em branch dedicada, sem alteração de código ou banco.
- **Etapa 2:** Banco reconstruído do zero com sucesso em ambiente isolado e mapa de migrations aprovado.
- **Etapa 3:** Nenhum token bruto presente em URLs ou logs; RPCs protegidas contra invocação por `anon`.
- **Etapa 4:** Substituição de fotos no Storage ocorrendo sem erro de RLS no `DELETE`.
- **Etapa 5/6:** Permissões de `manager` alinhadas na UI e no banco sem erros de RLS.
- **Etapa 7:** Workflow de CI rodando e passando em todas as PRs no GitHub.

---

## 10. Regras para agentes

- Ler `README.md`, `AGENTS.md` e `docs/` antes de iniciar qualquer trabalho.
- Trabalhar estritamente em etapas isoladas.
- Sempre verificar se existem alterações não commitadas antes de rodar comandos de git.
- Jamais mascarar erros de RLS usando políticas permissivas genéricas (`USING (true)`).
- Exigir evidência e teste automatizado antes de marcar um item como concluído.

---

## 11. Comandos proibidos

Fica estritamente proibida a execução dos seguintes comandos sem autorização explícita:
- `supabase db push`
- `supabase migration repair`
- `supabase db reset`
- `supabase db pull`
- `supabase link`
- `supabase functions deploy`
- `vercel deploy`
- `wrangler deploy`
- `npm audit fix` / `npm audit fix --force`
- Execução direta de SQLs mutáveis no ambiente Supabase de homologação ou produção.

---

## 12. Evidências necessárias

Cada etapa futura deverá produzir um relatório de evidências com:
- Comandos executados e seus respectivos outputs;
- Logs de teste e resultados de validação de RLS;
- Diffs das alterações de código e SQL;
- Confirmação de integridade dos dados e das permissões.

---

## 13. Pendências de produto

- Cálculo e gestão transacional de comissões por atendimento;
- Relatórios financeiros reais e métricas de desempenho;
- Fluxo completo de no-show e justificativas de cancelamento;
- Gateway de pagamento, gestão de assinaturas e bloqueio de inadimplentes;
- SMTP transacional profissional e domínio oficial;
- Termos de Serviço e Política de Privacidade de acordo com a LGPD.

---

## 14. Próxima tarefa autorizada

```text
Produzir o mapa de reconciliação das migrations, sem alterar arquivos,
sem aplicar migrations e sem executar comandos mutáveis no Supabase.
```
