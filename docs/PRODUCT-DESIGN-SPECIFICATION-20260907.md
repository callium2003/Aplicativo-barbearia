# BarbeariaSP — Especificação visual derivada das imagens do Product Design

Data original: 07/09/2026
Revisão funcional aprovada: 08/09/2026

Status: referência canônica para a próxima implementação da gestão; decisões desta revisão ainda não implementadas

Fonte visual oficial: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9`

## Autoridade desta especificação

Este documento, suas imagens oficiais e as decisões aprovadas em 08/09/2026 formam a fonte canônica do redesign visual do BarbeariaSP. Código, CSS, componentes e estilos anteriores podem ser reutilizados para preservar funcionalidade, mas **não** são autoridade visual quando entrarem em conflito com esta especificação. A existência de CSS ou markup legado não justifica manter o visual antigo; a implementação deve remover ou neutralizar conflitos antigos na superfície que está sendo redesenhada.

A precedência geral de produto é:

decisão explícita mais recente do usuário
→ melhor experiência e coerência de produto aprovadas nesta revisão
→ referências visuais oficiais
→ esta especificação e as demais especificações vigentes
→ implementação legada

Na gestão, a área de **Clientes (T32), já homologada, é a referência visual prioritária e compartilhada**. As demais imagens oficiais continuam obrigatórias para composição e detalhes específicos de cada tela, desde que não recriem navegação, fluxo ou estrutura substituídos por esta revisão.

Esta precedência permite propor mudanças funcionais, de dados, Supabase, autenticação, RLS ou RPCs quando forem necessárias para a experiência aprovada, mas não autoriza implementá-las silenciosamente. Toda mudança técnica relevante deve apresentar problema, nova regra, benefício, impactos, dados existentes, migrations/RPCs/RLS prováveis, riscos e casos especiais para aprovação antes da implementação.

**Baseline de segurança a preservar.** A branch isolada `security/p0-remediations-20260907-workspace` contém AUTH-01, AUTHZ-01 e ABUSE-01 implementados e validados localmente, ainda sem integração ao checkout principal. A implementação visual/funcional desta especificação deve ser integrada sem sobrescrever essas remediações: retorno pós-login restrito, nenhum `UPDATE` amplo de `appointments` para profissional e limite de quatro reservas futuras ativas por cliente/barbearia. A operação controlada de status deve ser ajustada para que o profissional não possa cancelar.

## 1. Finalidade e regras de interpretação

Este documento transforma as 56 imagens aprovadas do Product Design em instruções para implementação React/Next.js. Ele não redesenha as telas. As imagens continuam sendo a autoridade para composição, proporção, hierarquia e identidade visual.

Regras para o agente de desenvolvimento:

1. Quando houver várias versões da mesma tela, a imagem cronologicamente mais recente é a referência principal para os elementos que ela mostra. Versões anteriores continuam válidas para estados ou detalhes ausentes na última versão.
2. Texto, valor ou comportamento claramente visível é uma decisão visual observada. Uma ação inferida pelo rótulo é descrita como intenção de navegação, não como regra de negócio nova.
3. Tudo que não puder ser comprovado pela imagem ou pela especificação funcional vigente está marcado como **precisa de definição**.
4. Valores, nomes, datas, clientes e profissionais exibidos são conteúdo demonstrativo. Não devem ser codificados como dados fixos de produção.
5. Exclusão definitiva de serviços não aparece no design. A referência aprovada usa inativação e reativação.
6. A experiência é mobile-first. As imagens verticais usam aproximadamente 852 × 1846 px, proporção equivalente a um viewport lógico próximo de 390 × 844 px em densidade alta.

## 2. Inventário rastreável das 56 imagens

| ID | Arquivo | Superfície representada | Uso na especificação |
|---:|---|---|---|
| 01 | `exec-79530b78-1657-4d81-b5b2-6594cce0dc8f.png` | Agendamento — horário, versão inicial | Variante visual |
| 02 | `exec-4dbf782e-732e-439b-8404-f04daa98ff86.png` | Agendamento — horário, identidade verde | Variante visual |
| 03 | `exec-73c75e85-7320-41e5-b822-6d4af007ce28.png` | Agendamento — horário com cabeçalho BarbeariaSP | Variante visual |
| 04 | `exec-75f9f750-a9e3-4fa7-80b7-d294f0e9bc2e.png` | Agendamento — escolher profissional | Referência complementar |
| 05 | `exec-cc2e6667-6d65-4934-ad6b-07f00ff1d6ba.png` | Agendamento — serviço e profissional | Variante anterior |
| 06 | `exec-93b5f2f5-c64c-4389-b8f1-5272c8d7f977.png` | Agendamento — escolher data | Referência principal |
| 07 | `exec-38366e25-5d3a-441e-902f-024d23c2f38b.png` | Agendamento — serviços e profissional | Referência principal do passo 2 |
| 08 | `exec-92bbd973-f6b7-4507-9df1-82cde32c3609.png` | Agendamento — escolher horário | Referência principal do passo 3 |
| 09 | `exec-c94c7022-7615-4bb0-a36d-6986bddadc6a.png` | Login antes da confirmação | Referência principal |
| 10 | `exec-0a1e7aa1-2ae2-44a6-adff-9e90091b06a5.png` | Revisão e confirmação do agendamento | Referência principal |
| 11 | `exec-bf33bd56-2e1f-4a43-9a45-5b1bdbff4167.png` | Área do cliente — início | Variante |
| 12 | `exec-50102b10-9fb5-4043-b0d1-2acf742038b0.png` | Área do cliente — início detalhado | Referência principal |
| 13 | `exec-872edbdb-5d83-4fed-bb05-08bf1deaf7f6.png` | Meus agendamentos | Referência principal |
| 14 | `exec-89e3889b-76ba-43a5-9669-66e5a878520c.png` | Detalhes do agendamento | Referência principal |
| 15 | `exec-65917587-0b6a-4941-8870-300b2ea80934.png` | Meus dados | Referência principal |
| 16 | `exec-fd14dd96-8fd3-4fd4-9ece-e1cc9a9a33c9.png` | Preferências de comunicação | Variante |
| 17 | `exec-0706b4ba-2edd-4d7d-8c23-cdde0e841c0b.png` | Privacidade e meus dados | Referência principal |
| 18 | `exec-c09690a1-02c5-4722-8f91-8accacec43ed.png` | Preferências de comunicação | Referência principal |
| 19 | `exec-3ba268b4-9d6c-4ce6-9bb3-a2b48b75fe32.png` | Página pública da barbearia | Variante inicial |
| 20 | `exec-08903ea5-e04e-48bb-a9e7-dfa95ed6c411.png` | Landing page desktop — composição 1 | Variante |
| 21 | `exec-84bf0a91-6b45-4be8-a6ac-07754ab1c878.png` | Landing page desktop — composição 2 | Variante |
| 22 | `exec-48e0f7c1-ffda-4b45-a859-8a49ffb6ebe4.png` | Landing page desktop — composição 3 | Referência de topo |
| 23 | `exec-89f38061-529c-424e-86d9-d30d8c95e9f1.png` | Landing page desktop — composição longa | Referência consolidada |
| 24 | `exec-034f8639-ad27-47aa-9bfd-d98b2a9c0c13.png` | Fotografia hero sem placa | Ativo intermediário |
| 25 | `exec-468cd2cd-c264-43ec-957d-92412ceee8ea.png` | Fotografia hero com placa BarbeariaSP | Ativo principal |
| 26 | `exec-7b8e1062-967b-463a-8940-1599a64364fc.png` | Página pública da barbearia | Referência principal |
| 27 | `exec-4952101c-74dc-4f39-8136-77e978d2637b.png` | Agendamento — serviços e profissional | Refinamento principal |
| 28 | `exec-07ce26f2-be49-45bc-beaf-7c803917be3a.png` | Login de gestão em composição desktop | Referência desktop |
| 29 | `exec-985799eb-3a2b-4fa3-b467-e47847562274.png` | Login de gestão mobile, versão 1 | Variante |
| 30 | `exec-5e8996b0-7770-409e-bdf3-8411444edf7b.png` | Login de gestão mobile, versão 2 | Variante |
| 31 | `exec-52b4db17-7e13-4304-9fef-0c0b2c1896eb.png` | Login de gestão mobile, versão 3 | Variante |
| 32 | `exec-01fc40cd-d2c2-4bb0-aaea-cc8887362e77.png` | Configurações | Variante sem relatórios |
| 33 | `exec-0f6fa61e-e1cc-486c-a4ce-d7ae23129f05.png` | Dados da barbearia | Variante sem foto |
| 34 | `exec-a083496a-560c-4dbd-9abf-2e0df066aebc.png` | Agenda e horários da barbearia | Referência principal |
| 35 | `exec-678493c7-37f0-4e51-b2f9-f1c724d75682.png` | Configurações com relatórios | Referência principal |
| 36 | `exec-493eed7c-4c9a-428c-86f8-00dac6043b44.png` | Perfil profissional | Referência principal |
| 37 | `exec-85bb4d42-fce2-4b2d-af3d-a2cbf990c2a2.png` | Dados da barbearia com foto | Referência principal |
| 38 | `exec-699cee05-2474-4ce3-9f81-59e7abb58b1f.png` | Novo profissional | Variante de cadastro |
| 39 | `exec-1f100f27-4842-4c04-887c-6e7b8db16e0b.png` | Horários de trabalho do profissional | Variante com três grupos de dias |
| 40 | `exec-2d49d024-9900-4478-8a2c-1b4b9e7e9e56.png` | Relatórios e comissões — resumo | Variante inicial |
| 41 | `exec-3af57322-c100-4571-8a29-710a0dcac7d6.png` | Novo profissional com convite por e-mail | Variante |
| 42 | `exec-d10b6e50-a3ea-4bb6-bdff-a739f4a2a489.png` | Horários do profissional, sete dias | Referência principal |
| 43 | `exec-d0ad6b31-8854-4d0b-bdc0-e4fdfce4870a.png` | Novo profissional com e-mail e link | Referência principal |
| 44 | `exec-dee73329-808f-410f-8ee4-36a6f980925d.png` | Relatório — visão geral do período | Referência principal |
| 45 | `exec-18b6995b-f9c6-402e-b840-c4fbef9cd401.png` | Relatório — desempenho da equipe | Referência principal |
| 46 | `exec-af85ac2c-968f-42eb-b726-2364bba8b0c8.png` | Relatório — desempenho dos serviços | Referência principal |
| 47 | `exec-f246aa63-ae72-456d-b21b-d1258f7341bd.png` | Relatório — clientes e relacionamento | Referência principal |
| 48 | `exec-41a1b08d-ef89-46d0-bd6d-7c0a32d9caf8.png` | Relatório — agendamentos do período | Referência principal |
| 49 | `exec-9d0a9e7f-9c25-4543-9064-f6bb2717532a.png` | Relatório — comissões e repasses | Referência principal |
| 50 | `exec-c0b1c946-f79c-4974-b224-e824cbab8513.png` | Serviços oferecidos | Referência principal |
| 51 | `exec-2eb5882e-c72c-4224-b4f9-e8d173cac6dc.png` | Clientes | Variante sem filtro de período |
| 52 | `exec-1023438e-0d03-4220-97e7-ba903d5a29d6.png` | Convite de profissional — acesso | Referência do login de convite |
| 53 | `exec-87064491-7695-4fc6-bdb8-fc6b31666c29.png` | Plano e assinatura — trial | Referência principal |
| 54 | `exec-b0aa37de-0782-4542-b764-c50befca4d3b.png` | Clientes com intervalo de datas | Referência principal |
| 55 | `exec-5ffb62e9-7a2c-4dc6-9d5a-a2a3be289f28.png` | Editar serviço e inativar | Referência principal |
| 56 | `exec-e29a8fd7-7e40-4e39-bf2e-57917aa37b55.png` | Convite de profissional — confirmação | Referência principal |

## 3. Convenções globais aplicáveis a todas as telas

### 3.1 Estrutura mobile

- Largura de conteúdo: 100%, com `max-width` sugerido de 430 px quando exibido isoladamente em desktop.
- Margens laterais: aproximadamente 16–20 px.
- Espaçamento vertical base: 8 px; agrupamentos usam 12, 16, 24 ou 32 px.
- Cabeçalho: 56–64 px quando textual; hero fotográfico de 180–240 px nas telas públicas e de acesso.
- Rodapé de ação fixo ou aderente: botão principal com 48–52 px de altura e margem de 16 px.
- Navegação inferior: 64–72 px, cinco ou três destinos conforme o perfil.
- Cards: largura total, padding de 14–18 px, distância de 10–14 px entre cards.

### 3.2 Estados compartilhados

Todo componente interativo deve implementar, mesmo quando não aparece na imagem:

- **normal:** tratamento conforme a referência;
- **hover (desktop):** mudança sutil de fundo/borda, sem deslocamento de layout;
- **foco:** contorno visível de 2 px com afastamento de 2 px; nunca depender apenas da cor;
- **selecionado:** preenchimento terracota, oliva, preto ou fundo pêssego conforme a família da tela, acompanhado por check, rádio ou texto;
- **desabilitado:** opacidade entre 40% e 55%, cursor não interativo e `aria-disabled`/`disabled` real;
- **loading:** preservar dimensões para evitar salto; usar skeleton nos cards/listas e spinner com texto em ações;
- **erro:** mensagem curta junto ao campo ou bloco afetado, cor de alerta e ícone; manter os dados já preenchidos;
- **sucesso:** faixa verde-clara com ícone de confirmação e mensagem objetiva;
- **vazio:** card explicativo com ação primária pertinente; não exibir métricas inventadas;
- **sem permissão:** explicar que o perfil não possui acesso e oferecer retorno seguro;
- **confirmação destrutiva:** modal ou painel com consequência, ação neutra em destaque equivalente e confirmação explícita.

### 3.3 Requisitos globais de acessibilidade

- HTML semântico, ordem de leitura igual à ordem visual e apenas um `h1` por tela.
- Contraste mínimo WCAG AA; validar principalmente textos bege/cinza, bordas finas e status em chips.
- Alvos de toque com no mínimo 44 × 44 px.
- Ícones decorativos com `aria-hidden`; ícones acionáveis com nome acessível.
- Inputs sempre associados a `label`; placeholder não substitui label.
- Erros associados por `aria-describedby` e resumo de erros quando houver múltiplos campos.
- Mudanças assíncronas anunciadas em região `aria-live="polite"`.
- Modais prendem foco, fecham por Escape quando seguro e devolvem foco ao acionador.
- Não usar apenas cor para status, seleção, disponibilidade ou resultado.

## 4. Especificação por tela — fluxo público de agendamento

### T01. Página pública da barbearia

**Objetivo.** Apresentar identidade, contatos, serviços, equipe, horários e iniciar o agendamento. Referências principais: imagens 25 e 26; imagem 19 é variante anterior; imagem 24 é o ativo fotográfico sem a placa.

**Layout e hierarquia.** Hero fotográfico no topo, com placa “BarbeariaSP”, seguido por conteúdo em fundo marfim. Nome da barbearia em título serifado grande, endereço completo e texto descritivo. CTA terracota de largura total “Agendar horário” domina a primeira dobra. Abaixo: botões secundários WhatsApp e Como chegar, carrosséis/listas horizontais de Serviços e Nossa equipe, bloco Horários de atendimento, bloco Endereço e contato e navegação inferior.

**Componentes.** `PublicShopHero`, `ShopIdentity`, `PrimaryBookingButton`, `ContactActionRow`, `ServicePreviewList`, `ProfessionalAvatarList`, `OpeningHoursCard`, `AddressCard`, `PublicBottomNav`. Serviços usam ícone circular, nome, duração e preço. Profissionais usam foto circular, nome e especialidade. Cabeçalhos de seção têm ação “Ver todos”.

**Visual.** Fundo `#F7F3EC` aproximado; cards brancos; terracota `#C85A35` para ação; texto principal quase preto; texto auxiliar cinza quente; bordas bege claras; raios de 8–12 px. Título em serifada editorial, 30–36 px; corpo 13–16 px; labels em caixa alta 10–12 px e tracking amplo.

