# Especificação Funcional de Software (EFS) — BarbeariaSP

**Produto:** BarbeariaSP — plataforma SaaS de agendamento e gestão de barbearias

**Tipo de documento:** Especificação de Requisitos de Software (SRS/EFS)

**Referências de estrutura:** IEEE 830 e ISO/IEC/IEEE 29148

**Idioma:** Português do Brasil

**Classificação:** Documento fundador para produto, design, desenvolvimento, testes, implantação e operação

**Autoridade de construção:** Este documento reúne os requisitos funcionais, visuais, técnicos, de segurança, financeiros e operacionais do produto.

---

## 1. Introdução

### 1.1 Propósito

Este documento define o BarbeariaSP como um produto digital completo e estabelece os requisitos necessários para construí-lo do zero. Ele deve orientar produto, design, engenharia, banco de dados, segurança, qualidade, operação, suporte e validação jurídica.

O documento descreve:

- o propósito e os limites do produto;
- os públicos e seus níveis de acesso;
- todas as jornadas públicas, do cliente, da equipe e da gestão;
- as regras de negócio de agenda, atendimento, clientes, profissionais, serviços, comissões, relatórios e assinatura;
- o modelo lógico de dados e seus relacionamentos;
- os contratos de autorização, RLS, RPCs, Storage e processos assíncronos;
- os requisitos de autenticação, segurança, privacidade e LGPD;
- os requisitos de experiência responsiva para celular, tablet e computador;
- os requisitos não funcionais, operacionais, de observabilidade, backup, recuperação e aceite.

As seções 1–47 constituem a especificação normativa. As expressões **deve**, **não deve**, **pode** e **somente** representam requisitos do produto, independentemente do que esteja implementado. A seção 48 mantém, separadamente e neste mesmo documento, o acompanhamento de construção, pendências, evidências e homologação. O registro de execução não substitui nem reduz os requisitos para construir o produto do zero.

### 1.2 Público-alvo

Este documento destina-se a:

- responsável pelo produto;
- profissionais de produto e experiência do usuário;
- arquitetura e desenvolvimento frontend/backend;
- especialistas em banco de dados e Supabase;
- segurança da informação;
- qualidade e testes;
- infraestrutura, implantação e suporte;
- privacidade e assessoria jurídica.

### 1.3 Escopo funcional

O BarbeariaSP abrange:

- landing comercial da plataforma;
- autenticação e criação da barbearia;
- período de teste e assinatura B2B da plataforma;
- página pública própria de cada barbearia;
- agendamento online pelo cliente;
- área autenticada do cliente;
- gestão de agenda, clientes, equipe, serviços e horários;
- comissões e repasses aos profissionais;
- relatórios operacionais e financeiros baseados nos atendimentos;
- notificações internas e e-mail transacional;
- preferências de marketing separadas por plataforma e barbearia;
- direitos do titular, exportação e encerramento da conta de cliente;
- isolamento multiempresa, auditoria, backup, monitoramento e operação.

### 1.4 Exclusões explícitas

Não fazem parte do produto definido por esta especificação:

- pagamento, sinal ou pré-pagamento do corte pelo cliente no aplicativo;
- carteira, cartão salvo ou cobrança do cliente final;
- clube de assinatura vendido pela barbearia ao cliente;
- comanda, ponto de venda, caixa, sangria ou fechamento financeiro presencial;
- estoque e venda de produtos;
- emissão de nota fiscal do serviço da barbearia;
- recepção como papel separado;
- check-in, fila de espera, encaixe e recorrência automática de reservas;
- avaliação de atendimento, pontos ou programa de fidelidade;
- campanhas automáticas e WhatsApp Business API;
- multiunidade, franquias ou organização controladora de várias barbearias;
- painel superadministrativo com acesso rotineiro aos dados dos tenants;
- associação de profissionais a serviços específicos;
- aplicativo nativo iOS ou Android.

A existência de preço e receita nos agendamentos serve para registro, comissão e relatórios. Ela não significa que o BarbeariaSP recebe ou processa o pagamento do serviço prestado ao cliente. A integração financeira desta especificação é exclusivamente a cobrança da **barbearia pela assinatura do SaaS BarbeariaSP**.

### 1.5 Convenção de requisitos

Os requisitos recebem identificadores estáveis no formato `RF-ÁREA-NNN` e os requisitos não funcionais no formato `RNF-ÁREA-NNN`. Regras transversais usam `RN-NNN`.

Prioridades seguem MoSCoW:

- **M — Must:** necessária para o produto definido;
- **S — Should:** importante, mas pode ser sequenciada após o núcleo correspondente;
- **C — Could:** evolução compatível, sem alterar o núcleo;
- **W — Won't:** explicitamente fora desta especificação.

### 1.6 Referências normativas e complementares

- [Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), em texto compilado vigente.
- [Orientações da ANPD sobre direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).
- [Guia da ANPD para definição de controlador, operador, suboperador e encarregado](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado).
- [Resolução CD/ANPD nº 15/2024 e orientações sobre comunicação de incidente de segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).
- ISO/IEC/IEEE 29148 para organização e verificabilidade de requisitos.
- IEEE 830 como referência histórica de estrutura de especificações de software.
- O contrato visual completo para construção está nas seções 4 e 42 deste documento.

Esta EFS traduz requisitos de produto e controles técnicos. Ela não substitui parecer jurídico nem a aprovação dos documentos públicos e contratos aplicáveis.

Os catálogos resumidos não substituem as seções detalhadas. Em caso de dúvida, vale a regra mais específica e restritiva.

### 1.7 Documento único e autossuficiente

Esta EFS contém o contrato completo do produto. Sua aplicação não exige leitura de outro documento do projeto: composição visual, design system, arquitetura, segurança, assinatura, notificações e privacidade estão incorporados aqui.

As seções 2–41 descrevem o produto e suas regras; a seção 42 detalha o design system e cada superfície; as seções 43–46 completam os contratos técnicos, financeiros, de comunicação e privacidade; a seção 47 estabelece a verificação integrada. São partes do mesmo documento e têm igual força normativa.

Imagens de marca, fotografias e screenshots são ativos de apresentação. Não devem conter regras que existam somente na imagem. O texto desta EFS especifica a composição e o comportamento necessários para construir todas as telas, inclusive quando um ativo fotográfico ainda precisar ser fornecido.

As decisões comerciais e jurídicas ainda não fixadas estão identificadas neste documento. Devem ser resolvidas aqui antes de construir a parte afetada; não há instrução de procurar a resposta em outro arquivo.

## 2. Visão do produto

O BarbeariaSP é uma plataforma SaaS multiempresa para barbearias. Cada barbearia recebe uma presença pública própria, agenda digital, cadastro de clientes, gestão de equipe, serviços, horários, comissões, relatórios, notificações, privacidade e assinatura da plataforma.

O produto atende quatro experiências complementares:

1. **Site comercial do BarbeariaSP:** apresenta a plataforma e converte uma barbearia interessada em nova conta ou período de teste.
2. **Experiência pública da barbearia:** apresenta uma barbearia específica e permite iniciar um agendamento.
3. **Área do cliente:** permite ao consumidor confirmar, acompanhar, cancelar e refazer agendamentos, manter seus dados e exercer escolhas de privacidade.
4. **Área de gestão e equipe:** permite ao proprietário, gestor e profissional operar a barbearia de acordo com suas permissões.

O valor principal do produto é reunir descoberta, reserva e operação em uma experiência simples para o cliente e confiável para a barbearia, sem sacrificar isolamento entre empresas, segurança ou controle dos dados.

## 3. Princípios obrigatórios do produto

### 3.1 Mobile-first sem limitar telas maiores

Toda jornada deve ser concebida primeiro para celular, incluindo dispositivos com largura de 320 a 430 pixels. A mesma funcionalidade deve permanecer utilizável em tablets e computadores.

Mobile-first não significa reproduzir no computador uma coluna móvel estreita em todas as situações. Em telas maiores, o produto deve aproveitar o espaço adicional para:

- exibir navegação expandida;
- colocar resumo e conteúdo lado a lado quando isso reduzir esforço;
- apresentar tabelas comparáveis em vez de cartões repetitivos;
- manter formulários em largura confortável, sem linhas excessivamente longas;
- exibir painéis auxiliares sem retirar contexto da ação principal.

Nenhuma ação essencial pode existir somente por hover, gesto oculto ou menu contextual. Todos os recursos devem funcionar por toque, teclado e mouse.

### 3.2 Uma única regra de negócio em todos os dispositivos

Celular, tablet e computador são apresentações responsivas do mesmo produto. Eles devem usar as mesmas fontes de dados, permissões, cálculos e operações. Não pode existir uma “versão móvel” com regras diferentes da versão desktop.

### 3.3 Segurança no servidor e no banco

Ocultar botões ou rotas não concede nem revoga permissão. Toda operação sensível deve ser autorizada no banco ou em um serviço confiável, usando identidade autenticada, vínculo com a barbearia, papel e propriedade do recurso.

### 3.4 Isolamento multiempresa

Dados operacionais de uma barbearia nunca podem ser lidos, alterados ou inferidos por outra barbearia. Esse isolamento deve valer para consultas, mutações, relatórios, arquivos, notificações, convites e processos em segundo plano.

### 3.5 Clareza antes de densidade

Cada tela deve ter uma responsabilidade principal. A interface deve usar revelação progressiva: mostrar primeiro o resumo e as ações mais frequentes, deixando configurações detalhadas em seções ou rotas específicas.

### 3.6 Dados reais e estados honestos

A aplicação não deve inventar métricas, clientes, valores, pagamentos ou resultados para preencher vazios. Deve distinguir claramente carregamento, ausência de dados, erro, falta de permissão, integração indisponível e sucesso confirmado.

### 3.7 Acessibilidade como requisito funcional

Acessibilidade deve ser parte da construção, não uma camada posterior. Estrutura semântica, contraste, foco, teclado, leitores de tela, redução de movimento, zoom e alvos de toque devem ser validados em cada módulo.

### 3.8 Privacidade por padrão

O produto deve coletar apenas os dados necessários para finalidades declaradas. Marketing deve ser opcional e separado de mensagens necessárias ao atendimento. A ausência de consentimento nunca deve impedir uma reserva.

## 4. Identidade, linguagem visual e responsividade

### 4.1 Referência visual

A linguagem visual oficial usa:

- fundo marfim claro;
- superfícies brancas;
- texto em carvão e cinza quente;
- terracota como cor principal de ação;
- tipografia serifada editorial em marca e títulos;
- tipografia sem serifa em controles e conteúdo operacional;
- bordas e sombras discretas;
- fotografia real de barbearia e profissionais;
- cartões simples, sem excesso de caixas aninhadas.

Na área de gestão, a composição visual da área de Clientes é a referência prioritária para hierarquia, espaçamento, filtros, cartões, estados e comportamento responsivo. Essa composição está descrita integralmente na seção 42, junto ao design system e aos contratos das demais telas. Fotografias e imagens aprovadas devem respeitar esses contratos e não podem substituir ou alterar as regras funcionais.

### 4.2 Faixas responsivas de referência

| Faixa | Comportamento esperado |
|---|---|
| 320–599 px | Uma coluna, navegação inferior ou fluxo focado, ações largas, tabelas convertidas em cartões rotulados |
| 600–899 px | Conteúdo de largura confortável, uma ou duas colunas conforme a tarefa, navegação adaptada a tablet |
| 900–1199 px | Navegação expandida, formulários e resumos lado a lado, tabelas quando comparação for relevante |
| 1200 px ou mais | Conteúdo limitado aproximadamente a 1180–1280 px, sem esticar indefinidamente formulários e cartões |

Devem ser verificados, no mínimo, os viewports 320, 360, 390, 768, 1024 e 1440 pixels.

### 4.3 Componentes e estados globais

Todos os controles devem prever:

- estado normal;
- hover quando aplicável;
- foco visível;
- selecionado;
- desabilitado real;
- carregamento sem deslocamento excessivo de layout;
- erro próximo ao contexto que falhou;
- sucesso objetivo;
- vazio com orientação útil;
- falta de permissão com destino seguro;
- confirmação explícita para ações destrutivas ou de alto impacto.

Os alvos de toque devem ter ao menos 44 × 44 pixels. Inputs precisam de `label`; placeholders não substituem rótulos. Mudanças assíncronas devem ser anunciadas por região viva. Status não podem depender somente de cor.

## 5. Arquitetura de referência

### 5.1 Aplicação web

A aplicação deve ser construída com:

- Next.js com App Router;
- React e TypeScript em modo estrito;
- renderização e carregamento escolhidos por rota conforme necessidade de SEO, autenticação e interatividade;
- CSS responsivo compartilhado por tokens e componentes, evitando duplicação de estilo por tela;
- pacote de produção compatível com execução Node.js standalone na Hostinger.

### 5.2 Backend operacional

O Supabase é o backend operacional do produto e deve fornecer:

- PostgreSQL como fonte de verdade transacional;
- Supabase Auth para identidade e sessão;
- Row Level Security para isolamento e autorização;
- funções PostgreSQL/RPC para operações atômicas ou sensíveis;
- triggers para invariantes que também precisam cobrir escrita direta;
- Storage para imagens públicas autorizadas;
- Realtime para notificações internas e atualizações pertinentes;
- Edge Functions para integrações privilegiadas e processos que não podem executar no navegador;
- Vault para segredos operacionais por ambiente;
- `pg_cron` e `pg_net` para disparos controlados de tarefas quando aplicável.

Cloudflare Workers, D1, Drizzle ou outro banco paralelo não fazem parte da arquitetura operacional do produto.

### 5.3 Fuso horário e valores

- Instantes devem ser persistidos em UTC.
- Horários operacionais e datas exibidas devem usar `America/Sao_Paulo`.
- Durações devem ser armazenadas em minutos inteiros.
- Valores monetários devem ser armazenados em centavos inteiros, nunca em ponto flutuante.
- Preços e regras comerciais utilizados em uma reserva devem ser registrados como snapshots para preservar o histórico.

### 5.4 Configuração e segredos

O navegador pode receber somente configurações públicas necessárias, como URL pública do projeto e chave pública do Supabase. Chaves administrativas, service role, chaves do Resend, Asaas, banco e segredos HMAC devem existir somente em ambiente confiável.

Nenhum segredo deve ser versionado, exposto em variável `NEXT_PUBLIC_*`, retornado por RPC ao usuário, inserido em migration, documentação, teste ou log.

## 6. Modelo de identidade, papéis e acesso

### 6.1 Identidades

Uma pessoa possui uma identidade de autenticação. A mesma identidade pode:

- ser cliente de uma ou mais barbearias;
- ser profissional de uma ou mais barbearias;
- ter papéis administrativos diferentes em barbearias distintas;
- continuar existindo mesmo que um vínculo específico seja inativado.

O e-mail autenticado pertence à identidade de acesso. Ele não deve ser usado automaticamente como e-mail comercial ou de contato de um profissional.

### 6.2 Papéis de produto

| Papel | Definição |
|---|---|
| Visitante | Pessoa sem sessão, com acesso à landing e ao catálogo público |
| Cliente | Pessoa autenticada que agenda ou acompanha seus próprios atendimentos |
| Profissional | Membro que atende clientes e opera somente seus próprios atendimentos e disponibilidade permitida |
| Gestor | Membro que opera agenda, clientes, equipe, serviços, horários, relatórios e configurações operacionais da barbearia |
| Proprietário | Responsável máximo pela barbearia, incluindo gestão, acessos administrativos, assinatura e dados fiscais |
| Serviço privilegiado | Processo de backend com permissão mínima para uma tarefa específica; nunca representa um usuário comum |

### 6.3 Matriz funcional resumida

| Recurso | Cliente | Profissional | Gestor | Proprietário |
|---|---:|---:|---:|---:|
| Ver catálogo público | Sim | Sim | Sim | Sim |
| Criar reserva própria | Sim | Não como conta administrativa da própria barbearia | Não como conta administrativa da própria barbearia | Não como conta administrativa da própria barbearia |
| Ver/cancelar reserva própria futura | Sim | Não | Não | Não |
| Ver agenda operacional | Não | Somente própria | Da barbearia | Da barbearia |
| Concluir/no-show | Não | Somente próprios atendimentos | Atendimentos da barbearia | Atendimentos da barbearia |
| Cancelar atendimento pela gestão | Não | Não | Sim | Sim |
| Gerir clientes | Não | Não | Sim | Sim |
| Gerir dados operacionais do profissional | Próprios dados de cliente | Próprio perfil público e disponibilidade permitida | Sim | Sim |
| Gerir acesso de profissional | Não | Não | Sim, para papel profissional | Sim |
| Convidar gestor | Não | Não | Não | Sim |
| Gerir serviços e horários da loja | Não | Não | Sim | Sim |
| Ver relatórios e comissões | Não | Não | Sim | Sim |
| Gerir assinatura e dados fiscais | Não | Não | Não | Sim |
| Direitos sobre dados de cliente | Próprios; encerramento sem vínculo operacional ativo | Próprios dados de cliente; não apaga identidade operacional | Próprios dados de cliente; não apaga identidade operacional | Próprios dados de cliente; não apaga identidade operacional |

As permissões detalhadas devem ser verificadas no backend. A matriz da interface serve somente para apresentação coerente.

## 7. Mapa de navegação e rotas

### 7.1 Rotas públicas

| Rota | Finalidade |
|---|---|
| `/` | Landing comercial do BarbeariaSP |
| `/{slug}` | Página pública de uma barbearia |
| `/cliente/entrar` | Autenticação do cliente com retorno seguro ao fluxo |
| `/entrar` | Autenticação de proprietário, gestor e profissional |
| `/convite/equipe` | Validação e aceite de convite de equipe |
| `/privacidade` | Aviso de privacidade público |

### 7.2 Rotas do cliente

| Rota | Finalidade |
|---|---|
| `/meus-agendamentos` | Próximos atendimentos, histórico e ações permitidas |
| `/meu-perfil` | Dados pessoais, vínculos e preferências de comunicação |
| `/meu-perfil/privacidade` | Exportação, protocolos e encerramento da conta de cliente |

### 7.3 Rotas de gestão e equipe

| Rota | Finalidade |
|---|---|
| `/cadastro-inicial` | Criação da primeira barbearia e do vínculo de proprietário |
| `/painel` | Início e visão operacional da barbearia |
| `/painel/agenda` | Agenda estritamente operacional |
| `/painel/clientes` | CRM e relacionamento com clientes |
| `/painel/profissionais` | Lista e busca da equipe |
| `/painel/profissionais/novo` | Cadastro de profissional sem obrigação de acesso |
| `/painel/profissionais/[id]` | Ficha operacional completa do profissional |
| `/painel/mais` | Índice de módulos secundários permitidos ao papel |
| `/painel/dados-da-barbearia` | Perfil público e dados privados da empresa |
| `/painel/horarios` | Horário semanal da barbearia |
| `/painel/servicos` | Catálogo de serviços |
| `/painel/notificacoes` | Central e preferências de notificações |
| `/painel/minha-conta` | Atividade e vínculo do próprio profissional; proprietário e gestor seguem para Acesso e segurança |
| `/painel/acesso-e-seguranca` | Método de entrada e informações pessoais de segurança, sem dados da empresa |
| `/painel/minha-disponibilidade` | Disponibilidade do próprio profissional |
| `/painel/relatorios` | Relatórios, comissões e exportações |
| `/painel/assinatura` | Central operacional da assinatura atual |
| `/#planos` | Catálogo comercial, condições e comparação de planos na landing pública |
| `/painel/assinatura/cobrancas` | Pedidos, pagamentos e documentos financeiros disponíveis |
| `/painel/assinatura/cancelar` | Intenção de renovação, não renovação ao final e futuro pedido de encerramento imediato |
| `/painel/assinatura/dados` | Solicitação de arquivo dos dados operacionais autorizados da barbearia |

### 7.4 Navegação por contexto

- Visitante: início, produto, recursos, preços/planos, segurança, dúvidas e entrar.
- Página pública: barbearia, agendar e entrar. Visitantes e perfis de Gestão mantêm uma composição estritamente pública, sem identidade, atalhos ou navegação privada. Para uma sessão autenticada exclusivamente como Cliente, a página pública pode exibir no rodapé a navegação contextual “Barbearia”, “Agenda” e “Meu perfil”: ela serve como saída segura caso a pessoa desista da reserva, não revela dados da Gestão e não substitui “Agenda da barbearia”, que continua iniciando a reserva do slug aberto.
- Cliente autenticado: barbearia, agenda e meu perfil. “Barbearia” abre o único vínculo público do cliente ou pede a escolha entre seus vínculos; “Agenda” abre sempre a própria agenda do cliente. Em Meus agendamentos, Meu perfil aparece uma única vez na navegação primária do Cliente; o cabeçalho não repete esse atalho e preserva somente a marca, Sair e a identidade visual.
- Proprietário/gestor no celular: Início, Agenda, Clientes, Equipe e Mais.
- Proprietário/gestor em desktop: os cinco destinos principais permanecem reconhecíveis e os módulos autorizados podem aparecer em navegação lateral ou expandida.
- Profissional: agenda própria, disponibilidade própria, notificações, perfil permitido e conta.
- Agendamento, autenticação, convite e formulários profundos: navegação focada, com voltar e proteção contra perda acidental de estado.
- Uma restauração ou atualização de sessão deve revalidar o papel sem forçar a pessoa para a Home quando a rota atual continua autorizada; encerramento de sessão deve levá-la a Entrar.

## 7.5 Catálogo resumido de requisitos funcionais

### 7.5.1 Landing comercial e aquisição da barbearia

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-LP-001 | A raiz `/` deve apresentar a proposta de valor do BarbeariaSP para proprietários de barbearia. | M |
| RF-LP-002 | A landing deve apresentar a jornada pública, o agendamento, a área do cliente e os recursos de gestão. | M |
| RF-LP-003 | Planos e preços devem vir do mesmo catálogo versionado usado na central de assinatura. | M |
| RF-LP-004 | O CTA de teste deve iniciar autenticação e cadastro da barbearia, sem exigir cartão. | M |
| RF-LP-005 | A landing deve conter FAQ, segurança, privacidade, termos, suporte e chamada final. | M |
| RF-LP-006 | A landing deve ser indexável, responsiva, acessível e otimizada para carregamento. | M |
| RF-LP-007 | Conteúdo comercial não pode usar depoimentos, indicadores ou capacidades fictícias. | M |

### 7.5.2 Autenticação, cadastro e onboarding

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-AU-001 | Cliente e equipe devem poder autenticar por Google ou magic link. | M |
| RF-AU-002 | Retornos pós-login devem aceitar somente destinos internos autorizados. | M |
| RF-AU-003 | Conta sem vínculo administrativo deve seguir para cadastro inicial ou área do cliente conforme o contexto. | M |
| RF-ON-001 | O cadastro inicial deve criar barbearia, proprietário, trial e aceite contratual de forma atômica. | M |
| RF-ON-002 | O slug deve ser único, seguro e não conflitar com rotas reservadas. | M |
| RF-ON-003 | O início da gestão deve orientar dados, horários, serviços, equipe, página pública e compartilhamento. | M |
| RF-ON-004 | A página pública só deve oferecer reserva quando a configuração mínima for válida. | M |

### 7.5.3 Página pública e agendamento

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-PB-001 | Cada barbearia deve possuir página pública por slug com perfil, contato, serviços, equipe e horários. | M |
| RF-PB-002 | A consulta pública deve expor somente colunas aprovadas para publicação. | M |
| RF-AG-001 | O fluxo deve seguir data → serviços e profissional → horário → revisão e confirmação. | M |
| RF-AG-002 | A reserva deve aceitar de um a três serviços ativos. | M |
| RF-AG-003 | A reserva deve usar um único profissional para todo o conjunto de serviços. | M |
| RF-AG-004 | O cliente deve poder escolher profissional específico ou “Sem preferência”. | M |
| RF-AG-005 | A disponibilidade deve usar grade de 10 minutos e a duração total dos serviços. | M |
| RF-AG-006 | Slots devem respeitar loja, profissional, pausas, ausências, bloqueios e reservas ativas. | M |
| RF-AG-007 | O rascunho deve sobreviver à autenticação por até 30 minutos. | M |
| RF-AG-008 | A autenticação não deve confirmar a reserva automaticamente. | M |
| RF-AG-009 | A confirmação deve recalcular preço, duração, elegibilidade, conflito e quota em transação. | M |
| RF-AG-010 | Cada cliente deve ter no máximo quatro reservas futuras ativas por barbearia. | M |
| RF-AG-011 | A quinta reserva deve falhar também em concorrência e escrita direta autorizada. | M |
| RF-AG-012 | Contas administrativas da própria barbearia não devem reservar como clientes nesse tenant. | M |
| RF-AG-013 | O reagendamento deve preservar a reserva original se o novo slot não for confirmado. | M |
| RF-AG-014 | O aplicativo não deve solicitar nem processar pagamento do serviço do cliente. | M |

### 7.5.4 Área do cliente e privacidade

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-CL-001 | O cliente deve visualizar próximo atendimento, reservas futuras e histórico. | M |
| RF-CL-002 | O cliente deve poder cancelar a própria reserva futura conforme a política definida. | M |
| RF-CL-003 | O cliente deve poder iniciar reagendamento ou repetição de atendimento sem alterar o histórico. | M |
| RF-CL-004 | Nome e telefone devem ser editáveis; e-mail autenticado deve ser somente leitura nesse formulário. | M |
| RF-CL-005 | O cliente deve visualizar seus vínculos com barbearias sem expor relações a terceiros. | M |
| RF-CL-006 | Preferências da plataforma e de cada barbearia devem ser separadas e salvas explicitamente. | M |
| RF-CL-007 | O cliente deve exportar seus dados em JSON estruturado. | M |
| RF-CL-008 | O cliente deve criar e acompanhar protocolos próprios de privacidade. | M |
| RF-CL-009 | O encerramento deve exigir reautenticação e anonimizar/excluir dados conforme retenção. | M |
| RF-CL-010 | A exportação não deve incluir comissões, auditoria interna ou dados privados de funcionários. | M |

