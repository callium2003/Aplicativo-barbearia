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