**Ações e navegação.** Agendar horário abre T02. WhatsApp abre conversa para o número cadastrado; Como chegar abre mapa com endereço. Serviço/equipe e “Ver todos” abrem listagem ou seleção correspondente — **precisa de definição** se haverá rotas públicas exclusivas. Navegação inferior alterna Início, Agendar e Entrar.

**Estados.** Sem foto usa fallback aprovado pela aplicação; sem endereço/WhatsApp oculta a ação correspondente; sem serviços ou profissionais mostra estado vazio sem CTA impossível. Horário fechado precisa indicar “Fechado”. Loading usa skeleton do hero e dos cards.

**Responsivo.** Mobile segue a imagem. Tablet mantém coluna central de até 680 px ou duas colunas apenas nos blocos inferiores. Desktop pode usar conteúdo central de 900–1100 px, preservando o hero e a ordem; não transformar em dashboard.

### T02. Escolher data — passo 1

**Objetivo.** Selecionar primeiro o dia do agendamento. Referência: imagem 06.

**Layout e componentes.** Hero reduzido da barbearia; marca/nome; título “Escolha a data”; subtítulo; stepper horizontal com quatro etapas (Data, Serviço e profissional, Horário, Confirmação); calendário mensal; setas de mês anterior/próximo; legenda Selecionado/Hoje/Indisponível; botões Continuar e Voltar.

**Hierarquia e visual.** Título serifado 28–34 px. Stepper ocupa largura total, números/checks circulares de 22–28 px ligados por linhas. Calendário em grade de sete colunas; data selecionada com círculo terracota preenchido; hoje com realce secundário; dias externos/indisponíveis em cinza. CTA terracota no rodapé.

**Ações.** Setas alteram o mês. Tocar em dia disponível seleciona uma única data. Continuar abre T03. Voltar retorna T01.

**Regras e estados.** Não permitir continuar sem data. Dias indisponíveis não recebem foco interativo. Loading deve preservar a grade. Erro de disponibilidade mostra aviso acima do calendário e opção de tentar novamente. Mês mínimo/máximo navegável — **precisa de definição**.

**T02 preliminary availability rule (decisão aprovada).** O modelo atual não possui associação profissional ↔ serviço: todos os profissionais ativos da barbearia são considerados aptos aos serviços ativos. Como o único efeito do serviço no cálculo de disponibilidade é sua duração, T02 usa o serviço ativo de menor duração como sonda. Se nenhum intervalo comportar esse serviço, nenhum serviço mais longo poderá caber. Essa regra apenas identifica se existe alguma possibilidade de atendimento antes da escolha de serviços; T03/T04 sempre recalculam com os serviços realmente selecionados. A futura funcionalidade de produto **“serviços realizados por profissional”** exigirá revisão desta lógica preliminar.

**Acessibilidade.** Calendário com grade semântica ou botões nomeados com data completa, indicação de selecionado por `aria-pressed`/`aria-selected` e foco visível.

### T03. Escolher serviços e profissional — passo 2

**Objetivo.** Selecionar de um a três serviços e um único profissional capaz de executar todos. Referências principais: imagens 07 e 27; imagens 04 e 05 mostram variações anteriores.

**Layout e componentes.** Hero curto; título; stepper; card da data selecionada com ação Alterar; lista vertical de serviços com checkbox, ícone, descrição, duração e preço; resumo “n de 3 serviços selecionados”, duração e total; lista horizontal de profissionais com opção Sem preferência; CTA “Continuar para horários”; Voltar.