### 7.5.5 Gestão, agenda e clientes

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-GE-001 | A navegação principal de proprietário/gestor deve ser Início, Agenda, Clientes, Equipe e Mais. | M |
| RF-GE-002 | O Início deve mostrar resumo do dia, alertas e atalhos sem criar métricas divergentes. | M |
| RF-GE-003 | Agenda deve conter somente consulta e ações operacionais de atendimento. | M |
| RF-GE-004 | Proprietário/gestor deve concluir, marcar no-show e cancelar no próprio tenant. | M |
| RF-GE-005 | Profissional deve concluir e marcar no-show somente nos próprios atendimentos. | M |
| RF-GE-006 | Profissional não deve cancelar atendimento nem alterar campos estruturais da reserva. | M |
| RF-GE-007 | Agenda deve filtrar por período, profissional, cliente, serviço e status. | M |
| RF-CRM-001 | Clientes devem ser formados pela relação entre identidade global e barbearia. | M |
| RF-CRM-002 | A gestão deve buscar clientes por nome, telefone normalizado ou e-mail permitido. | M |
| RF-CRM-003 | A gestão deve filtrar clientes por intervalo De/Até. | M |
| RF-CRM-004 | A ficha deve mostrar contatos, primeira/última interação, reservas, concluídos e receita concluída. | M |
| RF-CRM-005 | Uma barbearia não deve descobrir relações do cliente com outra barbearia. | M |
| RF-CRM-006 | Contato por WhatsApp deve exigir telefone válido e ação explícita. | M |

### 7.5.6 Equipe, acesso e disponibilidade

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-EQ-001 | Equipe deve ser o ponto único de gestão operacional dos profissionais. | M |
| RF-EQ-002 | Profissional deve poder ser cadastrado sem acesso ao sistema. | M |
| RF-EQ-003 | Novo profissional deve iniciar ativo, sem acesso e com agenda herdada. | M |
| RF-EQ-004 | A ficha deve separar dados, comissão, agenda, acesso e situação por revelação progressiva. | M |
| RF-EQ-005 | E-mail de contato e e-mail de acesso devem permanecer independentes. | M |
| RF-EQ-006 | Acesso deve refletir os estados none, pending, active e inactive. | M |
| RF-EQ-007 | Convite deve ter token hasheado, validade, uso único, e-mail correspondente e aceite idempotente. | M |
| RF-EQ-008 | Proprietário pode convidar gestor; proprietário e gestor podem convidar profissional. | M |
| RF-EQ-009 | O profissional deve editar somente o próprio perfil público e disponibilidade permitida. | M |
| RF-EQ-010 | Agenda personalizada deve ser reversível e preservar a configuração anterior. | M |
| RF-EQ-011 | Agenda personalizada não pode ultrapassar os horários da barbearia. | M |
| RF-EQ-012 | Pausas, ausências e bloqueios devem valer nos modos herdado e personalizado. | M |
| RF-EQ-013 | Inativar deve bloquear novas reservas, acesso e convites sem apagar conta, histórico ou compromissos. | M |
| RF-EQ-014 | Compromissos futuros de profissional inativado devem gerar revisão persistente. | M |
| RF-EQ-015 | Reativar o profissional não deve reativar o acesso automaticamente. | M |

### 7.5.7 Barbearia, horários e serviços

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-BR-001 | Proprietário/gestor deve editar perfil público, contato, endereço, foto e visibilidade. | M |
| RF-BR-002 | Somente proprietário deve acessar dados fiscais e de cobrança. | M |
| RF-HR-001 | A semana da barbearia deve possuir sete dias independentes, abertos ou fechados. | M |
| RF-HR-002 | Um salvamento só deve anunciar sucesso após validar e persistir os sete dias. | M |
| RF-SV-001 | Proprietário/gestor deve criar e editar serviço com nome, descrição, duração e preço. | M |
| RF-SV-002 | Serviço deve ser ativado/inativado, sem exclusão definitiva na interface comum. | M |
| RF-SV-003 | Serviço inativo não deve entrar em nova reserva e deve permanecer nos históricos. | M |
| RF-SV-004 | Não deve existir relação profissional-serviço nesta especificação. | M |

### 7.5.8 Relatórios e comissões

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-RL-001 | Proprietário/gestor deve acessar relatórios do próprio tenant por período de até 367 dias. | M |
| RF-RL-002 | Devem existir visão geral, agendamentos, equipe, serviços, clientes e comissões. | M |
| RF-RL-003 | Os relatórios devem seguir exatamente as fórmulas e status definidos nesta EFS. | M |
| RF-RL-004 | O mesmo filtro deve controlar tela e exportação CSV. | M |
| RF-RL-005 | Mobile deve usar cartões rotulados e desktop pode usar tabelas com os mesmos dados. | M |
| RF-CM-001 | A conclusão deve criar lançamento de comissão com snapshots. | M |
| RF-CM-002 | Alterar comissão atual não deve recalcular lançamentos históricos. | M |
| RF-CM-003 | Repasses devem suportar pendente/pago, ator, instante e marcação em lote. | M |
| RF-CM-004 | Comissão paga deve impedir reabertura ordinária do atendimento. | M |

### 7.5.9 Notificações e comunicação

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-NT-001 | O produto deve oferecer central interna, contagem de não lidas e preferências internas por evento para a equipe. | M |
| RF-NT-002 | O cliente deve receber e-mail de nova reserva, cancelamento, reagendamento e lembrete de 24h; não existe evento técnico de confirmação posterior. | M |
| RF-NT-003 | A entrega transacional deve usar outbox com idempotência, lock, retry e backoff. | M |
| RF-NT-004 | O worker deve exigir HMAC, timestamp válido e nonce de uso único. | M |
| RF-NT-005 | E-mail transacional e magic link devem possuir configurações e responsabilidades separadas. | M |
| RF-NT-006 | Mensagens operacionais não devem depender de consentimento de marketing. | M |
| RF-MK-001 | Marketing da plataforma e de cada barbearia devem ter consentimentos independentes. | M |
| RF-MK-002 | Opções devem iniciar desmarcadas e ausência de evento deve significar ausência de consentimento. | M |
| RF-MK-003 | Concessão, recusa e revogação devem gerar eventos append-only por escopo e versão. | M |

### 7.5.10 Assinatura SaaS da barbearia

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-SA-001 | A plataforma deve oferecer trial completo de 30 dias sem cartão e sem cobrança automática. | M |
| RF-SA-002 | O catálogo deve oferecer mensal, trimestral, semestral e anual com preços e parcelamentos definidos. | M |
| RF-SA-003 | Os planos devem aceitar até cinco profissionais ativos; volume superior deve ser sob consulta. | M |
| RF-SA-004 | O Asaas deve operar checkout hospedado; o aplicativo não deve armazenar dados de cartão. | M |
| RF-SA-005 | Retorno de checkout não deve conceder acesso; somente confirmação financeira conciliada pode fazê-lo. | M |
| RF-SA-006 | Webhooks e operações externas devem ser idempotentes. | M |
| RF-SA-007 | A central deve exibir situação, planos, contratação, cobranças, cancelamento e dados. | M |
| RF-SA-008 | Proprietário deve ser o único papel da barbearia com acesso financeiro e contratual. | M |
| RF-SA-009 | O fim da vigência deve aplicar as fases de acesso e retenção definidas nesta EFS. | M |
| RF-SA-010 | Cancelamento e reembolso devem depender de confirmação autoritativa, não apenas da interface. | M |

### 7.5.11 LGPD, dados e operação

| ID | Requisito verificável | Pri. |
|---|---|:---:|
| RF-LG-001 | O tratamento deve possuir finalidade, base legal, retenção e agente responsável definidos. | M |
| RF-LG-002 | O portal deve oferecer acesso, correção, exportação, revogação e encerramento da conta de cliente. | M |
| RF-LG-003 | Ações de privacidade devem operar somente sobre a identidade autenticada. | M |
| RF-LG-004 | Documentos legais devem ser versionados e possuir identificação e canal reais. | M |
| RF-LG-005 | Fornecedores e transferências internacionais devem ser declarados conforme o fluxo real. | M |
| RF-LG-006 | Dados sensíveis não devem ser coletados sem nova avaliação e aprovação. | M |
| RF-OP-001 | O produto deve possuir monitoramento independente da simples resposta HTTP da aplicação. | M |
| RF-OP-002 | Backups devem abranger banco, Auth, Storage e configuração reproduzível, sem segredos expostos. | M |
| RF-OP-003 | Restauração deve ser testada em ambiente isolado e seguir RPO/RTO aprovados. | M |
| RF-OP-004 | Incidentes devem possuir processo de detecção, contenção, avaliação, comunicação e recuperação. | M |

## 7.6 Catálogo de regras de negócio transversais

| ID | Regra testável |
|---|---|
| RN-001 | Toda entidade operacional pertence a uma única barbearia e não pode cruzar tenants. |
| RN-002 | Um vínculo de equipe só concede acesso enquanto estiver ativo e associado à identidade autenticada. |
| RN-003 | O papel efetivo é obtido de dados confiáveis do banco, nunca de metadados alteráveis pelo usuário. |
| RN-004 | A mesma identidade pode ser cliente e membro de equipe, mas cada operação deve usar o contexto e papel corretos. |
| RN-005 | Uma conta administrativa ativa não pode reservar como cliente na própria barbearia. |
| RN-010 | Uma reserva contém de um a três serviços e exatamente um profissional. |
| RN-011 | Duração e preço da reserva são a soma dos snapshots de serviços confirmados no servidor. |
| RN-012 | Um profissional não pode ter dois atendimentos ativos com intervalos sobrepostos. |
| RN-012A | Um cliente não pode ter dois atendimentos ativos com intervalos sobrepostos na mesma barbearia, mesmo quando os profissionais são diferentes. |
| RN-013 | Um slot só é válido se couber integralmente no horário efetivo e não cruzar pausas, ausências ou bloqueios. |
| RN-014 | Datas podem usar uma sondagem com o menor serviço; a confirmação sempre usa os serviços realmente escolhidos. |
| RN-015 | No máximo quatro reservas futuras em `scheduled` podem coexistir para cliente e barbearia. |
| RN-016 | Cancelamento libera a reserva da quota; conclusão e no-show também não contam como reserva futura ativa. |
| RN-017 | A confirmação da reserva deve ser atômica; conflito ou falha não pode persistir uma reserva parcial. |
| RN-018 | Reagendamento só substitui o compromisso anterior depois de confirmar o novo intervalo. |
| RN-019 | O aplicativo registra o preço do serviço, mas não recebe o pagamento do cliente. |
| RN-020 | Profissional pode concluir ou marcar no-show somente no próprio atendimento; não pode cancelar. |
| RN-021 | Profissional não pode cancelar nem realizar atualização ampla de agendamentos. |
| RN-022 | Proprietário e gestor podem operar status somente em atendimentos da própria barbearia. |
| RN-023 | Estados `completed`, `cancelled` e `no_show` são terminais na operação comum. |
| RN-030 | Serviço inativo não participa de nova reserva e permanece identificável por snapshot no histórico. |
| RN-031 | Novo profissional inicia ativo, sem acesso e com agenda herdada da barbearia. |
| RN-032 | Agenda personalizada é limitada pelo horário da loja, reversível e preservada ao voltar para o modo herdado. |
| RN-033 | Inativar profissional bloqueia novas reservas e acesso, mas não cancela ou reatribui compromissos existentes. |
| RN-034 | Reativar cadastro não reativa acesso; são duas operações independentes. |
| RN-035 | E-mail de contato e e-mail de acesso não se atualizam implicitamente. |
| RN-036 | Comissão nasce na conclusão usando percentual e valores snapshot daquele atendimento. |
| RN-037 | Alteração posterior de preço ou comissão não modifica lançamento histórico. |
| RN-038 | Comissão paga impede reabertura ordinária do atendimento. |
| RN-040 | Receita dos relatórios inclui somente atendimentos `completed`. |
| RN-041 | Minutos reservados incluem `scheduled`, `completed` e `no_show`, conforme o período filtrado. |
| RN-042 | Todo relatório aplica o mesmo tenant, timezone, período e filtro profissional à tela e ao CSV. |
| RN-043 | Período de relatório não pode ultrapassar 367 dias corridos. |
| RN-050 | Comunicação operacional independe de marketing. |
| RN-051 | Consentimento de marketing começa desmarcado e exige manifestação positiva por escopo. |
| RN-052 | Abandono do pedido de consentimento não gera evento e equivale à ausência de consentimento. |
| RN-053 | Mudanças de consentimento são append-only e registram versão, origem e instante. |
| RN-060 | Trial dura 30 dias, não exige cartão e não gera cobrança ou dívida automática. |
| RN-061 | Todos os planos padrão permitem no máximo cinco profissionais ativos. |
| RN-062 | Retorno do checkout não comprova pagamento nem concede acesso. |
| RN-063 | Acesso comercial só muda após evento financeiro autenticado e conciliado na fonte local. |
| RN-064 | Cancelamento sem encerramento antecipado preserva acesso até o fim do período confirmado. |
| RN-065 | Após o fim efetivo, a matriz temporal de restrição e retenção é aplicada no servidor. |
| RN-070 | Cliente só exporta, corrige ou encerra dados vinculados à própria identidade autenticada. |
| RN-071 | Exclusão de conta deve limpar arquivos antes de remover a referência necessária para localizá-los. |
| RN-072 | Dados exigidos por histórico operacional ou obrigação legal devem ser anonimizados, não associados a outro titular. |
| RN-073 | Segredos nunca podem chegar ao navegador, Git, logs, documentação ou respostas de RPC. |
| RN-074 | RLS, grants e funções estreitas são a autoridade de acesso; a interface não substitui autorização. |
| RN-075 | Eventos externos, convites, filas e operações financeiras devem ser idempotentes. |

## 8. Landing comercial do BarbeariaSP

### 8.1 Objetivo

A landing deve explicar o valor do produto para proprietários de barbearias e conduzi-los à criação de conta ou entrada no painel. Ela deve ser indexável, rápida, responsiva e compreensível sem autenticação.

### 8.2 Estrutura obrigatória

A página deve conter, nesta ordem lógica:

1. cabeçalho com marca, navegação por âncoras e ações “Entrar” e “Começar teste”;
2. hero fotográfico com a placa BarbeariaSP, proposta de valor, benefício principal e CTA;
3. demonstração da jornada pública, agendamento e área do cliente com imagens integrais do produto;
4. explicação do fluxo do cliente até a operação da barbearia;
5. recursos para agenda, clientes, equipe, serviços, relatórios, comissões e notificações;
6. bloco de segurança, privacidade e isolamento de dados;
7. período de teste de 30 dias;
8. catálogo de planos mensal, trimestral, semestral e anual;
9. perguntas frequentes expansíveis;
10. chamada final e rodapé com contatos, documentos legais e identificação da Cullentech como desenvolvedora do produto.

### 8.3 Regras de conteúdo

- Planos, preços, parcelamento e limites devem vir do mesmo catálogo versionado usado na central de assinatura.
- A landing não pode prometer integração, canal, resultado, economia ou funcionalidade não definida nesta especificação.
- Não deve usar depoimentos, avaliações ou métricas fictícias.
- O CTA de teste deve conduzir ao fluxo de autenticação e cadastro inicial.
- O retorno de autenticação deve preservar apenas destinos internos autorizados.
- Termos, aviso de privacidade e contato de suporte devem estar disponíveis no rodapé.
- A marca da desenvolvedora deve aparecer de forma secundária, sem competir com a identidade BarbeariaSP ou com a identidade pública de cada barbearia.

### 8.4 SEO, desempenho e acessibilidade

- Título, descrição, Open Graph, dados estruturados e canonical devem refletir o BarbeariaSP.
- Imagens devem ter dimensões conhecidas, formatos adequados e carregamento responsivo.
- O conteúdo principal da primeira dobra deve permanecer legível sem depender da imagem.
- Links por âncora e FAQ devem funcionar por teclado.
- A página deve evitar JavaScript desnecessário para conteúdo editorial.

## 9. Cadastro e ativação da barbearia

### 9.1 Criação da conta

O responsável pode entrar por Google ou magic link. Após autenticação, se não possuir vínculo ativo com uma barbearia, deve ser direcionado ao cadastro inicial.

### 9.2 Cadastro inicial

O fluxo deve solicitar somente o necessário para criar a empresa e iniciar o teste:

- nome público da barbearia;
- nome do responsável;
- telefone/WhatsApp de contato;
- e-mail de contato da empresa, quando diferente do login;
- slug público sugerido e editável, sujeito a disponibilidade e regras de formato;
- aceite versionado dos Termos de Uso e do Aviso de Privacidade;
- confirmação de que o responsável possui autoridade para cadastrar a empresa.

O cadastro deve criar, atomicamente:

- a barbearia;
- o vínculo do usuário como proprietário;
- o período de teste elegível;
- uma configuração inicial segura;
- o registro da versão dos termos aceitos.

Uma falha parcial não pode deixar uma barbearia sem proprietário ou uma assinatura sem barbearia correspondente.

### 9.3 Configuração orientada

Após o cadastro, o início da gestão deve apresentar um checklist progressivo:

1. dados e foto da barbearia;
2. endereço e contatos;
3. horários de funcionamento;
4. serviços;
5. primeiro profissional;
6. revisão da página pública;
7. compartilhamento do link de agendamento.

O checklist orienta, mas não substitui validações do produto. A página pública só deve oferecer agendamento quando houver ao menos um serviço ativo, um profissional ativo elegível e horário configurado.

## 10. Página pública da barbearia

### 10.1 Identificação por slug

Cada barbearia deve possuir um slug único, normalizado e reservado contra conflito com rotas do sistema. Alterações de slug devem ser restritas, auditadas e prever redirecionamento temporário do slug anterior quando comercialmente necessário.

### 10.2 Conteúdo público

A página deve apresentar apenas dados autorizados para publicação:

- nome e foto/capa da barbearia;
- descrição;
- endereço e ação “Como chegar”;
- telefone/WhatsApp e ação de contato;
- serviços ativos com nome, duração e preço;
- profissionais ativos e públicos com nome, foto e informações permitidas;
- horários de atendimento;
- CTA principal “Agendar horário”.

Dados fiscais, identidade administrativa, e-mails de acesso, comissões, anotações internas, convites e dados privados de clientes nunca devem aparecer no catálogo público.

A foto/capa cadastrada deve aparecer inteira em uma moldura responsiva, sem corte por preenchimento, independentemente de sua proporção ser horizontal, quadrada ou vertical; faixas neutras de acomodação são aceitáveis. Em viewports de até 400 px, a prévia de serviços deve usar duas colunas legíveis; em larguras maiores pode usar quatro colunas quando todos os títulos, durações e preços couberem sem overflow ou quebra artificial de palavra.

### 10.3 Estados

- Sem foto: usar fallback visual da marca, sem URL quebrada.
- Sem contato ou endereço: ocultar somente a ação impossível.
- Dia fechado: exibir “Fechado”.
- Sem configuração mínima: explicar que o agendamento online não está disponível, sem revelar detalhes internos.
- Slug inexistente, inativo ou sem acesso comercial: retornar página segura e não enumerar dados da barbearia.

## 11. Agendamento público

### 11.1 Jornada obrigatória

O agendamento deve seguir quatro etapas:

1. **Data**;
2. **Serviços e profissional**;
3. **Horário**;
4. **Revisão e confirmação**.

O cliente pode voltar entre etapas sem perder escolhas ainda compatíveis.

### 11.2 Escolha da data

- O calendário deve respeitar dias de funcionamento, profissionais ativos, horários efetivos, pausas, ausências, bloqueios e reservas existentes.
- A avaliação preliminar de uma data pode usar o serviço ativo de menor duração para descobrir se existe qualquer possibilidade de atendimento.
- Essa avaliação é apenas uma sondagem. A disponibilidade final deve ser recalculada com a duração total dos serviços escolhidos.
- Dias indisponíveis não devem ser controles interativos.

### 11.3 Serviços

- O cliente deve escolher no mínimo um e no máximo três serviços ativos.
- Um serviço possui nome, descrição opcional, duração em minutos, preço em centavos e estado ativo/inativo.
- O total de duração é a soma das durações escolhidas.
- O total de preço é a soma dos preços escolhidos.
- Um serviço inativado não pode entrar em nova reserva, mas seus snapshots permanecem no histórico.

### 11.4 Profissional

- Um único profissional deve atender todos os serviços de uma reserva.
- O cliente pode escolher um profissional específico ou “Sem preferência”.
- Sem preferência permite ao backend selecionar um profissional elegível para o intervalo, seguindo regra determinística e auditável.
- Nesta especificação, todos os profissionais ativos e públicos da barbearia são considerados aptos a todos os serviços ativos. Não existe relação profissional-serviço.

### 11.5 Horários disponíveis

- A grade deve usar intervalos de 10 minutos.
- O intervalo completo precisa caber no horário efetivo do profissional e da barbearia.
- O intervalo não pode cruzar pausa, ausência, bloqueio ou outro atendimento ativo.
- A grade pode ser agrupada em manhã, tarde e noite.
- Um horário exibido não representa reserva temporária definitiva; deve ser revalidado ao confirmar.

### 11.6 Identificação e autenticação

Antes da confirmação, o cliente deve estar autenticado. O produto pode usar Google e magic link.

O rascunho deve preservar por até 15 minutos:

- barbearia;
- data;
- serviços;
- profissional ou ausência de preferência;
- horário escolhido;
- nome e telefone informados.

Após autenticação, o produto deve retornar somente a uma rota interna permitida, restaurar o rascunho e revalidar a disponibilidade. O callback de autenticação não deve criar a reserva automaticamente.

Nome e telefone celular/WhatsApp são obrigatórios para a reserva. O e-mail vem da identidade autenticada e não deve ser apresentado como campo livre substituível na confirmação.

Uma identidade com papel administrativo ativo na mesma barbearia não pode usar esse acesso para criar reserva de cliente naquela empresa.

### 11.7 Confirmação atômica

Ao confirmar, uma única operação transacional deve:

1. validar sessão, cliente e barbearia;
2. validar que serviços e profissional pertencem à barbearia e estão ativos;
3. recalcular duração e preço no servidor;
4. verificar horário efetivo e conflitos sob proteção contra concorrência;
5. aplicar o limite de reservas futuras;
6. criar o agendamento e os snapshots de serviços;
7. atualizar o vínculo CRM do cliente com a barbearia;
8. enfileirar notificações operacionais;
9. retornar confirmação sem expor dados internos.

Se qualquer etapa falhar, nenhuma parte da reserva deve ser persistida.

### 11.8 Limite contra abuso

Cada cliente pode manter no máximo quatro reservas futuras ativas por barbearia.

Para essa regra:

- contam somente `scheduled` com início futuro;
- `cancelled`, `completed` e `no_show` não contam;
- cancelar uma reserva libera imediatamente uma vaga da quota;
- a quinta reserva deve falhar, mesmo em requisições simultâneas;
- a regra deve ser aplicada no banco no caminho comum de inserção, cobrindo RPC e escrita direta autorizada;
- o bloqueio é por cliente e barbearia, não global para toda a plataforma.

### 11.9 Resultado da reserva

O sucesso deve informar barbearia, data, horário, serviços, profissional, duração, valor e próximo passo. Uma falha de disponibilidade deve diferenciar slot ocupado de erro técnico e permitir nova escolha sem apagar todo o rascunho.

## 12. Ciclo de vida do agendamento

### 12.1 Estados

| Estado | Significado |
|---|---|
| `scheduled` | Reserva definitiva criada e horário ocupado |
| `completed` | Atendimento realizado |
| `cancelled` | Atendimento cancelado por ator autorizado |
| `no_show` | Cliente não compareceu |

### 12.2 Transições

- `scheduled` pode ir para `completed`, `cancelled` ou `no_show`.
- `completed`, `cancelled` e `no_show` são terminais na operação comum.
- Estados terminais não devem ser reabertos por atualização direta.
- Correções excepcionais exigem procedimento administrativo específico, justificativa e auditoria; não fazem parte dos botões ordinários da agenda.

### 12.3 Autorização por ator

- Cliente: pode cancelar somente a própria reserva futura, segundo a política comercial definida.
- Profissional: pode concluir ou registrar não comparecimento somente em atendimento atribuído a ele.
- Profissional não pode cancelar atendimento.
- Gestor e proprietário: podem concluir, registrar não comparecimento e cancelar atendimento da própria barbearia.
- Nenhum profissional deve receber `UPDATE` amplo sobre `appointments`.

Toda ação de status deve usar operação estreita que aceite apenas o identificador do atendimento e o novo estado permitido, trave a linha, valide a transição e registre o ator.

### 12.4 Cancelamento e reagendamento

O cancelamento deve exigir confirmação e mostrar as consequências. A reserva cancelada permanece no histórico.

O reagendamento deve ser atômico: o agendamento original só perde validade depois que o novo intervalo for confirmado. Se o novo horário falhar, o compromisso original deve permanecer inalterado.

Na experiência de Cliente, o comando “Reagendar” preserva a reserva atual enquanto abre o novo fluxo de agendamento. Na confirmação, a RPC transacional bloqueia a reserva original, valida e cria a substituta e somente confirma o cancelamento da anterior se toda a operação terminar com sucesso. O caminho envia o cancelamento da reserva anterior e a nova reserva; não há e-mail técnico separado de reagendamento nesse caminho.

A política comercial precisa definir, antes da construção deste comportamento:

- antecedência mínima para cancelamento pelo cliente;
- comunicação e eventual política de ausência.

## 13. Área do cliente

### 13.1 Início e agenda

A área do cliente deve destacar o próximo atendimento e oferecer abas ou filtros para “Próximos” e “Histórico”. Cada item deve exibir:

- barbearia;
- data e horário;
- serviços;
- profissional;
- valor registrado;
- status textual;
- ações autorizadas.

O cliente pode:

- abrir os detalhes;
- cancelar uma reserva futura, quando permitido;
- reagendar com preservação da barbearia e contexto possível;
- repetir um agendamento anterior, iniciando novo fluxo com dados pré-selecionados ainda válidos;
- contatar a barbearia pelo canal público disponível.

Quando o cliente iniciar um novo agendamento a partir de sua área, o destino não deve ser inferido do próximo atendimento: com um único vínculo ativo, deve abrir diretamente a página pública dessa barbearia; com mais de um vínculo, deve pedir explicitamente a escolha da barbearia. O cabeçalho geral da agenda identifica somente a Área do cliente. Cada cartão usa, separadamente, os dados da barbearia vinculada ao próprio agendamento e preserva, quando a reserva ainda for futura e alterável, as ações de contato pelo WhatsApp público, reagendamento e cancelamento.

