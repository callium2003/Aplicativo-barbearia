# Plano de Tarefa - Implementação do Design Aprovado (Área do Cliente & Gestão)

## Objetivo
Aplicar fielmente a identidade visual e os modelos de layout aprovados (armazenados em `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9`) em todas as páginas reais do projeto BarbeariaSP, preservando 100% da lógica de negócio, dados do Supabase, regras LGPD e contratos existentes.

A execução seguiu a ordem estrita aprovada pelo usuário:
1. **Fase 1**: Área do Cliente (`/cliente/entrar`, `/[slug]`, `/meus-agendamentos`, `/meu-perfil`).
2. **Fase 2**: Área de Gestão (`/painel`, `/painel/agenda`, `/painel/clientes`, `/painel/configurar`, `/painel/relatorios`).

---

## Fases do Protocolo V.L.A.E.G.

### Fase 1: V - Visão & Lógica
- [x] Auditar as 56 imagens de pranchas/mockups aprovados em `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9`.
- [x] Mapear cada imagem para sua rota e componente correspondente no Next.js.
- [x] Confirmar escopo e prioridade com o usuário (iniciar pela Área do Cliente, seguida da Gestão).
- [x] Definir o plano de implementação detalhado (`implementation_plan.md`) aprovado pelo usuário.

### Fase 2: L - Link & Conectividade
- [x] Validar que todas as consultas e RPCs do Supabase continuam íntegras:
  - `get_public_availability`, `book_customer_appointment`, `save_my_customer_profile`
  - `get_my_customer_marketing_preferences`, `save_my_customer_marketing_preferences`
- [x] Garantir que os tokens e sessões do Supabase Auth transitam normalmente entre rotas.

### Fase 3: A - Arquitetura & Implementação (Área do Cliente - Em Andamento)
- [ ] **Etapa 1: Login do Cliente (`app/cliente/entrar/page.tsx`)**:
  - Ajuste visual conforme `exec-985799eb...` pendente de refinamento final.
- [x] **Etapa 2: Vitrine & Agendamento Público (`app/[slug]/page.tsx` e `public-page.module.css`)**:
  - Aplicado layout do hero com foto real, bordas curvas inferiores, botões terracota/WhatsApp/Como chegar, vitrines de Serviços e Equipe, cards de Horários e Endereço, alinhado a `exec-7b8e1062...`.
- [ ] **Etapa 3: Meus Agendamentos (`app/meus-agendamentos/page.tsx`)**:
  - Redesenho visual conforme `exec-50102b10-9fb5-4043-b0d1-2acf742038b0.png` PENDENTE.
- [ ] **Etapa 4: Meu Perfil & Privacidade (`app/meu-perfil/page.tsx`)**:
  - Refinamento estético PENDENTE.

### Fase 4: E - Estilo & UI (Gestão - Em Andamento)
- [ ] Aplicar o redesign visual nos painéis conforme mockups:
  - `/painel/configurar` (`exec-678493c7...` hub de configurações e edição de barbearia/profissionais PENDENTE)
  - Demais telas da gestão com estilo harmonizado.

### Fase 5: G - Gatilho & Publicação (Validação Concluída)
- [x] Validação da suíte de testes de UI e gestão: 100% aprovada (pass 25 de 25 testes das áreas afetadas).
- [x] Verificação de integridade de tipos: `tsc --noEmit` completou com código 0 (zero erros).
- [x] Preservação estrita dos contratos com Supabase, segurança LGPD e exportação CSV.

## Atualização de fechamento — 07/09/2026

As marcações históricas de pendência acima não representam mais o estado de implementação das Etapas 1–3 do redesign do cliente. Foram implementados: página pública e fluxo T01–T06, `/meus-agendamentos`, gerenciamento inline, `/meu-perfil`, Meus dados, preferências explícitas com reconciliação parcial e `/meu-perfil/privacidade`. Os blocos 3.1–3.4 foram aprovados manualmente; Privacidade ainda requer captura autenticada repetível. A fonte de verdade atual é [docs/REDESIGN-STAGES-1-3-20260907.md](docs/REDESIGN-STAGES-1-3-20260907.md); as tarefas de gestão permanecem fora deste fechamento.
