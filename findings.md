# Descobertas e Inventário de Mockups de Design

## 1. Localização e Mapeamento dos Modelos Visuais Aprovados
Os modelos visuais aprovados estão localizados em:
`C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9` (total: 56 arquivos PNG, resolução 853x1844 / 390x844px).

### Mapeamento das Telas:

#### A. Área do Cliente & Vitrine Pública
1. **Login do Cliente (`/cliente/entrar`)**:
   - Referência de identidade: `exec-985799eb-3a2b-4fa3-b467-e47847562274.png`.
   - Elementos: Topo com fotografia de barbearia (`/marketing-barbershop-hero.png`), gradiente escuro, tipografia editorial Georgia, marca BarbeariaSP, cartão claro acolhedor com Google e Link Mágico.
2. **Página Pública da Barbearia (`/[slug]`)**:
   - Referência: `exec-7b8e1062-967b-463a-8940-1599a64364fc.png`.
   - Elementos: Topbar escura compacta, hero com foto e descrição da barbearia, badges diretos de ação ("Agendar horário", "Falar no WhatsApp", "Como chegar").
3. **Seleção de Serviços & Agendamento (`/[slug]` seção booking)**:
   - Referência: `exec-4952101c-74dc-4f39-8136-77e978d2637b.png`.
   - Elementos: Cards de serviços com checkbox de seleção cumulativa, indicador de duração total e valor somado, calendário/data e slots por profissional.
4. **Meus Agendamentos (`/meus-agendamentos`)**:
   - Referência: `exec-50102b10-9fb5-4043-b0d1-2acf742038b0.png`.
   - Elementos: Card principal destacado para "Próximo agendamento" com botão WhatsApp e Reagendar; abas Próximos / Histórico; lista em cards com status e ações.
5. **Meu Perfil (`/meu-perfil`)**:
   - Elementos: Dados de contato, consentimentos de marketing LGPD (barbearia vs aplicativo), lista "Minhas Barbearias" e acesso à privacidade.

#### B. Área de Gestão
1. **Login Gestão (`/entrar`)**:
   - Implementado e conferido (`exec-985799eb...`).
2. **Clientes & Relacionamento (`/painel/clientes`)**:
   - Referência: `exec-b0aa37de-0782-4542-b764-c50befca4d3b.png` e `exec-f246aa63...`.
   - Elementos: Filtro "De" e "Até" para período, busca textual, cards com métricas e histórico.
3. **Serviços & Editar Serviço (`/painel/configurar` e modal/tela de edição)**:
   - Referência: `exec-5ffb62e9-7a2c-4dc6-9d5a-a2a3be289f28.png`.
   - Elementos: Edição sem botão de exclusão destrutiva, opção de "Inativar serviço" e reativação.
4. **Profissionais & Disponibilidade (`/painel/profissionais`)**:
   - Referência: `exec-493eed7c-4c9a-428c-86f8-00dac6043b44.png`.
5. **Dados da Barbearia & Foto (`/painel/configurar#dados-barbearia`)**:
   - Referência: `exec-85bb4d42-fce2-4b2d-af3d-a2cbf990c2a2.png`.
6. **Convites de Equipe (`/painel/configurar#equipe-acessos`)**:
   - Referência: `exec-d0ad6b31-8854-4d0b-bdc0-e4fdfce4870a.png`.
7. **Relatórios & Comissões (`/painel/relatorios`)**:
   - Referências: `exec-678493c7...`, `exec-9d0a9e7f...`, `exec-af85ac2c...`, `exec-41a1b08d...`.

## 2. Invariantes de Dados e Segurança
- Nenhum schema ou função do Supabase será modificado nesta etapa visual.
- Todos os RPCs existentes (`get_public_availability`, `book_customer_appointment`, `save_my_customer_profile`, `get_my_customer_marketing_preferences`, `save_my_customer_marketing_preferences`) devem permanecer com as mesmas assinaturas e retornos.
- Nenhuma chave de API ou segredo será hardcoded.