Na tela **Meus agendamentos**, o atalho contextual serve apenas para alternar entre Próximos e Histórico. Dados pessoais, preferências de comunicação e privacidade não devem ser repetidos nessa agenda: permanecem concentrados em **Meu perfil**, acessível pela navegação inferior.

Na navegação inferior da área Cliente, “Barbearia” deve abrir a página pública do único vínculo ou pedir explicitamente a escolha quando houver vários; não deve levar à landing comercial nem escolher a partir de um agendamento. “Agenda” deve abrir `/meus-agendamentos`. Na página pública `/{slug}`, “Agenda da barbearia” continua iniciando a reserva do slug aberto e não abre `/meus-agendamentos`. Quando a sessão for exclusivamente de Cliente, a mesma navegação inferior pode acompanhar a página pública como saída contextual: “Barbearia” permanece ativo, “Agenda” abre a agenda pessoal e “Meu perfil” abre o perfil. Para visitante, proprietário, gestor e profissional, a apresentação continua sem navegação privada.

### 13.2 Perfil

O perfil deve permitir:

- editar nome;
- editar telefone celular/WhatsApp;
- visualizar o e-mail autenticado como somente leitura;
- visualizar barbearias com as quais possui vínculo;
- acessar preferências de comunicação;
- acessar privacidade e direitos do titular;
- sair da conta.

Alterar dados do cliente não deve modificar a identidade de acesso sem um fluxo separado de segurança.

### 13.3 Preferências de comunicação

As preferências devem ser separadas por:

- mensagens operacionais necessárias;
- marketing da plataforma;
- marketing de cada barbearia.

Escolhas editadas na tela só devem se tornar efetivas depois de salvamento explícito. Falha parcial deve manter somente o escopo não salvo como alteração local, sem desfazer escolhas já persistidas.

### 13.4 Redirecionamento por papel

Um cliente autenticado sem papel administrativo que acesse uma rota de gestão deve ser direcionado com segurança para a área do cliente. O sistema não deve revelar a existência de recursos de outra empresa.

## 14. Estrutura da gestão

### 14.1 Shell principal

Para proprietário e gestor, a navegação principal deve ser:

1. Início;
2. Agenda;
3. Clientes;
4. Equipe;
5. Mais.

Essa estrutura é obrigatória também no desktop, ainda que a apresentação seja lateral ou expandida.

### 14.2 Responsabilidades

- **Início:** resumo operacional, alertas e atalhos prioritários.
- **Agenda:** atendimento e mudança autorizada de status.
- **Clientes:** CRM e relacionamento.
- **Equipe:** cadastro, ficha, comissão, agenda, pausas, ausências, acesso e situação dos profissionais.
- **Mais:** índice para dados da barbearia, horários, serviços, notificações, relatórios, assinatura e conta conforme o papel.

Agenda não deve conter formulários de perfil, comissão, convite, horário estrutural ou acesso. Mais não deve se tornar uma página monolítica com todos os formulários abertos.

## 15. Início da gestão

O início deve oferecer uma visão curta e acionável do dia, sem duplicar relatórios analíticos. Pode apresentar:

- próximos atendimentos do dia;
- quantidade de atendimentos por status;
- alertas de configuração que impedem reservas;
- profissionais inativos com compromissos futuros a revisar;
- falhas operacionais relevantes de notificação;
- situação comercial da assinatura quando exige ação;
- atalhos para agenda, novo profissional, novo serviço e relatórios.

Dados financeiros detalhados, rankings e análises pertencem a Relatórios. O início não deve criar fórmulas alternativas para as mesmas métricas.

## 16. Agenda operacional da gestão

### 16.1 Conteúdo

A agenda deve permitir visualização por data ou período, com filtros por:

- profissional;
- cliente;
- serviço;
- status.

Cada atendimento deve mostrar horário, duração, cliente, telefone quando autorizado, serviços, profissional, status e ações disponíveis.

### 16.2 Ações

- Proprietário/gestor: concluir, no-show e cancelar.
- Profissional: concluir e marcar no-show somente em atendimento próprio.
- A interface deve ocultar ações impossíveis, mas o banco permanece como autoridade.

Depois de uma ação bem-sucedida, a agenda deve recarregar a fonte autoritativa e informar o resultado. Falhas de transição, conflito ou autorização devem usar mensagens distintas.

### 16.3 Disponibilidade própria

A alteração estrutural da disponibilidade do profissional deve ocorrer em `/painel/minha-disponibilidade`, não dentro da agenda operacional.

## 17. Clientes e CRM

### 17.1 Formação do cadastro

O vínculo entre cliente e barbearia deve ser criado ou atualizado quando houver uma reserva válida. O CRM da barbearia não deve duplicar a identidade global do cliente; deve referenciá-la e manter dados específicos do relacionamento.

### 17.2 Lista de clientes

A área deve permitir:

- busca por nome, telefone normalizado ou e-mail permitido;
- filtro por intervalo de datas “De/Até”;
- métricas do período;
- ordenação previsível;
- paginação ou carregamento incremental;
- contato pelo WhatsApp quando houver número válido;
- abertura da ficha do cliente.

No celular, resultados devem aparecer em cartões. No desktop, lista ou tabela pode ser usada para comparação. Os mesmos dados e filtros devem existir nos dois formatos.

### 17.3 Ficha do cliente

A ficha deve apresentar apenas dados necessários ao relacionamento:

- nome e contatos;
- primeira e última interação com a barbearia;
- número de reservas e atendimentos concluídos;
- receita histórica baseada em atendimentos concluídos;
- próximos atendimentos;
- histórico de reservas;
- preferências de marketing daquela barbearia;
- ações de contato autorizadas.

O produto não deve permitir anotações livres contendo dados sensíveis sem finalidade, base legal, política de acesso e retenção previamente definidas.

### 17.4 Isolamento e minimização

Uma barbearia enxerga somente a relação daquele cliente com ela. Não pode descobrir outras barbearias frequentadas, histórico externo, preferências de outra empresa ou dados da conta que não sejam necessários ao atendimento.

## 18. Equipe e profissionais

### 18.1 Ponto único de gestão

Equipe é o local único para cadastro e administração operacional dos profissionais. A lista deve oferecer busca, filtros por situação e acesso à ficha.

### 18.2 Cadastro de profissional

O profissional deve poder ser criado sem acesso ao sistema. Campos:

- nome obrigatório;
- telefone opcional;
- e-mail de contato opcional;
- Instagram opcional;
- foto pública opcional;
- comissão padrão;
- situação operacional;
- modo de agenda.

Um profissional novo deve iniciar:

- operacionalmente ativo;
- sem acesso ao sistema;
- com agenda herdada dos horários da barbearia;
- sem exigir senha ou e-mail de login.

### 18.3 Ficha do profissional

A ficha deve usar revelação progressiva nesta ordem:

1. resumo e situação;
2. dados profissionais e perfil público;
3. comissão;
4. agenda e disponibilidade;
5. acesso ao sistema;
6. inativação ou reativação.

No celular, os formulários detalhados não devem aparecer todos abertos ao mesmo tempo. Em desktop, resumo e edição podem coexistir quando a leitura permanecer clara.

### 18.4 Perfil público e self-service

O profissional pode editar o próprio nome público, telefone, Instagram e foto, dentro do vínculo e das políticas da barbearia. Ele não pode editar comissão, papel, acesso, situação operacional, dados fiscais ou informações de outro profissional.

### 18.5 E-mail de contato e e-mail de acesso

O e-mail de contato pertence ao perfil profissional. O e-mail de acesso pertence à identidade autenticada ou a um convite. Alterar um nunca deve alterar o outro implicitamente.

O módulo **Acesso e segurança** é pessoal e separado dos Dados da barbearia: apresenta o método de entrada e o e-mail associado à identidade autenticada, sem revelar senha, token, sessão ou segredo. Quando a identidade usar Google, alteração ou recuperação do Gmail é feita na própria conta Google. Nesta etapa, a tela é apenas de consulta; qualquer futura mudança de e-mail por acesso de link seguro deverá exigir confirmação protegida e preservar a mesma identidade/vínculos, conforme as decisões da seção 24.10.1.

### 18.6 Estados de acesso

O estado de acesso deve ser derivado de vínculo e convite:

| Estado | Significado |
|---|---|
| `none` | Profissional cadastrado sem convite ou vínculo de acesso |
| `pending` | Convite válido aguardando aceite |
| `active` | Vínculo autenticado ativo |
| `inactive` | Vínculo existente, porém desativado para a barbearia |

Credenciais, senha ou token nunca devem ser armazenados na tabela de profissionais.

### 18.7 Convite de equipe

Proprietário e gestor podem convidar um profissional. Somente o proprietário pode convidar um novo gestor.

Na ficha do profissional, proprietário ou gestor — nunca o profissional convidado — deve poder criar, copiar, encaminhar por WhatsApp ou outro aplicativo, reenviar, trocar o e-mail de acesso e revogar um convite pendente. Nesta fase o convite é encaminhado por link; não há promessa de entrega automática por e-mail.

O convite deve:

- usar token aleatório de alta entropia, armazenado somente como hash;
- ter validade definida;
- ser de uso único;
- estar ligado à barbearia, ao papel, ao profissional e ao e-mail de acesso;
- exigir que o usuário autenticado tenha o mesmo e-mail normalizado;
- permitir troca de conta quando a identidade estiver incorreta;
- aceitar de forma idempotente;
- poder ser revogado e reenviado sem reutilizar o token anterior;
- nunca expor token em log, analytics ou mensagem de erro.

Falha ou recusa do convite não deve apagar o cadastro operacional do profissional.

### 18.8 Agenda herdada e personalizada

O modo `barbershop` herda os horários semanais da barbearia. O modo `custom` usa configuração semanal própria.

Regras:

- agenda herdada é o padrão de novos profissionais;
- agenda personalizada é opcional e reversível;
- retornar ao modo herdado não apaga a última configuração personalizada;
- reativar o modo personalizado restaura essa configuração para revisão;
- a agenda personalizada nunca pode ultrapassar os horários abertos da barbearia;
- os sete dias devem ser editados verticalmente no celular;
- cada dia possui aberto/fechado, início e fim;
- pausas, ausências e bloqueios se aplicam nos dois modos;
- a disponibilidade efetiva é a interseção entre horário da barbearia, modo do profissional, pausas, ausências, bloqueios e compromissos.

### 18.9 Comissão

Cada profissional pode possuir percentual padrão de comissão. O percentual deve respeitar faixa de 0% a 100%, precisão definida e alteração auditada.

Ao concluir um atendimento, o sistema deve gerar o lançamento de comissão com snapshots do percentual e dos valores daquele momento. Alterar a configuração depois não modifica lançamentos anteriores.

### 18.10 Inativação

Inativar um profissional deve:

- definir o cadastro operacional como inativo;
- desativar o vínculo de acesso daquela barbearia;
- revogar convites pendentes;
- impedir novas reservas para ele;
- preservar a identidade Auth;
- preservar vínculos com outras barbearias;
- preservar perfil, horários, pausas, ausências e bloqueios;
- preservar atendimentos passados e futuros;
- preservar comissões, repasses e auditoria;
- não cancelar, apagar, reatribuir ou redistribuir atendimentos futuros.

Se houver atendimento futuro ativo, deve ser criado um alerta persistente de revisão para proprietário/gestor. O alerta deve permanecer até resolução explícita e oferecer acesso à agenda filtrada do profissional.

Reativar o cadastro não reativa o acesso. O acesso deve exigir ação separada.

## 19. Dados da barbearia

### 19.1 Perfil público

Proprietário e gestor podem administrar:

- nome público;
- descrição;
- telefone e WhatsApp;
- e-mail de contato/notificações;
- endereço;
- foto/capa;
- slug dentro das regras;
- visibilidade pública.

Na edição da foto, a área deve ser identificada como **Foto da barbearia** e exibir dentro do círculo a imagem persistida atualmente. Ao escolher outro arquivo válido, o mesmo círculo deve mostrar a prévia da nova imagem antes do envio. Se a imagem não puder ser carregada, a interface deve apresentar as iniciais da barbearia como alternativa visível, sem apagar nem substituir a referência persistida. A foto anterior só deixa de ser a referência vigente depois que upload e gravação da nova URL forem confirmados.

### 19.2 Dados administrativos e fiscais

Somente o proprietário pode acessar e alterar identidade legal, documento fiscal, dados de cobrança e demais informações privadas da empresa.

Dados fiscais não devem ser retornados junto ao perfil público nem em consultas operacionais de gestor quando não forem necessários.

## 20. Horários da barbearia

A barbearia deve possuir sete registros semanais, um por dia, com:

- aberto/fechado;
- horário inicial;
- horário final.

Regras:

- dia fechado usa horários nulos;
- início deve ser anterior ao fim;
- horários devem respeitar granularidade aceita;
- alterações futuras não modificam snapshots de atendimentos já criados;
- disponibilidade pública deve refletir a nova configuração após persistência bem-sucedida;
- salvar a semana deve ser consistente: sucesso somente quando os sete dias forem validados e persistidos.

## 21. Serviços

### 21.1 Cadastro

Proprietário e gestor podem criar e editar serviço com:

- nome;
- descrição opcional;
- duração;
- preço;
- estado ativo/inativo;
- ordem de apresentação opcional.

### 21.2 Regras

- Serviço deve ser inativado, não excluído definitivamente pela interface comum.
- Serviço inativo permanece no histórico e não entra em novas reservas.
- Nome, duração e preço de cada serviço devem ser copiados para o agendamento como snapshot.
- Preço deve ser maior ou igual a zero e duração deve pertencer à faixa comercial definida.
- Não existe associação entre serviço e profissional nesta versão fundadora.

Antes da construção do cadastro, o responsável do produto deve definir os limites mínimo/máximo de duração, valor e texto, além do efeito comercial da inativação sobre um rascunho ainda não confirmado.

## 22. Relatórios e comissões

### 22.1 Acesso e filtros

Somente proprietário e gestor podem acessar relatórios da própria barbearia. O período máximo por consulta deve ser de 367 dias corridos, com limites calculados no fuso `America/Sao_Paulo`.

Filtros:

- data inicial e final;
- profissional opcional pertencente à barbearia;
- abas de relatório;
- atualização explícita;
- exportação CSV com o mesmo conjunto de filtros.

### 22.2 Relatórios obrigatórios

A central deve conter seis visões:

1. visão geral do período;
2. agendamentos;
3. desempenho da equipe;
4. desempenho dos serviços;
5. clientes e relacionamento;
6. comissões e repasses.

No celular, registros detalhados devem aparecer como cartões com rótulo de cada valor. No desktop, tabelas semânticas devem facilitar comparação. Os formatos precisam mostrar os mesmos registros e totais.

### 22.3 Fórmulas da visão geral

| Métrica | Regra |
|---|---|
| Total de agendamentos | Quantidade de reservas no período e filtros |
| Agendados/concluídos/cancelados/no-show | Quantidade por status |
| Receita bruta | Soma dos valores snapshot de atendimentos `completed` |
| Ticket médio | Receita bruta ÷ quantidade de atendimentos concluídos; zero quando não houver concluídos |
| Valor cancelado | Soma dos snapshots em `cancelled` |
| Valor de no-show | Soma dos snapshots em `no_show` |
| Minutos reservados | Soma da duração em `scheduled`, `completed` e `no_show` |
| Comissões totais | Soma dos lançamentos de comissão do período |
| Comissões pendentes | Soma dos lançamentos com pagamento pendente |
| Comissões pagas | Soma dos lançamentos pagos |
| Receita após comissão | Receita bruta − comissões totais |
| Clientes totais | Clientes distintos com reserva no período cujo status não seja `cancelled` nem `no_show` |
| Clientes novos | Cliente elegível cuja primeira reserva não cancelada/não-no-show na barbearia começa dentro do período |
| Clientes recorrentes | Cliente elegível cuja primeira reserva não cancelada/não-no-show na barbearia começa antes do período |
| Clientes reagendados | Cliente elegível que possui ao menos uma reserva futura em `scheduled` com início igual ou posterior ao fim do período |
| Taxa de reagendamento | Clientes reagendados ÷ clientes totais elegíveis × 100 |
| Taxa de cancelamento | Cancelados ÷ total de agendamentos × 100 |
| Taxa de no-show | No-show ÷ total de agendamentos × 100 |

Divisões por zero devem retornar zero, nunca `NaN` ou infinito.

### 22.4 Desempenho da equipe

Por profissional, deve apresentar:

- total de agendamentos;
- concluídos, cancelados e no-show;
- receita concluída;
- ticket médio;
- minutos reservados;
- minutos disponíveis;
- ocupação = minutos reservados ÷ minutos disponíveis × 100;
- comissões totais, pendentes e pagas.

### 22.5 Desempenho dos serviços

Por serviço snapshot, deve apresentar:

- quantidade concluída;
- receita;
- preço médio;
- minutos de serviço;
- participação percentual na receita.

### 22.6 Clientes e agendamentos

Os relatórios devem fornecer:

- evolução diária;
- estatísticas de clientes;
- detalhe dos agendamentos;
- contato por WhatsApp somente quando autorizado e válido.

Não há coleta nem exibição de motivo de cancelamento nesta versão do produto. Cancelamento é informado por status, quantidade e valor snapshot do atendimento, sempre dentro do período e filtro profissional aplicados.

### 22.6.1 Detalhamento a partir da visão geral

Na Visão geral, os cartões Faturamento, Cancelamentos, Não compareceu e Clientes exibem uma ação textual acessível “Ver detalhes”; somente essa ação revela ou recolhe logo abaixo da grade a lista completa de registros que compõem exclusivamente aquele indicador. Ao revelar, a página posiciona o painel de detalhes na área visível para que a ação tenha retorno inequívoco no celular. O restante do cartão não é acionável. O detalhamento não altera o período, o profissional ou a consulta já aplicada. Faturamento mostra somente atendimentos concluídos; Cancelamentos somente `cancelled`; Não compareceu somente `no_show`; Clientes mostra a base elegível retornada pelo relatório.

Os cartões Agendamentos e Comissões também usam exclusivamente a ação textual “Ver detalhes” e levam, respectivamente, às abas Agendamentos e Comissões preservando os mesmos filtros aplicados. Essas interações não criam nova fórmula, não consultam outro tenant e não executam mutações. O detalhamento deve ter título, quantidade, estado vazio e os dados mínimos para conferência. A paginação obrigatória da aba Agendamentos permanece aplicável quando o volume exigir.

### 22.6.2 Clientes sem retorno

Relatórios oferece, dentro da visão Clientes e sem criar uma sétima aba principal, o segmento **Sem retorno +45 dias**. A consulta usa a data corrente em `America/Sao_Paulo` como referência e inclui exclusivamente clientes que: (a) tiveram ao menos um atendimento `completed` naquela barbearia; (b) têm a última conclusão em data estritamente anterior a referência menos 45 dias; e (c) não possuem reserva futura ativa `scheduled` — ou `confirmed` somente enquanto existir legado antes da normalização — em qualquer profissional da mesma barbearia. Cancelamentos e no-show não contam como retorno.

Cada resultado apresenta nome, contato autorizado, última conclusão, dias sem retorno, quantidade e valor de atendimentos concluídos no histórico aplicável e os tipos de serviço já realizados. Se houver filtro de profissional, somente as conclusões daquele profissional compõem última visita, quantidade, valor e serviços; a exclusão por reserva futura permanece por toda a barbearia para não abordar alguém que já tem retorno marcado. A consulta é exclusiva de owner/manager, valida que o profissional pertença ao tenant, não expõe o resultado publicamente e retorna vazio apenas para uma consulta bem-sucedida sem elegíveis.

### 22.7 Comissões e repasses

Um lançamento de comissão deve ser criado na conclusão do atendimento e iniciar como pendente. Marcar como pago deve registrar data, ator e auditoria.

O produto deve permitir:

- alterar o estado de um lançamento entre pendente e pago conforme regra autorizada;
- marcar em lote o período filtrado como pago;
- exportar os dados;
- impedir reabertura ordinária de atendimento com comissão já paga;
- preservar snapshots mesmo que preço ou percentual mudem depois.

## 23. Notificações

### 23.1 Canais

O produto deve oferecer notificações internas na aplicação para a equipe e e-mail transacional somente ao cliente. As preferências da equipe são individuais por usuário, barbearia e evento interno; não há preferência de e-mail de agenda para owner, gestor ou profissional.

Push, WhatsApp automático e campanhas de marketing não pertencem ao canal transacional definido aqui.

### 23.2 Eventos

- nova reserva (`new_appointment`);
- agendamento cancelado (`appointment_cancelled`);
- agendamento reagendado diretamente por data, horário ou profissional (`appointment_rescheduled`);
- lembrete de 24 horas (`appointment_reminder_24h`).

`appointment_confirmed` não pertence ao fluxo futuro: a reserva nasce válida como `scheduled`, e “Agendamento confirmado” é apenas a linguagem do e-mail inicial ao cliente. Registros históricos desse tipo permanecem retidos conforme a política de retenção e não devem ser apagados apenas por essa mudança.

Quando o Cliente iniciar o reagendamento pela própria agenda, a reserva atual é preservada até a confirmação transacional da nova. A RPC cancela a anterior e cria a substituta na mesma transação; portanto, o caminho emite o cancelamento da reserva anterior e a nova reserva, sem simular nem enfileirar `appointment_rescheduled`. Se o novo slot estiver indisponível, a transação falha e a reserva original continua ativa.

### 23.3 Destinatários

- Proprietário e gestor: eventos operacionais gerais da barbearia, exclusivamente na central interna e conforme preferência interna.
- Profissional: eventos dos próprios atendimentos, exclusivamente na central interna e conforme preferência interna.
- Cliente: e-mail operacional da própria reserva, sem depender de consentimento de marketing.

### 23.4 Central interna

A central deve possuir:

- sino com contagem de não lidas;
- lista cronológica;
- filtros “Histórico” e “Não lidas”;
- marcar uma como lida;
- marcar todas como lidas;
- atualização Realtime sem depender exclusivamente dela para consistência.

No celular, a visualização inicial deve ser **Não lidas**, apresentada antes do Histórico. Preferências ficam em uma visualização própria dentro do mesmo módulo e exibem somente os três alertas internos configuráveis: novo agendamento, cancelamento e reagendamento. O lembrete de 24 horas é comunicação automática ao cliente e não entra nessa preferência da barbearia.

O Histórico é exclusivamente o registro cronológico das notificações internas do usuário: deve exibir, no máximo, as 100 mais recentes criadas nos últimos 45 dias. Não há paginação para registros mais antigos, pois notificações internas expiram fisicamente ao completar 45 dias, inclusive quando não tenham sido lidas. A contagem de não lidas considera somente registros ainda retidos.

O monitor de entrega de e-mails, destinatários, tentativas e erros técnicos não deve ser apresentado na Central nem em nenhuma tela de gestão da barbearia. Ele é dado operacional protegido, reservado a uma futura Gestão da Plataforma autorizada; até que essa superfície exista e seja aprovada, permanece acessível somente a processos privilegiados de backend.

### 23.5 Fila transacional

Os eventos devem gerar uma outbox. Estados:

- `pending`;
- `processing`;
- `sent`;
- `failed`.

O processador deve:

- reivindicar itens atomicamente;
- usar idempotência/deduplicação;
- limitar tentativas;
- aplicar retry com backoff;
- registrar erro sanitizado;
- separar aceite da API de entrega final do e-mail;
- processar lembretes cujo atendimento esteja entre 23 e 24 horas no futuro, sem duplicar;
- enfileirar o lembrete apenas se a criação da reserva ou a última alteração de data/horário/profissional ocorreu pelo menos 26 horas antes do atendimento. Reservas ou reagendamentos mais próximos recebem apenas a comunicação imediata.

### 23.6 Proteção do worker

Chamadas servidor-servidor devem usar HMAC-SHA-256 com:

- segredo no Vault;
- timestamp com janela inferior a cinco minutos completos;
- nonce de uso único;
- reivindicação atômica do nonce antes de acessar a fila;
- comparação segura de assinatura;
- recusa de repetição, expiração ou assinatura inválida.

### 23.7 E-mail

O Resend deve ser usado para mensagens transacionais do aplicativo. O SMTP do Supabase Auth para magic links é uma configuração separada.

O domínio remetente deve possuir SPF, DKIM e política DMARC definida. Rastreamento de abertura ou clique deve permanecer desligado salvo decisão de privacidade explícita.

Webhooks de entrega, bounce, reclamação e supressão devem ser tratados de forma idempotente quando forem usados para observabilidade.

## 24. Assinatura e cobrança

### 24.1 Catálogo comercial

| Plano | Duração | Valor total | Parcelamento máximo |
|---|---:|---:|---:|
| Mensal | 1 mês | R$ 99,90 | 1 vez |
| Trimestral | 3 meses | R$ 284,90 | 2 vezes |
| Semestral | 6 meses | R$ 539,90 | 3 vezes |
| Anual | 12 meses | R$ 999,00 | 4 vezes |

Regras:

- valores são armazenados em centavos de real;
- o catálogo deve ser versionado;
- um contrato guarda a versão, preço, duração e limite aceitos;
- parcelas devem fechar o total exato, distribuindo centavos residuais de forma determinística;
- todos os planos incluem até cinco profissionais ativos;
- acima de cinco profissionais, a contratação é sob consulta;
- não existe cobrança automática por excedente sem novo contrato aprovado.

### 24.2 Período de teste

- Duração de 30 dias.
- Acesso funcional completo dentro dos limites do plano padrão definido.
- Não exige cartão.
- Não se converte automaticamente em cobrança ou dívida.
- Ao terminar sem contratação, aplica-se a matriz de acesso pós-vigência.

### 24.3 Provedor de pagamento

O Asaas deve ser o provedor inicial. O checkout deve ser hospedado pelo provedor para que o BarbeariaSP não processe dados de cartão.

O BarbeariaSP é a fonte de verdade para plano, vigência e autorização. O Asaas é fonte de eventos financeiros, reconciliados em uma projeção local. A aplicação não deve consultar o Asaas a cada login.

Identificadores internos estáveis devem ser diferentes dos identificadores externos. `externalReference` serve apenas para correlação e nunca para autenticação, identidade ou autorização.

### 24.4 Contratação

O fluxo deve:

1. mostrar o plano, duração, preço total, parcelamento e termos;
2. registrar aceite da versão contratual;
3. criar pedido interno idempotente;
4. criar ou reutilizar cliente e checkout no Asaas por operação idempotente;
5. redirecionar ao checkout hospedado;
6. receber o retorno somente como estado informativo;
7. aguardar webhook assinado ou conciliação autenticada;
8. criar o período de assinatura somente após confirmação financeira válida.

