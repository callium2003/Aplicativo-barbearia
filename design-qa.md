# Design QA — landing comercial e gestão BarbeariaSP

## Evidências

- Fonte visual principal: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\exec-89f38061-529c-424e-86d9-d30d8c95e9f1.png`.
- Complemento aprovado para o hero: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\exec-468cd2cd-c264-43ec-957d-92412ceee8ea.png`.
- Implementação: `http://127.0.0.1:3000/`, capturada no navegador interno do Codex durante esta tarefa. A API do navegador anexou as capturas à tarefa, mas não expôs um caminho de arquivo local.
- Fonte: 793 x 1983 px, prancha longa de referência.
- Captura principal da implementação: viewport desktop do navegador interno, densidade padrão; a API não expôs as dimensões CSS separadamente.
- Estado verificado: página inicial sem autenticação, topo, seção de produto e FAQ expandida.
- Normalização: comparação por regiões equivalentes, pois a fonte é uma prancha longa e a implementação é responsiva. Não foi aplicada comparação pixel a pixel.

## Comparação visual final

A composição mantém a direção aprovada: fundo claro, tipografia editorial, cor terracota, fotografia escura de barbearia, jornada comercial e hierarquia de produto. As alterações solicitadas depois da aprovação — placa na parede, texto menor abaixo da placa e telas integrais nos cards — prevalecem sobre a primeira prancha.

### Superfícies obrigatórias

- Tipografia: Georgia no conteúdo editorial e Arial na interface preservam a diferença entre títulos e texto funcional. Pesos, quebras e entrelinhas ficaram legíveis no viewport verificado.
- Espaçamento e ritmo: topo, chamadas, seções e FAQ mantêm respiro consistente. O hero usa a altura útil do viewport para manter marca, texto e ações no primeiro quadro.
- Cores: creme, carvão e terracota correspondem à direção aprovada e mantêm contraste adequado nos estados observados.
- Imagens: a fotografia principal está nítida e a placa `BarbeariaSP` permanece visível. As três telas usam os PNGs aprovados em proporção `853 / 1844`, com `object-fit: contain`, sem recorte interno.
- Conteúdo: textos descrevem apenas recursos existentes ou planejados para apresentação, sem depoimentos, métricas ou preços inventados. Planos permanecem como `Valor a definir`.
- Responsividade e acessibilidade: há breakpoints para tablet e celular, foco visível, redução de movimento, navegação semântica, textos alternativos e alvos principais com pelo menos 42 px no breakpoint móvel.
- Interações: link interno `Produto` navegou para `#produto`; a primeira pergunta da FAQ expandiu e exibiu a resposta corretamente; o CTA principal abriu a tela de gestão em `/entrar`.

## Histórico das iterações

### Iteração 1 — placa e destaque principal

- Achado P1: a placa existia no arquivo, mas o enquadramento central a cortava e o título ocupava a mesma região.
- Correção: imagem alinhada à esquerda, placa preservada, título reduzido e reposicionado na parte inferior esquerda, abaixo da marca; hero ajustado à altura útil do viewport.
- Evidência pós-correção: captura do topo no navegador mostrou a placa completa, o título abaixo e as duas ações no primeiro quadro.

### Iteração 2 — cards de telas

- Achado P2: os cards tinham altura fixa e escondiam a parte inferior das telas verticais.
- Correção: remoção das alturas de 500/520 px, adoção da proporção `853 / 1844` e uso de `object-fit: contain`.
- Evidência pós-correção: captura da seção `#produto` confirmou que os cards seguem a proporção integral; o restante de cada tela aparece pela rolagem normal da landing, sem recorte dentro do card.

## Achados finais

Não restam achados P0, P1 ou P2 no escopo verificado.

P3 residual: uma captura móvel com dimensões CSS explícitas não pôde ser persistida pela API do navegador interno. O CSS móvel foi coberto por teste estrutural e pelo build, mas merece nova inspeção visual no dispositivo usado na homologação antes da publicação.

## Checklist de implementação

- [x] placa `BarbeariaSP` visível na parede;
- [x] destaque menor e abaixo da placa;
- [x] cards sem recorte interno;
- [x] navegação interna funcional;
- [x] FAQ expansível;
- [x] typecheck, lint, build e suíte completa aprovados;
- [ ] homologação móvel em dispositivo real antes da publicação.

## Complemento — gestão mobile — 06/09/2026

### Referências e superfícies verificadas

- Acesso aprovado: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\exec-985799eb-3a2b-4fa3-b467-e47847562274.png`.
- Configurações e relatórios aprovados: pranchas `exec-678493c7-37f0-4e51-b2f9-f1c724d75682.png`, `exec-85bb4d42-fce2-4b2d-af3d-a2cbf990c2a2.png`, `exec-493eed7c-4c9a-428c-86f8-00dac6043b44.png`, `exec-d0ad6b31-8854-4d0b-bdc0-e4fdfce4870a.png`, `exec-d10b6e50-a3ea-4bb6-bdff-a739f4a2a489.png` e as seis pranchas de relatórios da mesma sessão.
- Renderização conferida: `http://127.0.0.1:3000/entrar`, no navegador interno, com fotografia, marca, retorno ao início, título e formulário completos, sem corte horizontal.
- Rotas autenticadas: inspeção combinada de marcação, CSS responsivo, build de produção e testes de contrato. O navegador local não possuía sessão de gestor e redirecionou corretamente para `/entrar`; por isso, a verificação visual com dados reais permanece como homologação, não como falha de implementação.

