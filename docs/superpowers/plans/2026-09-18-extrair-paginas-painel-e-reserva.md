# Extração de páginas extensas em componentes — Plano de implementação

> **Para agentes:** execute cada lote com um ciclo TDD e valide antes de iniciar o seguinte. Não crie commit, push, deploy, migration ou alteração remota.

**Objetivo:** dividir as três páginas extensas em componentes coesos, preservando rigorosamente comportamento, aparência, acessibilidade, consultas e contratos existentes.

**Arquitetura:** cada página continuará sendo a proprietária de estado, efeitos, consultas Supabase e funções de mutação. Os novos componentes, na mesma pasta da página, receberão apenas os dados e callbacks já existentes como props tipadas; não criarão estado espelho nem novas chamadas remotas. Os estilos e classes atuais serão mantidos.

**Tecnologias:** Next.js 16, React 19, TypeScript 5.9, ESLint, testes nativos Node.

**Especificação:** `docs/FUNCTIONAL-SPEC.md`, especialmente requisitos de reserva pública, gestão e seção 48.

## Restrições globais

- Preservar as alterações locais preexistentes fora deste lote.
- Não tocar no Supabase remoto, em migrations antigas, em RLS ou em credenciais.
- Não alterar copy, classes CSS, links, IDs, `aria-*`, consultas, RPCs, estados ou regras de negócio.
- Depois de cada página: executar `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run test:unit`.
- Cada teste novo protege uma fronteira de composição observável; testes de texto existentes devem ler o novo componente que passou a ser dono da interface.

---

### Tarefa 1: Configurações da barbearia

**Arquivos:**

- Criar: `app/painel/configurar/SettingsIndex.tsx`
- Criar: `app/painel/configurar/ShopProfileSection.tsx`
- Criar: `app/painel/configurar/BusinessHoursSection.tsx`
- Criar: `app/painel/configurar/ServicesSection.tsx`
- Criar: `app/painel/configurar/ProfessionalsSection.tsx`
- Criar: `app/painel/configurar/TeamAccessSection.tsx`
- Modificar: `app/painel/configurar/page.tsx`
- Modificar: `tests/management-settings-services-presentation.test.mjs`

**Interfaces:** os componentes consomem os mesmos valores, setters, refs e handlers já declarados por `Configurar`; `Configurar` continua dono de `shop`, catálogo, profissionais, horários, equipe, convites, imagem e todos os efeitos Supabase.

- [x] Escrever teste que importa os componentes de configuração e garante que a página monta as seções extraídas.
- [x] Executar o teste e observar falha por os componentes ainda não existirem.
- [x] Extrair índice, perfil, horário, catálogo, profissionais e equipe para arquivos vizinhos, sem alterar atributos ou handlers.
- [x] Atualizar testes estáticos existentes para ler a página e os componentes responsáveis pelas interfaces preservadas.
- [x] Executar `node.exe --experimental-strip-types --test tests/management-settings-services-presentation.test.mjs` e observar aprovação.
- [x] Executar `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run test:unit`.

### Tarefa 2: Página pública e reserva

**Arquivos:**

- Criar: `app/[slug]/PublicBarbershopHeader.tsx`
- Criar: `app/[slug]/PublicBookingFlow.tsx`
- Criar: `app/[slug]/PublicBarbershopFooter.tsx`
- Modificar: `app/[slug]/page.tsx`
- Modificar: `tests/public-booking-access.test.mjs`, `tests/public-slug-and-customer-rebooking.test.mjs`

**Interfaces:** `PublicBarbershop` mantém todos os efeitos de sessão, recuperação de reserva pendente, disponibilidade, autenticação e gravação. Os componentes recebem valores e callbacks da página; não acessam Supabase nem armazenamento do navegador diretamente.

- [x] Escrever teste que exige que a página componha cabeçalho, fluxo de reserva e rodapé extraídos.
- [x] Executar o teste e observar falha pelos módulos ausentes.
- [x] Mover somente a marcação de cada bloco para os três componentes, preservando o fluxo `dados → serviços/profissional → horário → confirmação`, IDs, foco e mensagens.
- [x] Atualizar testes de reserva para inspecionarem o componente que possui a marcação movida, mantendo as mesmas garantias funcionais.
- [x] Executar os testes públicos dirigidos e então `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run test:unit`.

### Tarefa 3: Ficha do profissional

**Arquivos:**

- Criar: `app/painel/profissionais/[id]/ProfessionalDataSection.tsx`
- Criar: `app/painel/profissionais/[id]/ProfessionalScheduleSection.tsx`
- Criar: `app/painel/profissionais/[id]/ProfessionalAccessSection.tsx`
- Criar: `app/painel/profissionais/[id]/ProfessionalOperationalSection.tsx`
- Criar: `app/painel/profissionais/[id]/professional-detail-shared.ts`
- Modificar: `app/painel/profissionais/[id]/page.tsx`
- Modificar: `tests/management-team-presentation.test.mjs`

**Interfaces:** `FichaProfissional` mantém carregamento, autorização, upload e mutações. As três seções recebem estado e callbacks existentes por props e preservam os elementos `details`, formulários e feedbacks atuais.

- [x] Escrever teste que exige que a ficha componha os componentes de dados, agenda, acesso e operação.
- [x] Executar o teste e observar falha pelos módulos ausentes.
- [x] Extrair as seções, mantendo as mesmas funções `saveData`, `saveCommission`, disponibilidade, convite, acesso e inativação.
- [x] Atualizar os testes da área profissional para seguirem os blocos extraídos sem reduzir a cobertura de comportamento.
- [x] Executar o teste dirigido e então `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run test:unit`.

### Revisão final

- [x] Conferir `git diff --check` e `git status --short` para separar o lote das alterações preexistentes.
- [x] Apresentar a árvore nova de cada pasta, os comandos realmente executados e limitações de validação visual.