**Hierarquia.** Data contextual acima das escolhas. Serviços ocupam a maior área. Seleção visível por checkbox terracota e linha realçada. Resumo fica imediatamente antes dos profissionais. Fotos circulares de 52–64 px; profissional selecionado recebe anel/check.

**Ações.** Alterar volta a T02 preservando escolhas compatíveis. Cada serviço alterna seleção até o máximo de três. Selecionar profissional troca a seleção única. CTA abre T04 com data, serviços e profissional. Voltar abre T02.

**Validações.** Mínimo de um serviço; máximo de três; profissional deve atender todos os serviços, salvo Sem preferência. Se a combinação ficar incompatível, desmarcar profissional ou pedir nova escolha — comportamento exato **precisa de definição**. Preço total e duração são calculados, nunca digitados.

**Estados.** Serviço indisponível aparece desabilitado com motivo. Profissional sem agenda no dia pode ser ocultado ou desabilitado — **precisa de definição**. Lista vazia oferece retorno. Loading usa linhas skeleton. Erro mantém seleções locais.

**Responsivo.** Mobile usa lista e carrossel horizontal. Tablet/desktop pode dispor lista e resumo/profissionais em duas colunas, mantendo ordem e CTA claro.

### T04. Escolher horário — passo 3

**Objetivo.** Selecionar um horário disponível após data, serviços e profissional. Referência principal: imagem 08; imagens 01–03 são variantes de identidade e densidade.

**Layout e componentes.** Hero curto; stepper; cards de resumo (data, serviços, duração total, total e profissional); grade de horários separada em Manhã, Tarde e Noite; nota de duração; CTA “Revisar agendamento”; Voltar.

**Visual e proporções.** Horários em grade de quatro colunas no mobile, botões de aproximadamente 64–76 × 36–40 px. Disponível: branco com borda bege; selecionado: terracota preenchido; indisponível: cinza e/ou hachura. Resumo em card branco com divisores finos.

**Ações.** Tocar em horário disponível seleciona um slot. Revisar abre T05 se autenticado ou T06 se não autenticado, conforme o fluxo aprovado. Alterar em qualquer resumo retorna ao passo correspondente preservando estado. Voltar abre T03.

**Estados.** Sem horários mostra mensagem por período e opção de voltar à data. Se o slot expirar antes da confirmação, informar indisponibilidade e atualizar a grade. Loading usa blocos do tamanho dos horários. Horários devem ter nome acessível completo, incluindo início e término estimado.

### T05. Revisar e confirmar agendamento — passo 4

**Objetivo.** Permitir revisão final antes da reserva. Referência: imagem 10.

**Layout.** Cabeçalho com identidade e conta conectada; stepper completo; lista de detalhes com ícones: data, horário, serviços, profissional, duração, barbearia; total destacado em faixa inferior; aviso de nova verificação de disponibilidade; botão Confirmar agendamento; botão Alterar agendamento.

**Ações.** Confirmar revalida disponibilidade e cria a reserva. Alterar retorna ao fluxo mantendo os dados. Se a pessoa já estiver autenticada, chega diretamente aqui; caso contrário, passa por T06.

**Estados.** Loading bloqueia duplo envio e troca o rótulo para “Confirmando…”. Sucesso abre T07. Conflito de horário retorna a T04 com mensagem específica. Erro de autenticação leva a T06 sem perder o rascunho. Erro técnico não deve ser apresentado como conflito.

**Acessibilidade.** Resumo em lista descritiva; total anunciado; foco movido para mensagem de erro/sucesso; botão principal não pode permanecer acionável durante submissão.

### T06. Autenticação do cliente antes de confirmar

**Objetivo.** Autenticar sem perder a reserva pendente. Referência: imagem 09.

**Layout e componentes.** Hero fotográfico; título “Entre para confirmar”; resumo compacto da reserva; botão Google; separador “ou”; campo de e-mail; botão Receber link de acesso; nota com cadeado; Voltar ao agendamento.

**Campos.** `email`, tipo `email`, placeholder “Seu e-mail”, obrigatório para magic link, trim, validação de formato e mensagem “Informe um e-mail válido”. Google não exige campo.

**Ações.** Google inicia OAuth e retorna para T05. Receber link solicita magic link e mostra confirmação sem revelar existência de conta. Voltar retorna a T04. O rascunho deve sobreviver ao redirecionamento pelo período já definido na aplicação.

**Estados.** Loading individual por método. Sucesso do magic link informa que o e-mail foi enviado e permite reenviar após intervalo — intervalo **precisa de definição**. Erro de provedor mostra mensagem sanitizada. Conta administrativa impedida de reservar na própria barbearia segue regra existente, não inferida pela imagem.

### T07. Confirmação e início da área do cliente

**Objetivo.** Confirmar visualmente a reserva e oferecer ações pós-agendamento. Referências: imagens 11 e 12.

**Layout.** Hero; saudação; faixa verde-clara “Agendamento confirmado”; card Próximo agendamento com data, horário, serviços, barbearia e profissional; ações Reagendar, Cancelar e WhatsApp; lista de atalhos; Sair; navegação inferior.

**Ações.** Reagendar abre T09 em modo de alteração. Cancelar abre confirmação da T09. WhatsApp abre contato. Atalhos levam a T08, T10, T11 e T12. Sair encerra sessão. Navegação inferior alterna Barbearia, Agenda e Meu perfil.

**Estados.** Sem próximo agendamento substitui o card por CTA “Agendar horário”. Cancelado/concluído não aparece como próximo. Loading preserva o card. Falha parcial de atalhos não deve esconder o agendamento.

## 5. Especificação por tela — área do cliente

### T08. Meus agendamentos

**Objetivo.** Listar próximos agendamentos e histórico. Referência: imagem 13.

**Layout.** Hero; título; abas Próximos e Histórico com contadores; cards de agendamento; ações WhatsApp, Reagendar e Cancelar; cards históricos compactos; CTA “Agendar novo horário”; navegação inferior.

**Componentes.** `CustomerAppointmentTabs`, `AppointmentCard`, `AppointmentStatusChip`, `AppointmentActionRow`, `BookAgainButton`.

**Ações.** Aba troca conjunto sem perder posição desnecessariamente. Card abre T09. Reagendar inicia fluxo com contexto. Cancelar pede confirmação. Novo horário abre T01/T02 da barbearia correspondente; escolha quando houver várias barbearias — **precisa de definição**.

**Estados.** Abas vazias têm mensagens específicas. Paginação ou carregamento incremental do histórico — **precisa de definição**. Status nunca depende apenas de cor.

### T09. Detalhes do agendamento

**Objetivo.** Exibir dados e oferecer reagendamento, contato e cancelamento. Referência: imagem 14.

**Layout.** Hero; chip de status; título; detalhes em linhas com ícones; total destacado; três botões empilhados; área de cancelamento com alerta e confirmação em duas ações; Voltar.

**Ações.** Reagendar abre T02 preservando barbearia e serviços quando possível. Falar no WhatsApp abre contato. Ver barbearia abre T01. Cancelar abre confirmação inline/modal; “Manter agendamento” fecha; “Confirmar cancelamento” executa.

**Estados.** Confirmado exibe ações completas. Concluído remove reagendar/cancelar ou aplica regra vigente — **precisa de definição**. Cancelado exibe motivo quando disponível. Durante cancelamento, bloquear repetição. Sucesso atualiza status e anuncia resultado.

**Decisão aprovada para implementação.** Após um cancelamento bem-sucedido, a pessoa permanece em `/meus-agendamentos`: a lista atualiza o status e apresenta feedback claro no mesmo contexto. A confirmação anterior ao cancelamento, a chamada real existente, permissões, regras de reagendamento e dados reais devem ser preservados. Esta decisão não exige alteração de backend, RPC, Supabase, migrations ou RLS.

### T10. Meus dados

**Objetivo.** Manter dados cadastrais e barbearias relacionadas. Referência: imagem 15.

**Layout.** Hero; mensagem de sucesso; campos Nome completo, E-mail de acesso e Celular/WhatsApp; ícones e ações de edição; seção Minhas barbearias; Salvar alterações; Voltar para agenda; navegação inferior.

**Campos.** Nome: texto, obrigatório, trim, tamanho máximo **precisa de definição**. E-mail: somente leitura quando usado para login, salvo fluxo seguro separado. Telefone: `tel`, obrigatório, máscara brasileira, armazenar normalizado. Mensagens de erro junto ao campo.

**Ações.** Lápis ativa edição quando aplicável. Salvar valida e persiste. Barbearia abre T01. Voltar abre T08.

**Estados.** Dados não alterados deixam Salvar desabilitado. Sucesso em faixa verde. Erro mantém formulário. Alteração de e-mail pode exigir reautenticação — **precisa de definição**.

### T11. Preferências de comunicação

**Objetivo.** Controlar consentimentos opcionais da plataforma e de cada barbearia. Referências: imagens 16 e 18.

**Layout.** Hero; explicação; toggle global da BarbeariaSP; lista Minhas barbearias com toggle individual; mensagem de sucesso; link Entenda como usamos seus dados; Salvar preferências; Voltar ao perfil; navegação inferior.

**Componentes e estados.** `ConsentToggle` mostra Ativado/Desativado e nunca começa marcado por inferência. Toggle deve ser botão/switch semântico com `aria-checked`. Loading não troca valores silenciosamente. Erro informa quais preferências não foram salvas.

**Ações.** Alternar só altera estado local até Salvar. Link abre política/explicação vigente. Voltar descarta ou solicita confirmação se houver alterações — **precisa de definição**.