### Resultado da comparação

- O acesso reproduz a composição aprovada: fotografia quente no topo, marca branca, retorno discreto e conteúdo funcional em cartão claro.
- A central de configurações usa linhas/cartões compactos e mantém todos os formulários existentes abaixo dos atalhos.
- Foto da barbearia, serviços, sete dias, jornadas individuais, pausas, ausências e convites permanecem presentes.
- As tabelas dos cinco relatórios detalhados mudam para cartões com rótulos via `data-label` abaixo de 760 px, eliminando a causa do corte horizontal sem duplicar dados ou ações.
- A navegação de gestor voltou a incluir todas as páginas existentes; no celular ela permanece em uma barra inferior rolável por toque.
- Não foram introduzidos preços, pagamentos ou indicadores fictícios.

### Achados finais da gestão

Não restam achados P0, P1 ou P2 na implementação local inspecionada. P3 de homologação: entrar com uma conta de dono/gestor no aparelho de referência e percorrer configurações, profissional e cada aba de relatório antes de publicar.

final result: passed

## Complemento — Clientes da gestão (T32) — 08/09/2026

### Referência e implementação

- Referência principal T32 / imagem 54: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\exec-b0aa37de-0782-4542-b764-c50befca4d3b.png`.
- Referência de apoio, imagem 51: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\exec-2eb5882e-c72c-4224-b4f9-e8d173cac6dc.png`.
- Implementação verificada: `http://127.0.0.1:3010/painel/clientes`, com sessão real de gestão e dados reais da barbearia.

### Resultado observado em 390 × 844

- Cabeçalho editorial, busca, três métricas, listagem em cards e navegação da gestão renderizaram na largura móvel solicitada.
- A listagem apresentou dois clientes reais, seus contatos, atendimentos concluídos, receita e último atendimento, sem criar dados demonstrativos ou ações sem destino.
- O WhatsApp permaneceu associado ao telefone real de cada cliente e com nome acessível específico.
- A inspeção revelou quebra indevida do valor da receita em uma métrica compacta. A regra foi corrigida com tamanho responsivo e `white-space: nowrap`.
- Loading, erro, base vazia e busca sem resultado possuem mensagens específicas; a animação do skeleton respeita `prefers-reduced-motion`.

### Limitações e pendências de validação

- Depois da correção do valor monetário, a extensão do navegador perdeu o controle da aba autenticada. A recaptura final em 390 × 844 e a captura desktop não puderam ser concluídas nesta rodada.
- A primeira captura móvel e a árvore de acessibilidade foram verificáveis na tarefa, mas a API não expôs um caminho local para persistir a imagem.
- Por essa razão, a fidelidade visual final permanece em homologação manual; testes, TypeScript, lint e revisão estática não substituem a recaptura visual.

final result: partial — mobile observado; recaptura final e desktop pendentes
## Gestão — Subetapas 4.3 e 4.4 — 08/09/2026

- Referências: imagem 35 (T17), imagem 37 (T18), imagem 50 (T30) e imagem 55 (T31).
- Implementação estrutural: shell único, índice editorial, dados da barbearia e catálogo de serviços com estados ativos/inativos.
- Viewport pretendido: 390 × 844 e desktop.
- Validação automatizada autenticada: bloqueada porque a integração do Chrome retornou `Debugger unattached` ao acessar a sessão já autenticada.
- Validação técnica: testes estruturais e TypeScript aprovados; servidor local respondeu HTTP 200.
- final result: blocked

### Correção integrada de configurações, serviços e agenda profissional

- Manual utilizado: `docs/PRODUCT-DESIGN-SPECIFICATION-20260907.md`, especialmente T18, T19, T21, T22 e T31.
- Referências recebidas na validação: imagem 55, “Editar serviço”, e imagem 38/41/43, “Novo profissional”.
- A agenda geral passou a confirmar as sete linhas realmente persistidas antes de anunciar sucesso; domingo permanece independente e pode ser aberto com horário próprio.
- A agenda individual passou a editar um dia por vez, com seletor dos sete dias, mantendo o payload completo no salvamento.
- Dados da barbearia, dados cadastrais, serviços, profissionais e equipe/convites receberam a mesma linguagem de campos amplos, cartões claros e hierarquia editorial.
- Não foram criadas associações profissional-serviço, campos demonstrativos, biblioteca de ícones ou alterações de backend.
- Testes estruturais, TypeScript, lint e `git diff --check` aprovados. O lint manteve somente o aviso preexistente de `fmt` não utilizado em `app/meus-agendamentos/page.tsx`.
- A recaptura autenticada em 390 × 844 continua bloqueada: a conexão com a aba do Chrome expirou ao anexar o depurador. A validação visual final permanece manual.