O retorno do navegador não comprova pagamento e não concede acesso.

### 24.5 Webhooks e conciliação

- Validar autenticidade conforme o mecanismo oficial do provedor.
- Persistir o evento bruto necessário com dados sensíveis minimizados.
- Deduplicar pelo identificador externo e tipo de evento.
- Processar em transação.
- Permitir reprocessamento seguro.
- Reconciliar periodicamente pedidos sem confirmação final.
- Nunca confiar em e-mail, valor ou referência fornecida pelo navegador como autorização.

### 24.6 Limite de profissionais

Ativar ou criar um sexto profissional deve falhar no servidor quando o contrato permitir somente cinco. A contagem deve ocorrer com proteção contra concorrência. Profissionais inativos não contam; convites e política de reserva de vaga precisam seguir uma única regra documentada antes da implementação.

### 24.7 Cancelamento, reembolso e vigência

- Não renovação mantém acesso até o fim do período pago.
- Encerramento antecipado e reembolso devem registrar solicitação, decisão, valor, motivo e evento do provedor.
- Direito de arrependimento e demais obrigações legais devem ser refletidos nos termos e no fluxo.
- Nenhum reembolso deve ser considerado concluído somente por ação na interface; exige confirmação do provedor.

### 24.8 Fases após o fim efetivo

| Período | Acesso permitido |
|---|---|
| Dias 1–5 | Consultar e cumprir somente os compromissos já existentes com início até cinco dias após o fim efetivo, regularizar assinatura e exportar dados; não criar novos compromissos |
| Dias 6–15 | Assinatura, conta, privacidade e exportação; operação da barbearia indisponível |
| Dias 16–59 | Dados preservados, operação indisponível; acesso restrito aos canais definidos de regularização/privacidade |
| A partir do dia 60 | Expurgo ou anonimização conforme retenção legal e contratos; histórico não pode ser prometido como recuperável |

A mudança de fase deve ser calculada no servidor a partir do fim efetivo do período. Não deve depender do relógio do navegador.

Desde o fim efetivo, a página pública pode continuar apresentando a barbearia, mas não pode aceitar novos agendamentos: ela não deve listar horários, e o banco deve recusar a criação inclusive por RPC, aba antiga ou chamada direta. A mensagem ao cliente é: **“Sua barbearia não está mais recebendo agendamentos pelo BarbeariaSP.”**

Durante os cinco dias operacionais, proprietário, gestor e profissional só podem consultar e operar compromissos cujo início esteja dentro desse limite. Depois do limite, a agenda operacional não pode revelar nem permitir gestão dos dados de clientes. Caso a interface apresente compromissos posteriores preservados, ela deve usar uma projeção servidora redigida, visualmente embaçada e sem dados pessoais, detalhes ou ações.

### 24.8.1 Exportação operacional da barbearia

- Somente o proprietário autenticado da barbearia pode gerar a exportação. Gestor e profissional não recebem conteúdo financeiro, cadastro operacional ou dados de clientes por essa rota.
- O arquivo reúne apenas registros efetivamente persistidos no tenant: dados operacionais e cadastrais da barbearia, agenda e seus snapshots, clientes vinculados, permissões de contato específicas daquela barbearia, catálogo, equipe, disponibilidade, pausas, ausências, comissões e repasses. Cancelamento e novo agendamento são registros distintos quando ambos existirem; o produto não deve inferir ou montar uma cronologia artificial.
- A entrega é um download imediato, no dispositivo do proprietário, em um ZIP contendo planilha Excel e JSON de conteúdo equivalente. A plataforma não guarda cópia do arquivo, não envia e-mail e não cria prazo de link para esse fluxo.
- O arquivo não pode incluir credenciais de acesso, sessão, convites, segredos, dados de outro tenant, preferências globais de plataforma ou logs técnicos internos. A geração deve registrar auditoria minimizada, sem conteúdo do arquivo nem dados pessoais adicionais.
- A autorização precisa ser verificada no servidor, além da interface, com autenticação recente de até 15 minutos e método de login que não seja mera renovação de token. A mesma regra de acesso às fases da assinatura se aplica ao fluxo, inclusive quando a operação regular estiver bloqueada e a exportação ainda permitida pela tabela 24.8. Enquanto não houver no banco o marco autoritativo do fim efetivo para calcular as fases, a exportação segue a regra atual da central de assinatura e não cria por inferência uma cobrança, bloqueio ou expurgo novo.
- A comunicação pública deve informar que a barbearia pode exportar os dados operacionais disponíveis antes do encerramento definitivo. Após o prazo de retenção aplicável, dados pessoais podem ser eliminados ou anonimizados e não podem ser recuperados pela plataforma.

### 24.9 Decisões comerciais obrigatórias antes da integração financeira

Devem ser formalmente definidas e versionadas:

- evento que inicia o trial e regra de elegibilidade por nova barbearia;
- cálculo de “mês” e tratamento do dia de vencimento;
- início de um período pago contratado durante o trial;
- renovação automática ou manual;
- meios de pagamento além dos que forem aprovados no checkout;
- regra de upgrade, downgrade e plano personalizado;
- fórmula de reembolso proporcional, arredondamento e tarifas;
- permissões exatas para reagendamento durante os cinco dias operacionais;
- se convite pendente reserva vaga no limite de profissionais;
- razão social, dados de suporte, política de cancelamento e textos jurídicos.

### 24.10 Painel de controle interno da BarbeariaSP — decisão registrada para evolução futura

Em evolução posterior, a empresa BarbeariaSP deverá possuir um painel interno, separado do painel de cada barbearia, para administrar exclusivamente a relação SaaS e seus deveres operacionais. O objetivo não é dar acesso genérico aos dados das barbearias nem reverter a exclusão de contas de clientes.

O escopo a decidir e implementar nessa evolução compreende, no mínimo:

- catálogo de barbearias parceiras atuais, inativas, canceladas ou encerradas, com situação contratual, vigência, histórico de assinatura, solicitações de cancelamento, exportações solicitadas e protocolos de suporte pertinentes;
- acompanhamento da retenção, anonimização ou expurgo previsto para cada conta de barbearia após o término efetivo do contrato;
- histórico administrativo e financeiro necessário à relação SaaS, como contratos, cobranças, reembolsos, decisões de suporte e eventos de reconciliação, observando as bases legais e os prazos de guarda aplicáveis;
- atendimento a solicitações legítimas de privacidade, suporte e recuperação de acesso, com trilha de auditoria minimizada e acesso restrito a pessoas autorizadas da plataforma.

Este painel não pode manter, exibir, exportar ou recuperar senha, hash de senha, token, sessão, convite ou qualquer outro segredo de autenticação. Dados de clientes que tiveram a conta encerrada devem seguir a anonimização ou eliminação definida na seção 25; registros operacionais preservados para obrigação legal, segurança, estatística ou histórico devem permanecer sem identificação quando isso for aplicável. A definição futura deverá detalhar os papéis internos autorizados, RLS, finalidade, retenção, auditoria, fluxo de suporte e revisão jurídica antes de criar tabelas, consultas ou telas.

Esta decisão registra uma necessidade de produto; não cria agora painel, banco, retenção adicional, acesso a dados, migration ou alteração em Supabase remoto.

### 24.10.1 Recuperação excepcional de acesso do proprietário assinante — decisão registrada para evolução futura

Quando o proprietário de uma barbearia assinante perder definitivamente o acesso ao e-mail ou à conta Google usada para entrar, a BarbeariaSP deverá oferecer recuperação **assistida** da titularidade administrativa. A finalidade é impedir que a empresa cliente perca a gestão da própria operação; não é um mecanismo genérico para recuperar identidades pessoais de clientes, profissionais ou gestores.

- O login pelo Google continua sob recuperação exclusiva do Google. A BarbeariaSP não cria senha local, não troca senha e não simula a recuperação de uma conta Google.
- Enquanto ainda possuir acesso, o proprietário assinante poderá cadastrar um e-mail alternativo de recuperação. Esse endereço deve ser diferente do e-mail de acesso, confirmado por link antes de valer e mantido exclusivamente para segurança/recuperação; não é público, não substitui o contato da barbearia e não altera o e-mail de login.
- A pessoa solicita a recuperação por canal próprio da plataforma, informa a barbearia e um novo e-mail de acesso, mas a solicitação não revela se existe conta, assinatura ou vínculo para terceiros.
- O e-mail alternativo confirmado permite iniciar a solicitação e receber comunicações seguras, mas sozinho não transfere a propriedade. A plataforma confere a titularidade por procedimento manual documentado, usando dados contratuais/cadastrais já autorizados, contato independente previamente registrado e prova adicional proporcional ao risco. Não basta conhecer nome público, slug, telefone, CNPJ ou controlar somente o e-mail alternativo.
- Depois da validação, uma pessoa autorizada da BarbeariaSP vincula a **nova identidade autenticada** ao papel de proprietário da mesma barbearia, registra auditoria minimizada e informa o resultado pelo canal verificado. O procedimento não copia senha, token, sessão ou segredo; o `user_id` antigo não é reutilizado.
- A conta anterior deve ter a titularidade e sessões revogadas somente após a conclusão segura da transferência, conforme regra de segurança e retenção definida para a implementação. A operação deve preservar agenda, equipe, dados e histórico da barbearia, mas nunca conceder acesso a outro tenant.
- Antes da construção, devem ser definidos os papéis internos que podem aprovar a recuperação, a evidência mínima, dupla conferência quando cabível, prazo, canal de contestação, auditoria, rate limit e revisão jurídica/contratual.

Esta decisão não autoriza agora alteração de login, Auth, banco, RLS, migration, dados existentes ou Supabase remoto.

## 25. Privacidade, LGPD e consentimento

### 25.1 Agentes e responsabilidades

Os contratos e documentos públicos devem definir o papel de cada agente por finalidade:

- a barbearia tende a ser controladora dos dados usados para prestar e administrar seus atendimentos;
- a empresa do BarbeariaSP pode atuar como operadora nesses tratamentos;
- a empresa do BarbeariaSP pode ser controladora para conta da plataforma, segurança, suporte, cobrança e obrigações próprias;
- Supabase, Hostinger, Resend, provedor de autenticação e Asaas devem ser classificados como operadores, suboperadores ou destinatários conforme contrato e fluxo real.

Essa distribuição deve ser validada juridicamente antes do lançamento público.

### 25.2 Categorias de dados

| Categoria | Exemplos | Finalidade principal |
|---|---|---|
| Identidade e conta | nome, e-mail, telefone, identificador Auth | autenticação, contato e exercício de direitos |
| Agendamento | barbearia, serviços, profissional, horários, status e snapshots | execução e histórico do atendimento |
| Empresa | perfil público, endereço, responsável, dados fiscais | operação, divulgação e cobrança |
| Profissional | nome, contato, Instagram, foto, horários e vínculos | oferta e execução do atendimento |
| CRM | relação com a barbearia, primeira/última interação e agregados | relacionamento e operação da barbearia |
| Consentimento | escopo, escolha, versão, origem e instante | prova e gestão de preferências |
| Notificação | destinatário, evento, conteúdo mínimo e entrega | comunicação operacional |
| Cobrança | contrato, pedido, pagamento, reembolso e eventos | assinatura da plataforma |
| Segurança | auditoria, sessão, IP minimizado quando justificado, nonce e falhas | prevenção de abuso e investigação |

O produto não deve coletar intencionalmente dados pessoais sensíveis como saúde, biometria, religião ou geolocalização precisa. Uma nova coleta dessa natureza exige avaliação jurídica, de segurança e necessidade antes de ser criada.

### 25.3 Consentimento de marketing

Devem existir dois escopos independentes:

- `PLATFORM_MARKETING`;
- `BARBERSHOP_MARKETING`, vinculado a uma barbearia.

Regras:

- o pedido pode aparecer após a primeira reserva concluída com sucesso;
- todas as opções começam desmarcadas;
- aceitar exige ação positiva;
- recusar registra `false` explícito;
- fechar ou abandonar não registra evento e é tratado como ausência de consentimento;
- o pedido pode ser reapresentado posteriormente enquanto não houver escolha explícita, sem bloquear a jornada;
- cada mudança gera evento append-only com versão do texto e origem;
- comunicação operacional não depende de marketing;
- revogação deve ser tão simples quanto concessão.

### 25.4 Direitos do titular

O cliente autenticado deve poder:

- confirmar a existência de tratamento;
- acessar e corrigir seus dados;
- exportar dados em JSON estruturado;
- revogar consentimentos;
- solicitar portabilidade conforme formato aplicável;
- solicitar anonimização, bloqueio ou eliminação quando cabível;
- encerrar a conta de cliente;
- acompanhar protocolos sem numeração enumerável.

O canal deve permitir confirmação e acesso simplificado imediatamente quando tecnicamente cabível e suportar a resposta completa, com origem dos dados, critérios e finalidades, dentro do prazo legal aplicável. Para o regime geral da LGPD, a declaração completa prevista para esse tipo de solicitação deve ser preparada para atendimento em até 15 dias, sem impedir respostas mais rápidas.

### 25.5 Exportação do cliente

A exportação deve conter somente dados do próprio titular:

- perfil;
- vínculos com barbearias;
- agendamentos e seus snapshots;
- consentimentos e preferências;
- protocolos de privacidade pertinentes.

Não deve conter dados privados de funcionários, comissões, auditorias internas, segredos, observações de terceiros ou informações de outros clientes.

### 25.6 Encerramento da conta de cliente

O fluxo deve exigir sessão válida, reautenticação recente e confirmação informada. Uma Edge Function privilegiada deve usar o JWT do solicitante como identidade; não deve aceitar `user_id` arbitrário no corpo. A função deve validar o bearer no próprio código com `auth.getUser(token)` e recusar token ausente, inválido, chave de API e identidade anônima antes de acessar Storage, dados pessoais ou RPC. A opção legada de verificação JWT da plataforma não substitui essa validação explícita.

Ordem segura:

1. validar identidade e reautenticação;
2. localizar somente arquivos do próprio titular;
3. excluir arquivos pela API do Storage;
4. anonimizar PII em registros operacionais que precisam ser preservados;
5. remover vínculos, consentimentos, preferências e notificações pessoais conforme retenção;
6. preservar snapshots não identificadores exigidos para integridade financeira/operacional;
7. excluir a identidade Auth somente depois das etapas necessárias;
8. registrar protocolo e auditoria minimizada.

Falha de limpeza de arquivo não deve ser ocultada por anonimização prematura que torne a remoção impossível.

Ao encerrar a conta, reservas futuras ainda `scheduled` são removidas para que um horário ativo não permaneça sem titular. Atendimentos concluídos, cancelados ou marcados como não comparecimento, bem como qualquer reserva cujo início já tenha passado, preservam os snapshots estritamente operacionais da barbearia. Nesses registros devem ser removidos os vínculos e dados pessoais do cliente, incluindo nome, telefone, e-mail, observações e motivo de cancelamento. Essa preservação anonimizada sustenta relatórios e comissões; não torna a conta do cliente recuperável.

### 25.7 Documentos públicos e governança

Antes do lançamento público, devem existir e passar por revisão jurídica:

- Termos de Uso;
- Aviso de Privacidade;
- contrato com barbearias;
- política de retenção e descarte;
- política de segurança/incidentes aplicável;
- lista de fornecedores e transferências internacionais;
- identificação da empresa, razão social, CNPJ e endereço;
- canal público de suporte e privacidade, prazo e responsável;
- encarregado ou canal equivalente conforme avaliação jurídica;
- bases legais por finalidade;
- data, versão e processo de atualização dos documentos.

## 26. Modelo lógico de dados

### 26.1 Convenções gerais

- Chaves primárias devem usar UUID.
- Entidades multiempresa devem possuir `barbershop_id` obrigatório, salvo entidades globais claramente definidas.
- Tabelas devem possuir `created_at` e `updated_at` quando mutáveis.
- Exclusão lógica ou inativação deve ser preferida quando o histórico precisa permanecer íntegro.
- E-mails devem ser normalizados para comparação; telefones devem possuir representação normalizada separada da exibição.
- Status devem usar domínio/enum ou `CHECK` explícito.
- Datas de auditoria e eventos devem ser imutáveis.
- Snapshots não devem depender de joins com cadastros que podem mudar.

### 26.2 Núcleo de identidade e empresa

| Entidade | Finalidade | Campos essenciais |
|---|---|---|
| `barbershops` | Tenant e perfil da barbearia | id, nome, slug, contatos, endereço, descrição, foto, timezone, active |
| `barbershop_registration_details` | Dados legais/fiscais privados | barbershop_id, identidade legal, documento, endereço fiscal, responsáveis |
| `team_members` | Vínculo autenticado e papel | barbershop_id, user_id, professional_id opcional, role, active, invited/activated timestamps |
| `team_invitations` | Convite de acesso | barbershop_id, professional_id opcional, email normalizado, role, token_hash, expires_at, accepted_at, revoked_at |
| `audit_logs` | Trilha de ações sensíveis | actor_user_id, barbershop_id, action, entity, entity_id, metadata minimizada, created_at |

Um usuário pode possuir vários `team_members`, mas não deve haver mais de um vínculo ativo equivalente para o mesmo usuário e barbearia.

### 26.3 Clientes

| Entidade | Finalidade | Campos essenciais |
|---|---|---|
| `customers` | Perfil global do cliente | user_id, name, phone, normalized_phone, timestamps |
| `barbershop_customers` | Relação cliente–barbearia | barbershop_id, customer_id, first_seen_at, last_seen_at, aggregate fields opcionais derivados |
| `customer_consents` | Histórico append-only de escolhas | customer_id, barbershop_id opcional, scope, granted, text_version, source, created_at |
| `customer_privacy_requests` | Protocolo de direito do titular | customer_id, protocol_hash/public_token seguro, type, status, requested_at, completed_at |

Deve existir unicidade da relação `barbershop_id + customer_id`.

### 26.4 Serviços, equipe e agenda

| Entidade | Finalidade | Campos essenciais |
|---|---|---|
| `services` | Catálogo da barbearia | barbershop_id, name, description, duration_minutes, price_cents, active, sort_order |
| `professionals` | Cadastro operacional | barbershop_id, name, phone, contact_email, instagram_url, photo_url, active, schedule_mode |
| `professional_commission_settings` | Comissão vigente | professional_id, rate, effective_from, created_by |
| `business_hours` | Semana da barbearia | barbershop_id, weekday, is_open, start_time, end_time |
| `professional_hours` | Semana personalizada | professional_id, weekday, is_open, start_time, end_time |
| `professional_breaks` | Pausas recorrentes | professional_id, weekday/date scope, start_time, end_time, active |
| `professional_time_blocks` | Ausências e bloqueios | professional_id, starts_at, ends_at, reason_code opcional, active |
| `professional_deactivation_reviews` | Revisão de compromissos futuros | barbershop_id, professional_id, open_appointment_count, status, created_by, resolved_by, timestamps |

`schedule_mode` deve aceitar somente `barbershop` ou `custom`.

### 26.5 Agendamentos e comissões

| Entidade | Finalidade | Campos essenciais |
|---|---|---|
| `appointments` | Reserva e ciclo de vida | barbershop_id, customer_id, professional_id, starts_at, ends_at, status, totals snapshot, customer contact snapshots, status timestamps |
| `appointment_services` | Serviços snapshot da reserva | appointment_id, source_service_id opcional, name_snapshot, duration_snapshot, price_cents_snapshot, position |
| `appointment_commissions` | Comissão snapshot e repasse | appointment_id, professional_id, rate_snapshot, base_cents, commission_cents, payment_status, paid_at, paid_by |

Restrições essenciais:

- `ends_at > starts_at`;
- no máximo três serviços por agendamento;
- um profissional por agendamento;
- totais conferem com os snapshots;
- conflitos consideram somente status que ocupam agenda;
- um lançamento de comissão por regra definida de atendimento concluído;
- atendimento e serviços pertencem ao mesmo tenant.

### 26.6 Notificações

| Entidade | Finalidade |
|---|---|
| `user_notifications` | Caixa interna por usuário |
| `notification_preferences` | Preferência por usuário, barbearia, evento e canal |
| `notification_outbox` | Fila transacional idempotente |
| `notification_delivery_events` | Eventos externos de entrega, quando integrados |
| `notification_worker_nonces` | Proteção contra replay do worker |

### 26.7 Assinatura e cobrança

| Entidade | Finalidade |
|---|---|
| `subscription_plans` | Catálogo versionado de planos |
| `barbershop_subscriptions` | Contrato e estado comercial da barbearia |
| `subscription_periods` | Períodos de trial ou acesso pago |
| `billing_orders` | Intenção interna de contratação |
| `payment_provider_accounts` | Mapeamento seguro da barbearia no provedor |
| `payment_provider_links` | Checkout/links externos com validade |
| `billing_payments` | Projeção local de pagamentos |
| `subscription_cancellations` | Não renovação e encerramento |
| `billing_refunds` | Solicitações e confirmações de reembolso |
| `payment_webhook_events` | Caixa de entrada idempotente de webhooks |
| `payment_outbox` | Operações externas com retry seguro |
| `retention_runs` | Execução auditável de fases de retenção/expurgo |

### 26.8 Relacionamentos essenciais

```text
auth.users
  ├── customers ──< barbershop_customers >── barbershops
  └── team_members >──────────────────────── barbershops

barbershops
  ├── services
  ├── professionals
  │     ├── professional_hours
  │     ├── professional_breaks
  │     └── professional_time_blocks
  ├── business_hours
  ├── appointments
  │     ├── appointment_services
  │     └── appointment_commissions
  ├── notifications
  └── barbershop_subscriptions
        ├── subscription_periods
        ├── billing_orders
        ├── billing_payments
        ├── cancellations
        └── refunds
```

## 27. Contratos de operações e RPCs

Nomes podem ser ajustados durante o desenho técnico, mas as garantias funcionais abaixo são obrigatórias.

### 27.1 Catálogo e disponibilidade pública

- Consultar página pública por slug sem expor colunas privadas.
- Consultar serviços e profissionais públicos ativos.
- Calcular disponibilidade com data, serviços e profissional opcional.
- Retornar apenas intervalos válidos e dados públicos necessários.

Views públicas devem selecionar colunas explicitamente e usar comportamento seguro de invocador.

### 27.2 Reserva

`book_customer_appointment` deve realizar a confirmação atômica descrita na seção de agendamento.

Também deve existir operação segura para:

- cancelar reserva própria futura;
- reagendar de forma atômica;
- consultar reservas próprias;
- salvar o perfil do cliente.

### 27.3 Gestão de profissionais

Operações estreitas devem cobrir:

- criar profissional gerenciado;
- editar dados operacionais;
- consultar ficha completa conforme papel;
- alterar modo de agenda;
- inativar/reativar cadastro;
- desativar/reativar vínculo de acesso;
- criar/revogar convite;
- resolver revisão de inativação.

Não deve existir `UPDATE` amplo que permita ao frontend alterar qualquer coluna de `professionals`, `team_members` ou `appointments` sem validação de campo.

### 27.4 Status de atendimento

`set_appointment_status(appointment_id, new_status)` deve:

- travar a linha;
- validar tenant;
- validar ator e atribuição;
- validar transição;
- impedir cancelamento por profissional;
- atualizar somente colunas de status e auditoria permitidas;
- gerar notificações e comissão quando aplicável;
- ser idempotente quando repetir o mesmo resultado seguro.

### 27.5 Relatórios

As operações de relatório devem retornar conjuntos consistentes para:

- relatório gerencial;
- relatório financeiro;
- detalhes e agregações;
- alteração de repasse;
- marcação em lote de repasses.

Filtros, timezone, status e fórmulas devem existir no banco ou camada autoritativa única, não ser recalculados de forma divergente em cada componente visual.

### 27.6 Privacidade

Operações devem cobrir:

- consultar preferências próprias;
- salvar/revogar consentimento append-only;
- exportar dados próprios;
- criar e consultar protocolos próprios;
- iniciar encerramento autenticado da própria conta.

### 27.7 Notificações

Operações privilegiadas devem reivindicar e concluir lotes da outbox, enfileirar lembretes e obter segredos somente no backend. `anon` e `authenticated` não podem executar funções de segredos ou processamento.

## 28. RLS, autorização e segurança do banco

### 28.1 Regras gerais

- Toda tabela em schema exposto deve ter RLS habilitada e forçada quando apropriado.
- Policies devem definir `USING` e `WITH CHECK` conforme operação.
- Grants da Data API são uma camada separada de RLS e devem seguir privilégio mínimo.
- Tabelas internas devem ficar em schema privado quando não precisam da Data API.
- Views devem usar `security_invoker` e projeção explícita.
- Autorização deve usar `auth.uid()` e vínculos confiáveis no banco, nunca `user_metadata` controlável pelo usuário.

### 28.2 Isolamento por tenant

Para qualquer linha com `barbershop_id`, o backend deve provar que o usuário possui vínculo ativo e papel suficiente naquela mesma barbearia. IDs UUID, filtros do frontend ou dificuldade de adivinhação não são controles de autorização.

### 28.3 Funções `SECURITY DEFINER`

Só devem ser usadas quando a operação atômica não pode ser expressa com segurança por RLS comum. Cada função deve:

- definir `search_path = ''`;
- qualificar schemas;
- validar `auth.uid()`;
- validar tenant, papel, propriedade e payload;
- validar estado atual e concorrência;
- revogar execução de `PUBLIC` e `anon` em operações privadas; exceções públicas mínimas de disponibilidade e convite seguem exclusivamente a seção 43.4;
- conceder somente ao papel mínimo necessário;
- não retornar segredos nem colunas excessivas;
- possuir testes negativos.

### 28.4 Concorrência e invariantes

Devem usar locks, índices e/ou constraints adequados:

- conflito de horários;
- limite de quatro reservas futuras;
- limite de profissionais do plano;
- aceite único de convite;
- geração única de comissão;
- idempotência de webhook e outbox;
- transição de status;
- alteração de slug.

### 28.5 Proteções da aplicação

- Redirecionamentos pós-login devem aceitar somente rotas internas de allowlist; URLs externas, `//host`, esquemas e variações codificadas devem ser recusados.
- Consultas SQL devem ser parametrizadas.
- Erros externos e de banco devem ser sanitizados antes de chegar ao usuário ou log.
- Cabeçalhos devem incluir CSP adequada, proteção contra framing, MIME sniffing e política de referrer.
- Produção em HTTPS deve aplicar HSTS com configuração compatível com domínio e subdomínios realmente controlados.
- Cookies de sessão devem seguir as configurações seguras do provedor e HTTPS.
- Ações sensíveis devem exigir sessão recente ou reautenticação.
- Endpoints públicos devem possuir limites proporcionais sem substituir invariantes do banco.