**Decisão aprovada para implementação.** Os switches mantêm alterações locais até a ação explícita “Salvar preferências”. O botão fica desabilitado quando não houver diferenças, um erro mantém as escolhas locais com feedback, e o sucesso só é anunciado depois da persistência real concluir. A implementação reutiliza dados e RPCs atuais, sem schema, backend, RLS ou migrations novos.

### T12. Privacidade e meus dados

**Objetivo.** Centralizar resumo de dados, solicitações LGPD e encerramento de conta. Referência: imagem 17.

**Layout.** Hero; lista Resumo dos seus dados; botão Baixar meus dados em JSON; card Protocolos de solicitações com status; área de risco “Encerrar conta”; link de política; Voltar ao perfil; navegação inferior.

**Ações.** Cada resumo abre detalhe correspondente. Exportação solicita/baixa arquivo autenticado. Protocolo abre detalhe — **precisa de definição**. Encerrar conta abre confirmação robusta e segue processo vigente. Política abre `/privacidade`.

**Estados.** Exportação em preparação mostra progresso e protocolo. Sem protocolos mostra estado vazio. Erro de exportação não oferece arquivo parcial. Encerramento exige reautenticação quando definido pelo produto. Exclusão imediata não deve ser prometida; apresentar prazos jurídicos aprovados.

## 6. Especificação por tela — landing page comercial

### T13. Landing page BarbeariaSP

**Objetivo.** Apresentar o produto para barbearias, explicar funcionamento, mostrar telas, planos e converter para teste gratuito. Referências: imagens 20–23; a imagem 22 define a parte superior aprovada e a 23 consolida a página longa. Imagem 25 é o ativo fotográfico principal.

**Estrutura geral.** Header branco com marca à esquerda, navegação central e ações Entrar/CTA à direita. Hero fotográfico escuro com painel de texto sobreposto. Seções subsequentes em fundo marfim/branco: proposta de valor, recursos, mockups de produto, fluxo em passos, gestão, planos, segurança/privacidade, FAQ, CTA final e rodapé.

**Componentes.** `MarketingHeader`, `HeroSection`, `FeatureGrid`, `ProductScreenGallery`, `JourneySteps`, `ManagementFeaturePanel`, `PricingGrid`, `TrustSection`, `FaqAccordion`, `FinalCta`, `MarketingFooter`.

**Hierarquia visual.** Hero ocupa aproximadamente 75–90% da primeira dobra. Headline serifada branca, com segunda linha terracota; eyebrow em caixa alta terracota; texto de apoio branco; CTA terracota e secundário contornado. Seções usam títulos serifados grandes, muito espaço em branco e divisores finos. Mockups de celular são apresentados em cards verticais sem corte do conteúdo relevante.

**Tipografia.** Marca e títulos usam serifada editorial semelhante a Georgia; título principal 52–72 px desktop e 36–48 px mobile. Corpo sans-serif 16–18 px. Labels/eyebrows 11–13 px, peso 700–800, tracking 0,1–0,14 em. Botões 15–17 px, peso 700–800.

**Cores e tratamentos.** Preto/marrom `#201915` e `#0B0A09`; marfim `#F7F3EC`; branco quente `#FFFDF9`; terracota `#CB5B38`; terracota escuro `#9D3F25`; oliva de apoio nas variantes antigas, mas o sistema consolidado usa terracota. Bordas `#E5DDD2`; sombra suave e raios de 10–16 px. Hero usa overlay escuro suficiente para contraste.

**Ações e navegação.** Logo volta ao topo. Produto, Como funciona e Planos usam âncoras. Entrar e Começar teste grátis levam ao acesso de gestão. Cards de plano iniciam teste/contratação conforme estado de autenticação. FAQ abre e fecha itens. Rodapé inclui Política de Privacidade ativa; Termos e Regras de assinatura só podem virar links quando as rotas públicas existirem.

**Estados.** Header sticky — **precisa de definição**. Accordion usa `aria-expanded`. Cards de plano precisam de loading apenas se valores vierem de API; hoje devem consumir catálogo compartilhado. Imagem ausente usa fallback real, não caixa desenhada. Links pendentes aparecem como texto desabilitado, sem `href`.

**Responsivo.** Desktop usa largura máxima de 1180–1280 px e grades de 3–4 colunas. Tablet reduz para duas colunas. Mobile esconde/condensa navegação, empilha CTAs, usa hero em tela quase cheia, uma coluna para cards e imagens de celular com largura máxima aproximada de 360–390 px. Rodapé empilha marca, links e copyright. Não cortar os screenshots internos; usar `height: auto`, `object-fit: contain` e contêiner sem altura fixa incompatível.

**Acessibilidade.** Header com `nav` nomeada; headings em ordem; texto alternativo descrevendo cada tela; fundo do hero testado para contraste; FAQ operável por teclado; links pendentes não devem fingir ser controles.

## 7. Especificação por tela — acesso à gestão e convites

### T14. Acessar gestão

**Objetivo.** Autenticar proprietário, gestor ou profissional na área administrativa. Referências principais: imagens 28–31; imagem 28 mostra implantação desktop e 31 a composição mobile consolidada.

**Layout.** Fundo marfim; hero fotográfico superior com marca na parede e seta de retorno; cartão/formulário abaixo ou sobreposto. Eyebrow “Gestão da barbearia”; título “Acesse sua gestão”; texto curto; botão Google preto; separador; campo e-mail; botão de magic link contornado; link Área do Cliente.

**Campos.** E-mail, tipo `email`, placeholder “voce@email.com”, obrigatório para magic link, trim e validação de formato. Mensagem de erro abaixo do campo. Não solicitar senha nesta tela.

**Ações.** Voltar abre landing. Google inicia OAuth. Receber link solicita magic link e mostra tela/mensagem de envio. Área do Cliente abre login/área do cliente. Redirecionamento após login depende do papel existente.

**Estados.** Loading separado por método; botões bloqueados durante a própria operação; sucesso não revela se um e-mail está cadastrado; erros técnicos são sanitizados; sessão já autenticada redireciona ao destino correto. Conta sem barbearia abre cadastro inicial conforme regra vigente.

**Responsivo.** Mobile segue coluna única. Desktop mantém foto ampla e card de 380–460 px, centralizado ou lateralizado conforme imagem 28. Nunca esticar o formulário por toda a tela.

### T15. Acessar convite de profissional

**Objetivo.** Autenticar a pessoa convidada mantendo o contexto da barbearia e função. Referência: imagem 52.

**Layout e componentes.** Hero com marca; eyebrow “Convite para a equipe”; título “Você foi convidado”; card com barbearia, função, profissional vinculado e e-mail do convite; aviso de acesso limitado; Google; separador; campo e-mail preenchido; magic link; link Voltar ao início.

**Ações e regras.** Métodos de login preservam o token de convite. A conta autenticada deve ser conferida contra o convite antes de seguir — comportamento de identidade exato segue regra existente. Convite expirado, usado ou inválido exige estado específico com retorno.

**Estados.** Loading, erro de autenticação, convite inválido/expirado, e-mail incompatível e sucesso. Nunca exibir token na interface ou logs. Dados pessoais no resumo devem ser mínimos.

### T16. Confirmar entrada na equipe

**Objetivo.** Revisar os dados do convite com conta conectada e aceitar ou recusar. Referência: imagem 56.

**Layout.** Hero; eyebrow “Confirmação do convite”; título “Confirme sua entrada”; card barbearia/função/origem por link; card Conta conectada com nome, e-mail e ação Trocar conta; aviso de escopo; botão terracota “Aceitar convite”; ação textual “Recusar convite”; nota final com cadeado.

**Ações.** Trocar conta encerra/troca autenticação sem invalidar o convite. Aceitar confirma vínculo e encaminha ao perfil/agenda profissional. Recusar pede confirmação e define destino — **precisa de definição**. Duplo envio deve ser idempotente.

**Estados.** Aceitando, aceito, já utilizado, expirado, sem permissão e erro. Sucesso deve indicar o próximo destino. Recusa não pode ocorrer por toque acidental.

## 8. Especificação por tela — configurações e operação da barbearia

### T17. Mais — índice de módulos

**Objetivo.** Servir como índice de módulos independentes que não ocupam um destino principal da navegação. Referência visual: imagem 35, reinterpretada pela arquitetura aprovada em 08/09/2026. Não recriar uma mega página de configurações.

**Layout.** App bar, eyebrow, título “Mais”, descrição curta e grupos enxutos de linhas navegáveis. Cada linha abre uma rota/módulo próprio. Usar a linguagem visual homologada de Clientes: fundo marfim, cartões brancos, bordas discretas, sombras leves, títulos editoriais, terracota nas ações principais e alvos de toque adequados.

**Itens.** Dados da barbearia, Serviços, Horários da barbearia, Notificações, Assinatura e plano e Minha conta, conforme papel. **Equipe não aparece aqui como configuração**, pois é destino principal. **Relatórios não aparece aqui**, pois continua como módulo próprio acessível a partir de Início e/ou da navegação expandida, preservando suas telas aprovadas. Cada linha tem ícone da biblioteca oficial, título, subtítulo e chevron.

**Ações.** Cada linha abre a tela correspondente, sem edição inline agregada. Voltar abre o destino anterior. Avatar pode abrir Minha conta — **precisa de definição** se é também acionável.

**Estados.** Itens sem permissão ficam ocultos ou desabilitados com explicação conforme papel vigente. Badge de pendência pode aparecer em assinatura/configuração incompleta — regra **precisa de definição**.

### T18. Dados da barbearia

**Objetivo.** Editar informações públicas e foto do perfil. Referência principal: imagem 37; imagem 33 é variante sem foto.

**Layout.** App bar; eyebrow Perfil público; nome em título; texto explicativo; card de foto com miniatura circular e botão Trocar foto; formulário; botão preto Salvar alterações fixo/aderente ao final.

