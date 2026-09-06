# BarbeariaSP Management Mobile Redesign

**Goal:** Aplicar às telas reais de gestão o visual móvel aprovado, preservando os dados, permissões e funcionalidades existentes.

**Architecture:** Manter as rotas, consultas Supabase e regras de acesso atuais. A mudança usa o `PanelShell` compartilhado, novos estados visuais em `product-ui.css` e marcação responsiva nas tabelas de relatórios; nenhum schema ou serviço remoto será alterado.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS global compartilhado e Supabase existente.

---

### Task 1: Regressão visual e funcional automatizada

- Criar teste de contrato para login com foto, navegação completa, central de configurações, agenda semanal e relatórios móveis.
- Executar o teste isolado e confirmar falha antes da implementação.

### Task 2: Acesso e navegação do painel

- Aplicar o cabeçalho fotográfico aprovado à rota `/entrar`.
- Expor no `PanelShell` todas as rotas autorizadas para gestor.
- Manter navegação inferior móvel, cabeçalho e ações acessíveis.

### Task 3: Central de configurações e equipe

- Integrar `/painel/configurar` ao `PanelShell`.
- Criar central de atalhos para dados da barbearia, serviços, profissionais, agenda, relatórios, plano e conta.
- Reorganizar visualmente foto, cadastro, serviços, profissionais, sete dias, pausas e convites sem alterar a persistência.
- Manter convite por e-mail, copiar link e compartilhamento por WhatsApp.

### Task 4: Relatórios móveis

- Manter os seis relatórios e os dados reais atuais.
- Converter tabelas em cartões legíveis no celular sem duplicar consultas ou ações.
- Preservar filtros, CSV, WhatsApp e atualização de repasses.

### Task 5: Verificação e documentação

- Executar testes direcionados, typecheck, suíte e build.
- Verificar `/entrar`, `/painel/configurar`, `/painel/profissionais` e `/painel/relatorios` em viewport móvel e desktop.
- Registrar QA visual em `design-qa.md` e atualizar a documentação de estado, sem publicar.