### 28.6 Auditoria

Devem ser auditados, com minimização:

- mudanças de papel e acesso;
- convites, revogações e aceites;
- inativação/reativação de profissional;
- alterações de comissão e repasse;
- cancelamentos administrativos;
- alterações fiscais e de assinatura;
- exportação e encerramento de conta;
- reprocessamento de pagamento/webhook;
- alterações de configuração de segurança.

Logs de auditoria não podem conter token, senha, segredo, conteúdo completo de erro do provedor ou dados pessoais desnecessários.

## 29. Storage e imagens

### 29.1 Buckets

| Bucket | Conteúdo | Limite |
|---|---|---:|
| `barbershop-images` | Foto/capa pública da barbearia | 3 MB |
| `professional-images` | Foto pública do profissional | 2 MB |

Formatos permitidos: JPEG, PNG e WebP.

### 29.2 Caminhos e autorização

- Arquivos da barbearia devem usar prefixo baseado em `barbershop_id`.
- Arquivos do profissional devem usar prefixo baseado em `professional_id` e validar a relação com o tenant.
- Proprietário/gestor pode operar somente caminhos da própria barbearia.
- Profissional pode operar somente o próprio caminho autorizado.
- URLs persistidas devem apontar para bucket e origem permitidos.
- Caminhos com traversal, barra invertida, query inesperada ou fragmento devem ser recusados.
- O backend deve validar conteúdo real do arquivo, e não confiar somente em extensão ou MIME declarado pelo navegador.
- SVG e outros formatos ativos não devem ser aceitos como foto pública.

### 29.3 Substituição segura

Ao trocar uma imagem:

1. validar tipo e tamanho;
2. enviar novo arquivo em caminho controlado;
3. persistir a nova referência;
4. somente depois remover a imagem antiga;
5. se a persistência falhar, limpar o novo upload sem apagar o anterior.

## 30. Processos assíncronos e Edge Functions

### 30.1 Funções necessárias

- `process-notifications`: processa outbox e lembretes transacionais.
- `monitor-platform-health`: registra e avalia sinais operacionais autorizados.
- `delete-my-customer-account`: coordena Storage, anonimização e Auth com identidade do solicitante.
- funções de pagamento: recebem webhooks e executam conciliação/retentativas sem expor segredos ao frontend.

### 30.2 Requisitos comuns

- privilégio mínimo;
- validação antes de abrir conexão ou acessar fila;
- timeout;
- idempotência;
- limites de lote;
- logs estruturados e sanitizados;
- correlação por identificador interno não sensível;
- retry controlado;
- nenhum segredo no retorno;
- versões de runtime e dependências fixadas.

### 30.3 Interfaces externas

| Interface | Responsabilidade | Entrada confiável | Saída/efeito | Controles obrigatórios |
|---|---|---|---|---|
| Supabase Auth | Identidade, OAuth Google e magic link | Credenciais/tokens do provedor | Sessão e identidade verificada | Redirect allowlist, sessão segura, reautenticação |
| Supabase Data API | Consultas autorizadas do navegador | JWT do usuário e payload validado | Linhas permitidas ou erro sanitizado | RLS, grants mínimos, views reduzidas; exposição explícita por tabela/função; sem exposição automática de novas tabelas |
| PostgreSQL/RPC | Invariantes e operações atômicas | `auth.uid()`, tenant, papel e parâmetros tipados | Reserva, status, relatórios, lifecycle | Lock, constraint, idempotência, auditoria |
| Supabase Storage | Fotos públicas permitidas | Arquivo validado e caminho autorizado | Objeto e URL pública controlada | Tenant, owner, magic bytes, tamanho e formato |
| Supabase Realtime | Atualização de notificações | Assinatura autorizada | Evento de mudança permitido | RLS e recuperação por consulta normal |
| Resend | E-mail transacional do aplicativo | Item reivindicado da outbox | ID do envio e eventos de entrega | Chave no Vault, remetente verificado, idempotência |
| SMTP do Auth | Magic links de autenticação | Solicitação do Supabase Auth | Mensagem de acesso | Domínio, antiphishing e configuração separada do Resend |
| Asaas | Assinatura B2B do BarbeariaSP | Pedido interno e operação server-side | Checkout, pagamento, estorno e webhook | Segredo no backend, conciliação e anti-replay |
| Hostinger | Execução do aplicativo web | Artefato standalone e configuração pública/privada separada | Aplicação HTTPS | Processo reproduzível, logs sanitizados e rollback |

A aplicação não expõe webhook configurável para barbearias e não integra pagamento do serviço do cliente.

## 31. Assinatura, permissões e retenção como autorização

O acesso a módulos deve considerar dois eixos independentes:

1. o papel do usuário na barbearia;
2. a fase comercial da assinatura.

Um gestor com papel válido não pode operar quando a fase comercial bloqueia o módulo. Da mesma forma, uma assinatura ativa não concede papel administrativo a um usuário sem vínculo.

A verificação deve ocorrer no servidor por uma função central de acesso, evitando regras divergentes por página. Deve existir distinção entre:

- acesso integral;
- operação restrita a compromissos existentes;
- assinatura/privacidade/exportação;
- somente retenção interna;
- dados expirados para expurgo.

## 32. Tratamento de erros e mensagens

### 32.1 Princípios

- Mensagem ao usuário deve dizer o que ocorreu e o próximo passo possível.
- Erro técnico não deve ser chamado de indisponibilidade de agenda.
- Falta de permissão não deve ser apresentada como recurso inexistente quando isso prejudicar entendimento legítimo.
- Erros devem preservar dados já digitados sempre que seguro.
- Mensagens não devem expor SQL, tabela, stack trace, token, e-mail de terceiros ou resposta completa de provedor.

### 32.2 Categorias mínimas

- autenticação necessária;
- sessão expirada;
- falta de permissão;
- validação de campo;
- conflito de agenda;
- limite de reservas;
- limite do plano;
- convite inválido, expirado, usado ou revogado;
- integração externa indisponível;
- pagamento aguardando confirmação;
- falha temporária com nova tentativa;
- erro inesperado com identificador de suporte.

### 32.3 Retorno contextual de ação

Toda operação iniciada explicitamente pelo usuário deve informar seu resultado no mesmo contexto visual da ação, sem recarregar a página ou deslocar a navegação para o topo. Em formulário ou card, sucesso e falha aparecem imediatamente abaixo do grupo de botões que enviou a alteração; em linha de lista ou tabela, aparecem na própria linha ou logo abaixo dela; em diálogo, ficam no rodapé do diálogo. Quando uma lista tiver várias ações iguais, o retorno pertence exclusivamente ao item acionado e não pode ser exibido no rodapé geral da lista. O botão mostra estado de processamento e fica indisponível enquanto a operação estiver em andamento.

Erros de validação específicos continuam junto ao campo correspondente. Mensagens de carregamento, falha de contexto ou falha global da página podem permanecer no topo, pois não resultam de uma ação localizada. O retorno de ação deve usar região acessível de status, não expor detalhes técnicos e preservar os dados editados quando a operação falhar.

## 33. Requisitos não funcionais

| ID | Tipo | Requisito verificável |
|---|---|---|
| RNF-ARQ-001 | Arquitetura | O sistema deve usar Next.js/React/TypeScript no frontend e Supabase como único backend operacional. |
| RNF-ARQ-002 | Arquitetura | Regras sensíveis devem ser aplicadas por RLS, RPC, trigger ou serviço confiável, nunca somente na interface. |
| RNF-MT-001 | Multiempresa | Testes devem provar negação de leitura e escrita entre duas barbearias distintas. |
| RNF-CON-001 | Concorrência | Duas confirmações incompatíveis para o mesmo profissional/intervalo devem resultar em exatamente uma reserva válida. |
| RNF-CON-002 | Concorrência | Quota de reservas, limite de profissionais, convite, comissão e webhook devem resistir a requisições paralelas. |
| RNF-PERF-001 | Desempenho | A landing e a página pública devem evitar JavaScript não essencial e otimizar imagens para o viewport. |
| RNF-PERF-002 | Desempenho | Listas e relatórios devem evitar N+1, usar paginação e agregação no banco. |
| RNF-RESP-001 | Responsividade | Todas as jornadas devem funcionar em 320, 360, 390, 768, 1024 e 1440 px sem perda funcional. |
| RNF-RESP-002 | Responsividade | Não deve haver rolagem horizontal inesperada nem conteúdo oculto por navegação fixa. |
| RNF-ACC-001 | Acessibilidade | Fluxos essenciais devem atender WCAG 2.2 AA. |
| RNF-ACC-002 | Acessibilidade | Toda ação deve funcionar por toque, teclado e mouse, com foco visível e nome acessível. |
| RNF-ACC-003 | Acessibilidade | Zoom de 200% e redução de movimento não podem impedir leitura ou operação. |
| RNF-SEC-001 | Segurança | Toda comunicação deve usar HTTPS e todo segredo deve permanecer em backend/Vault. |
| RNF-SEC-002 | Segurança | Erros e logs não podem expor PII desnecessária, SQL, stack, token ou segredo. |
| RNF-PRI-001 | Privacidade | Coleta e exportação devem seguir minimização e finalidade documentada. |
| RNF-AUD-001 | Auditoria | Operações sensíveis devem registrar ator, tenant, ação, entidade e instante, sem conteúdo secreto. |
| RNF-OPS-001 | Operação | A saúde do frontend, banco, filas, funções e integrações deve ser monitorada por sinais independentes. |
| RNF-BKP-001 | Continuidade | Backup criptografado e restauração isolada devem possuir RPO, RTO e retenção formalmente aprovados. |
| RNF-LOC-001 | Localização | Interface deve usar pt-BR, BRL e `America/Sao_Paulo`, persistindo instantes em UTC. |
| RNF-COMP-001 | Compatibilidade | O produto deve suportar versões atuais de Chrome, Edge, Safari e Firefox, incluindo iOS e Android. |

### 33.1 Desempenho

- Landing e página pública devem priorizar LCP, imagens responsivas e mínimo JavaScript.
- Consultas devem evitar N+1 e uma chamada por cartão.
- Relatórios devem usar agregação no banco e paginação para detalhes.
- Índices devem cobrir tenant, período, status, profissional, cliente, outbox e idempotência.
- Realtime não deve substituir consulta inicial nem mecanismo de recuperação.

### 33.2 Compatibilidade

- Versões atuais dos navegadores Chrome, Edge, Safari e Firefox.
- iOS Safari e Chrome Android em larguras suportadas.
- Teclado e mouse no desktop.
- Zoom de 200% sem perda de conteúdo ou operação.

### 33.3 Acessibilidade

Meta mínima: WCAG 2.2 nível AA para os fluxos essenciais.

Deve-se validar:

- ordem semântica e um `h1` por tela;
- contraste medido;
- foco visível e ordem lógica;
- formulários e resumo de erros;
- diálogos com foco contido e retorno ao acionador;
- calendário acessível;
- tabelas e cartões equivalentes;
- `prefers-reduced-motion`;
- safe areas em navegação fixa;
- conteúdo não oculto por barras inferiores.

### 33.4 Localização

- Idioma inicial: português do Brasil.
- Datas no formato brasileiro e timezone explícito quando necessário.
- Moeda em BRL.
- Telefones normalizados sem impedir exibição amigável.
- Textos jurídicos e de consentimento versionados.

## 34. Observabilidade, saúde e suporte

### 34.1 Saúde

Um endpoint `/api/health` deve comprovar apenas que a aplicação Next.js responde. Ele não deve ser tratado como prova de saúde do banco, Auth, Storage, Resend ou Asaas.

Monitores independentes devem verificar, sem dados sensíveis:

- resposta da aplicação;
- conectividade controlada com o banco;
- atraso e falhas da outbox;
- falhas de Edge Functions;
- expiração de segredo/configuração necessária;
- taxa de erro de autenticação;
- webhooks financeiros não processados;
- jobs de retenção.

### 34.2 Alertas

Alertas devem possuir severidade, responsável, canal e procedimento. Falhas repetidas não podem gerar tempestade de notificações. Logs devem conter correlação suficiente para diagnóstico sem PII desnecessária.

### 34.3 Suporte

O produto deve informar canal oficial, horário e prazo de resposta. Protocolos de suporte e privacidade devem ser distintos quando as obrigações e acessos forem diferentes.

## 35. Backup, restauração e continuidade

### 35.1 Escopo do backup

O plano deve contemplar:

- banco PostgreSQL;
- metadados necessários de Auth;
- objetos do Storage;
- configurações reproduzíveis de Edge Functions, cron e Vault sem exportar segredos em texto aberto;
- catálogo e contratos de assinatura;
- documentação operacional.

### 35.2 Regras

- Backups devem ser criptografados e mantidos fora do Git, navegador e servidor de aplicação.
- Retenção deve ser definida por categoria e compatível com LGPD e contrato.
- Restauração deve ser testada primeiro em ambiente isolado.
- Teste de restore não deve usar produção como destino.
- Deve existir RPO e RTO aprovados.
- Operação destrutiva requer alvo exato, autorização e evidência de backup quando aplicável.
- Expurgo em produção deve considerar cópias de backup e prazo de sobrescrita.

### 35.3 Incidentes

O procedimento deve cobrir detecção, contenção, preservação de evidências, avaliação de impacto, comunicação interna, notificação regulatória quando aplicável, recuperação e revisão posterior.

Quando o incidente puder acarretar risco ou dano relevante aos titulares, o processo deve permitir que o controlador comunique a ANPD e os titulares afetados em até três dias úteis, ressalvado prazo específico previsto em outra legislação. Quando as informações ainda estiverem incompletas, o procedimento deve suportar comunicação preliminar e complementação, conforme regulamentação aplicável.

## 36. Ambientes, entrega e publicação

Devem existir ambientes separados para desenvolvimento, teste/homologação e produção, com projetos Supabase e credenciais independentes.

### 36.1 Migrations

- Toda alteração usa nova migration; migrations aplicadas não são editadas.
- Migrations devem ser aditivas e retrocompatíveis durante rollout sempre que possível.
- Alteração destrutiva exige migration compensatória planejada, backup e aprovação.
- RLS, grants, funções e triggers devem ser versionados junto com testes SQL.
- Dados de demonstração nunca devem entrar em produção por migration.

### 36.2 Ordem de release

Uma publicação que envolva schema deve seguir:

1. backup e verificação operacional;
2. migrations compatíveis;
3. testes SQL, RLS e advisors;
4. Edge Functions compatíveis;
5. frontend;
6. smoke tests de rotas e papéis;
7. monitoramento;
8. remoções somente em ciclo posterior.

Build bem-sucedido ou HTTP 200 isolado não comprovam que a versão está pronta. O artefato servido, as rotas, a integração com Supabase e as jornadas críticas devem ser verificados.

## 36.3 Fluxos de ponta a ponta

### FL-001 — Aquisição e criação da barbearia

1. O visitante acessa a landing comercial.
2. Consulta recursos, segurança, planos e perguntas frequentes.
3. Seleciona “Começar teste”.
4. Autentica-se por Google ou magic link.
5. Informa os dados mínimos da barbearia e aceita os documentos versionados.
6. O sistema cria barbearia, vínculo de proprietário e trial de 30 dias em operação atômica.
7. O proprietário recebe o checklist de configuração.
8. Após configurar dados, horários, serviços e profissional, revisa e compartilha a página pública.

**Exceções:** e-mail já vinculado, slug indisponível, cadastro incompleto, aceite ausente, falha transacional e identidade sem autoridade declarada.

### FL-002 — Agendamento do cliente

1. O cliente abre `/{slug}`.
2. Seleciona uma data possível.
3. Seleciona de um a três serviços e um profissional ou “Sem preferência”.
4. O sistema calcula horários usando a duração total.
5. O cliente escolhe um horário.
6. Se necessário, autentica-se; o rascunho é preservado.
7. Revê barbearia, data, serviços, profissional, duração e preço.
8. Confirma explicitamente.
9. O banco revalida tudo, aplica a quota e grava a reserva atomicamente.
10. O produto apresenta a confirmação e enfileira mensagens operacionais.

**Exceções:** slug indisponível, configuração insuficiente, sessão expirada, slot ocupado, profissional inativo, serviço inativo, quinta reserva ativa ou falha técnica. Nenhuma exceção deve cobrar o cliente ou criar reserva parcial.

### FL-003 — Cancelamento ou reagendamento pelo cliente

1. O cliente autentica e abre um atendimento próprio.
2. O sistema verifica estado, início e política comercial.
3. Para cancelar, apresenta consequência e solicita confirmação.
4. Para reagendar, mantém a reserva atual enquanto o cliente escolhe novo intervalo.
5. O backend confirma a ação de forma atômica.
6. A agenda e o histórico são atualizados e as partes recebem notificação operacional.

**Exceções:** atendimento de terceiro, estado terminal, prazo não permitido, novo slot ocupado ou sessão sem reautenticação necessária.

### FL-004 — Cadastro e acesso de profissional

1. Proprietário/gestor cria o cadastro operacional sem exigir acesso.
2. O sistema inicia o profissional ativo, sem acesso e com agenda herdada.
3. A gestão completa perfil, foto, comissão, pausas e disponibilidade.
4. Quando necessário, informa um e-mail de acesso separado e cria convite.
5. O profissional abre o link, autentica-se com o e-mail correspondente e aceita.
6. O sistema consome o convite uma única vez e cria/ativa o vínculo.
7. O profissional passa a acessar somente agenda, disponibilidade, notificações, perfil e conta permitidos.

**Exceções:** convite expirado, revogado, usado, e-mail divergente, papel não autorizado ou profissional de outro tenant.

### FL-005 — Operação do atendimento e comissão

1. Atendimento `scheduled` aparece na agenda dos atores permitidos.
2. Profissional atribuído ou gestão confirma o atendimento.
3. Profissional atribuído ou gestão conclui ou registra no-show; somente a gestão pode cancelar.
4. Ao concluir, o banco cria uma comissão pendente com snapshots.
5. Proprietário/gestor confere o relatório e marca o repasse como pago.
6. O sistema registra ator, instante e auditoria.

**Exceções:** transição inválida, profissional não atribuído, tenant diferente, comissão duplicada ou tentativa de reabrir lançamento pago.

### FL-006 — Inativação de profissional

1. A gestão abre a ficha e solicita inativação.
2. O sistema consulta compromissos futuros ativos e mostra a consequência.
3. A gestão confirma.
4. O backend inativa cadastro e vínculo, revoga convites e bloqueia novas reservas.
5. Histórico e compromissos existentes permanecem intactos.
6. Havendo compromissos futuros, é criado alerta persistente de revisão.
7. Uma reativação posterior altera somente o cadastro; acesso continua inativo até ação separada.

### FL-007 — Contratação da assinatura SaaS

1. O proprietário consulta situação e catálogo.
2. Seleciona plano e parcelamento permitido.
3. Revê valor, duração, limite e termos versionados.
4. O backend cria pedido idempotente e checkout hospedado no Asaas.
5. O navegador retorna em estado “aguardando confirmação”.
6. Webhook autenticado ou conciliação confirma o pagamento.
7. O sistema cria o período e atualiza o acesso comercial.

**Exceções:** retorno sem webhook, evento duplicado, valor divergente, pedido expirado, reembolso ou indisponibilidade do provedor. Nenhuma delas deve conceder acesso sem confirmação autoritativa.

### FL-008 — Exercício de direitos do cliente

1. O cliente autentica-se e abre Privacidade.
2. Escolhe exportação, correção, revogação ou encerramento.
3. Ações sensíveis exigem reautenticação recente.
4. O sistema cria protocolo não enumerável.
5. Exportação retorna somente dados próprios; encerramento executa limpeza e anonimização na ordem segura.
6. O protocolo recebe resultado e instante, preservando somente auditoria necessária.

### FL-009 — Notificação transacional

1. Um evento de agenda é confirmado na transação.
2. O banco cria notificações internas e itens idempotentes de outbox.
3. O agendador chama o worker com HMAC, timestamp e nonce.
4. O worker reivindica um lote, envia pelo Resend e atualiza o resultado.
5. Falha recuperável volta ao ciclo com backoff; falha definitiva permanece observável.
6. A situação de entrega externa pode ser conciliada por webhook idempotente.

## 37. Estratégia de testes e critérios de aceite

### 37.1 Pirâmide de testes

- Unitários: normalização, cálculo, matriz visual, formatação e regras puras.
- Componentes: estados, acessibilidade, formulários e responsividade estrutural.
- Integração: chamadas Supabase, tratamento de erro e reconciliação.
- SQL: RLS, RPCs, triggers, concorrência e isolamento.
- E2E: jornadas completas por papel.
- Visual: comparação com referências em celular, tablet e desktop.
- Operacional: worker, e-mail, webhook, backup e restore em ambiente seguro.

### 37.2 Casos obrigatórios de segurança

- usuário de outra barbearia é negado em leitura e escrita;
- cliente só acessa os próprios dados;
- profissional só altera disponibilidade permitida e status dos próprios atendimentos;
- profissional não cancela nem faz `UPDATE` amplo em agendamento;
- gestor não acessa assinatura, dados fiscais ou convite de gestor;
- quinta reserva futura ativa falha sob concorrência;
- convite não pode ser reutilizado ou aceito por outro e-mail;
- redirect externo pós-login é recusado;
- função privilegiada não executa para `anon`;
- caminho de Storage de outro tenant é recusado;
- webhook repetido não duplica período, pagamento ou reembolso;
- retorno de checkout não concede acesso;
- exportação e exclusão só operam a identidade autenticada.

### 37.3 Jornadas E2E mínimas

1. landing → teste → login → cadastro inicial;
2. página pública → data → serviços/profissional → horário → login → confirmação;
3. cliente → próximos → cancelamento → histórico;
4. cliente → perfil → preferências → privacidade → exportação;
5. proprietário → configuração mínima → página pública disponível;
6. gestor → cadastrar profissional sem acesso → configurar agenda → convidar;
7. profissional → aceitar convite → ver agenda própria → concluir/no-show;
8. gestor → inativar profissional com compromisso futuro → revisar alerta → reativar sem acesso;
9. gestor → criar/inativar/reativar serviço;
10. gestor → filtros de agenda e CRM;
11. proprietário/gestor → seis relatórios → CSV → repasse;
12. proprietário → plano → checkout → webhook confirmado → período ativo;
13. assinatura expirada → fases de acesso e exportação;
14. notificação → outbox → envio → entrega/falha observável.

### 37.4 Aceite visual por tela

- corresponde à hierarquia da referência oficial;
- não possui overflow horizontal inesperado;
- CTA principal continua alcançável;
- conteúdo maior não quebra cartão, tabela ou botão;
- estados de carregamento, vazio, erro, sucesso e sem permissão foram exercitados;
- foco e teclado funcionam;
- celular, tablet e desktop oferecem a mesma capacidade;
- dados exibidos vêm da fonte real ou de fixture claramente isolada de teste.

## 38. Decisões obrigatórias antes dos módulos correspondentes

Esta especificação fixa a arquitetura e as regras centrais. Os itens abaixo exigem decisão de produto, comercial ou jurídica antes da implementação da parte afetada; não devem ser preenchidos por suposição de engenharia:

### Agenda e serviços

- antecedência máxima para reservar;
- antecedência mínima para cancelar e reagendar;
- política para atendimento muito próximo ou iniciado;
- limites de duração, preço e texto de serviço;
- regra determinística de atribuição em “Sem preferência”;
- destino e comunicação quando profissional é inativado com atendimento futuro;
- catálogo estruturado de motivos de bloqueio.

### Assinatura

- início e elegibilidade do trial;
- calendário de vigência;
- contratação durante trial;
- renovação;
- meios de pagamento;
- upgrade, downgrade e plano personalizado;
- proporcionalidade de reembolso;
- reserva de vaga por convite;
- permissões exatas dos dias 1–5.

### Jurídico e LGPD

- identidade legal da plataforma;
- definição contratual de controlador e operador;
- bases legais;
- canal e prazo de suporte/privacidade;
- encarregado ou canal equivalente;
- retenção por categoria;
- fornecedores e transferências internacionais;
- textos e versões dos documentos;
- política de cookies/analytics, caso sejam utilizados.

## 39. Fora do escopo fundador

Os seguintes recursos não devem ser presumidos como parte do produto sem uma especificação e aprovação próprias:

- associação entre profissional e serviços;
- marketplace entre barbearias;
- aplicativo nativo iOS/Android;
- WhatsApp Business API e campanhas automáticas;
- prontuário, informação de saúde ou biometria;
- estoque, caixa, emissão fiscal ou folha de pagamento;
- múltiplas unidades sob uma organização controladora;
- inteligência artificial para preço, agenda ou atendimento;
- novas métricas e gráficos além dos relatórios definidos;
- cobrança automática por profissional excedente;
- integração financeira diferente do provedor definido.

## 39.1 Matriz de rastreabilidade