**Campos.** Nome da barbearia: texto obrigatório. Telefone/WhatsApp: `tel`, máscara brasileira, obrigatório apenas se definido pela regra atual. Endereço, bairro e cidade: texto; obrigatoriedade **precisa de definição**. Foto: `file`, aceitar formatos de imagem e limites já definidos na aplicação; preview antes de salvar.

**Ações.** Trocar foto abre seletor; salvar valida e persiste; voltar retorna a T17. Foto publicada aparece em T01.

**Estados.** Upload mostra progresso; formato/tamanho inválido gera erro junto ao controle; falha não remove foto atual; sucesso em faixa. Botão desabilitado sem alterações. Remover foto não aparece e **precisa de definição**.

### T19. Agenda e horários da barbearia

**Objetivo.** Definir dias e janelas gerais em que a barbearia aceita reservas. É um módulo independente acessado por Mais, não uma seção da Agenda operacional. Referência: imagem 34.

**Layout.** App bar; eyebrow Disponibilidade; título; card de linhas por agrupamento de dias, cada uma com horário e switch; item Intervalos e bloqueios; nota informativa; botão Salvar horários.

**Componentes.** `BusinessDayScheduleRow`, `AvailabilitySwitch`, `BlockingRulesLink`, `StickySaveBar`. A imagem agrupa Segunda a sexta, Sábado e Domingo; a agenda individual usa sete dias. Se a regra do sistema permitir horários diferentes por dia, agrupamento automático **precisa de definição**.

**Ações.** Switch abre/fecha o período. Tocar na linha edita horários. Intervalos gerais/feriados abrem o módulo correspondente. Salvar persiste. Alterações nos horários gerais atualizam automaticamente os profissionais que usam “Agenda da barbearia”, sem apagar pausas, ausências ou bloqueios próprios.

**Estados.** Fechado exibe texto e switch desligado. Horários inválidos (fim anterior ao início/sobreposição) bloqueiam salvar. Loading usa linhas skeleton. Alterações não salvas ao voltar pedem confirmação.

### T20. Ficha única do profissional

**Objetivo.** Concentrar a gestão da mesma pessoa em um único ponto, acessado por Equipe, sem espalhar cadastro, agenda, pausas, acesso e inativação por telas desconectadas. Referência visual: imagem 36, complementada pelas imagens 38, 41, 42 e 43 e pelas decisões de 08/09/2026.

**Layout.** App bar; resumo de identidade com foto pública, nome, função e situação ativo/inativo; seções progressivas para Dados profissionais, Agenda, Pausas e ausências, Comissão, Acesso ao sistema e Inativação/reativação. Mostrar resumo primeiro e abrir edição somente quando necessária; não transformar a ficha em outra mega página.

**Campos.** Nome, telefone, e-mail de contato, foto pública, comissão e situação operacional. E-mail de contato pertence ao cadastro profissional e não altera login. Não incluir “serviços que atende” nesta etapa, pois a relação profissional ↔ serviço ainda não existe no backend.

**Ações.** Editar dados operacionais, configurar agenda, pausas e ausências, ajustar comissão, conceder/revogar acesso e inativar/reativar conforme papel. A inativação exige confirmação e, quando houver atendimentos futuros, alerta obrigatório para revisão manual. A reativação operacional não reativa o acesso automaticamente.

**Estados.** Profissional ativo/inativo; agenda herdada/personalizada; sem acesso, convite pendente, acesso ativo e acesso inativo; atendimentos futuros pendentes de revisão; salvando, sucesso, erro e sem permissão. Histórico, horários, pausas, atendimentos passados, comissões, repasses e auditoria permanecem preservados.

### T21. Novo profissional e acesso ao sistema

**Objetivo.** Cadastrar primeiro a pessoa para uso operacional e, opcionalmente, conceder acesso dentro da própria ficha. Referência visual principal: imagem 43; imagens 38 e 41 registram evoluções. A separação entre cadastro e identidade autenticada prevalece sobre a composição antiga.

**Layout.** App bar; eyebrow Equipe; título; foto circular com “Adicionar foto”; campos operacionais; resumo “Agenda da barbearia” como padrão; ação principal “Salvar profissional”. Após salvar, a ficha exibe a seção Acesso ao sistema com estados e ações próprias.

**Campos.** Foto opcional, com regras de imagem existentes. Nome completo: texto obrigatório. Telefone/WhatsApp: `tel`, máscara brasileira; obrigatoriedade **precisa de definição**. E-mail de contato: tipo `email`, opcional conforme regra vigente. E-mail de acesso é solicitado e confirmado apenas ao conceder acesso; pode começar igual ao de contato, mas é um conceito separado.

**Ações.** Adicionar foto abre seletor. Salvar cria o profissional sem exigir acesso. “Conceder acesso” confirma e-mail de acesso, cria convite e permite copiar link. Envio transacional por e-mail só fica disponível quando o processador oficial estiver configurado. Não incluir associação profissional ↔ serviço nesta etapa.

**Estados.** Telefone/e-mail inválido, duplicidade/vínculo existente, profissional salvo sem acesso, link gerando, copiado, convite pendente/aceito/revogado/expirado e falha de convite separada de falha de cadastro. Nunca perder cadastro se o convite ou envio falhar; oferecer nova tentativa. Link tem expiração e uso único conforme regra vigente.

### T22. Horários de trabalho do profissional

**Objetivo.** Escolher entre “Agenda da barbearia” e “Agenda personalizada” e configurar horários individuais, pausas e ausências. Novo profissional começa sempre com “Agenda da barbearia”. Referência visual: imagem 42, reinterpretada pela decisão de editor vertical; imagem 39 é variante histórica agrupada.

**Layout.** App bar; eyebrow Agenda do profissional; título; chip de identidade; seletor explícito entre modo herdado e personalizado; resumo do horário vigente; seções de pausas recorrentes, ausências e bloqueios. No modo personalizado, exibir os sete dias em sequência vertical, especialmente no mobile, sem carrossel nem rolagem horizontal Seg–Dom.

**Campos.** Modo de agenda; por dia, aberto/fechado, entrada e saída; pausas recorrentes com início e fim; ausências/bloqueios com data e período. Motivo livre e regras de visibilidade **precisam de definição** antes da implementação.

**Ações.** Trocar de modo é reversível e não apaga a última configuração personalizada. No modo herdado, mudanças nos horários da barbearia são refletidas automaticamente; pausas, ausências e bloqueios próprios continuam permitidos. No modo personalizado, cada dia pode ser editado e salvo em conjunto.

**Validações.** Entrada anterior à saída; pausas dentro do expediente; ausência não contradiz regra de disponibilidade; sobreposições bloqueadas. Horários personalizados devem permanecer dentro do horário em que a barbearia está aberta, salvo futura decisão explícita. Segunda-feira não é presumida aberta. Cada dia é independente.

**Estados.** Herdada, personalizada, dia fechado, sem pausa, ausência futura, mudanças não salvas, conflito, loading e erro. Seleção usa texto/forma além de cor.

## 9. Especificação por tela — relatórios

**Decisão de escopo de 08/09/2026.** T23–T29 mantêm os relatórios, indicadores, filtros, cálculos, fontes de dados, exportações e operações já aprovados e implementados. Eles **devem ser visualizados já no novo redesign da gestão**, usando Clientes como referência visual prioritária e o novo shell/navegação. Melhorias analíticas, novas métricas, novas fórmulas ou mudanças funcionais ficam para uma etapa posterior, com proposta e aprovação separadas. Esta revisão não autoriza substituir dados reais, RPCs ou regras existentes.

### T23. Hub/Resumo de relatórios e comissões

**Objetivo.** Oferecer visão curta do período e acesso aos relatórios detalhados. Referência: imagem 40.

**Layout.** App bar; eyebrow; título “Resultados do período”; seletor mensal; card com métricas (agendamentos concluídos, faturamento estimado, taxa de ocupação); seção Comissões da equipe com lista; ação Configurar regras de comissão; nota metodológica.

**Ações.** Período atualiza dados. Profissional abre desempenho/comissão. Configurar abre regras. Preservar os destinos e ações já existentes; não criar navegação nova ao tocar métricas nesta fase.

**Estados.** Sem dados mostra zero com explicação, não cards falsos. Loading por skeleton. Erro oferece tentar novamente. Valores financeiros precisam indicar moeda e origem/metodologia.

### T24. Visão geral do período

**Objetivo.** Consolidar indicadores financeiros, agenda e clientes. Referência: imagem 44.

**Layout.** App bar com voltar, título “Relatórios” e exportar; eyebrow; h1; selects Período e Profissional; grade 2 × 2 de métricas; card Agenda e clientes; linhas navegáveis Clientes e Motivos de cancelamento.

**Métricas visíveis.** Faturamento, ticket médio, comissões, após comissões, agendamentos, cancelamentos, não compareceu e clientes ativos/recorrentes. Preservar as fórmulas, critérios e dados reais atualmente aprovados; qualquer revisão de impostos, descontos ou metodologia pertence à fase posterior de melhoria dos relatórios.

**Ações.** Filtros recarregam. Exportar mantém o CSV e o mesmo filtro já aprovados. Linhas preservam os destinos existentes. Não adicionar formatos ou detalhamentos novos nesta fase.

### T25. Desempenho da equipe

**Objetivo.** Comparar produção, ocupação, ticket e comissões por profissional. Referência: imagem 45.

**Layout.** App bar e exportar; filtro de período; lista de cards por profissional com avatar/iniciais, nome, status, atendimentos concluídos, receita, ticket, barra de ocupação e comissão paga/pendente; nota metodológica.

**Ações.** Card/chevron preserva o destino atual quando existente; não criar uma nova tela detalhada nesta fase. Filtro e exportação seguem o comportamento vigente de T24.

**Estados.** Preservar o tratamento vigente para profissional sem produção. Barra tem valor textual. Comissão pendente/paga usa texto, não só cor.