final result: partial — implementação e validação técnica concluídas; comparação visual autenticada pendente

## Gestão — Dados da barbearia (T18 / imagem 37) — 08/09/2026

### Referência e escopo

- Referência oficial: `C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\exec-85bb4d42-fce2-4b2d-af3d-a2cbf990c2a2.png`.
- Especificação: `docs/PRODUCT-DESIGN-SPECIFICATION-20260907.md`, superfície T18.
- Padrão compartilhado: área de Clientes homologada, com fundo claro, cartões brancos, bordas discretas e hierarquia editorial.
- Escopo desta rodada restrito a `#dados-barbearia`; Dados cadastrais, Serviços e demais áreas não foram redesenhados nesta rodada.

### Alterações verificadas no código

- A hierarquia visual foi revalidada após a atualização de governança em `AGENTS.md` e no início da especificação: decisão mais recente do usuário, imagem 37, T18, Clientes homologado e, por último, legado apenas funcional.
- Definições duplicadas de `.management-shop-profile` foram removidas do CSS global. T18 agora possui um único bloco visual; o módulo legado mantém somente a neutralização de integração necessária.
- O resumo/edit mode legado foi substituído por um formulário único, mantendo nome, telefone, WhatsApp, e-mail de notificações, endereço e descrição reais.
- A foto real permanece circular, sem distorção, com prévia, descarte e envio explícito preservados.
- Link público, cópia, teste do WhatsApp e teste do Google Maps continuam disponíveis em um cartão secundário claro.
- A ação principal usa terracota por decisão posterior do usuário; ações secundárias são brancas e nenhum bloco preto permanece nessa superfície.
- Estados desabilitados, foco visível e mensagens de erro/sucesso permanecem distinguíveis.

### Validação visual

- A automação abriu a rota autenticada `http://127.0.0.1:3010/painel/configurar#dados-barbearia` e a árvore de acessibilidade confirmou todos os campos e ações reais da nova estrutura, incluindo feedback de salvamento anunciado por `aria-live`.
- A primeira captura retornou o topo da página de Configurações antes de posicionar o viewport na seção T18. Nas tentativas seguintes, a integração do Chrome expirou ao controlar a aba.
- Não foi possível produzir capturas finais verificáveis da seção no viewport CSS de aproximadamente 390 × 844 nem no desktop, portanto não foi realizada comparação visual lado a lado conclusiva.

### Estado

- Validação estrutural e técnica: aprovada.
- Homologação visual mobile e desktop: pendente de recaptura/manual.

final result: blocked — capturas finais autenticadas em 390 × 844 e desktop indisponíveis

## Gestão — Configurações integradas (T17–T21) — 08/09/2026

### Referências e superfícies

- T17 / imagem 35: índice “Organize sua operação” e aviso de configuração.
- T18 / imagem 37: Dados da barbearia, Perfil público e Visualização pública.
- T19 / imagem 34: Agenda da barbearia.
- T30 / imagem 50: Serviços.
- T20 / imagem 36: Profissionais.
- T21 / imagem 43: Equipe e convites.
- Padrão compartilhado: Clientes da gestão já homologado.

### Validação visual atual

- A rota autenticada `/painel/configurar` foi recapturada no Chrome em viewport CSS de 390 × 844 e em 1280 × 900.
- O índice, o aviso, o perfil público, a visualização pública, a agenda, os serviços, os profissionais e os convites usam fundo claro, cartões brancos, bordas discretas e terracota apenas nas ações principais.
- A inspeção em 390 × 844 confirmou que os cartões permanecem dentro da largura do viewport e os inputs de horário não produzem overflow.
- A inspeção em desktop confirmou a largura integral da agenda e o preenchimento interno de Profissionais e Equipe/Convites.
- A foto pública real não carregou na sessão local observada; o fallback textual agora permanece pequeno e contido no círculo. A causa do asset não foi alterada nesta rodada.
- O cabeçalho escuro compartilhado da gestão continua diferente das barras superiores brancas das imagens oficiais. Ele foi preservado por ser uma superfície compartilhada fora destes blocos.
- O cadastro de profissional preserva o contrato atual (nome e telefone). Foto, e-mail, convite e serviços na mesma tela permanecem como melhoria futura, conforme decisão do usuário.

### Verificação funcional e técnica

- As queries, persistência, permissões, convites e ações existentes foram preservados.
- Horários carregados do banco são normalizados para string vazia ou `HH:mm`; dias fechados continuam sendo persistidos com horários nulos.
- “Conceder acesso ao painel” mantém o fluxo existente e agora posiciona e foca o formulário de convite, respeitando `prefers-reduced-motion`.
- Após recarregar a rota, a captura de logs do navegador não retornou warnings ou errors; os dois avisos React de inputs controlados deixaram de ocorrer.

final result: pass — validação autenticada concluída em mobile e desktop, com diferenças conhecidas registradas