| Necessidade de produto | Requisitos principais | Regras principais | Fluxo | Dados centrais |
|---|---|---|---|---|
| Converter uma barbearia interessada | RF-LP-001–007, RF-ON-001–004, RF-SA-001–003 | RN-060, RN-061 | FL-001 | barbershops, team_members, subscriptions, periods |
| Permitir reserva online segura | RF-PB-001–002, RF-AG-001–014 | RN-010–019 | FL-002 | services, professionals, hours, appointments, appointment_services |
| Cliente gerir a própria agenda | RF-CL-001–006 | RN-017, RN-018, RN-023 | FL-003 | customers, barbershop_customers, appointments |
| Operar atendimentos por papel | RF-GE-003–007 | RN-020–023 | FL-005 | appointments, team_members, audit_logs |
| Administrar clientes sem cruzar tenants | RF-CRM-001–006 | RN-001–004 | — | customers, barbershop_customers, appointments |
| Cadastrar e dar acesso à equipe | RF-EQ-001–012 | RN-031, RN-032, RN-035, RN-075 | FL-004 | professionals, team_members, team_invitations, professional_hours |
| Inativar profissional sem perder histórico | RF-EQ-013–015 | RN-033, RN-034 | FL-006 | professionals, memberships, deactivation_reviews, appointments |
| Manter catálogo e horários | RF-BR-001–002, RF-HR-001–002, RF-SV-001–004 | RN-030–032 | — | barbershops, registration_details, business_hours, services |
| Calcular comissão e repasse | RF-CM-001–004 | RN-036–038 | FL-005 | commission_settings, appointment_commissions, audit_logs |
| Medir operação e resultado | RF-RL-001–005 | RN-040–043 | — | appointments, appointment_services, commissions, CRM |
| Comunicar eventos operacionais | RF-NT-001–006 | RN-050, RN-073, RN-075 | FL-009 | notifications, preferences, outbox, delivery_events |
| Registrar marketing opcional | RF-MK-001–003 | RN-050–053 | — | customer_consents |
| Cobrar a barbearia pelo SaaS | RF-SA-001–010 | RN-060–065, RN-075 | FL-007 | plans, subscriptions, orders, payments, webhooks, refunds |
| Atender direitos do cliente | RF-LG-001–005, RF-CL-007–010 | RN-070–072 | FL-008 | customers, consents, privacy_requests, audit_logs |
| Proteger dados e operação | RNF-MT-001, RNF-SEC-001–002, RNF-AUD-001, RNF-BKP-001 | RN-001, RN-073–075 | Todos | RLS, Vault, Storage, backups, logs |
| Garantir uso em celular, tablet e computador | RNF-RESP-001–002, RNF-ACC-001–003, RNF-COMP-001 | — | Todos | Componentes e contratos compartilhados |

## 39.2 Critérios para um item entrar em desenvolvimento

Um item derivado desta EFS só deve entrar em implementação quando possuir:

- identificador de requisito e regras relacionadas;
- ator e papel autorizados;
- fluxo feliz e fluxos de erro relevantes;
- dados de entrada, saída e origem autoritativa;
- impacto em tenant, RLS, grants, RPCs, triggers e Storage;
- necessidade de auditoria definida;
- impacto de privacidade e retenção quando tocar dados pessoais;
- estados de UI e comportamento para celular, tablet e computador;
- critérios de aceite verificáveis;
- testes negativos de autorização;
- tratamento de concorrência e idempotência quando aplicável;
- decisão prévia para qualquer ponto listado na seção 38.

## 39.3 Sequenciamento recomendado para construção do zero

### Fase A — Fundação segura

- projeto Next.js/TypeScript e ambientes;
- Supabase Auth e modelo de identidade;
- barbearias, vínculos e papéis;
- RLS, grants, auditoria e convenções de migrations;
- tokens, componentes, responsividade e acessibilidade;
- dados legais mínimos e aceite versionado.

**Saída verificável:** duas barbearias e quatro papéis de teste provam isolamento sem depender da interface.

### Fase B — Configuração e presença pública

- cadastro inicial e trial;
- dados da barbearia;
- horários;
- serviços;
- profissionais sem acesso;
- Storage de imagens;
- landing comercial e página pública.

**Saída verificável:** uma barbearia configura sua operação e publica catálogo sem expor dados privados.

### Fase C — Agendamento e área do cliente

- disponibilidade efetiva;
- fluxo em quatro etapas;
- autenticação com rascunho;
- reserva atômica e quota de quatro;
- agenda e perfil do cliente;
- cancelamento/reagendamento;
- consentimentos e notificações internas iniciais.

**Saída verificável:** cliente reserva, acompanha e cancela sem conflito, pagamento ou cruzamento de tenant.

### Fase D — Gestão V2 e equipe

- shell Início/Agenda/Clientes/Equipe/Mais;
- agenda operacional;
- CRM;
- ficha, comissão, acesso e convite;
- agenda herdada/personalizada;
- pausas, ausências, bloqueios;
- inativação e revisão persistente;
- self-service do profissional.

**Saída verificável:** proprietário, gestor e profissional operam um dia de agenda respeitando a matriz de papéis.

### Fase E — Relatórios e comunicação transacional

- comissões snapshot;
- seis relatórios e CSV;
- central de notificações;
- outbox, worker, e-mail e lembrete de 24h;
- monitoramento e procedimentos de falha.

**Saída verificável:** atendimento concluído aparece com os mesmos valores em histórico, comissão, relatório e exportação; mensagem é processada de forma idempotente.

### Fase F — Assinatura B2B e retenção

- catálogo versionado;
- central de assinatura;
- Asaas em ambiente de teste;
- pedido, checkout, webhook, conciliação, cancelamento e reembolso;
- fases de acesso pós-vigência;
- exportação do tenant e retenção.

**Saída verificável:** retorno de checkout não libera acesso; webhook confirmado cria um único período e a expiração aplica a matriz correta.

### Fase G — LGPD, continuidade e lançamento

- portal completo do titular;
- encerramento e anonimização;
- documentos jurídicos reais;
- política de retenção;
- backup, restore e incidente;
- E2E por papel e tenant;
- QA visual em celular, tablet e desktop;
- testes de segurança e operação;
- rollout e rollback.

**Saída verificável:** produto passa pelos critérios técnicos, funcionais, visuais, de segurança, continuidade e aprovação jurídica definidos nesta EFS.

## 40. Glossário

| Termo | Definição |
|---|---|
| Barbearia/tenant | Empresa isolada dentro do BarbeariaSP |
| Identidade | Usuário autenticado no Supabase Auth |
| Vínculo | Relação da identidade com uma barbearia e um papel |
| Cliente | Titular que agenda serviços |
| Profissional | Pessoa operacional cadastrada para realizar atendimentos |
| Snapshot | Cópia imutável de valor histórico no momento do evento |
| Horário efetivo | Interseção de horários da barbearia, profissional, pausas, bloqueios e reservas |
| Reserva futura ativa | Agendamento futuro em `scheduled` |
| Outbox | Fila transacional persistida antes de integração externa |
| RLS | Políticas de segurança por linha do PostgreSQL |
| RPC | Operação de banco invocável com contrato controlado |
| Trial | Período de teste gratuito sem cobrança automática |
| Período de assinatura | Intervalo que concede acesso comercial confirmado |
| Anonimização | Remoção ou transformação irreversível de identificadores pessoais conforme finalidade e lei |

## 41. Regra de governança da especificação

Este documento é a fonte única de especificação para a construção do BarbeariaSP. Todo requisito necessário de design visual, arquitetura, segurança, cobrança, notificações e operação deve estar registrado aqui. Registros auxiliares de execução e evidências de teste não criam regras adicionais de produto.

Uma mudança funcional relevante deve ser registrada antes da implementação com:

1. problema que motiva a mudança;
2. nova regra proposta;
3. benefício para o usuário;
4. impacto no frontend, banco, Supabase, autenticação e segurança;
5. impacto nos dados;
6. migrations, RPCs, RLS e integrações necessárias;
7. riscos e casos especiais;
8. aprovação do responsável do produto.

Quando uma decisão aprovada substituir uma regra deste documento, todas as seções afetadas desta EFS devem ser atualizadas no mesmo ciclo, mantendo rastreabilidade no Git.

## 42. Especificação visual integral

### 42.1 Autoridade e aplicação

A construção deve reproduzir a linguagem editorial de Clientes em toda a gestão: cabeçalho claro, título serifado, conteúdo marfim, cartões brancos, bordas discretas e ação principal terracota. A referência é obrigatória para composição e hierarquia, inclusive nos relatórios. Novos fluxos precisam manter essa linguagem.

Precedência: decisão explícita mais recente do responsável → experiência de produto aprovada → contrato visual desta EFS → demais requisitos desta EFS. Uma incompatibilidade deve ser resolvida por decisão documentada, sem alteração silenciosa de regra funcional ou de segurança.

Não usar cabeçalho preto na gestão nem botão preto como padrão de salvar. O botão de autenticação Google pode usar tratamento escuro próprio. Não introduzir a variante verde/oliva como tema alternativo. Imagens devem ser fotografias e ativos reais aprovados; emojis e desenhos improvisados não substituem fotografia ou ícones funcionais.

### 42.2 Tokens de cor

| Token | Valor de referência | Aplicação |
|---|---|---|
| canvas | `#F7F3EC` | Fundo geral marfim |
| surface | `#FFFDFC` | Cartões e formulários |
| surface-muted | `#F1ECE5` | Regiões secundárias e abas inativas |
| ink | `#201915` | Títulos e texto forte |
| text | `#514941` | Corpo |
| text-muted | `#857A70` | Metadados; ajustar contraste quando necessário |
| accent | `#C85A35` | Ações principais e seleção |
| accent-dark | `#7B321D` | Pressionado/hover e combinações de maior contraste |
| accent-soft | `#F8E7DF` | Seleção suave |
| success | `#4D7C45` | Confirmação/ativo |
| success-soft | `#EEF5E9` | Fundo de sucesso |
| warning | `#A46522` | Atenção |
| danger | `#B94C3B` | Erro e ação destrutiva |
| border | `#E4DDD3` | Divisores e cartões |
| border-strong | `#CBBFB2` | Campos |
| overlay | `rgba(12,9,7,0.58)` | Sobre fotografia |

Esses valores são referência de identidade. O contraste final deve ser medido: texto normal ao menos 4,5:1; texto grande e elementos gráficos essenciais ao menos 3:1, conforme WCAG. Ajustar o tom dentro da mesma família quando o par não passar. Opacidade não pode tornar texto essencial ilegível.

### 42.3 Tipografia e dimensões

| Elemento | Regra |
|---|---|
| Fonte editorial | Georgia, com fallback serifado; marca, títulos e destaques editoriais |
| Fonte funcional | Arial, com fallback sans-serif; corpo, navegação, botões e campos |
| Hero comercial | 36–48 px no celular; 52–72 px no desktop; entrelinha 1,05–1,15 |
| Título de tela | 28–36 px; entrelinha 1,1–1,2 |
| Título de seção | 20–24 px |
| Corpo | 15–16 px na aplicação; 16–18 px na landing; entrelinha 1,45–1,65 |
| Metadados | 12–14 px; não reduzir números para acomodar largura inadequada |
| Eyebrow | 11–12 px, caixa alta, peso 700, tracking aproximado 0,1 em |
| Campo móvel | Texto de 16 px para evitar zoom automático de formulário |

Espaçamentos: escala de 4, 8, 12, 16, 20, 24, 32, 40, 48 e 64 px. Margens móveis de 16–20 px; intervalos entre seções de 24–32 px; cartões com padding 14–18 px e distância 10–14 px. App bar de 56–64 px; navegação inferior de 64–72 px mais safe area; hero de acesso de 180–240 px.

Raios: 6 px em controles compactos, 10 px em campos/botões, 10–14 px em cartões, 14–20 px em painéis e circular nos avatares. Bordas de 1 px; selecionado pode usar 2 px sem alterar a geometria externa. Sombras discretas: cartão `0 6px 20px rgba(42,30,20,.06)`; painel `0 12px 36px rgba(42,30,20,.10)`; barra aderente `0 -8px 24px rgba(42,30,20,.08)`.

### 42.4 Biblioteca de componentes

| Componente | Contrato de apresentação e interação |
|---|---|
| App bar | Voltar à esquerda, título/contexto, ações à direita; clara na gestão; nomes acessíveis |
| Hero | Foto sem distorção, overlay, marca e texto legível; enquadramento preserva o assunto |
| Botão primário | Terracota, texto contrastante, altura 48–52 px, largura total no celular quando ação principal |
| Botão secundário | Superfície branca/transparente, borda discreta, mesma área de toque |
| Botão destrutivo | Danger somente na ação de risco; consequência e alternativa segura visíveis |
| Campo | Label acima, altura 44–48 px, padding 12–14 px, ajuda/erro abaixo, valor preservado em falha |
| Checkbox/radio | Marca visual de 20–24 px dentro de área de toque de 44 px; texto clicável associado |
| Switch | Controle semântico com `aria-checked`, rótulo e texto de situação |
| Card | Fundo claro, borda e hierarquia título→valor→metadados; ação interna separada de clique no card |
| Chip de status | Texto obrigatório; cor e ícone complementares; sem usar cor isolada |
| Filtro de datas | De/Até e Aplicar/Limpar; empilhar se os controles não couberem com largura útil |
| Tabela responsiva | Tabela semântica desktop; cartão com rótulos mobile; uma fonte de dados |
| Modal/bottom sheet | Desktop 420–520 px; móvel dentro da altura útil; consequência, ação segura e confirmação |
| Skeleton | Mesma geometria aproximada do conteúdo; animação desativável por preferência de movimento |
| Mensagem | Erro junto ao campo/bloco; sucesso em faixa verde suave; anúncio por `aria-live` |
| Barra de ação | Aderente quando útil, sem cobrir campos, teclado, navegação ou última linha |

Diálogos contêm o foco e o devolvem ao acionador. Escape fecha quando seguro; durante operação irreversível, a interface informa o processamento e evita repetição. Hover não desloca layout. Foco usa anel visível de 2 px com afastamento de 2 px. Ícones decorativos usam `aria-hidden`; ações por ícone têm nome acessível. Uma única família de ícones lineares deve ser usada no produto; a escolha do pacote não cria novo recurso funcional.

### 42.5 Contrato visual das telas públicas e do cliente

Os códigos T identificam superfícies, não obrigam uma rota distinta por superfície. Detalhes, preferências e confirmações podem ocupar seções do contexto principal, preservando a rota definida na seção 7.

| ID e superfície | Composição, ordem e controles | Estados e navegação |
|---|---|---|
| T01 Página pública | Hero; nome serifado; endereço; descrição; Agendar horário; WhatsApp/Como chegar; serviços; equipe; horários; contato; navegação inferior | Sem foto usa fallback contido; ausência de dado oculta ação impossível; catálogo sem capacidade explica indisponibilidade; até tablet preserva a composição de uma coluna; em desktop, hero em duas colunas — foto e conteúdo — e seções em contêiner de 900–1100 px, sem centralizar uma tela de celular |
| T02 Data | Hero compacto; título Escolha a data; stepper de quatro etapas; calendário mensal de sete colunas; anterior/próximo; legenda; Continuar/Voltar | Selecionado terracota e indicação semântica; hoje distinguível; indisponível não acionável; erro mantém mês e permite tentar novamente |
| T03 Serviços/profissional | Data com Alterar; lista de serviços com checkbox, descrição, duração e preço; contador n/3; soma de duração/preço; avatares e Sem preferência; Continuar | Máximo três; um profissional; seleção com check/anel; listas vazias com retorno; desktop permite seleção e resumo lado a lado |
| T04 Horário | Stepper; resumo de data, serviços, duração, preço e profissional; horários por manhã/tarde/noite; Revisar; Voltar | Grade móvel com até quatro colunas, cada toque ao menos 44 px; seleção textual/visual; nenhum slot não significa erro técnico; novas consultas preservam escolhas válidas |
| T05 Revisão | Resumo em linhas descritivas; identificação do cliente; e-mail somente leitura; total; Confirmar agendamento; Voltar | Confirmando bloqueia duplo envio; conflito retorna ao horário; autenticação restaura rascunho; sucesso só após retorno autoritativo |
| T06 Login cliente | Hero; Entre para confirmar; resumo da reserva; Google terracota; separador; e-mail; Receber link; aviso de acesso; Voltar ao agendamento | Loading separado por método; mensagem genérica de envio; erro sanitizado; callback volta à revisão sem criar reserva |
| T07 Confirmação | Saudação; faixa de sucesso; próximo agendamento destacado; data/serviços/profissional; atalhos agenda/perfil; navegação cliente | Sem próximo atendimento oferece Agendar; falha secundária não esconde a reserva confirmada |
| T08 Meus agendamentos | Hero compacto; título; abas Próximos/Histórico; cartões consistentes por agendamento; alternador contextual de histórico; Agendar novo horário; navegação | Vazios diferentes por aba; dados, preferências e privacidade ficam exclusivamente em Meu perfil; o histórico mostra somente os últimos 12 meses pela data do agendamento, inclui cancelamentos e não comparecimentos e carrega páginas de até 20 itens; status textual; cada reserva futura alterável oferece contato público, reagendamento e cancelamento; um vínculo abre sua página pública diretamente e múltiplos vínculos pedem escolha explícita, sem inferir a primeira barbearia |
| T09 Detalhe | Detalhe no contexto da agenda; status; data, serviços, profissional e valor; ações permitidas; confirmação de cancelamento com Manter/Confirmar | Confirmar usa a ação principal terracota; após cancelar permanece em Meus agendamentos, atualiza histórico e anuncia resultado; estados terminais não oferecem cancelamento/reagendamento da mesma reserva |
| T10 Meu perfil | Hero; dados pessoais; nome; e-mail somente leitura; telefone; Salvar; Minhas barbearias; preferências; privacidade; Voltar para agenda | Salvar desabilitado sem diferença; erro mantém edição; vínculo abre página pública correspondente |
| T11 Preferências | Explicação operacional versus marketing; switch BarbeariaSP; um switch por barbearia; Salvar preferências em terracota; acesso à privacidade | Alterações locais até salvar; erro parcial identifica escopo; nenhum switch inferido como aceito; confirmar descarte ao abandonar edição |
| T12 Privacidade | Resumo dos dados; Baixar JSON; protocolos e situação; bloco de risco Encerrar conta; aviso de privacidade; Voltar | Exportação em preparação/sucesso/erro; vazio de protocolos; confirmação com reautenticação; sem promessa de arquivo parcial ou exclusão incompatível com retenção |

Ao mudar a etapa de reserva, mover foco e viewport para o título da etapa, respeitando redução de movimento. Navegação inferior e barras aderentes devem reservar espaço no fim do conteúdo. A data, total e ação principal nunca ficam ocultos por recorte de imagem.

### 42.6 Landing, login e convites

| Superfície | Contrato visual |
|---|---|
| T13 Landing comercial | Header branco com marca e Entrar/Começar teste; hero escuro com placa BarbeariaSP visível; headline menor posicionada abaixo da placa; fotografia ocupa aproximadamente 75–90% da primeira dobra sem cortar ações; seções marfim/branco com títulos serifados, recursos, imagens de produto integrais, jornada, gestão, planos, segurança, FAQ e CTA final; rodapé com suporte/legal/Cullentech |
| T14 Login gestão | Marfim; fotografia quente e marca no topo; voltar à landing; card Acesse sua gestão; Google terracota; separador; e-mail; magic link contornado; acesso à área do cliente; desktop com formulário de 380–460 px e foto ampla |
| T15 Autenticação do convite | Hero compacto; identificação pública da barbearia e papel; destinatário mascarado sem sessão; Google/magic link; contexto de convite preservado com armazenamento restrito; identidade incorreta oferece Trocar conta |
| T16 Confirmação do vínculo | Resumo barbearia, papel e identidade autenticada; explicação do acesso; Aceitar convite e ação segura de sair/voltar; estados expirado/revogado/usado/inválido distintos; aceite confirma vínculo e leva ao destino autorizado |

Na landing, usar grades de 3–4 colunas em desktop, duas em tablet e uma em celular; CTAs empilhados no celular. Screenshots de apresentação devem usar proporção integral próxima de 853/1844, `height:auto` e `object-fit:contain`. Fotografia pode ser recortada para enquadramento; screenshot de produto não pode perder conteúdo interno. FAQ usa `aria-expanded` e teclado. Não criar links sem destino ou prova social fictícia.

### 42.7 Gestão e cadastros

| Superfície | Composição obrigatória | Operação e estado |
|---|---|---|
| Início | App bar clara; contexto da barbearia; título editorial; resumo do dia; próximos atendimentos; atalhos; alertas persistentes depois dos atalhos | Atalhos usam somente o título do destino, pois o card inteiro é acionável. Alerta de profissional inativo com futuro deve levar à agenda filtrada; Relatórios acessível daqui |
| Agenda | App bar; título Agenda sem rótulo editorial adicional; data/período; filtros; resumo “Agendamentos de hoje” expansível; agenda diária/semanal adaptada à largura; cards/lista de atendimentos; ações por papel. Sino de notificações e inicial da conta ficam agrupados no extremo direito do cabeçalho. | Tocar em “Agendamentos de hoje” revela/recolhe, logo abaixo, a lista cronológica do dia sem alterar período, data ou filtros selecionados; status vem do banco; proprietário/gestor operam as ações autorizadas e barber não vê Cancelar. |
| T17 Mais | Título Mais; descrição; lista vertical de linhas/cartões com ícone, título, subtítulo e chevron | Somente índice: Dados da barbearia, Serviços, Horários, Notificações, Relatórios, Assinatura e Acesso e segurança conforme papel; Equipe é destino principal; novos destinos devem ser empilhados, sem grade lateral. “Minha conta” não aparece para proprietário/gestor por duplicar dados empresariais. |
| T18 Dados da barbearia | App bar; retorno explícito para Mais no celular; Perfil público; título; subtítulo “Cadastre as informações que seus clientes consultam sobre a barbearia.”; área “Foto da barbearia” com foto persistida ou iniciais visíveis e prévia da nova seleção no mesmo círculo; foto circular sem distorção; formulário único; Salvar terracota; card secundário de visualização pública | Link público com copiar, testar WhatsApp e mapa; preview e descarte de foto; falha de carregamento usa iniciais sem apagar a referência; upload falho preserva anterior; seção fiscal só owner |
| T19 Horários da barbearia | Disponibilidade; título; sete blocos verticais independentes; aberto/fechado, início/fim; explicação de herança; Salvar | Domingo independente; sem carrossel de dias; dia fechado com horários nulos; erro conserva edição; salvamento verifica semana inteira |
| Equipe/lista | App bar; título Equipe; explicação de que é o espaço dedicado para gestão dos profissionais da barbearia; busca; filtros ativo/inativo; Novo profissional; cards com foto, nome, situação, modo de agenda e acesso | Sem equipe oferece cadastro; sem resultado oferece limpar; clique abre ficha; nenhum dado de login misturado ao contato; no celular, o último card permanece totalmente visível acima da navegação inferior |
| T20 Ficha profissional | Resumo com foto/nome/situação; seções progressivas Dados, Comissão, Agenda e disponibilidade, Acesso, Inativação | Resumos legíveis antes de expandir; comissão e acesso conforme papel; alerta futuro persistente; reativação explica que acesso segue inativo |
| T21 Novo profissional | App bar; Equipe; foto opcional; nome obrigatório; telefone e e-mail de contato opcionais; resumo Agenda da barbearia; Salvar profissional | Após salvar abre ficha; convite é ação posterior; falha de foto/convite não apaga cadastro; não solicitar senha |
| T22 Disponibilidade | Chip de identidade; seletor Agenda da barbearia/Personalizada; resumo efetivo; sete dias verticais no modo custom; pausas; ausências/bloqueios | Pausas nos dois modos; custom fora do horário da loja bloqueado; trocar para herdado conserva configuração; confirmar descarte de edição |
| Acesso e segurança | App bar; título; cartão de identidade com método de entrada e e-mail associado; cartão de proteção | Não exibe dados cadastrais da empresa, senha, hash, token, sessão, convite ou controles de transferência de titularidade; Google orienta recuperação no próprio Google; link seguro informa que futura troca de e-mail exigirá confirmação protegida. |
| T30 Serviços | Retorno explícito para Mais no celular; Catálogo; título; Novo serviço terracota arredondado; abas Ativos/Inativos; cards nome/duração/preço/status | Card abre edição; vazio por aba; sem exclusão definitiva; navegação Mais selecionada |
| T31 Serviço novo/editar | Formulário de uma coluna: nome, preço BRL, duração, descrição; status; Salvar terracota; Inativar contornado ou Reativar | Criação não exibe inativação; confirmação informa efeito em novas reservas; snapshots existentes permanecem |
| T32 Clientes | App bar clara; título serifado Clientes, sem rótulo ou subtítulo editorial adicional; busca Nome, e-mail ou WhatsApp; De/Até; Aplicar/Limpar; três métricas; lista de cards | O cartão de busca usa dimensões visuais proporcionais aos cartões de métricas; cards: avatar/iniciais, nome, telefone, agendamentos, valor concluído, última data, WhatsApp e abrir ficha; valor monetário não quebra no meio; base vazia, filtro vazio e erro distintos |
| Ficha cliente | Cabeçalho com identidade; contatos; resumo do relacionamento; próximos e histórico; retorno à lista filtrada | Só dados daquele tenant; WhatsApp por ação explícita; sem campos de saúde/anotações sensíveis |
| Notificações | App bar com retorno explícito para Mais no celular; título; Não lidas antes de Histórico; abas claras com seleção terracota/amarronzada sólida; lista cronológica de no máximo 100 notificações dos últimos 45 dias; marcar individual/todas; acesso separado a preferências dentro do módulo | Estado não lido textual; vazio/erro distintos; marcar lida não navega inesperadamente; preferências exibem quatro eventos configuráveis; dados técnicos de entrega de e-mail não aparecem na gestão da barbearia |
| Minha conta | Identidade da sessão; papel e barbearia; preferências pessoais; perfil próprio permitido; Sair | Não permite alterar vínculo, papel ou e-mail administrativo por formulário genérico |

T32 define o padrão de todas as telas de gestão. Não reduzir a tipografia para encaixar métricas: reorganizar grade ou empilhar. A navegação móvel principal cabe em cinco itens sem rolagem horizontal.

### 42.8 Relatórios no mesmo design