### T26. Desempenho dos serviços

**Objetivo.** Mostrar volume, receita, participação e tempo por serviço. Referência: imagem 46.

**Layout.** App bar; filtro de período; card de total de serviços; lista de serviços com nome, quantidade, receita, preço médio, participação da receita em barra e minutos executados; chevron; nota.

**Ações.** Card preserva o comportamento atual; não criar detalhamento novo nesta fase. Filtro e exportação preservam período e contratos vigentes.

**Estados.** Serviços inativos continuam no histórico, identificados quando necessário. Sem dados e loading seguem padrão. Participação deve ser acessível em texto.

### T27. Clientes e relacionamento — relatório

**Objetivo.** Analisar base ativa, novos, recorrentes e próximas reservas. Referência: imagem 47.

**Layout.** App bar; filtro mensal; card “clientes ativos”; lista Clientes no período com avatar/iniciais, nome, número de visitas, valor no período, última e próxima visita, chips Novo/Recorrente; nota sobre receita.

**Ações.** Cliente abre perfil/histórico. Filtro e exportação seguem padrão.

**Estados.** Cliente sem próxima visita omite o campo. Novo/recorrente preserva o critério funcional já usado pelo relatório atual. Receita mantém a fonte e o critério aprovados, com nota metodológica visível.

### T28. Agendamentos do período

**Objetivo.** Listar agendamentos filtrados com status, serviços, profissional e valores. Referência: imagem 48.

**Layout.** App bar; filtros de período e profissional; total de registros; cards por data/hora com cliente, serviço, profissional, valor, chip de status e WhatsApp.

**Ações.** Filtros recarregam; card abre detalhe; WhatsApp abre conversa; exportar gera arquivo filtrado.

**Estados.** Confirmado, concluído, cancelado e não compareceu devem ter chips textuais. Lista vazia, paginação/carregamento e limite de exportação preservam o comportamento aprovado atual; melhorias ficam para a fase posterior.

### T29. Comissões e repasses

**Objetivo.** Acompanhar comissão total, pendente, já paga e marcar repasses. Referência: imagem 49.

**Layout.** App bar; filtro de período; card com totais; seção Repasses do período em tabela convertida para cards no mobile. Cada item exibe data, profissional, serviço, percentual/base, valor, status e ação Marcar paga quando pendente.

**Ações.** Marcar paga exige confirmação e registra pagamento; item pago mostra data. Exportar segue filtro. Abrir profissional/detalhe preserva o destino existente; não criar detalhe novo nesta fase.

**Estados.** Pendente, pago, processamento e erro seguem a implementação aprovada. Não introduzir estorno ou novo estado nesta fase. Ação concluída não deve permanecer clicável. Valores preservam o cálculo atual a partir dos serviços concluídos e da taxa registrada.

## 10. Especificação por tela — serviços, clientes e assinatura

### T30. Serviços oferecidos

**Objetivo.** Gerenciar catálogo ativo e inativo sem exclusão definitiva. Referência: imagem 50.

**Layout.** App bar; eyebrow Catálogo; título; botão terracota “Novo serviço”; abas Ativos/Inativos; lista de cards com ícone, nome, duração, preço, chip e chevron; nota; navegação global com Mais selecionado quando visível.

**Ações.** Novo serviço abre formulário de criação — layout **precisa de definição**, podendo reutilizar T31 sem bloco de inativação. Aba alterna listas. Card abre T31.

**Estados.** Ativo/inativo, lista vazia por aba, loading e erro. Serviço inativo não aparece para novos agendamentos, mas permanece no histórico. Reativação ocorre pela edição/status, nunca por recriação obrigatória.

### T31. Editar serviço

**Objetivo.** Alterar dados e inativar serviço preservando histórico. Referência: imagem 55.

**Layout.** App bar; eyebrow; h1; formulário de uma coluna; card de status; botão terracota Salvar alterações; botão contornado Inativar serviço; nota explicativa; navegação inferior.

**Campos.** Nome: texto obrigatório. Valor: moeda BRL, obrigatório, maior ou igual ao mínimo aceito — mínimo **precisa de definição**. Duração: minutos/select, obrigatório e compatível com grade da agenda. Descrição: textarea, opcional, limite **precisa de definição**. Status: controle ativo/inativo, preferencialmente somente leitura com ação explícita.

**Ações.** Salvar valida e persiste. Inativar abre confirmação explicando que o serviço some de novos agendamentos. Em serviço inativo, ação equivalente deve ser Reativar serviço.

**Estados.** Alterações não salvas, salvando, sucesso, erro, inativando e reativando. Não usar exclusão. Se houver agendamento futuro com o serviço, consequência **precisa de definição** e deve ser esclarecida antes da ação.

### T32. Base de clientes

**Objetivo.** Pesquisar clientes, filtrar por intervalo e acessar histórico/contato. Referência principal: imagem 54; imagem 51 é variante sem período.

**Layout.** App bar; eyebrow Relacionamento; h1; busca; bloco Filtrar por período com De e Até e ação Aplicar; três métricas; lista de clientes; nota de WhatsApp; navegação inferior com Clientes selecionado.

**Campos.** Busca: tipo search, placeholder “Nome, e-mail ou WhatsApp”, debounce **precisa de definição**. De/Até: date pickers; ambos opcionais quando sem filtro, mas início não pode ser posterior ao fim. Ação Aplicar executa filtro; limpar filtro deve existir embora não apareça — forma **precisa de definição**.

**Cards.** Avatar/iniciais, nome, telefone, quantidade de agendamentos, valor concluído, última data, ícone WhatsApp e chevron. Dados sensíveis aparecem somente a perfis autorizados.

**Ações.** Buscar/filtrar atualiza métricas e lista. Card abre detalhe do cliente — tela **precisa de definição** se não houver equivalente existente. WhatsApp abre contato sem disparo automático.

**Estados.** Sem resultado da busca, período sem clientes, base vazia, loading, erro e paginação. Data deve aceitar qualquer intervalo permitido, não apenas mês.

### T33. Plano e assinatura — trial

**Objetivo.** Exibir situação do teste, dias restantes, recursos e ações comerciais. Referência: imagem 53.

**Layout.** App bar; eyebrow Seu plano; h1 “Teste gratuito ativo”; descrição; card com dias restantes, barra de progresso, início e término; card Plano atual com chip Ativo e lista de recursos; botões Contratar usando e Conhecer os planos; notas de cobrança/avisos; navegação inferior.

**Ações.** Contratar usando abre contratação mantendo plano sugerido — critério **precisa de definição**. Conhecer planos abre catálogo. Voltar retorna a Mais (T17).

**Estados.** Trial ativo, perto do fim, encerrado, assinatura ativa, pagamento pendente, carência, acesso restrito, cancelado ao fim do período, dados preservados e situação desconhecida. Datas e bloqueio real devem vir do servidor; a interface não confirma pagamento pelo retorno do navegador.

**Visual.** Cor oliva/marrom na barra de progresso e terracota para alertas/CTAs; cards brancos, chip verde-claro de ativo. Estado crítico usa alerta sem depender apenas de vermelho.

## 11. Componentes reutilizáveis e nomes técnicos sugeridos

| Componente | Uso |
|---|---|
| `BrandHero` | Hero fotográfico de páginas públicas, cliente, login e convite |
| `MobileAppBar` | Cabeçalho com voltar, título e ação/avatar |
| `BottomNavigation` | Navegação por papel: cliente ou gestão |
| `SectionEyebrow` | Label em caixa alta acima de títulos |
| `EditorialPageTitle` | Títulos serifados de página |
| `SurfaceCard` | Card branco com borda bege e raio comum |
| `PrimaryButton`, `SecondaryButton`, `DangerButton` | Ações terracota/preta, contornada e destrutiva |
| `StatusChip` | Ativo, confirmado, pago, cancelado, recorrente etc. |
| `InlineNotice` | Sucesso, informação, alerta e erro |
| `FormField`, `MoneyField`, `PhoneField`, `DateField`, `TimeSelect` | Campos padronizados e acessíveis |
| `ToggleField` | Switch com label, descrição e estado textual |
| `ListRowLink` | Linha com ícone, título, subtítulo e chevron |
| `AvatarIdentity` | Foto/iniciais, nome, papel e status |
| `AppointmentStepper` | Quatro passos do agendamento |
| `BookingSummaryCard` | Data, serviços, profissional, duração e total |
| `CalendarMonthPicker` | Calendário mensal acessível |
| `TimeSlotGrid` | Horários por período e estados de disponibilidade |
| `ServiceSelectionRow` | Serviço selecionável com duração/preço |
| `ProfessionalPicker` | Lista horizontal de profissionais e Sem preferência |
| `AppointmentCard` | Próximo, histórico e relatório de agendamento |
| `MetricCard`, `MetricGrid` | Indicadores dos relatórios |
| `PeriodFilter`, `ProfessionalFilter`, `DateRangeFilter` | Filtros compartilhados |
| `ReportHeader` | App bar, título, filtros e exportação |
| `EmptyState`, `ErrorState`, `PermissionState`, `LoadingSkeleton` | Estados estruturais |
| `ConfirmDialog` | Confirmação de cancelamento, inativação e repasse |
| `StickyActionBar` | Ação principal no fim da tela mobile |

## 12. Design System Derivado

Os valores abaixo são aproximações derivadas visualmente. Antes de substituir tokens já existentes no código, comparar com o CSS atual e com as imagens na mesma largura. Quando houver divergência, a imagem aprovada e os tokens existentes que já a reproduzem têm precedência.

### 12.1 Paleta de cores