| Superfície | Composição |
|---|---|
| T23 Entrada da central | App bar Relatórios; título Relatórios; filtros comuns; navegação para as seis visões; resumo descritivo; não cria sétimo conjunto de fórmulas. Não exibe na abertura texto metodológico de receita e ticket. |
| T24 Visão geral | De/Até e profissional; métricas em grade 2×2 quando couber; receita, ticket, comissões e após comissões; bloco agenda/clientes; cancelamentos/no-show. Somente o texto “Ver detalhes” expande Faturamento, Cancelamentos, Não compareceu e Clientes no mesmo contexto ou leva Agendamentos e Comissões à respectiva aba, sem perder filtros. O bloco Clientes e recorrência inclui “Sem retorno +45 dias”, que abre o segmento correspondente em Clientes. Exportar CSV fica ao fim do conteúdo, no padrão terracota. A evolução diária mostra sempre os últimos sete dias do período aplicado, preenchendo dias sem atendimento com zero. Atalhos de Hoje, Esta semana, Este mês e Últimos 30 dias ficam em uma única linha, com rótulos compactos; o último pode quebrar somente entre “Últimos” e “30 dias”, sem rolagem horizontal. |
| T25 Equipe | Cards por profissional com avatar, nome, situação, concluídos, receita, ticket, ocupação textual/barra e comissões; tabela comparável no desktop |
| T26 Serviços | Total do período; nome, quantidade concluída, receita, preço médio, participação e minutos por serviço; participação também em texto |
| T27 Clientes | Dois segmentos: “Clientes no período” mantém a base elegível com nome, visitas, valor, última/próxima reserva quando houver e Novo/Recorrente; “Sem retorno +45 dias” lista somente cliente com pelo menos um atendimento `completed`, última conclusão anterior a 45 dias da data de referência e nenhuma reserva futura ativa (`scheduled` ou legado `confirmed`) na barbearia. O segundo segmento mostra contato autorizado, última conclusão, dias sem retorno, quantidade/valor histórico e tipos de atendimento concluídos. Cancelamento e no-show não contam como retorno. Quando houver filtro por profissional, o histórico concluído respeita esse profissional, mas qualquer reserva ativa futura da barbearia exclui o cliente. |
| T28 Agendamentos | Filtros; total; cards por data/hora, cliente, serviços, profissional, valor e status; contato autorizado; paginação |
| T29 Comissões | O seletor comum de profissional filtra a visão. A aba abre com totais de comissão, pendente, paga e quantidade de lançamentos para todos ou para o profissional selecionado. Somente o texto “Ver detalhes” revela a tabela/cards com data, profissional, serviço, base, percentual, valor, situação e ação; nova ação recolhe. A confirmação antes de marcar paga é obrigatória. |

Todas as visões usam uma camada única de dados, os filtros da seção 22 e CSV equivalente. Zero só representa resultado de consulta bem-sucedida. Em falha, exibir indisponível e Tentar novamente. Barras não introduzem novas métricas. Filtros continuam acessíveis em celular sem rolagem horizontal.

### 42.9 Central de assinatura

| Tela | Composição e ações |
|---|---|
| T33 Central da assinatura | App bar clara; título Assinatura; situação e vigência da assinatura atual; três cartões verticais: Cobranças, Meus dados e Cancelamento. A própria tela de entrada já é a Visão geral, portanto ela não se repete como cartão. Cada cartão abre sua seção sem perder contexto. Não há catálogo comercial, comparação de planos, preço, parcelas, limites ou aceite nesta área. |
| Visão geral | Situação atual e vigência; aviso operacional de pendência quando existir; link discreto para a landing pública quando a pessoa quiser conhecer outros planos. |
| Cobranças | Histórico com pedido, data, total, situação financeira e referência permitida; zero registros somente após consulta bem-sucedida; erro e situação desconhecida distintos. |
| Meus dados | Solicitação de arquivo dos dados operacionais autorizados da barbearia e situação do arquivo quando disponível. Não se confunde com dados de conta, perfil público, sessão ou preferências pessoais, que ficam nas áreas próprias de Mais. Sem cronologia extensa das regras de assinatura; privacidade e prazos aplicáveis devem ter linguagem resumida e direcionamento para os documentos/atendimento adequados. |
| Cancelamento | Exibir primeiro a intenção padrão de renovação automática e, abaixo, não renovar ao final; a escolha não pode afirmar nem alterar uma configuração financeira antes de confirmação autoritativa. Exibir também um card separado de cancelamento imediato, com acesso à landing de benefícios. Uma futura mutação exige confirmação explícita, nova autenticação, registro auditável e confirmação/conciliação do provedor. |
| Landing pública `/#planos` | Catálogo comercial, comparação de planos, duração, preços, parcelas, limites, contratação, termos, checkout e demais regras comerciais da assinatura. |

Todas as telas da central usam app bar clara, títulos serifados, cartões brancos e terracota; não usam bloco preto de abas. Na entrada da central, o retorno editorial grande leva a Mais e o retorno compacto da app bar fica oculto para não duplicar a ação; nas subseções, o retorno compacto leva à central de Assinatura. Profissional/gestor sem autorização recebe orientação para procurar o proprietário, sem dados financeiros. Datas de tela são apresentação de valores autoritativos. As rotas históricas de painel para planos e contratação devem redirecionar para `/#planos`, sem apresentar catálogo dentro da gestão.

### 42.10 Aceite visual independente de outro documento

Para cada superfície desta seção, verificar estrutura, ordem, cores, tipografia, dimensões, estados e ações descritos aqui em 390×844, tablet e desktop; incluir 320 px para reflow. Testar nomes extensos, valores grandes, ausência de foto, teclado virtual, zoom e dados vazios. O aceite exige equivalência funcional entre dispositivos e aplicação consistente dos tokens. Comparação com imagens aprovadas pode complementar a conferência, mas nenhum requisito depende exclusivamente de ler outra especificação.

## 43. Contratos técnicos complementares de arquitetura e segurança

### 43.1 Organização e fontes de verdade

Separar componentes de apresentação, regras puras, acesso a dados e operações privilegiadas. O shell de gestão resolve contexto e navegação; módulos recebem o contexto validado e não deduzem autorização de segmentos da URL. Um módulo compartilhado inicializa o cliente público Supabase após validar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Falta de configuração gera erro seguro.

Páginas comerciais e catálogo público podem usar renderização apropriada a SEO. Páginas privadas não devem compartilhar cache entre usuários ou tenants. Troca de conta deve limpar dados e subscriptions Realtime do contexto anterior. Toda mutação confirma a identidade e vínculo atuais no backend.

O pacote Node standalone deve incluir servidor, manifesto necessário, `public/` e `.next/static/`. A otimização remota de imagens permite somente a origem Supabase configurada e os caminhos públicos autorizados. Chaves administrativas de Supabase, Resend e pagamento ficam nas funções privilegiadas/Vault, não no servidor de apresentação.

### 43.2 Matriz de acesso aos domínios de dados

| Domínio | Visitante | Cliente | Profissional | Gestor/proprietário | Backend privilegiado |
|---|---|---|---|---|---|
| Catálogo público | Projeção mínima ativa | Igual ao público | Igual ao público | Dados operacionais do tenant | Somente tarefa autorizada |
| Agendamentos | Sem SELECT direto | Próprios | Atribuídos | Tenant | Tarefa autorizada |
| Clientes/CRM | Nenhum | Próprio perfil/relações | Sem CRM geral | Clientes relacionados ao tenant | Direitos do titular/rotina autorizada |
| Equipe/convites | Detalhe mascarado por token válido | Sem administração | Próprio vínculo | Gestor administra barber; owner administra papéis administrativos | Entrega/aceite controlados |
| Fiscal/assinatura | Nenhum | Nenhum | Nenhum | Somente owner | Integração financeira autorizada |
| Comissão/preferências operacionais | Nenhum | Sem comissão | Próprias preferências | RPC autorizada de comissão; preferências próprias | Processamento controlado |
| Notificação interna | Nenhum | Destinatário | Destinatário | Destinatário | Criação por evento |
| Outbox/segredos/nonces | Nenhum | Nenhum | Nenhum | Monitor reduzido owner/manager, sem segredo | Funções específicas |
| Auditoria | Nenhum | Próprio protocolo, não auditoria interna | Nenhum | Leitura interna somente owner | Registro controlado |

Uma tabela com RLS e sem policy pode ser intencional quando nenhum usuário recebe grants diretos e o acesso ocorre por RPC validada. Não adicionar policy permissiva para eliminar aviso de ferramenta.

### 43.3 Invariantes relacionais

Chaves e validações devem impedir associar serviço, profissional, membro, comissão ou pedido a tenant diferente do agendamento/contrato. Usar referências compostas quando apropriado. Constraint de exclusão por profissional e intervalo semiaberto `[starts_at, ends_at)` deve proteger conflito; o término de um compromisso pode coincidir com o início de outro. A grade de 10 minutos não representa intervalo de limpeza adicional.

Serializar quota por cliente/barbearia e limite de ativos por barbearia. Contar sob lock na mesma transação que grava. Atualizar perfil não permite modificar owner, papel, tenant ou identidade Auth. Operações de horário devem salvar conjunto consistente e impedir perda de edição concorrente por versão ou verificação de atualização.

### 43.4 Funções públicas excepcionais

Disponibilidade e detalhe mascarado de convite podem ser executáveis por visitante apenas com payload mínimo, validações e grants específicos. Essa exceção não se aplica às RPCs administrativas `SECURITY DEFINER`. O detalhe público de convite nunca devolve e-mail completo; o destinatário autenticado correspondente pode ver sua própria identificação completa. Convite tem validade de sete dias e consumo único sob lock; reenvio revoga a referência anterior.

Tokens de convite são segredos de posse: não enviar para analytics, não registrar em logs e retirar da URL visível quando houver mecanismo seguro para preservar o fluxo. Nome/e-mail sugeridos pelo provedor de login não concedem papel. Autenticação por senha, MFA obrigatório e logout global exigem definição própria antes de acrescentar fluxos; Google e magic link são os métodos aqui especificados.

### 43.5 Dependências e verificação

Fixar versões reproduzíveis por lockfile e imports exatos de Edge Functions; revisar vulnerabilidades de runtime separadamente de ferramentas de desenvolvimento. Executar testes RLS com duas barbearias e papéis distintos, incluindo chamada direta à Data API. Testar função como visitante, usuário sem vínculo, vínculo inativo, papel insuficiente e ator válido. Secret scanning deve abranger código, artefato publicado, logs de teste e histórico versionado sem imprimir o segredo encontrado.

## 44. Contrato financeiro completo da assinatura B2B

### 44.1 Compra, parcelas e estados separados

O valor do catálogo compra o período inteiro. Anual em quatro parcelas compra doze meses; conciliar cada parcela não concede mais doze meses. Uma assinatura interna pode possuir vários pedidos e períodos; uma compra antecipada parcelada não exige assinatura recorrente externa. Juros, reajustes, descontos e renovação automática não devem ser presumidos.

Separar os seguintes estados, mantendo o status original externo para diagnóstico:

| Dimensão | Estados internos de referência |
|---|---|
| Contrato | TRIAL, ACTIVE, ENDED, DATA_PURGED |
| Pedido | PENDING_PAYMENT, CONFIRMED, CANCELED, REVIEW_REQUIRED |
| Acesso derivado | FULL, GRACE_EXISTING_ONLY, RESTRICTED_EXPORT, SUSPENDED_PRESERVED, PURGED |
| Cancelamento | NONE, REQUESTED, SCHEDULED, EFFECTIVE |
| Pagamento | PENDING, CONFIRMED, RECEIVED, OVERDUE, CANCELED, PARTIALLY_REFUNDED, REFUNDED, DISPUTED |
| Reembolso | REQUESTED, PROCESSING, COMPLETED, FAILED, CANCELED |

Pedido pendente pode coexistir com trial ou período ativo; cancelamento programado pode coexistir com acesso integral. Indisponibilidade do Asaas não retira vigência local válida. Não pagamento de nova renovação não apaga o período anterior pago. Trial não reinicia por login, mudança de e-mail ou dados cadastrais.

### 44.2 Integração e eventos fora de ordem

Guardar identificadores de tenant, assinatura, pedido, período, conta do provedor e ambiente. Vincular cada ID externo ao objeto interno exato. Validar conta, ambiente, moeda e valor; referência conhecida não comprova autorização.

O receptor valida o mecanismo oficial de autenticação suportado pelo Asaas, limite de payload e ambiente. Persistir evento duravelmente antes de reconhecer recebimento; chave única composta por provedor, conta, ambiente e ID do evento. Processamento deve travar pedido/assinatura e garantir uma concessão por compra, mesmo quando eventos diferentes representam o mesmo pagamento.

Evento desconhecido ou vínculo inconsistente vai para revisão sem liberar acesso. Evento atrasado não pode regredir cegamente um pagamento recebido para pendente. Consultar o recurso externo para resolver divergência. Timeout de criação de cobrança ou estorno exige conciliação antes de repetir a chamada; deduplicar webhooks não elimina o risco de duplicar chamadas de saída.

### 44.3 Reembolso e contestação

Para antecipação, o cálculo conceitual é valor elegível × fração não utilizada. A unidade diária/mensal, frações, arredondamento, desconto e distribuição por cobrança devem ser definidos na seção 38. Registrar cálculo, base contratual, motivo, solicitante, operações externas e datas.

Não descontar tarifas automaticamente do direito de devolução. Guardar taxas, valor recebido, valor solicitado e valor efetivamente devolvido separadamente. Reembolsos anteriores e em processamento reduzem o saldo disponível para nova solicitação, impedindo exceder o valor elegível. Só reembolso COMPLETED integra o total devolvido; falha não apaga a obrigação.

Quando o arrependimento legal for aplicável, a política deve respeitar a devolução legalmente exigida; cálculo proporcional não substitui devolução integral devida. Trial não elimina direitos da contratação posterior. Chargeback, disputa, fraude e falha de parcela exigem política comercial/jurídica específica; não aplicar multa, negativação ou suspensão automática inventada.

Não renovação mantém acesso até o fim contratado. Encerramento antecipado com devolução define fim efetivo próprio; atraso do estorno não altera silenciosamente essa data. Não manter acesso ao período integral e devolver o mesmo período sem decisão expressa.

### 44.4 Conta financeira PF/PJ

O adaptador do provedor deve separar operações de cliente financeiro, cobrança/checkout, consulta, cancelamento, reembolso e normalização de eventos. A política de acesso permanece no domínio BarbeariaSP.

Uma troca de conta Asaas PF para PJ preserva IDs internos, contratos e períodos. Não pressupor que IDs externos, cartão, autorizações ou cobranças sejam transferíveis. Registrar nova conta e ambiente; direcionar novas compras em corte controlado; conciliar cobranças, parcelas, estornos e disputas antigas pela conta de origem. Nunca estornar objeto da conta antiga com credencial da nova. Recorrências, se aprovadas, podem exigir nova autorização. Desativar conta antiga somente após resolver obrigações e retenção.

### 44.5 Retenção e corrida com pagamento

Definir `access_ends_at` como fim exclusivo da vigência regular. A convenção exata dos dias das fases — períodos de 24 horas ou dias civis — deve ser aprovada na seção 38 e usada por banco, UI, contrato e testes. Jobs atualizam projeções, mas atraso de job não prolonga acesso; autorização deriva de datas no servidor.

Login, exportação, abertura de cobrança e pagamento pendente não reiniciam inatividade. Nova vigência confirmada interrompe o ciclo de expurgo. Imediatamente antes de eliminar, revalidar vigência, pagamento conciliado e retenção específica sob controle de concorrência. Compromisso futuro existente não prolonga carência e a página pública não revela inadimplência.

### 44.6 Exportação da barbearia

Disponível ao proprietário autorizado durante acesso integral e janela comercial de exportação. Deve incluir perfil operacional, serviços, profissionais ativos/inativos, horários, clientes relacionados, agenda com snapshots e relatórios/comissões autorizados. Formato estruturado interoperável com versão, nomes de campos, UTC/timezone e data de geração; CSV pode complementar tabelas.

Não exportar credenciais, tokens de convite, segredos, cartão ou informações de outro tenant. Arquivo deve possuir autorização e validade curta; não usar URL pública permanente. Pedido assíncrono tem protocolo e estados solicitado, processando, disponível, falhou e expirado. Definir prazo de retirada e regra para pedido iniciado antes do fim da janela e concluído depois. Direitos legais de titulares permanecem atendidos pelo canal de privacidade independentemente da janela comercial de 15 dias.

## 45. Contrato operacional completo de notificações

### 45.1 Preferências e conteúdo

Preferências são individuais por usuário/barbearia/evento interno e não alteram escolhas de outros membros. A central mostra histórico; a edição deve estar em uma seção claramente identificada de Preferências do módulo. Owner, gestor e profissional não recebem e-mail de agenda. O monitor técnico de entrega não é superfície da barbearia; permanece reservado a backend e a futura gestão de plataforma autorizada.

Os e-mails transacionais são exclusivos do cliente e usam o remetente `notificacoes@barbeariasp.cullentech.com.br`, com `Reply-To: nao-responda@barbeariasp.cullentech.com.br`. A hospedagem de e-mail deve rejeitar/descartar toda mensagem recebida em `nao-responda@...` e `notificacoes@...`; portanto, cliente nenhum deve conseguir transformar esses avisos em atendimento por e-mail. Cada mensagem deve conter nome do cliente, nome real da barbearia, data/hora em `America/Sao_Paulo`, serviço e profissional (com fallbacks seguros), além do rodapé: “Esta é uma mensagem automática. Não responda a este e-mail.”, link público canônico da própria barbearia, assinatura com o nome cadastrado da barbearia e, duas linhas abaixo, `BarbeariaSP`. Não incluir dados fiscais, comissão, notas internas, segredo de sessão ou links externos não confiáveis. Confirmar a reserva não depende do sucesso do e-mail.

### 45.2 Execução reproduzível

Um único executor periódico deve consumir a outbox: `pg_cron` a cada minuto → `pg_net` → Edge Function `process-notifications` → Resend. Execução manual deve usar o mesmo contrato de reivindicação e não criar um segundo consumidor sem lock.

Provisionar no Vault, por ambiente: `barbeariasp_project_url`, `barbeariasp_resend_api_key` e `barbeariasp_notification_cron_secret`. O helper de configuração valida presença e cria job único por nome sem URL/segredo hardcoded em migration. Obtenção de segredos é exclusiva de backend privilegiado; PUBLIC, anon e authenticated não têm EXECUTE.

Worker sem JWT de usuário exige autenticação servidor-servidor antes da conexão privilegiada: HMAC-SHA-256 sobre representação canônica compartilhada de timestamp, nonce e conteúdo da requisição, comparação segura, idade estritamente inferior a 300 segundos e consumo atômico do nonce. Worker de saúde deve usar proteção equivalente quando exposto. O nonce permanece registrado por tempo suficiente para não reabrir a janela de replay.

Reivindicar lote com lock e prazo de posse. Worker interrompido não deixa mensagem presa indefinidamente; item só volta a ser elegível depois do vencimento controlado do lock. Guardar tentativas, próxima tentativa, ID externo e código curto de erro. Definir limite de lote, timeout, quantidade máxima de tentativas e curva de backoff como parâmetros operacionais versionados antes de ativar o executor.

### 45.3 Entrega e diagnóstico

`sent` significa aceite pelo provedor, não entrega ao destinatário. Entrega, bounce, supressão e reclamação são estados do provedor e devem ser mostrados apenas quando confirmados. A recepção automática desses eventos é opcional, não deve ser confundida com requisito de campanha ou novo canal.

Diagnóstico: pending sem tentativas indica executor/cron/autenticação; failed exige examinar código sanitizado; sent sem recebimento exige consultar situação externa; 401 exige revisar assinatura/segredo, nunca removê-los. Evitar despejar payload externo em logs. Alertar sobre fila antiga, falhas consecutivas e ausência do executor; nunca usar dados de marketing para habilitar mensagem operacional.

## 46. Governança integral de dados e privacidade

### 46.1 Registro de tratamento e documentos públicos

Manter por finalidade: categoria de dados, origem, titular, controlador/operador, base legal, destinatários, transferência internacional, controles, retenção e descarte. O cadastro de uma barbearia não comprova por si só consentimento do cliente para marketing. Aceite de termos e ciência de privacidade não são consentimento genérico para todos os tratamentos.

O aviso público deve conter identificação legal da plataforma, papéis por tratamento, dados e fontes, finalidades/bases legais, compartilhamento, retenção, segurança em linguagem acessível, direitos, procedimento gratuito, canal, marketing opcional, cookies se usados, data e versão. Os termos devem conter elegibilidade, responsabilidades por atendimento presencial, dados e conteúdo, acesso por papel, assinatura, suporte, suspensão, encerramento, exportação, propriedade intelectual e relação com privacidade. Os termos devem também informar que a BarbeariaSP disponibiliza tecnologia de gestão e agendamento, mas não contrata, remunera, dirige, supervisiona ou controla os profissionais das barbearias; cada barbearia responde pela contratação, classificação, gestão, remuneração, encargos e obrigações trabalhistas, previdenciárias, fiscais e de segurança da própria equipe. Os contratos com barbearias devem definir instruções de tratamento, responsabilidades, suboperadores e cooperação em incidentes/direitos.

Nenhuma cláusula pode prometer “conformidade total” sem validação. Identidade legal, contato, retenção e termos são decisões reais a preencher na seção 38; não usar empresa, CNPJ ou canal fictício. Publicar aviso em `/privacidade`; disponibilizar termos e regras da assinatura em destinos públicos estáveis identificados na landing e no aceite.

### 46.2 Encerramento, vínculos operacionais e recuperação de falha

O fluxo de encerramento da conta de cliente não pode apagar uma identidade com responsabilidade operacional ativa como owner/manager/barber. Nessa situação, explicar a restrição, permitir os demais direitos e encaminhar a desvinculação administrativa por procedimento autorizado. Isso resolve a diferença entre apagar perfil de cliente e apagar uma identidade compartilhada com equipe.

Usar protocolo interno e etapas idempotentes para Storage, anonimização e Auth. Se a anonimização concluir e Auth falhar, registrar etapa exata e permitir retentativa controlada sem recriar PII ou repetir efeitos financeiros. Não anunciar encerramento integral antes de todas as etapas exigidas. Conta operacional não pode contornar essa proteção enviando outro `user_id`.

Anonimização deve considerar nome, telefone, e-mail, snapshots de contato, relação CRM, notificação, preferências, consentimentos e arquivos. Retenção de evidência de consentimento ou protocolo deve ter base e prazo específicos; “append-only” não significa guardar PII para sempre. Snapshots de serviço, valor, duração e profissional necessários à operação podem permanecer sem associação identificável ao cliente, respeitada política legal.

### 46.3 Matriz de retenção por categoria — proposta operacional a aprovar

Esta matriz traduz a decisão proposta de limitar a retenção identificável de agenda e CRM a 24 meses, contados da data do atendimento, com revisão mensal. Ela não cria ainda rotina automática, não altera dados existentes e não substitui validação jurídica, contábil ou municipal. “Controlador/operador” é indicativo e deve ser confirmado no contrato de tratamento: a barbearia tende a decidir o uso de dados do atendimento; a BarbeariaSP decide autonomamente dados da própria assinatura, segurança e cumprimento de obrigações próprias.

| Categoria e dados mínimos | Finalidade e papel indicativo | Prazo e marco inicial | Ação ao término | Exceções, segurança e estado |
|---|---|---|---|---|
| Conta do cliente: nome, e-mail, telefone, identificadores e arquivos próprios | Autenticação, perfil e reserva. BarbeariaSP controladora para a conta de plataforma; pode atuar como operadora para o atendimento da barbearia | Enquanto a conta estiver ativa. Após encerramento confirmado, aplicar imediatamente o fluxo de exclusão/anonimização; não aguardar 24 meses | Excluir arquivos pela API de Storage, revogar vínculos, preferências e consentimentos; anonimizar os registros operacionais preservados | LGPD, arts. 15–16. A exclusão não pode atingir identidade com vínculo operacional ativo de owner, gestor ou profissional. **Implementado para encerramento voluntário.** |
| Vínculo CRM cliente–barbearia e contatos operacionais | Relacionamento da barbearia com o cliente; barbearia controladora, BarbeariaSP operadora no fluxo de gestão | Até 24 meses após o último agendamento daquele vínculo, se não houver reserva futura ativa, solicitação de privacidade pendente ou outra base documentada | Excluir o vínculo e dados de contato específicos daquele tenant; não excluir a conta global se ainda usada em outra barbearia | A rotina deve ser tenant-isolada e não pode inferir vínculo entre barbearias. **Proposto; não automatizado.** |
| Agenda identificável: reserva, serviço, profissional, preço, status, nome, telefone, e-mail, observações e motivo de cancelamento | Execução do atendimento e relacionamento operacional; barbearia controladora, BarbeariaSP operadora | Até 24 meses após `starts_at`, incluindo `completed`, `cancelled` e `no_show`; revisão mensal em lote | Remover/anonimizar PII: IDs do cliente, nome, telefone, e-mail, observações e motivo de cancelamento. Não manter vínculo que permita reidentificação razoável | A janela visual de 12 meses é independente e não define descarte. Cancelamentos e no-show entram na mesma regra. **Proposto; não automatizado.** |
| Snapshot operacional anonimizado de agenda | Relatórios, comissões, estatística e integridade histórica | Após anonimização, somente enquanto houver finalidade operacional legítima, com revisão periódica pela plataforma | Preservar apenas data, status, serviço, duração, valor, profissional e comissão, sem identificador ou contato do cliente | Não pode ser combinado com outras bases para reidentificar o titular. **Parcialmente implementado no encerramento de conta; retenção por idade pendente.** |
| Comissões e repasses | Cálculo, conferência e histórico operacional da barbearia | Mesma janela de 24 meses para campos identificáveis do cliente; snapshot financeiro anonimizado segue a linha anterior | Anonimizar referência do cliente e preservar somente os elementos necessários ao cálculo e à auditoria operacional | Não é documento fiscal por si só. O vínculo com pagamento fiscal, se existir, deve seguir a categoria fiscal. **Proposto; não automatizado.** |
| Perfil da barbearia, owner, contrato SaaS, plano, pedidos, assinatura, cobrança e reembolso | Prestação e defesa do contrato B2B da BarbeariaSP; BarbeariaSP controladora | Pelo prazo contratual, fiscal e prescricional aplicável, contado do evento de encerramento/liquidação correspondente | Restringir acesso, arquivar ou eliminar/anonimizar o que exceder a obrigação aplicável | Não entra no expurgo geral de 24 meses. Integração financeira real ainda não está construída. **Prazo específico a validar com contador e jurídico.** |
| Documento fiscal da assinatura SaaS e escrituração correspondente | Obrigação tributária e prova fiscal da própria BarbeariaSP | Até a prescrição dos créditos tributários relacionados; como referência, o CTN prevê conservação até essa prescrição e há prazos tributários frequentes de cinco anos | Guardar o documento e dados estritamente necessários, em área segregada e de acesso restrito | ISS/NFS-e depende também da regra do município emissor. Nunca guardar cartão ou CVV. **Fora da retenção de agenda; validação fiscal obrigatória.** |
| Dados de pagamento e cartão | Cobrança de assinatura pela instituição de pagamento | BarbeariaSP não armazena PAN, CVV ou credenciais bancárias. IDs de transação ficam somente pelo prazo contratual/fiscal aplicável | Eliminar referências que excedam a finalidade; o dado de cartão permanece no provedor de pagamento | PCI-DSS é obrigação contratual/técnica do ecossistema, não justificativa para reter dados de agenda. **Integração financeira futura.** |
| Profissional, membro de equipe, convite, foto e agenda de trabalho | Gestão operacional interna da barbearia; barbearia controladora, BarbeariaSP operadora | Enquanto o vínculo operacional estiver ativo; após inativação, reter dados identificáveis somente pelo prazo estritamente necessário ao serviço e às obrigações da barbearia | Revogar acesso e apagar/anonimizar dados que não sustentem histórico operacional legítimo | A BarbeariaSP não contrata, remunera ou dirige profissionais da barbearia; os termos devem atribuir essas obrigações à barbearia sem prometer afastamento absoluto de vínculo por mera cláusula. **Prazo detalhado a validar.** |
| Consentimentos, preferências e revogações | Comprovar escolha do titular e respeitar canais | Enquanto a escolha estiver ativa e por período minimizado posterior necessário para demonstrar seu estado e atender direitos | Excluir/anonimizar PII do registro após o prazo definido, preservando no máximo evidência não identificável quando cabível | Ausência de consentimento não é consentimento. Não usar para marketing depois de revogação. **Prazo específico a validar.** |
| Solicitações de privacidade e protocolos | Atendimento de direitos, prova de execução e idempotência do fluxo | Pelo tempo necessário para concluir a solicitação e demonstrar seu atendimento em eventual questionamento | Anonimizar protocolo e evidências que deixarem de ser necessárias; nunca reintroduzir PII eliminada | Protocolo não autoriza guarda perpétua de dados pessoais. **Prazo específico a validar.** |
| Notificações internas | Comunicação operacional de equipe | Exclusão física diária após 45 dias de `created_at`, inclusive não lidas; interface limitada às 100 mais recentes da janela | Excluir fisicamente | Regra já instalada e isolada. **Implementado.** |
| Outbox e eventos técnicos terminais | Entrega e diagnóstico mínimo de mensagens | Exclusão física diária após 45 dias de `created_at`, apenas para itens `sent` ou `failed`; `pending` e `processing` não são apagados por idade | Excluir payload e registros terminais conforme a regra; investigar itens não terminais | Não exibir histórico técnico de e-mail ao usuário. **Implementado.** |
| Logs de acesso e segurança | Segurança, prevenção a abuso e cumprimento do Marco Civil quando aplicável | No mínimo seis meses para registros de acesso à aplicação abrangidos pelo art. 15 do Marco Civil; prazo maior somente por ordem judicial ou fundamento documentado | Excluir ou agregar após o prazo; manter acesso restrito e segregado da agenda | Log de acesso não autoriza guardar conteúdo de agenda ou PII excessiva. **Prazo técnico e fontes de log a inventariar.** |
| Tokens, convites e segredos de fluxo | Autorização e segurança | Token expira conforme o fluxo; hash/metadados devem ser limpos assim que não forem necessários para expiração, revogação, auditoria mínima ou prevenção a fraude | Excluir token/hash e minimizar metadados | Nunca armazenar token em texto claro, analytics ou logs. **Expiração de convite implementada; limpeza por idade a definir.** |
| Arquivos de exportação | Portabilidade e exportação operacional solicitada pelo titular/owner | Download imediato; a plataforma não mantém cópia do arquivo nem disponibiliza link persistente | Não persistir ou remover imediatamente após a entrega controlada | A barbearia que baixar dados torna-se responsável por protegê-los. **Implementado para exportação operacional.** |
| Backups e restauração | Continuidade, recuperação de desastre e segurança | Prazo, criptografia e RPO/RTO ainda devem ser definidos; exclusões/anonimizações precisam ser reaplicadas após restore | Expurgar cópias expiradas e reaplicar o registro de eliminações antes de reabrir acesso | Não alegar eliminação definitiva enquanto cópias de backup ainda estiverem dentro da janela técnica. **Não construído; depende de infraestrutura.** |