| Token sugerido | Valor aproximado | Função |
|---|---:|---|
| `--color-canvas` | `#F7F3EC` | Fundo principal marfim |
| `--color-surface` | `#FFFDFC` | Cards, formulários e superfícies elevadas |
| `--color-surface-muted` | `#F1ECE5` | Abas inativas, áreas secundárias e placeholders |
| `--color-ink` | `#201915` | Títulos e texto de maior contraste |
| `--color-text` | `#514941` | Texto de corpo |
| `--color-text-muted` | `#857A70` | Legendas, metadados e ajuda |
| `--color-accent` | `#C85A35` | CTA, seleção, progresso e destaques da marca |
| `--color-accent-dark` | `#7B321D` | Hover/pressed e botão forte em algumas telas de gestão |
| `--color-accent-soft` | `#F8E7DF` | Fundo de item selecionado e avisos leves |
| `--color-action-dark` | `#171719` | Botão principal preto nas telas de gestão |
| `--color-olive` | `#6E6B24` | Variante de seleção/progresso observada em versões iniciais; não introduzir em novas telas sem correspondência visual |
| `--color-success` | `#4D7C45` | Confirmações e estados ativos |
| `--color-success-soft` | `#EEF5E9` | Fundo de sucesso |
| `--color-warning` | `#A46522` | Alertas e pendências |
| `--color-danger` | `#B94C3B` | Cancelamento/inativação confirmada e erro |
| `--color-border` | `#E4DDD3` | Bordas de cards e divisores |
| `--color-border-strong` | `#CBBFB2` | Inputs ativos e botões contornados |
| `--color-whatsapp` | `#25A85A` | Ícone/ação WhatsApp, com texto acessível |
| `--color-overlay` | `rgba(12, 9, 7, 0.58)` | Contraste sobre fotografia |

Não usar valores aproximados para avaliar conformidade de contraste. O implementador deve medir os pares finais no navegador.

### 12.2 Tipografia

| Token | Sugestão | Uso |
|---|---|---|
| `--font-display` | `Georgia, "Times New Roman", serif` ou a serifada já carregada | Marca, h1, h2 e valores editoriais |
| `--font-ui` | fonte sans-serif do projeto | Corpo, labels, botões, campos e navegação |
| `--text-display-xl` | `clamp(2.5rem, 6vw, 4.5rem)` | Hero desktop |
| `--text-display-lg` | `clamp(2rem, 9vw, 3rem)` | Hero mobile e títulos comerciais |
| `--text-h1` | `clamp(1.75rem, 7vw, 2.25rem)` | Título de tela mobile |
| `--text-h2` | `1.25–1.5rem` | Títulos de seção/card |
| `--text-body` | `0.94–1rem` | Corpo principal |
| `--text-small` | `0.78–0.86rem` | Metadados e ajuda |
| `--text-eyebrow` | `0.66–0.75rem` | Label em caixa alta, peso 700–800 |

Títulos usam altura de linha aproximada de 1,02–1,15 e tracking levemente negativo. Corpo usa 1,45–1,65. Botões e labels usam peso 600–800. Não converter todos os textos para serifada; o contraste editorial/operacional é parte da identidade.

### 12.3 Escala de espaçamento