Princípios obrigatórios para a futura rotina mensal de 24 meses:

1. Executar no servidor, em lotes idempotentes e auditáveis, usando o fuso `America/Sao_Paulo` apenas para apresentação; o corte do banco usa `timestamptz` e `starts_at`.
2. Calcular o corte no primeiro dia de cada mês e tratar somente registros com `starts_at` anterior a 24 meses completos; não apagar reservas futuras, pendentes ou em processamento.
3. Separar exclusão de PII, anonimização de snapshot, exclusão de vínculo CRM e retenção fiscal; uma falha em uma etapa não pode deixar o registro parcialmente identificável sem rastreabilidade.
4. Aplicar RLS, privilégios mínimos e função privada; não expor execução ao navegador, `anon` ou `authenticated`.
5. Emitir aviso de exportação para a barbearia antes do encerramento definitivo do tenant, sem chamar o arquivo de backup ilimitado e sem prometer recuperação após o prazo.
6. Não aplicar o prazo de 24 meses a documento fiscal, cobrança B2B, log obrigatório, backup ou dado sujeito a obrigação específica sem a classificação e a validação correspondentes.

Retenção financeira não autoriza guardar toda a operação indefinidamente. Dados retidos devem ficar segregados e não restauram acesso à aplicação. Restore precisa reaplicar um registro de eliminações para não reintroduzir dados apagados. Cookies não essenciais/analytics, tratamento de menores e eventual decisão automatizada exigem definição jurídica própria antes de adicionar coleta ou funcionalidade.

## 47. Aceite da especificação única

| Caso | Dado | Quando | Resultado obrigatório |
|---|---|---|---|
| CT-U01 | Implementador recebe apenas esta EFS | Constrói tela de Clientes e demais módulos | Usa tokens, composição e estados da seção 42 sem consultar outro documento de produto |
| CT-U02 | Mesmo conjunto de dados | Abre celular, tablet e computador | Mesmo conteúdo funcional, cálculos e ações permitidas, com layout responsivo |
| CT-U03 | Duas barbearias | Usuário troca IDs em RPC/Data API/Storage | Backend nega acesso cruzado |
| CT-U04 | Quatro reservas futuras ativas | Cliente confirma quinta por RPC ou escrita direta | Quota recusa em ambos os caminhos, inclusive concorrentes |
| CT-U05 | Profissional atribuído | Confirma/conclui/no-show e depois tenta cancelar/alterar preço | Somente operações de status permitidas podem ocorrer |
| CT-U06 | Profissional com futuro e acesso ativo | Gestão inativa e depois reativa cadastro | Reservas preservadas, alerta persistente, acesso não reativado automaticamente |
| CT-U07 | Anual parcelado | Eventos de várias parcelas chegam duplicados ou fora de ordem | Uma compra e uma vigência, sem extensão por parcela |
| CT-U08 | Timeout externo | Criação de cobrança/estorno é repetida | Conciliação impede duplicação |
| CT-U09 | Expurgo próximo e pagamento confirmado | Rotinas concorrem | Revalidação impede apagar tenant com vigência válida |
| CT-U10 | Conta de cliente com vínculo administrativo | Solicita encerramento | Identidade operacional preservada; direitos alternativos e procedimento explicados |
| CT-U11 | Não houve consentimento de marketing | Reserva é criada | Reserva e notificações operacionais funcionam, marketing permanece desautorizado |
| CT-U12 | Falha de entrega de e-mail | Reserva já foi confirmada no banco | Reserva permanece válida; outbox registra falha recuperável |
| CT-U13 | Foto nova e gravação de referência falha | Upload precisa ser revertido | Foto antiga permanece; arquivo novo é limpo de forma autorizada |
| CT-U14 | Mesmo período e profissional | Relatório e CSV são gerados | Totais, registros, status e metodologia são equivalentes |

O documento de construção não deve remeter a outro Markdown para definir comportamento. Referências legais e documentação oficial de bibliotecas/provedores são fontes externas de verificação de contrato e API, não especificações complementares do produto. Decisões novas devem ser incorporadas nesta EFS antes da implementação correspondente.

## 48. Acompanhamento de construção, pendências e homologação

### 48.1 Finalidade e regra de leitura

Esta seção é o registro operacional atual do produto. As seções 1–47 permanecem como contrato normativo completo para construir, testar e operar o BarbeariaSP. A seção 48 não é diário de sessão nem fila automática de trabalho: registra somente o estado vigente, as evidências indispensáveis, as homologações confirmadas e a fila ativa escolhida pelo responsável.

Estados locais, remotos, publicados e homologados são independentes. Código ou teste aprovado não prova aplicação remota; aplicação remota não prova publicação; publicação não prova homologação. Decisões explícitas mais recentes do responsável prevalecem sobre registros anteriores consolidados aqui.

Registros intermediários superados — proposta, primeira implementação, ajuste e homologação do mesmo comportamento — são absorvidos pelo estado final. A ausência de um item antigo nesta síntese não revoga requisitos das seções 1–47, migrations, testes, homologações ou histórico do Git. Avisos de provedores só entram na fila ativa depois de investigação concreta; não geram novos “próximos passos” automaticamente.

### 48.2 Limites operacionais vigentes

- Checkout ativo: `C:\Users\calli\OneDrive\Documentos\Aplicativo barbearia\pagina barbearia\work\barbeariasp-platform`.
- O worktree contém muitas alterações locais intencionais e deve ser preservado. Não executar limpeza, reset, checkout destrutivo ou sobrescrita ampla.
- Não criar commit, push, branch, PR, merge, deploy, publicação, envio de e-mail ou alteração externa sem autorização explícita e específica.
- Supabase remoto, aplicação local, Resend, Hostinger e publicação são ambientes distintos.
- A versão atualmente hospedada foi publicada em 19/09/2026; uma nova publicação continua exigindo autorização explícita e verificação própria.
- A proteção do Supabase contra senhas vazadas permanece indisponível no plano Free e deve ser reavaliada somente se o plano mudar.
- Itens futuros como Asaas, WhatsApp Business API, campanhas, Gestão da Plataforma e revisão jurídica não entram na fila ativa sem escolha explícita do responsável.

### 48.3 Estado atual consolidado

| Área / referências | Construção e integração atuais | Validação e homologação preservadas | Estado / ação |
|---|---|---|
| Governança / §§1–48 | EFS consolidada como única especificação e registro operacional; documentos antigos não dirigem o trabalho | Diretriz confirmada pelo responsável; esta consolidação removeu o diário redundante sem alterar §§1–47 | **Vigente.** Atualizar apenas por mudança real de estado ou decisão aprovada |
| Página pública / §§7, 10–11, 23 | `/{slug}` abre nas informações da barbearia; agenda só abre por ação explícita, continuidade válida ou rascunho autenticado. Hero responsivo, um cartão “Endereço e contato”, telefone `tel:` somente se válido, rodapé BarbeariaSP ligado a `/`. Em assinatura vencida, agenda, WhatsApp e rota ficam indisponíveis; dados públicos e telefone permanecem | Responsável homologou localmente abertura inicial, remoção do bloco duplicado, contatos, assinatura vencida e link do rodapé em 15/09/2026 | **Homologado localmente.** Não implica publicação |
| Reserva e autenticação / §§7.4–7.5, 11 | Cliente informa nome e celular antes de Google ou Magic Link; rascunho expira e é revalidado; callback não cria reserva; confirmação final continua explícita. Cópia aprovada: “Faça login para seguir com seu agendamento.” e “Sua agenda é preservada enquanto você entra.” | AU-04 homologado localmente pelo responsável em 15/09/2026; teste dirigido 21/21, typecheck e diff aprovados nessa entrega | **Homologado localmente.** Preservar fluxo e granularidade de 10 minutos |
| Área do Cliente / §§12–13, 25 | Agenda, histórico, perfil, privacidade e navegação inferior contextual implementados; cabeçalho não duplica “Meu perfil”. Em 16/09/2026, os atalhos redundantes Meus dados, Preferências de comunicação e Privacidade e meus dados foram removidos da agenda; essas funções permanecem concentradas em Meu perfil. O histórico visível limita-se aos 12 meses anteriores pela data do agendamento, inclui cancelamentos e não comparecimentos e pagina em blocos de 20 sem excluir registros do banco. A página pública mostra navegação de Cliente somente para sessão exclusivamente de Cliente | Navegação e fluxos principais já homologados pelo responsável; remoção e contrato de histórico cobertos por teste de regressão. Em 16/09/2026, o responsável homologou localmente o limite visual de 12 meses e o carregamento paginado. Exportação, protocolos e encerramento possuem testes específicos registrados no código | **Construído e homologado localmente no escopo visual confirmado.** Não altera dados, preferências, privacidade ou rotas |
| Gestão e design / §§14–22, 32, T17–T30 | Navegação mobile usa Início, Agenda, Clientes, Equipe e Mais; superfícies próprias de dados, serviços, horários, notificações, relatórios e conta usam padrão terracota e retornos contextuais | Menus, Agenda, Mais e principais superfícies foram homologados em sessões locais; tablet/desktop ou papéis específicos só são pendência quando o responsável escolher nova rodada | **Construído com homologações parciais preservadas.** Não criar rodada automática |
| Equipe e profissional / §§18, 28 | Gestão V2, comissão, agenda herdada/personalizada, pausas, bloqueios, convites e inativação implementados. Migrations de Gestão V2 estão no remoto. `set_team_member_access` delega à revisão operacional segura por meio da migration local `20260915150000_reconcile_team_member_operational_status.sql`, registrada remotamente como `20260916005312_reconcile_team_member_operational_status` | Fixtures remotas com `ROLLBACK` provaram tenant, agenda, inativação, revisão de compromisso futuro e reativação explícita; zero resíduos após o teste. A experiência de gestão foi validada; perfil barbeiro permanece fora da fila até escolha explícita | **Aplicado e tecnicamente validado no remoto.** Prefixos local/remoto distintos são metadados do conector, não divergência |
| Agenda e assinatura vencida / §§12, 24.8 | Reserva nasce `scheduled`; owner/manager concluem, no-show ou cancelam; profissional atribuído conclui ou marca no-show. Após fim da vigência, novas reservas públicas bloqueiam imediatamente; gestão de compromissos existentes dura até cinco dias e depois a agenda fica restrita/mascarada | Migrations remotas de simplificação e expiração aplicadas; cenários de expiração/limite homologados pelo responsável conforme confirmação posterior | **Aplicado no remoto e homologado no escopo confirmado.** Não alterar a regra sem decisão nova |
| Notificações e e-mail / §23 | Central interna atende equipe; e-mails de agenda destinam-se somente ao Cliente. Worker preserva outbox, HMAC, idempotência e cópias aprovadas. Remetente previsto: `notificacoes@barbeariasp.cullentech.com.br`; endereços técnicos não são canal humano | Responsável validou em caixa de destinatário a confirmação e o cancelamento, com personalização, fuso, serviço, profissional, aviso automático, link e assinatura. Lembrete, evento técnico de reagendamento e bloqueio externo de recebimento não receberam homologação ponta a ponta nova | **Construído e parcialmente homologado.** As validações externas remanescentes só ocorrem por escolha explícita |
| Segurança e Data API / §§25.6, 28, 30 | Exposição automática de novas tabelas foi desativada; migrations recentes reforçaram RLS, grants e funções de Storage. Tabelas internas sem policy permanecem em negação por padrão: sem DML para `anon`/`authenticated`. As migrations locais `20260918170000`–`20260918190000`, aplicadas no remoto como `20260919010112`–`20260919010131`, restringem o catálogo autenticado a colunas públicas, deslocam cinco leituras sensíveis do painel para RPCs com privilégio mínimo e preservam operações de dono/gestor, inclusive reativação de profissional | Validação remota em 19/09/2026 confirmou grants por coluna, policies e as cinco RPCs `SECURITY DEFINER`: 58 funções fixam `search_path` vazio, nenhuma é executável por `anon` e 38 são executáveis por `authenticated` sob validação interna. Fixture two-tenant remota passou para estranho, owner, manager e barbeiro e terminou em `ROLLBACK`, sem usuários, lojas, profissionais ou vínculos residuais. Os quatro avisos `RLS Enabled No Policy` preservam negação por padrão; a proteção contra senhas vazadas não existe no plano Free | **Aplicado, tecnicamente validado no remoto e publicado na aplicação em 19/09/2026.** Homologação de fluxos reais permanece etapa separada |
| Proteção pública / §§23, 25.6, 30.3 | Migration local `20260915140000_public_booking_abuse_protection.sql` aplicada remotamente como `20260915211138_public_booking_abuse_protection`; Edge Function `public-booking-gateway` versão 1 ativa. Convites novos expiram em dois dias; calendário usa projeção de 42 dias; RPCs públicas protegidas ficam restritas ao serviço; rate limit usa origem confiável em hash e responde `429` | ACL remoto conferido; tabela de contadores com RLS e sem grants para `anon`/`authenticated`; reserva continua autenticada e limitada a quatro futuras por Cliente/barbearia. Testes dirigidos 36/36 e typecheck aprovados antes da aplicação | **Aplicado no remoto.** Homologação adicional de carga/`429` só entra na fila por escolha explícita |
| Privacidade e exportação / §25 | Direitos do Cliente, exportação, protocolos, consentimentos e encerramento possuem implementação e proteções de identidade. No encerramento, reservas futuras ativas são removidas; registros concluídos, cancelados, no-show ou já iniciados são anonimizados, preservando somente snapshots operacionais para histórico, relatórios e comissões. Exportação operacional da barbearia está integrada ao Supabase remoto e à aplicação hospedada | RPC owner-only homologada por transação com `ROLLBACK`; interface publicada em `/painel/assinatura/dados`. A migration local `20260916213000_preserve_anonymized_customer_appointment_history.sql` foi aplicada no remoto como `20260916235448_preserve_anonymized_customer_appointment_history`; a função confirmou `SECURITY DEFINER`, `search_path` vazio, sem execução para `anon` e execução somente para `authenticated`. Homologações de privacidade anteriores são preservadas; revisão jurídica continua decisão externa | **Construído e aplicado no remoto.** Jurídico somente quando o responsável escolher |
| Qualidade e migrations / §36 | Teste de linhagem inclui as migrations recentes de proteção pública, equipe, performance e retenção; migrations históricas não foram renomeadas ou reparadas. O script Windows de empacotamento passou a iniciar `npx.cmd` via `ComSpec`, compatível com Node 24 local sem alterar o Node 22 remoto. O teste de HTML de produção aguarda até 30 segundos pelo `next start`, mantendo as mesmas asserções de conteúdo | Rodada local após integrar A1/A2 e a invalidação de cache de sessão: 274/274 testes, typecheck, lint e build aprovados; build local gerou 37 rotas; `git diff --check` sem erros. As três migrations foram aplicadas e a fixture remota two-tenant passou com `ROLLBACK` e zero resíduos. O build Hostinger instalou 373 pacotes, auditou 374 sem vulnerabilidades conhecidas e gerou 37 rotas | **Código e schema validados, versionados na branch `codex/gestao-v2` e publicados em 19/09/2026.** Homologação de fluxos reais permanece pendente |
| Publicação / §§30, 34–35 | Versão completa da branch `codex/gestao-v2` publicada em `barbeariasp.cullentech.com.br` pelo build Hostinger `01a0b747-a103-72e0-8981-0f6da743bbe6`, em Node 22 | Build remoto concluído, 374 pacotes auditados sem vulnerabilidades conhecidas, 37 rotas geradas; cache limpo; landing respondeu HTTP 200 com título e marca BarbeariaSP, e `/api/health` respondeu HTTP 200 com `status: ok` | **Publicado em 19/09/2026.** A publicação não substitui homologação humana dos fluxos autenticados |

### 48.4 Evidências remotas que devem permanecer rastreáveis

As migrations recentes relevantes aparecem no remoto com prefixos atribuídos pelo conector, que podem diferir do arquivo local sem constituir erro. Não renomear migrations locais nem executar `migration repair` apenas por essa diferença.

- `20260914080833_customer_only_appointment_emails`;
- `20260916235448_preserve_anonymized_customer_appointment_history`;
- `20260914084133_enforce_subscription_expiry_agenda_access`;
- `20260914230625_prioritize_subscription_expiry_public_message`;
- `20260914233030_restore_customer_appointment_read_policy`;
- `20260914233420_restore_agenda_cutoff_policy_function_access`;
- `20260915111629_enable_rls_for_new_public_tables`;
- `20260915111729_revoke_default_data_api_grants`;
- `20260915114617_harden_storage_trigger_function_grants`;
- `20260915211138_public_booking_abuse_protection`;
- `20260916005312_reconcile_team_member_operational_status`;
- `20260916014849_optimize_deactivation_review_and_consent_policy`;
- `20260916014911_export_barbershop_operational_data`;
- `20260916015029_install_notification_retention`.
- `20260919010112_harden_tenant_catalog_grants`;
- `20260919010122_fix_professionals_select_policy`;
- `20260919010131_preserve_tenant_catalog_operations`.

Essas evidências registram aplicação de banco ou função, não publicação da aplicação. Fixtures remotas autorizadas usaram transação com `ROLLBACK` e não deixaram dados de teste no caso GE-26.

### 48.5 Inventário finito de lacunas de construção

Os itens técnicos encontrados na reconciliação foram aplicados e verificados no Supabase remoto. Não há lote de implementação ativo escolhido neste momento, mas as lacunas abaixo continuam registradas para que “fila vazia” não seja confundida com “EFS integralmente construída”.

| ID | Estado atual | O que falta para encerrar | Dependência que impede iniciar automaticamente |
|---|---|---|
| PERF-01 / §§28 e 36 | **Concluído no remoto.** `20260916014849_optimize_deactivation_review_and_consent_policy` instalou os dois índices de FK e o initPlan da policy sem reduzir autorização. Os três avisos originais desapareceram do Advisor; índices recém-criados aparecem apenas como informativos de uso ainda não observado | Nenhuma | Nenhuma |
| DATA-01 / §25 | **Concluído no remoto.** `20260916014911_export_barbershop_operational_data` instalou a RPC owner-only. `anon` e `public` não executam; `authenticated` executa. Homologação transacional com identidade owner retornou payload `1.0` com as áreas esperadas e terminou em `ROLLBACK` | Nenhuma | Nenhuma |
| RET-01 / §§24 e 28 | **Concluído no remoto.** A migration isolada `20260915170000_install_notification_retention.sql`, registrada remotamente como `20260916015029_install_notification_retention`, instalou somente índices, funções privadas e o cron diário `17 3 * * *`. As funções não têm execução para `anon`, `authenticated` ou `public`; execução inicial eliminou zero registros porque não havia dados expirados | Nenhuma | Nenhuma |
| BLD-01 / §§24 e 44 | **Não construído.** Trial, catálogo informativo, acesso pós-vigência e telas existem, mas não há integração financeira real | Pedido idempotente, checkout Asaas, webhook autenticado, conciliação, períodos pagos, cobrança, renovação, cancelamento, reembolso, disputa e limite contratual autoritativo de profissionais | Decisões comerciais da §24.9 e jurídica/contratual da §38; escolha explícita para integrar serviço financeiro |
| BLD-02 / §12.4 | **Construído, aplicado no remoto e homologado pelo responsável em 16/09/2026.** Política de antecedência mínima de duas horas bloqueia horários iniciados, passados ou próximos com orientação de WhatsApp; a RPC `reschedule_customer_appointment` trava a reserva original, cria a substituta pela validação normal de reserva e confirma o cancelamento somente na mesma transação. A migration local `20260916191502_add_atomic_customer_rescheduling.sql` foi registrada no remoto como `20260916224339_add_atomic_customer_rescheduling` | Suíte local 263/263 e typecheck aprovados; remoto confirmou `SECURITY INVOKER`, `search_path` vazio, sem `EXECUTE` para `anon`/`public` e com `EXECUTE` somente para `authenticated`. O responsável homologou: (1) reagendamento válido, com a reserva antiga no histórico como cancelada e a substituta agendada; (2) proteção contra conflito, pois slot já ocupado não é oferecido como disponível e a reserva original permanece ativa | Nenhuma. Reabrir somente diante de regressão concreta ou de nova regra comercial |
| BLD-03 / §§24.8, 35 e 46 | **Parcial.** Há janela pós-vigência, exportação, retenção de notificações e matriz de retenção por categoria preparada na §46.3; não há ainda ciclo automático de expurgo/anonimização de tenant após 60 dias | Aprovar a matriz, validar prazos fiscal/municipal e contratual, implementar rotina concorrente de expurgo, preservação legal mínima, aviso de exportação, cancelamento por vigência conciliada e reaplicação de exclusões em restore | Aprovação explícita da política e validação jurídica/contábil antes de operações destrutivas |
| OPS-01 / §§34–36 | **Não concluído para lançamento comercial.** Health básico e monitor de disponibilidade existem | Ambientes separados, backup criptografado, restore isolado testado, RPO/RTO, playbook de incidente e monitoramento independente de Auth, Storage, outbox, Edge Functions e jobs | Decisão de infraestrutura/produção e credenciais próprias de ambiente |
| FUT-01 / §§24.10–24.10.1 | **Evolução futura não construída.** Não existe painel interno nem recuperação assistida de titularidade | Gestão interna restrita, recuperação segura do proprietário, e-mail alternativo confirmado, dupla conferência, auditoria e contestação | Definição de papéis internos, evidência, suporte, rate limit e revisão jurídica |

Não há outra lacuna de construção confirmada fora desta tabela. As Edge Functions necessárias permanecem ativas e a versão completa foi publicada. Envio real, commit e push continuam fora do escopo sem autorização específica.

### 48.6 Itens deliberadamente adiados — não são pendências ativas

- proteção contra senhas vazadas enquanto o projeto permanecer no plano Supabase Free;
- WhatsApp Business API e campanhas;
- revisão jurídica final de Política de Privacidade, Termos e contratos;
- novas rodadas visuais de tablet, desktop ou perfil barbeiro;
- testes externos ou envios reais que dependam de autorização operacional.

Esses itens não devem ser sugeridos como “próximo passo” por simples leitura histórica. Só mudam de estado quando o responsável os escolher explicitamente.

### 48.7 Regra para atualizações futuras

Ao concluir uma mudança escolhida pelo responsável, atualizar a linha consolidada da área afetada e, somente se houver continuação explicitamente autorizada, a fila ativa. Não anexar narrativa cronológica de proposta, tentativa e correção. Manter no máximo o último resultado representativo de testes, a evidência remota indispensável e a homologação confirmada. Falhas relevantes não podem ser ocultadas, mas devem ser incorporadas ao estado final sem perpetuar uma falsa pendência. Avisos informativos, oportunidades de otimização e itens encontrados por iniciativa do agente não entram na fila ativa sem escolha explícita do responsável.