Base de 4 px, com tokens preferenciais:

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 20px`
- `--space-6: 24px`
- `--space-8: 32px`
- `--space-10: 40px`
- `--space-12: 48px`
- `--space-16: 64px`

Usar 16–20 px nas bordas mobile; 24–32 px entre seções; 10–14 px entre cards; 8–12 px entre label e controle.

### 12.4 Bordas e raios

- `--radius-sm: 6px` — chips, slots e controles compactos.
- `--radius-md: 10px` — inputs, botões e cards comuns.
- `--radius-lg: 14px` — cards de destaque e painéis.
- `--radius-xl: 20px` — recorte inferior de hero/foto quando visível.
- `--radius-pill: 999px` — chips, avatares e toggles.
- Bordas comuns: 1 px sólida `--color-border`.
- Borda selecionada: 1–2 px em `--color-accent`.
- Divisores internos: 1 px com baixa opacidade; evitar caixas aninhadas excessivas.

### 12.5 Sombras

- `--shadow-card: 0 6px 20px rgba(42, 30, 20, 0.06)`.
- `--shadow-raised: 0 12px 36px rgba(42, 30, 20, 0.10)`.
- `--shadow-sticky: 0 -8px 24px rgba(42, 30, 20, 0.08)`.

As imagens usam sombras discretas; bordas e contraste de superfície fazem a maior parte da separação. Não aplicar sombras pesadas em todos os cards.

### 12.6 Botões

**Primário terracota.** Fundo `--color-accent`, texto branco, altura mínima 48 px, raio 8–10 px, largura total no mobile. Hover escurece 6–10%; pressed reduz brilho, sem deslocar. Foco com anel de alto contraste.

**Primário escuro.** Fundo `--color-action-dark`, texto branco; usado em salvar/configuração e Google. O botão Google mantém ícone oficial e rótulo textual.

**Secundário contornado.** Fundo transparente/branco, borda de 1 px em terracota, preto ou cinza forte conforme contexto; texto correspondente. Hover usa fundo suave.

**Perigoso.** Fundo ou borda `--color-danger`; somente na confirmação final. A ação segura “Manter” deve permanecer igualmente perceptível.

**Textual.** Sem contêiner pesado para Voltar, Alterar, Ver todos e Recusar; ainda deve ter alvo de 44 px.

**Desabilitado/loading.** Preservar largura/altura. `disabled` real; spinner não substitui contexto (“Salvando…”, “Confirmando…”).

### 12.7 Inputs, selects e controles

- Altura padrão 44–48 px; padding horizontal 12–14 px.
- Fundo branco/quase branco; borda `--color-border-strong`; raio 6–8 px.
- Label acima, 11–13 px, peso 600; ajuda abaixo, 11–12 px.
- Foco: borda do accent + ring externo; erro: borda danger + mensagem/ícone.
- Select mantém chevron à direita e área inteira clicável.
- Campo de moeda alinha valor naturalmente e aplica máscara sem impedir edição.
- Date range usa dois campos De/Até; mobile mantém lado a lado se cada um tiver ao menos 140 px, senão empilha.
- Toggle deve ser controle semântico, com trilho de aproximadamente 42 × 24 px e knob de 18–20 px.
- Checkbox/radio: 20–24 px; seleção acompanhada de check/ponto.

### 12.8 Cards

- Fundo `--color-surface`, borda clara, raio 10–12 px, padding 14–18 px.
- Título e valor no primeiro nível; metadados abaixo ou à direita.
- Card clicável inteiro tem hover/foco e chevron, mas ações internas mantêm áreas separadas.
- Cards de resumo usam linhas/divisores em vez de vários subcards.
- Cards de alerta usam faixa/fundo sem perder contraste.

### 12.9 Tabelas e listas de dados

- Desktop: tabela semântica com cabeçalho fixo apenas quando necessário, alinhamento numérico à direita e primeira coluna à esquerda.
- Tablet: permitir scroll horizontal somente quando a transformação em cards perder comparação essencial.
- Mobile: converter cada linha em card rotulado, como na imagem de Comissões; não ocultar cabeçalhos sem repetir o label de cada valor.
- Paginação, total de registros e estado vazio permanecem visíveis.
- Valores monetários usam BRL e alinhamento consistente.

### 12.10 Modais e painéis de confirmação

- Overlay escuro translúcido; painel central no desktop e bottom sheet no mobile quando apropriado.
- Título, consequência objetiva, resumo do item, ação segura e ação confirmatória.
- Largura desktop de 420–520 px; padding 20–24 px; raio 14–18 px.
- Foco inicial na ação segura quando houver risco alto; foco preso no modal; fechar por Escape apenas quando não houver operação irreversível em curso.
- Loading impede fechar durante confirmação somente se necessário; falha mantém o modal com mensagem recuperável.

### 12.11 Padrões de navegação

**Público.** Hero/marca + conteúdo + navegação inferior Início/Agendar/Entrar.

**Cliente autenticado.** Hero compacto + conteúdo + navegação inferior Barbearia/Agenda/Meu perfil.

**Gestão.** App bar textual + conteúdo operacional + cinco destinos principais: **Início, Agenda, Clientes, Equipe e Mais**. A navegação móvel deve caber sem rolagem horizontal e selecionar o destino atual com terracota, texto e indicador visual. Relatórios são preservados como módulo próprio dentro da arquitetura, acessível a partir de Início e/ou da navegação expandida no desktop, mas não substituem um dos cinco destinos móveis aprovados.

**Profissional.** Mesma linguagem da gestão, mas somente destinos permitidos e foco em perfil/agenda própria.

**Fluxos focados.** Agendamento, login, convite e formulários profundos usam Voltar e CTA no fim; não exibir navegação global que facilite perda acidental de estado.

### 12.12 Breakpoints sugeridos

- `0–599 px`: mobile, uma coluna, ações de largura total, listas/cards.
- `600–899 px`: tablet, conteúdo de 560–760 px, até duas colunas quando não prejudicar leitura.
- `900–1199 px`: desktop compacto, navegação expandida e duas/três colunas.
- `1200 px+`: desktop amplo, `max-width` de 1180–1280 px; não aumentar indefinidamente cards/formulários.

Breakpoints são implementação sugerida, não regra jurídica ou funcional. Validar especialmente em 320, 360, 390, 768, 1024 e 1440 px.

## 13. Estados alternativos obrigatórios por família

| Família | Vazio | Erro | Sem permissão | Confirmação/sucesso |
|---|---|---|---|---|
| Agendamento | Sem datas/serviços/profissionais/horários | Falha de disponibilidade sem chamar tudo de conflito | Perfil administrativo impedido conforme regra vigente | Reserva confirmada e slot expirado tratado separadamente |
| Cliente | Sem próximo agendamento, histórico ou barbearia | Falha parcial preserva dados úteis | Conta não autenticada volta ao login com retorno | Dados/consentimentos salvos; cancelamento confirmado |
| Configurações | Catálogo/equipe ainda não configurado | Salvar/upload falhou sem perder edição | Papel sem acesso recebe destino seguro | Faixa de sucesso e dados atualizados |
| Relatórios | Período sem dados, com explicação | Métricas indisponíveis e tentar novamente | Restrição por papel | Exportação pronta ou protocolo |
| Serviços | Aba sem ativos/inativos | Falha de carga/salvamento | Somente gestão autorizada | Serviço salvo, inativado ou reativado |
| Clientes | Base vazia ou filtro sem resultados | Falha de busca/filtro | Dados pessoais protegidos | Filtro aplicado e contato explícito |
| Convites | Convite ausente | Inválido, expirado, usado ou conta incompatível | Sem vínculo não entra na gestão | Convite aceito/recusado com próximo passo |
| Assinatura | Situação desconhecida, nunca “sem dívida” por ausência | Integração indisponível | Gestor/profissional sem dados financeiros privados | Trial/assinatura/pagamento/cancelamento com estado verificável |

## 14. Decisões visuais versus regras funcionais

### Decisões visuais observadas

- Identidade editorial com serifada, marfim, terracota, fotografia de barbearia e cards brancos.
- Mobile-first, uma coluna, CTAs largos e navegação inferior por papel.
- Progressão do agendamento em quatro passos.
- Data antes de serviços/profissional e horário depois dessas escolhas.
- Cards de relatórios com filtros no topo e exportação no app bar.
- Relatórios T23–T29 no novo redesign visual, preservando conteúdo e comportamento aprovados.
- Serviços ativos/inativos e ação explícita de inativar.
- Equipe como ponto único para cadastro, ficha, agenda, comissão, acesso e inativação do profissional.
- Agenda profissional herdada ou personalizada, com os sete dias em editor vertical.
- Filtro de clientes por data inicial e final.

### Regras funcionais já explicitadas nas imagens/conversa

- Até três serviços no mesmo agendamento.
- Um único profissional para todos os serviços selecionados.
- Usuário autenticado vai à confirmação; não autenticado faz login e depois confirma.
- Serviço é inativado, não excluído.
- Profissional pode autogerenciar sua agenda dentro do escopo permitido.
- Profissional pode confirmar, concluir e registrar não comparecimento nos próprios atendimentos, mas não pode cancelar nem alterar campos estruturais ou sensíveis fora das ações autorizadas.
- Convite pode ser enviado por e-mail ou copiado para compartilhamento externo.
- Inativar profissional impede novos agendamentos, desativa o vínculo de acesso da barbearia e revoga convites pendentes, sem apagar histórico nem a conta do Supabase Auth.
- Reativar o cadastro profissional não reativa automaticamente o acesso.
- Relatórios preservam as regras e funcionalidades já aprovadas; apenas a apresentação entra no novo redesign nesta fase.

### Pontos que precisam de definição antes da implementação completa

- Critérios de antecedência máxima/mínima do calendário e cancelamento/reagendamento.
- Tratamento de combinações de serviços sem profissional compatível.
- Implementar **“serviços realizados por profissional”** e revisar, nessa entrega, a regra preliminar de disponibilidade de T02.
- Regras de alteração/cancelamento para agendamento concluído, cancelado ou muito próximo.
- Limites de texto, preço mínimo, duração permitida e efeitos sobre reservas futuras ao inativar serviço.
- Melhorias futuras de relatórios, novas métricas ou mudanças analíticas, sem reabrir nesta fase as regras já aprovadas.
- Evolução futura das regras de comissão e correção/estorno de repasse, caso seja proposta além do comportamento já aprovado.
- Campos e regras completas de ausências/bloqueios.
- Reautenticação para e-mail, exportação e encerramento de conta.
- Critério de plano recomendado e todos os comportamentos financeiros do backend.
- Adotar uma única biblioteca de ícones lineares aprovada para todo o aplicativo. Até essa decisão, reutilizar apenas ativos existentes e não introduzir ícones improvisados por tela.

## 15. Handoff para Codex

O agente de desenvolvimento deve preservar exatamente estes pontos:

1. Usar Clientes (T32) como referência visual prioritária e compartilhada da gestão; usar as 56 imagens como fonte oficial para os detalhes específicos que não conflitem com as decisões aprovadas.
2. Implementar mobile-first e comparar cada tela na mesma proporção das imagens verticais. Depois adaptar tablet e desktop sem alterar hierarquia.
3. Reutilizar componentes e tokens; não duplicar card, app bar, botão, input, filtro, status ou navegação em cada rota.
4. Preservar a ordem do agendamento: **data → serviços e profissional → horário → confirmação**.
5. Permitir até três serviços e manter um único profissional compatível para o conjunto.
6. Manter rascunho do agendamento durante autenticação e revalidar o slot no servidor antes de confirmar.
7. Preservar autenticação, isolamento por barbearia, dados e comportamentos homologados. Alterações de rota, fluxo, modelo, RPC ou RLS necessárias à arquitetura aprovada exigem proposta técnica e aprovação antes da implementação; nunca enfraquecer segurança para acomodar o visual.
8. Nunca codificar dados demonstrativos das imagens como dados reais. Todos os nomes, valores, datas, contagens e fotos devem vir das fontes da aplicação ou fixtures de teste.
9. Serviços devem ser editáveis, inativáveis e reativáveis; não oferecer exclusão definitiva.
10. A agenda profissional deve iniciar herdada da barbearia, permitir personalização reversível e tratar os sete dias em editor vertical, incluindo dias fechados, pausas, ausências e bloqueios.
11. O acesso deve viver dentro da ficha do profissional, separar e-mail de contato de e-mail de acesso e suportar convite/link copiável sem expor token, permitindo autenticação/troca de conta e confirmação segura do vínculo.
12. Clientes devem aceitar busca e intervalo **De/Até**, não apenas filtro mensal.
13. Relatórios T23–T29 devem preservar dados, filtros, cálculos e operações aprovados e, ao mesmo tempo, adotar integralmente o novo redesign visual da gestão. Não apresentar métricas fictícias quando a API estiver vazia ou falhar.
14. Informações financeiras e de assinatura devem respeitar o papel do proprietário; retorno de checkout não comprova pagamento.
15. Implementar os estados normal, hover, foco, selecionado, desabilitado, loading, erro, sucesso, vazio, sem permissão e confirmação descritos neste documento.
16. Garantir teclado, leitor de tela, contraste, alvos de toque, labels, mensagens associadas e anúncios de estado. Screenshot não comprova conformidade; executar testes reais.
17. Usar imagens/fotos reais aprovadas. Não substituir ativos por emoji, desenho CSS, SVG improvisado ou placeholder genérico.
18. Não criar regras de negócio para os itens marcados como **precisa de definição**. Isolar esses pontos em interfaces/configuração e pedir decisão antes de concluir o comportamento.
19. Antes de considerar uma tela fiel, comparar lado a lado o screenshot da implementação e a imagem de referência no mesmo viewport, corrigindo recorte, margens, padding, tipografia, cor, borda e raio.
20. Preservar o trabalho existente e implementar por fatias verticais testáveis; não remover funcionalidades prontas para acomodar o visual.
21. Implementar a navegação principal da gestão como Início, Agenda, Clientes, Equipe e Mais; Agenda permanece exclusivamente operacional e Mais abre módulos independentes.
22. Inativar profissional sem cancelar, excluir ou reatribuir atendimentos futuros; exibir alerta obrigatório para revisão da gestão e manter todo o histórico.
23. Permitir ao gestor cadastrar profissional sem acesso e administrar dados operacionais, comissão, agenda, pausas, ausências e situação; manter convites de gestor, acessos administrativos, assinatura e dados fiscais sob o proprietário.
24. Integrar primeiro ou em conjunto a frente `security/p0-remediations-20260907-workspace`, sem copiar arquivos às cegas nem restaurar contratos inseguros. Preservar AUTH-01, AUTHZ-01 e ABUSE-01 e resolver conflitos por revisão explícita.
25. Na operação de status, manter a RPC/autorização estreita de AUTHZ-01, mas separar a matriz por ator: profissional apenas `confirmed`, `completed` e `no_show`; `cancelled` continua restrito aos papéis autorizados e ao fluxo legítimo do cliente quando aplicável.
26. Manter o limite de quatro reservas futuras ativas por cliente/barbearia no ponto comum de `INSERT`, incluindo reservas criadas por RPC e por PostgREST direto.

### Critério mínimo de aceite visual por tela

- Estrutura, ordem e alinhamento correspondem à referência.
- Nenhum conteúdo relevante está cortado ou escondido atrás de navegação fixa.
- Tipografia e contraste reproduzem a hierarquia editorial/operacional.
- Estados selecionados e status têm texto/ícone além da cor.
- CTA principal permanece visível e alcançável em celular.
- Conteúdo dinâmico maior não quebra card, tabela ou botão.
- Teclado e foco percorrem controles em ordem lógica.
- Loading, erro, vazio e sem permissão foram exercitados.
- Navegação leva ao destino correto e preserva contexto quando necessário.
- A comparação visual foi feita no viewport correspondente à imagem.

## 16. Limites desta especificação

- As imagens não definem contratos de API, nomes de tabelas, payloads, políticas RLS ou fórmulas financeiras.
- Hover, foco, loading, erro e muitos vazios não aparecem nas imagens; os padrões deste documento são requisitos de implementação coerentes, não alegações de que esses estados foram desenhados pixel a pixel.
- Fontes e cores foram estimadas visualmente; reutilizar os tokens existentes quando eles já reproduzirem as imagens.
- Textos demonstrativos podem conter variações de marca ou dados fictícios; conteúdo de produção deve seguir documentação funcional e jurídica aprovada.
- Acessibilidade completa exige inspeção do código, teclado, leitor de tela, zoom/reflow e medição de contraste.
