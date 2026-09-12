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
| `/painel/minha-conta` | Conta, sessão e preferências pessoais permitidas |
| `/painel/minha-disponibilidade` | Disponibilidade do próprio profissional |
| `/painel/relatorios` | Relatórios, comissões e exportações |
| `/painel/assinatura` | Central operacional da assinatura atual |
| `/#planos` | Catálogo comercial, condições e comparação de planos na landing pública |
| `/painel/assinatura/cobrancas` | Pedidos, pagamentos e documentos financeiros disponíveis |
| `/painel/assinatura/cancelar` | Intenção de renovação, não renovação ao final e futuro pedido de encerramento imediato |
| `/painel/assinatura/dados` | Solicitação de arquivo dos dados operacionais autorizados da barbearia |

### 7.4 Navegação por contexto

- Visitante: início, produto, recursos, preços/planos, segurança, dúvidas e entrar.
- Página pública: barbearia, agendar e entrar. Mesmo quando aberta em um navegador que já possui uma sessão de Cliente ou Gestão, a composição pública não deve exibir identidade, atalhos ou navegação privada dessa sessão; a ação de agenda inicia a reserva da barbearia do slug aberto.
- Cliente autenticado: barbearia, agenda e meu perfil. “Barbearia” abre o único vínculo público do cliente ou pede a escolha entre seus vínculos; “Agenda” abre sempre a própria agenda do cliente.
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
| RF-NT-001 | O produto deve oferecer central interna, contagem de não lidas e preferências por evento/canal. | M |
| RF-NT-002 | Eventos devem cobrir nova reserva, confirmação, cancelamento, reagendamento e lembrete de 24h. | M |
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

A política comercial precisa definir, antes da construção deste comportamento:

- antecedência mínima para cancelamento pelo cliente;
- antecedência mínima para reagendamento;
- tratamento de reservas já iniciadas ou muito próximas;
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

Na navegação inferior da área Cliente, “Barbearia” deve abrir a página pública do único vínculo ou pedir explicitamente a escolha quando houver vários; não deve levar à landing comercial nem escolher a partir de um agendamento. “Agenda” deve abrir `/meus-agendamentos`. Já na página pública `/{slug}`, a apresentação e os atalhos devem ser públicos, inclusive se existir sessão de Cliente ou Gestão no navegador: “Agenda da barbearia” inicia a reserva do slug aberto e não abre `/meus-agendamentos`; a agenda pessoal permanece disponível somente pela área autenticada do Cliente.

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

O produto deve oferecer:

- notificações internas na aplicação;
- e-mail transacional;
- preferências por usuário, barbearia, evento e canal.

Push, WhatsApp automático e campanhas de marketing não pertencem ao canal transacional definido aqui.

### 23.2 Eventos

- novo agendamento;
- novo agendamento;
- agendamento cancelado;
- agendamento reagendado;
- lembrete de 24 horas.

### 23.3 Destinatários

- Proprietário e gestor: eventos operacionais gerais da barbearia conforme preferência.
- Profissional: eventos dos próprios atendimentos.
- Cliente: confirmação e alterações de sua própria reserva.

### 23.4 Central interna

A central deve possuir:

- sino com contagem de não lidas;
- lista cronológica;
- filtros “Histórico” e “Não lidas”;
- marcar uma como lida;
- marcar todas como lidas;
- atualização Realtime sem depender exclusivamente dela para consistência.

No celular, a visualização inicial deve ser **Não lidas**, apresentada antes do Histórico. Preferências de canal ficam em uma visualização própria dentro do mesmo módulo. Os quatro eventos operacionais configuráveis são novo agendamento, confirmação, cancelamento e reagendamento; o lembrete de 24 horas é comunicação automática ao cliente e não entra nessa preferência da barbearia.

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
- processar lembretes cujo atendimento esteja entre 23 e 24 horas no futuro, sem duplicar.

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
| Dias 1–3 | Consultar e cumprir compromissos já existentes, regularizar assinatura e exportar dados; não criar novos compromissos |
| Dias 4–15 | Assinatura, conta, privacidade e exportação; operação da barbearia indisponível |
| Dias 16–59 | Dados preservados, operação indisponível; acesso restrito aos canais definidos de regularização/privacidade |
| A partir do dia 60 | Expurgo ou anonimização conforme retenção legal e contratos; histórico não pode ser prometido como recuperável |

A mudança de fase deve ser calculada no servidor a partir do fim efetivo do período. Não deve depender do relógio do navegador.

### 24.9 Decisões comerciais obrigatórias antes da integração financeira

Devem ser formalmente definidas e versionadas:

- evento que inicia o trial e regra de elegibilidade por nova barbearia;
- cálculo de “mês” e tratamento do dia de vencimento;
- início de um período pago contratado durante o trial;
- renovação automática ou manual;
- meios de pagamento além dos que forem aprovados no checkout;
- regra de upgrade, downgrade e plano personalizado;
- fórmula de reembolso proporcional, arredondamento e tarifas;
- permissões exatas para reagendamento durante os dias 1–3;
- se convite pendente reserva vaga no limite de profissionais;
- razão social, dados de suporte, política de cancelamento e textos jurídicos.

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

O fluxo deve exigir sessão válida, reautenticação recente e confirmação informada. Uma Edge Function privilegiada deve usar o JWT do solicitante como identidade; não deve aceitar `user_id` arbitrário no corpo.

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
| Supabase Data API | Consultas autorizadas do navegador | JWT do usuário e payload validado | Linhas permitidas ou erro sanitizado | RLS, grants mínimos, views reduzidas |
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
- permissões exatas dos dias 1–3.

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
| T01 Página pública | Hero; nome serifado; endereço; descrição; Agendar horário; WhatsApp/Como chegar; serviços; equipe; horários; contato; navegação inferior | Sem foto usa fallback contido; ausência de dado oculta ação impossível; catálogo sem capacidade explica indisponibilidade; tablet até duas colunas inferiores e desktop 900–1100 px |
| T02 Data | Hero compacto; título Escolha a data; stepper de quatro etapas; calendário mensal de sete colunas; anterior/próximo; legenda; Continuar/Voltar | Selecionado terracota e indicação semântica; hoje distinguível; indisponível não acionável; erro mantém mês e permite tentar novamente |
| T03 Serviços/profissional | Data com Alterar; lista de serviços com checkbox, descrição, duração e preço; contador n/3; soma de duração/preço; avatares e Sem preferência; Continuar | Máximo três; um profissional; seleção com check/anel; listas vazias com retorno; desktop permite seleção e resumo lado a lado |
| T04 Horário | Stepper; resumo de data, serviços, duração, preço e profissional; horários por manhã/tarde/noite; Revisar; Voltar | Grade móvel com até quatro colunas, cada toque ao menos 44 px; seleção textual/visual; nenhum slot não significa erro técnico; novas consultas preservam escolhas válidas |
| T05 Revisão | Resumo em linhas descritivas; identificação do cliente; e-mail somente leitura; total; Confirmar agendamento; Voltar | Confirmando bloqueia duplo envio; conflito retorna ao horário; autenticação restaura rascunho; sucesso só após retorno autoritativo |
| T06 Login cliente | Hero; Entre para confirmar; resumo da reserva; Google; separador; e-mail; Receber link; aviso de acesso; Voltar ao agendamento | Loading separado por método; mensagem genérica de envio; erro sanitizado; callback volta à revisão sem criar reserva |
| T07 Confirmação | Saudação; faixa de sucesso; próximo agendamento destacado; data/serviços/profissional; atalhos agenda/perfil; navegação cliente | Sem próximo atendimento oferece Agendar; falha secundária não esconde a reserva confirmada |
| T08 Meus agendamentos | Hero compacto; título; abas Próximos/Histórico; cartões consistentes por agendamento; Agendar novo horário; navegação | Vazios diferentes por aba; status textual; cada reserva futura alterável oferece contato público, reagendamento e cancelamento; um vínculo abre sua página pública diretamente e múltiplos vínculos pedem escolha explícita, sem inferir a primeira barbearia |
| T09 Detalhe | Detalhe no contexto da agenda; status; data, serviços, profissional e valor; ações permitidas; confirmação de cancelamento com Manter/Confirmar | Após cancelar permanece em Meus agendamentos, atualiza histórico e anuncia resultado; estados terminais não oferecem cancelamento/reagendamento da mesma reserva |
| T10 Meu perfil | Hero; dados pessoais; nome; e-mail somente leitura; telefone; Salvar; Minhas barbearias; preferências; privacidade; Voltar para agenda | Salvar desabilitado sem diferença; erro mantém edição; vínculo abre página pública correspondente |
| T11 Preferências | Explicação operacional versus marketing; switch BarbeariaSP; um switch por barbearia; Salvar preferências; acesso à privacidade | Alterações locais até salvar; erro parcial identifica escopo; nenhum switch inferido como aceito; confirmar descarte ao abandonar edição |
| T12 Privacidade | Resumo dos dados; Baixar JSON; protocolos e situação; bloco de risco Encerrar conta; aviso de privacidade; Voltar | Exportação em preparação/sucesso/erro; vazio de protocolos; confirmação com reautenticação; sem promessa de arquivo parcial ou exclusão incompatível com retenção |

Ao mudar a etapa de reserva, mover foco e viewport para o título da etapa, respeitando redução de movimento. Navegação inferior e barras aderentes devem reservar espaço no fim do conteúdo. A data, total e ação principal nunca ficam ocultos por recorte de imagem.

### 42.6 Landing, login e convites

| Superfície | Contrato visual |
|---|---|
| T13 Landing comercial | Header branco com marca e Entrar/Começar teste; hero escuro com placa BarbeariaSP visível; headline menor posicionada abaixo da placa; fotografia ocupa aproximadamente 75–90% da primeira dobra sem cortar ações; seções marfim/branco com títulos serifados, recursos, imagens de produto integrais, jornada, gestão, planos, segurança, FAQ e CTA final; rodapé com suporte/legal/Cullentech |
| T14 Login gestão | Marfim; fotografia quente e marca no topo; voltar à landing; card Acesse sua gestão; Google escuro; separador; e-mail; magic link contornado; acesso à área do cliente; desktop com formulário de 380–460 px e foto ampla |
| T15 Autenticação do convite | Hero compacto; identificação pública da barbearia e papel; destinatário mascarado sem sessão; Google/magic link; contexto de convite preservado com armazenamento restrito; identidade incorreta oferece Trocar conta |
| T16 Confirmação do vínculo | Resumo barbearia, papel e identidade autenticada; explicação do acesso; Aceitar convite e ação segura de sair/voltar; estados expirado/revogado/usado/inválido distintos; aceite confirma vínculo e leva ao destino autorizado |

Na landing, usar grades de 3–4 colunas em desktop, duas em tablet e uma em celular; CTAs empilhados no celular. Screenshots de apresentação devem usar proporção integral próxima de 853/1844, `height:auto` e `object-fit:contain`. Fotografia pode ser recortada para enquadramento; screenshot de produto não pode perder conteúdo interno. FAQ usa `aria-expanded` e teclado. Não criar links sem destino ou prova social fictícia.

### 42.7 Gestão e cadastros

| Superfície | Composição obrigatória | Operação e estado |
|---|---|---|
| Início | App bar clara; contexto da barbearia; título editorial; resumo do dia; próximos atendimentos; atalhos; alertas persistentes depois dos atalhos | Atalhos usam somente o título do destino, pois o card inteiro é acionável. Alerta de profissional inativo com futuro deve levar à agenda filtrada; Relatórios acessível daqui |
| Agenda | App bar; título Agenda sem rótulo editorial adicional; data/período; filtros; resumo “Agendamentos de hoje” expansível; agenda diária/semanal adaptada à largura; cards/lista de atendimentos; ações por papel. Sino de notificações e inicial da conta ficam agrupados no extremo direito do cabeçalho. | Tocar em “Agendamentos de hoje” revela/recolhe, logo abaixo, a lista cronológica do dia sem alterar período, data ou filtros selecionados; status vem do banco; proprietário/gestor operam as ações autorizadas e barber não vê Cancelar. |
| T17 Mais | Título Mais; descrição; lista vertical de linhas/cartões com ícone, título, subtítulo e chevron | Somente índice: Dados da barbearia, Serviços, Horários, Notificações, Relatórios, Assinatura e Minha conta conforme papel; Equipe é destino principal; novos destinos devem ser empilhados, sem grade lateral |
| T18 Dados da barbearia | App bar; retorno explícito para Mais no celular; Perfil público; título; subtítulo “Cadastre as informações que seus clientes consultam sobre a barbearia.”; área “Foto da barbearia” com foto persistida ou iniciais visíveis e prévia da nova seleção no mesmo círculo; foto circular sem distorção; formulário único; Salvar terracota; card secundário de visualização pública | Link público com copiar, testar WhatsApp e mapa; preview e descarte de foto; falha de carregamento usa iniciais sem apagar a referência; upload falho preserva anterior; seção fiscal só owner |
| T19 Horários da barbearia | Disponibilidade; título; sete blocos verticais independentes; aberto/fechado, início/fim; explicação de herança; Salvar | Domingo independente; sem carrossel de dias; dia fechado com horários nulos; erro conserva edição; salvamento verifica semana inteira |
| Equipe/lista | App bar; título Equipe; explicação de que é o espaço dedicado para gestão dos profissionais da barbearia; busca; filtros ativo/inativo; Novo profissional; cards com foto, nome, situação, modo de agenda e acesso | Sem equipe oferece cadastro; sem resultado oferece limpar; clique abre ficha; nenhum dado de login misturado ao contato; no celular, o último card permanece totalmente visível acima da navegação inferior |
| T20 Ficha profissional | Resumo com foto/nome/situação; seções progressivas Dados, Comissão, Agenda e disponibilidade, Acesso, Inativação | Resumos legíveis antes de expandir; comissão e acesso conforme papel; alerta futuro persistente; reativação explica que acesso segue inativo |
| T21 Novo profissional | App bar; Equipe; foto opcional; nome obrigatório; telefone e e-mail de contato opcionais; resumo Agenda da barbearia; Salvar profissional | Após salvar abre ficha; convite é ação posterior; falha de foto/convite não apaga cadastro; não solicitar senha |
| T22 Disponibilidade | Chip de identidade; seletor Agenda da barbearia/Personalizada; resumo efetivo; sete dias verticais no modo custom; pausas; ausências/bloqueios | Pausas nos dois modos; custom fora do horário da loja bloqueado; trocar para herdado conserva configuração; confirmar descarte de edição |
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

Preferências são individuais por usuário/barbearia/evento/canal e não alteram escolhas de outros membros. A central mostra histórico; a edição deve estar em uma seção claramente identificada de Preferências do módulo. Owner/manager pode consultar monitor reduzido da entrega do tenant; barber não acessa monitor geral.

Mensagens contêm somente o necessário: barbearia, data/hora no fuso correto, serviços e ação segura para consultar o próprio compromisso. Não incluir dados fiscais, comissão, notas internas, segredo de sessão ou links externos não confiáveis. Confirmar a reserva não depende do sucesso do e-mail.

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

O aviso público deve conter identificação legal da plataforma, papéis por tratamento, dados e fontes, finalidades/bases legais, compartilhamento, retenção, segurança em linguagem acessível, direitos, procedimento gratuito, canal, marketing opcional, cookies se usados, data e versão. Os termos devem conter elegibilidade, responsabilidades por atendimento presencial, dados e conteúdo, acesso por papel, assinatura, suporte, suspensão, encerramento, exportação, propriedade intelectual e relação com privacidade. Os contratos com barbearias devem definir instruções de tratamento, responsabilidades, suboperadores e cooperação em incidentes/direitos.

Nenhuma cláusula pode prometer “conformidade total” sem validação. Identidade legal, contato, retenção e termos são decisões reais a preencher na seção 38; não usar empresa, CNPJ ou canal fictício. Publicar aviso em `/privacidade`; disponibilizar termos e regras da assinatura em destinos públicos estáveis identificados na landing e no aceite.

### 46.2 Encerramento, vínculos operacionais e recuperação de falha

O fluxo de encerramento da conta de cliente não pode apagar uma identidade com responsabilidade operacional ativa como owner/manager/barber. Nessa situação, explicar a restrição, permitir os demais direitos e encaminhar a desvinculação administrativa por procedimento autorizado. Isso resolve a diferença entre apagar perfil de cliente e apagar uma identidade compartilhada com equipe.

Usar protocolo interno e etapas idempotentes para Storage, anonimização e Auth. Se a anonimização concluir e Auth falhar, registrar etapa exata e permitir retentativa controlada sem recriar PII ou repetir efeitos financeiros. Não anunciar encerramento integral antes de todas as etapas exigidas. Conta operacional não pode contornar essa proteção enviando outro `user_id`.

Anonimização deve considerar nome, telefone, e-mail, snapshots de contato, relação CRM, notificação, preferências, consentimentos e arquivos. Retenção de evidência de consentimento ou protocolo deve ter base e prazo específicos; “append-only” não significa guardar PII para sempre. Snapshots de serviço, valor, duração e profissional necessários à operação podem permanecer sem associação identificável ao cliente, respeitada política legal.

### 46.3 Política de retenção a parametrizar

| Categoria | Regra que deve ser definida e aplicada |
|---|---|
| Conta/CRM/contatos | Finalidade operacional, atendimento de direitos e prazo de descarte |
| Agenda e snapshots | Separar PII de informação operacional que precise permanecer |
| Contratos/pagamentos/reembolsos | Base fiscal/contratual, acesso restrito e prazo específico |
| Consentimentos | Prova minimizada de decisão e revogação; prazo e fundamento próprios |
| Convites | Expiração operacional de sete dias e prazo de limpeza de tokens/hashes/metadados |
| Notificações internas | Exclusão física diária após 45 dias de `created_at`, inclusive registros não lidos; a Central consulta somente essa janela e limita o Histórico às 100 notificações mais recentes |
| Outbox transacional | Exclusão física diária, após 45 dias de `created_at`, somente de itens terminais `sent` ou `failed`; itens `pending` ou `processing` nunca são apagados por idade, permanecem restritos ao backend e devem ser detectáveis pela operação para investigação |
| Auditoria/protocolos | Finalidade, acesso e retenção sem conteúdo excessivo |
| Exportações | Validade e remoção de arquivo após retirada/expiração |
| Backups | Criptografia, retenção, expurgo e reaplicação de exclusões após restore |

Retenção financeira não autoriza guardar toda a operação indefinidamente. Retidos devem ficar segregados e não restauram acesso à aplicação. Restore precisa reaplicar um registro de eliminações para não reintroduzir dados apagados. Cookies não essenciais/analytics, tratamento de menores e eventual decisão automatizada exigem definição jurídica própria antes de adicionar coleta ou funcionalidade.

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

### 48.1 Finalidade e manutenção obrigatória

Esta seção é o registro único de execução do produto. Deve ser atualizada na mesma entrega de cada implementação, correção, descoberta de pendência ou homologação, sem criar documentos paralelos de plano, progresso ou status. As seções 1–47 continuam sendo o contrato normativo para construção do zero.

O agente deve consultar os requisitos e este registro antes de iniciar uma tarefa, identificar o próximo item autorizado e registrar o resultado real ao terminar. Decisões novas aprovadas devem atualizar tanto o requisito correspondente quanto o registro da decisão. Propostas ainda não aprovadas devem permanecer identificadas como propostas, sem autorizar implementação.

### 48.2 Estados e evidências

- **Não verificado:** ainda não houve reconciliação suficiente para classificar o escopo. Não significa que a funcionalidade inexiste ou perdeu homologação.
- **Pendente:** trabalho necessário identificado e ainda não realizado, com descrição concreta.
- **Parcial:** parte do escopo construída; informar exatamente o que falta.
- **Construído:** escopo implementado, acompanhado das evidências e limitações de validação; não implica publicação ou homologação.
- **Homologação:** registrar separadamente como não avaliada, aguardando homologação, homologada ou com ajustes solicitados. Identificar responsável, data quando conhecida e escopo aprovado. Testes automatizados não substituem homologação do usuário.
- **Integração/publicação:** registrar separadamente onde a entrega está disponível e o que falta integrar ou publicar. Build aprovado não prova publicação nem entrega do artefato correto.

Preservar homologações já confirmadas. Quando uma alteração ou regressão afetar apenas parte de um fluxo, delimitar essa parte e sua evidência, sem reabrir automaticamente todo o módulo. Nunca inventar testes, datas, aprovações ou estados. Não converter ausência de auditoria em pendência funcional.

### 48.3 Registro de entregas e próximos passos

Cada item deve referenciar uma seção, requisito RF/RN/RNF ou tela Txx. Itens grandes devem ser divididos por escopo verificável. Atualizar as linhas existentes e registrar apenas transições relevantes, evitando um diário redundante.

| ID / referência | Escopo | Construção | Validação / evidência | Integração / publicação | Homologação | Pendência / próximo passo |
|---|---|---|---|---|---|---|
| DOC-01 / §§ 1–47 | Especificação única de construção | Construído — documento consolidado | Revisão documental de referências e estrutura; não equivale a teste do aplicativo | Arquivo no repositório local; publicação Git não realizada nesta tarefa | Usuário aprovou a consolidação com “perfeito”; não implica homologação de todos os recursos | Manter requisitos coerentes com novas decisões aprovadas |
| DOC-02 / § 48 | Governança dos agentes e rastreamento na própria EFS | Construído — instruções e registro definidos | Revisão de coerência entre EFS, AGENTS e direcionamento do README | Alterações locais; sem commit, push ou deploy nesta tarefa | Diretriz solicitada pelo usuário; aplicação futura deve ser verificada em cada entrega | Atualizar este registro a cada trabalho e homologação |
| QA-01 / contratos existentes | Restaurar contratos de orientação afetados pelo redesign e estabelecer baseline local | Construído — ajuda do upload, identificação de Configurações, link público e código morto reconciliados | 133/133 testes; typecheck aprovado; lint sem avisos; build de produção aprovado com 27 páginas e pacote standalone preparado | Branch local `codex/gestao-v2`; sem commit, push, deploy ou Supabase remoto | Aguardando homologação visual; validação automatizada funcional concluída | Comparar superfícies autenticadas em 390×844, tablet e desktop com sessão de homologação |
| GE-01 / RF-GE-001, rota `/painel/mais`, T17 | Navegação principal da gestão e índice Mais | Parcial — mobile usa Início, Agenda, Clientes, Equipe e Mais; índice aplica destinos por papel em lista vertical extensível. Relatórios foi incluído após Notificações, antes de Assinatura e Minha conta, tanto para proprietário quanto para gestor; Equipe continua destino principal e a lista não usa grade lateral. | Teste de ordem mobile, destinos por papel e lista vertical passou após a inclusão; typecheck aprovado; validação visual autenticada deste incremento ainda pendente | Branch local `codex/gestao-v2`; rota `/painel/mais` presente; não publicado | Responsável homologou visualmente a aba Mais e os acessos para Dados da barbearia, Serviços, Horários e Notificações em 09/09/2026; aprovou Relatórios como destino da aba Mais na mesma data; o novo item ainda aguarda validação visual | Validar Relatórios no índice Mais em celular, tablet e desktop, mantendo a composição vertical homologada |
| GE-02 / T18, T30, T19, rota `/painel/dados-da-barbearia`, `/painel/servicos`, `/painel/horarios` | Separação das superfícies de dados, catálogo e horários | Parcial — rotas próprias e layout contextual reutilizam contratos existentes; Dados da barbearia e Serviços têm retorno explícito para Mais no celular; preferências de notificação foram removidas dessas superfícies. A foto de perfil vinda do Storage local deixa de interromper a renderização de Dados da barbearia: apenas essa URL local estrita é exibida sem o otimizador do Next. | Teste de apresentação/isolamento e regressão da foto local aprovados; typecheck aprovado; validações completas deste incremento pendentes | Branch local `codex/gestao-v2`; sem commit, push, deploy ou Supabase remoto | Responsável homologou visualmente Dados da barbearia, Serviços e Horários pelo fluxo da aba Mais em 09/09/2026; tablet e desktop não verificados | Remover definitivamente a dependência de âncoras na tela legada após validar as superfícies e concluir Equipe |
| GE-05 / §23.4, T17, Notificações | Local das preferências de canais operacionais | Parcial — preferências saem do layout de Configurações e passam a ser uma visualização separada dentro de Notificações, preservando RPC e controles existentes | Teste de regressão adicionado; validações completas deste incremento pendentes | Local; sem migration, alteração remota, commit, push ou deploy | Responsável homologou visualmente a superfície de Notificações pelo fluxo da aba Mais em 09/09/2026; gravação das preferências e tablet/desktop não verificados | Validar leitura/gravação das preferências por papel autorizado no ambiente local |
| GE-06 / §23.4, T17–T19, T30, Notificações | Retorno mobile, prioridade de não lidas e ação de conta | Parcial — Mais, Dados, Serviços, Horários e Notificações usam retorno contextual no app bar mobile; Notificações abre em Não lidas, mantém Histórico e Preferências separadas e explicita quatro eventos configuráveis; ação Sair foi reduzida a um controle compacto coerente com o app bar | Teste de regressão adicionado; validações completas deste incremento pendentes | Local; sem migration, alteração remota, commit, push ou deploy | Responsável homologou visualmente o retorno e a navegação das superfícies de Mais em 09/09/2026; tablet, desktop e gravação funcional não verificados | Comparar as telas autenticadas em tablet e desktop e confirmar a nova ação compacta de sair |
| GE-07 / §23.4, T18, T30, Notificações | Consistência de cópia, hierarquia visual e escopo da central | Construído localmente — botão Novo serviço ganha raio coerente com o sistema; Dados da barbearia usa a cópia aprovada; abas da central usam seleção terracota/amarronzada sólida; monitor técnico de e-mails deixou a Central e ficou reservado à futura Gestão da Plataforma | Testes direcionados de Notificações, Dados/Serviços e página pública aprovados; typecheck aprovado; validação visual em sessão ainda pendente | Checkout local `codex/gestao-v2`; sem migration remota, commit, push ou deploy | Aguardando homologação visual e funcional | Verificar em 390×844, tablet e desktop a ausência do monitor técnico e a continuidade das preferências |
| GE-08 / §23.4, §46.3, T01, T17, Notificações | Retenção de notificações, disponibilidade pública e separação do monitor técnico de e-mails | Construído localmente — Histórico consulta até 100 notificações dos últimos 45 dias; migration forward-only expurga notificações internas e outbox terminal com mais de 45 dias; itens pendentes/processando são preservados; página pública permanece acessível e bloqueia reservas quando a configuração mínima não estiver pronta. O aviso de preparação da gestão orienta configurar agenda, profissionais e serviços na aba Mais para começar a usar a nova ferramenta; o aviso e o bloqueio no banco usam o mesmo critério: cada profissional ativo deve ter ao menos uma faixa de horário aberta, com início e fim preenchidos. | 31/31 testes direcionados aprovados; typecheck e lint aprovados; migration e fixture SQL executadas dentro de transação local com `ROLLBACK`; `supabase db lint --local --fail-on error` sem erros, com dois avisos preexistentes de parâmetros não usados em `revoke_customer_marketing_consent` | Migration local `20260909091616_retain_notifications_for_45_days.sql` criada, não aplicada ao Supabase remoto; nenhuma publicação | Regra funcional aprovada pelo responsável em 09/09/2026; homologação visual/funcional em ambiente autenticado pendente | Reexecutar o build padrão após normalizar o bloqueio existente em `.next`; aplicar migration somente com autorização explícita para Supabase remoto; validar a futura Gestão da Plataforma antes de expor monitor de e-mail |
| GE-09 / RF-GE-003–007, T17, Agenda | Agenda de gestão no novo padrão visual e simplificação de status | Construído localmente e aplicado ao Supabase remoto — a reserva nasce definitiva como `scheduled`/Agendado, sem confirmação operacional. Gestor/proprietário podem concluir, marcar no-show ou cancelar; profissional atribuído pode concluir ou marcar no-show e não pode cancelar. A migration `20260909154505_simplify_appointment_status.sql` normalizou registros legados, removeu `confirmed` da restrição de dados e das preferências, eliminou UPDATE amplo e instalou RPC estreita. As superfícies ativas de Cliente, Gestão, Início, Profissionais e Relatórios não mantêm compatibilidade de interface para o estado legado. | Verificação remota em 11/09/2026: 0 agendamentos `confirmed`; 3 `scheduled`, 5 `completed`, 10 `cancelled` e 1 `no_show`. Teste de regressão da remoção do legado e testes de Agenda/Início aprovados localmente. | Migration aplicada ao projeto Supabase remoto ativo; sem commit, push ou deploy. A função legada de relatório ainda calcula uma chave interna `confirmed` com valor necessariamente zero; sua limpeza requer migration específica posterior. | Agenda de Gestão homologada visualmente pelo responsável em 09/09/2026. A experiência específica do perfil barbeiro não fez parte desta homologação e será validada em rodada conjunta posterior. | Preparar e, mediante autorização, aplicar a migration isolada que limpa a chave interna legada do relatório; preservar AUTHZ-01 e validar owner, manager e barbeiro. |
| GE-10 / §32.3, T18–T20, Agenda, Notificações e Equipe | Retorno contextual de salvamento e ações | Construído localmente — componente reutilizável acessível exibe sucesso ou falha sob o grupo de ação em Dados da barbearia, Serviços, Horários, preferências, Notificações, Agenda, criação e ficha detalhada do profissional. Na ficha, dados, comissão, agenda, pausa, bloqueio, convite, acesso, inativação e revisão possuem retorno no próprio bloco. Mensagens de carregamento ou contexto continuam no topo somente quando não há ação do usuário; salvar não recarrega nem desloca a página. | Testes direcionados e typecheck aprovados; validações completas deste incremento pendentes | Checkout local `codex/gestao-v2`; sem alteração remota, commit, push ou deploy | Aguardando homologação visual e funcional autenticada, em celular, tablet e desktop | Homologar os retornos da ficha após ativar os contratos da Gestão V2 no ambiente de teste |
| GE-11 / RF-AU-001–003, §7.4 | Preservação de rota durante eventos de sessão | Construído localmente — o guarda de sessão deixou de redirecionar qualquer evento de autenticação para `/painel`. Restauração inicial e eventos repetidos de entrada da mesma identidade não recarregam; troca real de conta ou atualização explícita do usuário recarrega a rota atual para revalidar o acesso; saída segue para `/entrar`. | Testes de guardas e transições de sessão 16/16, typecheck e lint do componente aprovados. Em navegador local, a rota de Novo profissional permaneceu no endereço solicitado após a restauração da sessão; a instância isolada aguardou a confirmação de acesso e não foi usada como homologação do formulário. | Checkout local `codex/gestao-v2`; sem alteração remota, commit, push ou deploy | Aguardando homologação autenticada com troca de conta, saída e acesso por owner, manager e profissional | Validar em uma sessão normal que a pessoa permanece na tela autorizada e que troca ou saída não mostra dados da conta anterior |
| GE-03 / T17, T18, T19, T30 | Build padrão após alterações | Construído localmente — a execução padrão voltou a concluir no diretório `.next` após a ocorrência histórica de `EPERM` atribuída a lock/atributo do OneDrive | `npm.cmd test` em 09/09/2026 executou build padrão, TypeScript, geração de 32 páginas, empacotamento standalone e 156 testes aprovados; naquela rodada, o Next avisou sobre `outputFileTracingRoot` e o `package-lock.json` externo, sem impedir o pacote. A causa foi corrigida localmente em QA-03. | Nenhuma publicação; artefato standalone local não substitui o pacote publicado | Não se aplica | Antes de publicar, repetir build no ambiente de publicação; a ausência do aviso no ambiente-alvo ainda deve ser comprovada sem inferi-la da máquina local |
| GE-04 / RF-EQ-001–015, RN-031–035, FL-004, FL-006, T20–T22 | Gestão V2 de Equipe: lista, novo profissional, ficha, comissão, agenda, acesso e situação | Parcial — lista e ficha mantêm o layout aprovado; “Novo profissional” é uma única ação terracota no cabeçalho, sem botão flutuante no celular. O retorno de cadastro e da ficha é somente a seta, sem a frase “Voltar para Equipe”; Salvar é terracota, Cancelar é contornado e a mensagem ocupa uma linha própria junto das ações. Na ficha, dados, comissão, pausa e bloqueio usam largura consistente e padrão terracota; retornos ficam junto da ação correspondente; há espaço inferior suficiente para a inativação não ser encoberta pela navegação móvel. Na edição da agenda personalizada, cada dia também informa o horário efetivo da barbearia, sem deslocar os campos de início e fim. | Teste direcionado de apresentação 11/11, typecheck e lint da ficha aprovados. Em 09/09/2026, após autorização do responsável, as migrations `20260909014503_gestao_v2_team_contracts.sql`, `20260909173658_fix_professional_data_and_custom_schedule.sql` e `20260909180549_accept_professional_photo_url_from_session.sql` foram aplicadas ao projeto remoto de homologação. As RPCs V2 privadas verificadas usam `SECURITY DEFINER`, não possuem execução anônima e permitem somente `authenticated` com checagem de papel/tenant. Fixtures SQL remotas com `ROLLBACK` confirmaram criação, edição, agenda personalizada, pausa, bloqueio, inativação, isolamento entre tenants e exclusão de slots de pausa/bloqueio da disponibilidade pública. Em sessão autenticada, Salvar dados de profissional existente e a troca para Agenda da barbearia retornaram sucesso. A restauração para agenda personalizada falha para configuração legada que abre terça-feira enquanto a barbearia está fechada nesse dia; é a validação de limite RN-032 e exige correção explícita, não normalização silenciosa. | Frontend local usa o projeto remoto de homologação; migrations aplicadas remotamente, sem commit, push ou deploy. A frente P0 continua em worktree separado e não foi mesclada nem copiada. | Validação atual é do papel de gestão. Telas e permissões vistas como barbeiro serão homologadas posteriormente em uma única rodada, conforme decisão do responsável em 09/09/2026. Seta apenas como ícone e formulário de novo profissional foram inspecionados na sessão autenticada; criação real por formulário e troca visual de foto ainda aguardam homologação. | Validar, sem alterar dados reais por acidente, criação de profissional, correção explícita de agenda legada incompatível, convite, acesso e inativação. Depois validar no agendamento público a reflexão de agenda, pausa e bloqueio e fazer a rodada conjunta do perfil barbeiro. |
| REC-01 / todos os módulos | Reconciliar execução por requisito antes de retomar implementação | Parcial — baseline técnico e primeiro desvio de navegação reconciliados; cobertura módulo a módulo permanece em andamento | Suíte local completa aprovada nesta etapa; isso não comprova integralmente todos os requisitos, publicação ou homologação | Não verificado por módulo fora do escopo desta etapa | Preservar aprovações existentes; recuperar seu escopo e evidências sem presumir revogação | Prosseguir pelas rotas secundárias e pela nova arquitetura de Equipe; cadastrar cada incremento com estado real |
| SEG-01 / segurança e autorização | Preservar e integrar futuramente as remediações P0 informadas pelo usuário | Correções informadas como realizadas em frente separada; integração pendente | AUTH-01, AUTHZ-01 e ABUSE-01 informados como validados; revalidar compatibilidade na integração | Branch security/p0-remediations-20260907-workspace; worktree .codex-worktrees/barbeariasp-security-p0-remediations-20260907; não integrado por esta tarefa | Validação da frente informada pelo usuário; integração não homologada aqui | Somente com autorização: integrar sem sobrescrever remediações e testar redirect, operações de status e limite de quatro reservas |

### 48.4 Registro de decisões e critério de encerramento

**GE-16 / §§11, 14–17, 22 e 42.7–42.8 — refinamento do shell e disponibilidade pública, iniciado em 10/09/2026:** por decisão do responsável, Início, Agenda, Clientes, Equipe e Relatórios devem compartilhar uma barra superior mais compacta, com a marca BarbeariaSP um pouco mais destacada e os controles de notificação, inicial e saída menores à direita. No desktop, a navegação primária mostra somente Início, Agenda, Clientes, Equipe e Mais; Relatórios, Notificações e configurações continuam acessíveis somente pelo índice de Mais. Início passa a usar “Gestão” nos atalhos, sem rótulos redundantes de continuação, e posiciona Pendências da operação depois dos atalhos. Agenda não usa o rótulo “Operação diária”; Clientes usa somente o título “Clientes”; Equipe usa somente o título “Equipe” e explica que é o espaço de gestão dos profissionais da barbearia; Relatórios usa somente o título “Relatórios” e não exibe texto metodológico de receita/ticket na abertura. A decisão do novo nome de “Mais” permanece aberta; a recomendação a homologar é “Gestão”, pois descreve o destino sem confundir com a página inicial. Não há mudança de regra de dados, papel, RLS ou acesso nessa parte visual.

Na investigação de disponibilidade pública, foi identificada no ambiente remoto de teste a ausência de `private.is_barbershop_booking_ready`, `public.get_public_booking_status` e do gatilho que reaplica a regra no banco. A página pública depende de `get_public_booking_status`; na ausência da RPC, ela mantém reservas indisponíveis para qualquer barbearia, embora os dados estejam completos. A restauração foi definida como migration isolada, sem reaplicar o bloco de retenção/notificações da migration histórica: função privada de prontidão, consulta pública de booleano e gatilho de bloqueio de insert. A regra preservada exige barbearia ativa, serviço ativo, profissional ativo, dia/horário aberto e agenda efetiva de cada profissional; não haverá liberação pelo frontend. O impacto ficou restrito ao schema remoto de teste, sem novo modelo de dados, RLS ou mudança de autenticação; `anon` recebe somente execução na função booleana pública e as funções privadas permanecem revogadas. O risco de uma migration parcial — exposição de dados ou reserva sem configuração — foi coberto por fixture de prontidão, indisponibilidade e grants antes da aplicação autorizada. A homologação de uma reserva completa pela interface continua pendente.

Construído e integrado ao ambiente remoto de teste: os ajustes de shell, textos, ordem de atalhos, navegação desktop e tamanho dos controles foram aplicados sem alterar os fluxos homologados. A foto pública foi conferida no banco, na projeção pública e no armazenamento do ambiente de teste; o objeto existe e responde como imagem. A renderização pública agora usa a URL válida diretamente, sem o filtro legado que podia esconder uma foto persistida. A migration `20260910191829_restore_public_booking_readiness.sql` foi exercitada em transação local e revertida: cadastro incompleto ficou indisponível, cadastro completo retornou horários, o papel anônimo recebeu somente os dois endpoints públicos e a função privada permaneceu inacessível. Com autorização do responsável, a mesma migration foi aplicada uma vez ao Supabase remoto de teste. A verificação pós-aplicação encontrou duas barbearias ativas com serviço, duas prontas para reserva e duas com ao menos um horário futuro; `anon` executa somente os endpoints públicos de status e disponibilidade, não a função privada, e o gatilho de bloqueio está instalado. Os 29 testes dirigidos, typecheck, `git diff --check` e a suíte completa (`npm test`: 168/168) passaram. A execução posterior do lint global foi bloqueada por diretórios gerados preexistentes `.next-team-v2` e `.next-v2`, que não são ignorados pelo comando e produzem milhares de diagnósticos de artefatos compilados; isso não foi corrigido ou ocultado nesta entrega. Não houve publicação, commit ou homologação visual em sessão autenticada; o próximo passo é confirmar pela interface pública a seleção de serviço, data e horário em ambos os cadastros de teste.

**Pendência GE-17 / §§6, 7.1, 10.4 e 45 — sessão de gestão na página pública, identificada em 10/09/2026:** investigação concluída, sem correção aplicada. O cliente Supabase atual persiste uma sessão única por perfil de navegador e a página pública a consulta; por isso, abrir `/{slug}` no mesmo perfil em que a pessoa entrou na gestão mostra a identidade já autenticada. Quando essa identidade é membro administrativo da própria barbearia, a regra de segurança existente bloqueia corretamente a reserva, mas a apresentação é confusa para teste de cliente. Separadamente, um rascunho de reserva guarda nome e telefone por até 30 minutos em `sessionStorage` e `localStorage`, sempre validado pelo mesmo slug, para sobreviver ao retorno de autenticação. Perfis realmente isolados (janela anônima, perfil de navegador distinto ou outro navegador sem perfil/sincronização compartilhados) não compartilham a sessão nem esse rascunho; em produção, a mesma regra de armazenamento por origem e perfil continuará valendo. Próxima decisão de produto e segurança: definir uma troca explícita para conta de cliente na página pública, que jamais desconecte a gestão de forma automática, e redesenhar a persistência do rascunho para reduzir retenção local de dados pessoais sem perder o retorno seguro após autenticação.

Em 10/09/2026, o responsável direcionou que essa separação seja corrigida, mas não escolheu ainda o tempo exato de expiração do rascunho entre 10 e 15 minutos. A implementação deverá manter gestão e cliente como contextos explícitos no mesmo navegador, sem saída automática da gestão; reduzir a persistência local para o mínimo necessário; validar o rascunho pelo `slug`; e oferecer ação clara para iniciar nova reserva ou limpar o rascunho. Não há autorização implícita para rebaixar o bloqueio de reserva feito por identidade administrativa da própria barbearia. Antes de escrever código, registrar e aprovar o prazo definitivo e os dados estritamente necessários.

**Decisão GE-17 / §§6, 7, 11 e RN-004–005 — contextos independentes, aprovada em 10/09/2026:** o rascunho de reserva expira em **15 minutos**. Gestão e Cliente usarão sessões Supabase de navegador separadas por chave de armazenamento: entrar, navegar e sair do contexto Cliente não encerra nem substitui automaticamente a sessão de Gestão. As rotas públicas e da área do cliente usarão exclusivamente o cliente de sessão do Cliente; as rotas de painel manterão o cliente de Gestão atual. O rascunho persistirá somente em `sessionStorage`, limitado ao `slug`, serviços, profissional, horário, nome, telefone e instante de salvamento; não será mais duplicado em `localStorage`. A restauração continuará revalidando slug, expiração e horário futuro; a pessoa terá ação explícita para limpar/iniciar nova reserva. A identidade presente no contexto Cliente continuará impedida de reservar a própria barbearia quando também tiver vínculo administrativo ativo, tanto na interface quanto no banco por AUTHZ/trigger existentes. Impacto previsto: frontend e testes de contexto/sessão; sem migration, RPC, RLS, alteração de Auth remoto, dados existentes, Supabase remoto ou publicação. Risco principal: OAuth/magic link deve retornar ao armazenamento de Cliente; será coberto por testes dirigidos antes da implementação e validação manual posterior.

**Execução local GE-17, em 10/09/2026:** construída a separação por chave de armazenamento: `customerSupabase` usa `barbeariasp-customer-auth`, enquanto o cliente de Gestão existente permanece inalterado. Perfil público, entrada de Cliente, Meus agendamentos, Meu perfil e Privacidade passaram a usar somente o contexto Cliente; OAuth, magic link e saída local da entrada de Cliente atuam, portanto, nesse contexto. O rascunho público agora é gravado e restaurado exclusivamente de `sessionStorage`, expira em 15 minutos e a ação existente de novo agendamento o limpa. O bloqueio de identidade administrativa na própria barbearia foi preservado na interface e continua coberto no banco pelos controles já existentes. O teste novo falhou antes da implementação pela ausência do cliente isolado e passou depois; os testes dirigidos relevantes passaram em 48/48, `npm.cmd run lint` e `npm.cmd run typecheck` passaram, e `npm.cmd test` concluiu com build de 32 rotas e 169/169 testes. Não houve migration, alteração de RLS, Auth remoto, dados, Supabase remoto, publicação, commit, push ou deploy. **Homologação de perfis confirmada pelo responsável em 10/09/2026:** a correção dos contextos de perfil de Gestão e Cliente foi validada e está concluída. Esta confirmação não declara, por si só, OAuth/magic link, expiração/limpeza do rascunho, reserva pública completa, foto, publicação ou produção como homologados; cada evidência permanece no seu item e escopo próprios.

**Homologação de reserva do Cliente confirmada pelo responsável em 10/09/2026:** em duas barbearias, o Cliente visualizou as duas reservas, selecionou cada barbearia para ver somente as suas respectivas reservas, cancelou uma reserva e realizou nova reserva. O escopo comprova o fluxo de reserva pública e a área de agendamentos do Cliente para múltiplas barbearias, sem mistura entre os recortes selecionados. Não constitui, isoladamente, prova de OAuth/magic link, expiração e limpeza do rascunho, foto pública, publicação ou produção.

**GE-18 / RF-CL-004 e RF-CL-007–009 — perfil e privacidade do Cliente, lote local em 10/09/2026:** o responsável homologou que as fotos públicas das barbearias aparecem corretamente. O fallback sem foto da página pública deixou de usar a imagem fictícia “Barbearia Central” e agora usa a mesma imagem institucional da landing BarbeariaSP. Em Meus dados, o título redundante “Seus dados” foi removido; nome e telefone ficam somente leitura até a pessoa acionar `Editar dados`, e somente então aparece `Salvar dados`, reduzindo alteração acidental. A área passou a usar “Privacidade e meus dados” e o texto “Consulte e baixe uma cópia dos seus dados ou encerre sua conta.”; a área de encerramento explica que os dados pessoais serão apagados ou mantidos sem identificação quando necessário. Não foram alterados RPCs, dados existentes, retenção real, reautenticação, exclusão/anonimização, Auth, RLS, migrations, Supabase remoto ou publicação. Os testes de regressão foram escritos antes do código e falharam pelos comportamentos ausentes; após a implementação, os testes dirigidos passaram em 34/34, lint e typecheck passaram, e `git diff --check` não encontrou erro. **Homologação visual deste ajuste local ainda é necessária:** conferir imagem institucional de fallback, leitura inicial e sequência Editar/Salvar em celular, tablet e desktop.

**GE-19 / RF-PB-001, RF-CL-004–009 e §25.6 — ajustes aprovados de perfil, horários e encerramento, decisão de 10/09/2026:** a área Cliente deve identificar o contexto como “ÁREA DO CLIENTE”, sem usar o nome da primeira barbearia vinculada, pois a mesma pessoa pode reservar em várias barbearias. `Editar dados` e `Salvar dados` devem ficar após o telefone e antes de “Minhas barbearias”. A página pública deve apresentar, por dia, os horários gerais realmente cadastrados pela barbearia; não deve exibir a instrução genérica para escolher uma data. A nota interna da área de privacidade não é conteúdo do cliente e deve ser removida. O encerramento deve abrir confirmação explícita: “Tem certeza que deseja encerrar sua conta no BarbeariaSP? Todos os seus dados serão removidos e você não terá mais acesso às suas agendas.” A resposta negativa retorna ao perfil; a positiva exige login recente, conserva somente nesta aba e por tempo limitado a intenção confirmada vinculada à mesma identidade e, após a Edge Function concluir, informa: “Conta cancelada conforme sua solicitação. Caso deseje retornar, será preciso fazer um novo cadastro.” A mudança preserva a Edge Function, a reautenticação e a retenção existentes; não autoriza migration, alteração de dados, RLS, Auth remoto, política pública, publicação ou deploy. O ativo fotográfico solicitado com “BarbeariaSP” na parede não está no repositório: os dois arquivos locais usados como fallback têm o mesmo conteúdo da foto “Barbearia Central”; a substituição visual depende do ativo correto fornecido/apontado pelo responsável.

**Execução GE-19 — lote local em 10/09/2026:** o responsável forneceu o ativo institucional, incorporado como `public/barbeariasp-institutional-hero.png`; landing, entrada do Cliente, entrada da Barbearia/Gestão, área Cliente e fallback público agora usam esse arquivo, sem alterar fotos persistidas das barbearias. O perfil não exibe mais uma barbearia como se fosse identidade do cliente; os vínculos continuam visíveis em sua própria seção. Horários gerais são lidos apenas para a página pública e renderizados por dia; se não houver configuração pública disponível, o card não inventa horários. A confirmação de encerramento substituiu a caixa nativa: a intenção confirmada é gravada somente em `sessionStorage`, expira em 15 minutos, exige a mesma identidade e nova autenticação antes de chamar a Edge Function existente. Os testes dirigidos foram escritos antes da implementação, falharam pelos comportamentos ausentes e passaram após a correção (41/41); uma referência de teste à imagem substituída foi corrigida na mesma rodada. `npm.cmd run typecheck`, `npm.cmd run lint`, `git diff --check`, build local com artefato standalone e a suíte integral de 193 testes passaram. Não houve migration, acesso/modificação do Supabase remoto, mudança de RLS, Auth remoto, Edge Function, dados, commit, push, publicação ou deploy. Homologação visual e funcional manual deste novo recorte permanece necessária.

**GE-20 / §§12–13 e T08 — agenda do Cliente com múltiplas barbearias, decisão aprovada em 10/09/2026:** a divergência visual entre o cartão destacado do primeiro futuro agendamento e os demais cartões não é por tenant nem representa dados distintos; ela será removida para que os cartões sigam o mesmo padrão. O cabeçalho “Meus agendamentos” deve dizer somente “ÁREA DO CLIENTE”, nunca o nome de uma barbearia. Cada reserva futura alterável deve apresentar, no próprio cartão, Falar com a barbearia pelo WhatsApp público, Reagendar para a página pública da barbearia daquela reserva e Cancelar com a confirmação existente. “Agendar novo horário” não pode herdar a barbearia do próximo agendamento: com um único vínculo `barbershop_customers`, abre diretamente o slug correspondente; com dois ou mais, abre uma escolha explícita de barbearia; sem vínculo, informa a indisponibilidade sem inventar um destino. Impacto autorizado: frontend, estilos e testes locais, usando relações já autorizadas do próprio cliente. Não há alteração de appointments, dados existentes, schema, migration, RPC, RLS, Auth remoto, Supabase remoto, publicação ou deploy. O isolamento é preservado porque a lista de agendamentos continua filtrada pelo `customer_id` autenticado e cada ação mantém o `barbershop_id`/slug da própria reserva.

**Execução GE-20 — lote local em 10/09/2026:** a área “Meus agendamentos” deixou de separar visualmente o primeiro futuro agendamento dos demais: todos os itens usam o cartão único da agenda. O topo agora identifica somente “ÁREA DO CLIENTE”. Para cada item futuro em estado alterável, o WhatsApp é montado a partir do contato da barbearia daquela reserva; Reagendar preserva o mesmo slug e serviços válidos; Cancelar mantém sua confirmação e atualização de histórico existentes. A nova reserva consulta somente os vínculos já visíveis ao cliente autenticado: um vínculo redireciona para seu slug, múltiplos vínculos exibem a escolha e nenhum vínculo não redireciona. Nenhuma consulta de agendamento perdeu o filtro por `customer_id`, e não houve escrita ou alteração de contrato de autorização. O novo teste foi escrito antes da implementação e falhou pelo cabeçalho, layout único, escolha de barbearia e contato por cartão ausentes; após a correção, os testes dirigidos passaram em 36/36. Typecheck, lint, `git diff --check`, build local com standalone e a suíte integral de 194 testes passaram. Não houve migration, alteração de RLS/Auth remoto, dados existentes, Supabase remoto, commit, push, publicação ou deploy. A homologação manual pendente limita-se ao novo padrão de cartões e aos três cenários de nova reserva (um vínculo, múltiplos vínculos e nenhum vínculo) em celular, tablet e desktop.

**Ajuste GE-20.1 — escolha de barbearia visível, decisão aprovada em 10/09/2026:** quando houver múltiplos vínculos e o cliente acionar “Agendar novo horário”, a pergunta de escolha não pode permanecer fora da área visível. A página deve rolar para o seletor, mover o foco para a pergunta e anunciar o próximo passo de modo claro, respeitando a preferência de redução de movimento. Não haverá redirecionamento implícito nem alteração de dados, autorização, banco, RLS, Auth, Supabase remoto, publicação ou deploy.

**Execução GE-20.1 — lote local em 10/09/2026:** ao abrir a escolha entre múltiplas barbearias, a própria página rola até o seletor e coloca o foco na etapa “NOVA RESERVA”. A instrução agora informa de forma direta que a escolha abrirá a agenda correta. A rolagem é suave quando permitida e imediata para quem opta por reduzir movimento; a tela continua no mesmo contexto até a pessoa escolher a barbearia, sem inferir ou alterar qualquer destino. O teste novo foi escrito antes da implementação, falhou pela ausência de foco, rolagem e instrução e passou após a correção (20/20 testes dirigidos). Typecheck passou. Não houve alteração de dados, banco, RLS, Auth, Supabase remoto, commit, push, publicação ou deploy. A homologação manual permanece restrita ao cenário de múltiplos vínculos nos tamanhos previstos.

**Homologação do responsável — GE-19, GE-20 e GE-20.1 em 10/09/2026:** o responsável confirmou a validação visual e funcional das alterações recentes de foto institucional, Perfil e Privacidade do Cliente, cartões e ações da Agenda, múltiplos vínculos e seletor visível de nova reserva. O status de homologação desses escopos passa a ser “homologado pelo responsável” no ambiente utilizado para a validação. Esta confirmação não prova publicação, produção, e-mail transacional, política jurídica, OAuth/magic link, retenção real ou qualquer escopo não mencionado.

**GE-21 / §§7.4 e 13.1 — navegação inferior contextual, decisão aprovada em 10/09/2026:** a barra inferior deve distinguir o contexto de quem a usa. Na área autenticada do Cliente, “Barbearia” abre o único vínculo público ou mostra a escolha visível entre múltiplos vínculos, sem cair na landing e sem inferir uma barbearia a partir de agendamentos; “Agenda” abre a própria lista de agendamentos. Na página pública de uma barbearia, visitante ou pessoa sem perfil de Cliente mantém “Agenda” como início da reserva da barbearia aberta; cliente autenticado usa “Agenda” para abrir seus próprios agendamentos. Impacto autorizado: frontend, testes locais e EFS, usando somente a sessão e os vínculos que já estão autorizados ao próprio cliente. Não haverá alteração de reservas, dados existentes, schema, migration, RPC, RLS, Auth remoto, Supabase remoto, publicação ou deploy. O risco de destino ambíguo é mitigado pela escolha explícita e pela manutenção do slug público atual para o visitante.

**Execução GE-21 — lote local em 10/09/2026:** a barra inferior da Agenda, Perfil e Privacidade passou a usar um único componente de navegação do Cliente. “Barbearia” consulta exclusivamente os vínculos do próprio cliente autenticado: um vínculo abre seu slug, vários mostram a escolha com foco e rolagem até “Qual barbearia você quer acessar?”, e nenhum vínculo informa a indisponibilidade sem voltar à landing. “Agenda” continua apontando para `/meus-agendamentos`. Na página pública, a consulta da identidade confirma a existência de perfil de Cliente: só nesse caso o item “Agenda” abre `/meus-agendamentos`; visitante e identidade sem perfil de Cliente continuam abrindo a reserva da página pública já acessada. Os testes novos foram escritos antes e falharam pela ausência do componente e da distinção de contexto; após a implementação, os testes dirigidos passaram em 22/22, typecheck e lint passaram, `git diff --check` não encontrou erro e a suíte integral passou em 197/197. O build foi tentado, mas o servidor `next dev` já ativo manteve arquivo em `.next/static` bloqueado e o processo retornou `EPERM`; não foi encerrado para preservar a sessão de desenvolvimento. Não houve migration, escrita de dados, alteração de reserva, RLS, Auth remoto, Supabase remoto, commit, push, publicação ou deploy. Homologação manual pendente: cliente com um vínculo, vários vínculos e nenhum vínculo na barra inferior; visitante e cliente autenticado na página pública.

**Homologação do responsável — GE-21 em 10/09/2026:** o responsável confirmou como homologados os cenários da barra inferior contextual: cliente com um vínculo, cliente com múltiplos vínculos e cliente sem vínculo; visitante acessando diretamente o link público de uma barbearia; e cliente autenticado acessando esse mesmo link público. Fica confirmado o comportamento de “Agenda da barbearia” para visitante, “Agenda” para cliente autenticado e escolha explícita para múltiplos vínculos. A homologação refere-se ao ambiente utilizado no teste e não comprova publicação, produção, build sem o servidor de desenvolvimento em uso, e-mail transacional ou qualquer integração externa.

**GE-22 / §§4, 7.4, 8, 13 e 42 — correções visuais e isolamento da página pública, decisão aprovada em 11/09/2026:** com a capacidade de uso restabelecida, a landing deve preservar a leitura integral de “BarbeariaSP” na composição institucional em celular e desktop; as entradas de Barbearia/Gestão e Cliente devem começar após uma pequena faixa superior de respiro, delimitando visualmente a imagem. O link público `/{slug}`, inclusive quando copiado ou aberto por uma pessoa já autenticada, deve usar composição estritamente pública e não deve exibir barra inferior: não pode expor identidade, “Meu perfil”, agenda pessoal ou atalhos de Gestão; o CTA “Agendar horário” inicia a reserva do slug aberto. A página pública deve caber integralmente em 360×800, sem rolagem horizontal nem conteúdo empurrado para fora pela grade de serviços. A sessão já existente é preservada nas abas de origem e não será encerrada globalmente. O bloqueio de identidade administrativa contra reserva na própria barbearia, RLS, autorização e isolamento entre barbearias permanecem inalterados. Impacto autorizado: frontend, testes locais, EFS e homologação visual em 390×844, tablet e desktop; não autoriza migration, alteração de banco, RLS, Auth remoto, Supabase remoto, publicação ou deploy.

**Execução GE-22 — lote local em 11/09/2026:** a imagem institucional da landing passou a usar enquadramento integral no desktop, sobre fundo escuro compatível, e a ancoragem à esquerda no celular, preservando a leitura da marca. As entradas de Gestão e Cliente receberam uma faixa superior de respiro antes do hero; o hero agora é ancorado no topo esquerdo para não recortar a marca verticalmente. Em `/{slug}`, a navegação e os atalhos de perfil/gestão não são renderizados para uma sessão já existente: a composição pública não revela “Meu perfil”, agenda pessoal ou “Acessar minha área”; a ação pública continua como “Agenda da barbearia” e abre a reserva do slug. A sessão não foi encerrada, os dados de cliente permanecem usados apenas no fluxo de reserva já autorizado e o bloqueio administrativo de reserva própria permanece intacto. Os testes novos foram escritos antes da implementação e falharam pela ausência do respiro, do enquadramento e do isolamento; após a correção, os testes dirigidos passaram em 34/34, lint e typecheck passaram e a suíte completa passou em 197/197. A construção local gerou novamente o artefato `standalone`. Foi feita inspeção visual local em desktop da landing e das duas entradas; a marca aparece integralmente e a faixa de respiro é visível. Não houve migration, escrita de dados, RLS, Auth remoto, Supabase remoto, commit, push, publicação ou deploy. Homologação manual ainda deve cobrir 390×844, tablet e o cenário de link público aberto com sessão administrativa já existente.

**Ajuste GE-22 — página pública sem barra inferior e largura móvel, em 11/09/2026:** a captura em 360×800 mostrou que a barra inferior ainda era renderizada para visitante e que a grade de quatro serviços deixava o conteúdo intrínseco expandir horizontalmente. A barra foi removida da página pública para todos os contextos; a reserva continua acessível pelo CTA “Agendar horário” e pelos atalhos de serviços/equipe. A página passou a limitar a largura ao viewport, a impedir rolagem horizontal e a usar quatro colunas encolhíveis (`minmax(0, 1fr)`), com texto quebrando dentro da própria coluna. O novo teste falhou antes da alteração; após o ajuste, os testes públicos e de contexto passaram em 40/40, typecheck e lint passaram. Não houve alteração de dados, reserva, banco, RLS, Auth, Supabase remoto, commit, push, publicação ou deploy. Homologação manual pendente: testar novamente em 360×800 e em um telefone maior, confirmando ausência completa da barra inferior e nenhum conteúdo fora da tela.

**Ajuste GE-22.1 — enquadramento de foto pública e leitura dos serviços, decisão aprovada em 11/09/2026:** a foto cadastrada pela barbearia deve aparecer inteira no topo de `/{slug}`, independentemente de ser horizontal, quadrada ou vertical. A moldura pode apresentar área neutra de acomodação, mas não pode ampliar a foto com `cover` nem cortar conteúdo para preencher uma proporção fixa. Deve haver pequeno respiro visível acima e nas laterais da moldura para deixar o enquadramento intencional. Em viewport de até 400 px, a prévia de serviços deve usar duas colunas legíveis em vez de comprimir quatro títulos; acima desse limite, a grade pode conservar quatro colunas quando houver largura suficiente. O ajuste preserva URL e arquivo persistidos, dados públicos, ações, reserva, autenticação, RLS, isolamento entre barbearias e dados existentes. Impacto autorizado: CSS da página pública, validação local em navegador e atualização desta EFS; não exige nem autoriza migration, RPC, RLS, Auth remoto, Supabase remoto, publicação ou deploy. Risco previsto: fotos com proporção muito diferente da moldura terão faixas neutras, opção preferível ao corte de conteúdo; a lista poderá ficar mais alta em celulares estreitos.

**Execução do ajuste GE-22.1 — lote local em 11/09/2026:** a reprodução em navegador com viewport de 360×800 mediu a foto persistida de 1024×1536 sendo forçada pelo CSS anterior a aproximadamente 345×131 com `object-fit: cover`, confirmando que a própria proporção fixa causava o corte. A moldura pública passou a 4:3, com respiro de 8 px, fundo neutro escuro, cantos completos e `object-fit: contain`; após a mudança, a mesma foto foi renderizada inteira em aproximadamente 329×247. A prévia de serviços passou para duas colunas até 400 px e conserva quatro acima desse limite. A inspeção real em 320, 360, 390, 412 e 430 px confirmou foto em `contain`, documento dentro da largura útil e ausência de overflow nos itens; em 360 px, cada coluna de serviço ficou com aproximadamente 148 px. O teste histórico que exigia `cover` foi removido por proteger o defeito, e a regressão foi validada pelo comportamento computado no navegador, sem criar teste artificial de CSS. A primeira suíte integral expôs somente essa expectativa antiga; após sua correção, o build final gerou 32 rotas e o pacote `standalone`, e a suíte passou em 176/176. O fechamento imediato do lint também corrigiu a declaração antecipada do encerramento de conta e duas navegações internas recentes para `useRouter`, preservando destinos e regras; testes dirigidos passaram em 35/35, typecheck e lint passaram sem erro ou aviso, e a suíte/build final já inclui essas correções. `git diff --check` dos arquivos do ajuste não encontrou erro, somente avisos de conversão futura de fim de linha pelo Git. Não houve migration, banco, escrita de dados, RPC, RLS, Auth remoto, Supabase remoto, commit, push, publicação ou deploy. A comparação automatizada local está concluída; homologação visual do responsável permanece pendente para a página agora aberta.

**LGPD-01 / RF-LG-001–004, RF-CL-009 e RN-070–072 — transparência no encerramento da conta e política revisada, concluído em 11/09/2026:** A Política de Privacidade pública (`/privacidade`) foi integralmente revisada e publicada com versão e data atualizadas (11 de setembro de 2026). Ela incorpora formalmente: (a) a distinção clara entre os papéis de Controlador e Operador; (b) a declaração expressa de que a plataforma não coleta nem armazena dados de cartão de crédito de clientes finais (atendimentos pagos no balcão) nem de barbearias (cobrança SaaS processada 100% via instituição de pagamento parceira autorizada e em conformidade PCI-DSS); (c) a minimização estrita aos dados necessários (nome, e-mail e WhatsApp), sem coleta de dados supérfluos como data de nascimento; (d) agendamento de menores por seus responsáveis legais; (e) autonomia no aplicativo para exportação, gestão de marketing e encerramento de conta em `/meu-perfil/privacidade`; (f) o texto canônico de encerramento de conta do cliente (“Quando a conta for encerrada, apagaremos ou removeremos a identificação dos seus dados pessoais sempre que possível. Alguns registros poderão ser mantidos pelo tempo necessário para cumprir obrigações legais, fiscais, de segurança ou para resguardar direitos. Dados usados apenas para estatísticas ou histórico serão mantidos sem identificar você.”); e (g) as regras e fases pós-cancelamento da barbearia parceira (1–3 dias tolerância, 4–15 dias exportação, 16–59 dias congelamento e 60+ dias expurgo/anonimização, com guarda fiscal legal de 5 anos). Testes de renderização atualizados e passando 100%. Pendência documental formalmente encerrada.

**TERMOS-01 / RF-LP-005 e §§2776–2778 — Termos de Uso e Condições Gerais, implementado e validado em 11/09/2026:** A página pública de Termos de Uso (`/termos` em `app/termos/page.tsx`) foi implementada em 11 seções em estrita conformidade com a EFS e com o Código de Defesa do Consumidor: (a) identificação legal completa da empresa (CNPJ 39.299.793/0001-27, sede na Rua Igaratinga, 137); (b) delimitação expressa de responsabilidade (plataforma como intermediadora de software e barbearia parceira como responsável integral pelo atendimento estético presencial); (c) pagamento gratuito pelo aplicativo e recebimento direto no balcão do salão; (d) agendamento para menores conduzido pelos responsáveis legais (Art. 14 da LGPD); (e) regras operacionais de pontualidade, tolerância a atrasos e política contra reservas abusivas (no-show); (f) regras comerciais da assinatura SaaS B2B, incluindo período de testes de 30 dias, direito legal de arrependimento de 7 dias (Art. 49 do CDC) e as fases do ciclo pós-cancelamento (1–3 dias tolerância, 4–15 dias exportação, 16–59 dias congelamento, 60+ expurgo); (g) propriedade intelectual e vedações a scraping/spam; (h) integração direta com a Política de Privacidade (`/privacidade`); (i) elegibilidade, foro e canais oficiais de suporte (`contato@cullentech.com.br`). Testes automatizados dedicados implementados em `tests/terms-of-service.test.mjs`, typecheck e lint validados com sucesso (100% de aprovação).

Na foto do perfil, a investigação remota confirmou para a barbearia de teste consultada que o valor existe em `barbershops`, é exposto pela visão pública e o objeto do Storage responde como imagem; a correção local é apenas de renderização, removendo um bloqueio legado de URL e evitando cache do otimizador para a foto pública dinâmica. Não altera Storage, RLS, RPC, autenticação ou os dados existentes. Homologação visual posterior continua necessária.

**Continuação GE-11 em 09/09/2026 — estabilidade da sessão:** a revisão identificou que `SIGNED_IN` pode repetir para a mesma identidade ao retomar uma aba. O guarda agora compara a identidade anterior: restauração inicial e eventos repetidos da mesma conta preservam a tela e o formulário; troca efetiva de conta ou atualização explícita do usuário revalida a rota por recarga; saída leva ao login. Isso corrige a implementação intermediária descrita em GE-11, que ainda recarregava em qualquer `SIGNED_IN`. Regressão comportamental reproduziu duas recargas indevidas antes da correção e passou depois; rodada autenticada de troca de conta continua pendente.

**GE-12 / §22, §42.8, T23–T29 — Relatórios, incremento local em 09/09/2026:** construção parcial. Entrada “Resultados do período”, filtros em cartão, seleção terracota, grade responsiva e barras no padrão visual aprovado; seis visões, fórmulas e RPCs preservadas. Filtros editados só consultam após “Atualizar resultados”; período válido de até 367 dias inclusivos; CSV indisponível enquanto há filtro ainda não aplicado, consulta em andamento ou falha. Falhas de consulta mostram indisponibilidade e tentativa novamente, sem apresentar zeros como resultado; falha específica das comissões não bloqueia as demais visões. O período aplicado fica identificado junto dos filtros. Testes funcionais de datas e respostas foram adicionados, incluindo data inválida, limites de 367/368 dias, erro e resultado legítimo zero; validação completa passou: build padrão, TypeScript, 32 páginas, pacote standalone e 157 testes aprovados. Frontend local, nenhuma migration ou publicação neste incremento. Homologação visual autenticada, comparação celular/tablet/desktop e uma atualização real de repasse ainda pendentes. A conexão de automação de navegador retornou `User unavailable` nesta rodada, portanto não há nova evidência visual. Próximo passo: inspecionar as seis visões com a sessão disponível.

**Continuação GE-12 em 09/09/2026 — confirmação de repasse:** marcar uma comissão pendente como paga agora abre uma confirmação contextual com valor e profissional; cancelar não altera o dado. A reversão de pago para pendente permanece uma ação direta. Sucesso ou falha aparece sob a mesma tabela de comissões, sem levar a pessoa ao topo. O contrato de dados e a RPC existente foram preservados. O teste dirigido cobre as duas transições; homologação visual e uma atualização real de repasse continuam pendentes para não modificar dados do ambiente durante esta rodada.

**Correção GE-04 em 09/09/2026 — dados, foto e agenda personalizada:** o frontend local continua conectado ao Supabase remoto; não houve cópia de dados para Docker. Foi reproduzida a falha de atualização do profissional com foto: a validação de URL dependia de uma configuração de origem ausente. A migration forward-only `20260909173658_fix_professional_data_and_custom_schedule.sql`, aplicada ao remoto autorizado, permite conservar a foto já cadastrada durante a edição dos demais dados. A migration posterior `20260909180549_accept_professional_photo_url_from_session.sql` autoriza uma foto nova somente quando sua origem corresponde à sessão autenticada, seu caminho é estritamente `professional-images/<id-do-profissional>/...` e o objeto já existe no Storage; query, fragmento, traversal, barra invertida, URL estranha e objeto ausente são recusados. A execução anônima da RPC foi revogada. A fixture remota com `ROLLBACK` confirmou associação válida, rejeição de objeto ausente e bloqueio de usuário de outro tenant. A troca de uma foto real pela interface ainda não foi homologada, para não modificar um perfil de teste sem necessidade.

Na ficha, Personalizada abre a edição dos horários guardados sem ativá-los previamente. O botão Salvar envia os sete dias para `save_professional_custom_schedule`, que valida autorização, dias e limites do funcionamento e grava horários e modo em uma única transação. Horários antigos não são normalizados silenciosamente: o gestor pode corrigir os dias antes de salvar. Se a gravação falhar, a agenda efetiva anterior permanece. O retorno aparece abaixo de Salvar; no modo herdado, a mensagem é “O profissional está usando os mesmos horários de funcionamento da barbearia.” A expressão “neste ambiente” foi removida desse fluxo.

Evidências: 11 testes direcionados, typecheck e lint da ficha aprovados; teste SQL remoto com fixtures e ROLLBACK aprovou criação, edição com e-mail/Instagram, salvamento personalizado, rejeição de dia fechado, preservação do modo após falha, correção do dia e bloqueio de usuário externo ao tenant. O teste também consultou a disponibilidade pública após salvar e confirmou que os horários retornados respeitam o intervalo personalizado. Uma segunda fixture remota inseriu pausa recorrente e bloqueio pontual e comprovou que os slots correspondentes não são retornados no agendamento público; tentativa de usuário externo criar ambos foi negada. Pela interface autenticada, Salvar dados retornou sucesso; Personalizada abriu os sete dias e a tentativa de salvar a terça-feira incompatível exibiu erro abaixo de Salvar. A ficha passa a mostrar o funcionamento da barbearia por dia, com os campos de início e fim mantendo posições estáveis, e a validação identifica o dia e o intervalo a corrigir. O advisor remoto mantém apenas os avisos preexistentes de RLS sem policy, funções públicas autorizadas e proteção contra senha vazada; nenhum novo alerta foi associado à correção de Equipe. Servidor de desenvolvimento iniciado como processo separado na porta 3010; respondeu HTTP 200 após compilar. Homologação do responsável, teste visual em todos os tamanhos, criação real de profissional, troca real de foto e conclusão de uma reserva pela interface pública seguem pendentes.

**GE-13 / RF-GE-002, §§15 e 42.7 — Início da gestão, incremento local em 09/09/2026:** a superfície de Início foi reconstruída no padrão editorial V2, preservando a navegação e os fluxos aprovados. Ela consulta o tenant atual e apresenta o link público em card próprio, resumo operacional do dia reutilizando a mesma regra de status da Agenda, até quatro próximos atendimentos, pendências de serviço, profissional, horário e agenda individual, e atalhos para Agenda, novo profissional, novo serviço e Relatórios. Não há métricas financeiras, dados de relatório ou dados de clientes nos alertas. Compromissos futuros de profissional inativo são agrupados por profissional e levam a `/painel/agenda?professional=<id>`; a Agenda agora interpreta somente UUID válido, aplica o filtro às consultas do período e do resumo diário, identifica o filtro ativo e permite limpá-lo. Não houve migration, alteração de RPC, RLS, autenticação, assinatura ou dados existentes: são consultas já autorizadas pelo tenant. O aviso de configuração não declara que o link público aceita reservas sem confirmar o critério completo. Testes novos verificam prioridade dos alertas, agrupamento sem dados de clientes, seleção dos próximos horários e sanitização do filtro; typecheck, lint dirigido, 12 testes dirigidos de Início/Agenda e `git diff --check` passaram. O build e a suíte completa foram iniciados, mas a saída final ainda não foi capturada nesta rodada; não usar isso como evidência de aprovação. A automação visual não produziu uma captura autenticada válida, portanto 390×844, tablet e desktop permanecem não verificados. Sem migration remota, commit, push ou publicação. Homologação não iniciada.

**GE-14 / RF-SA-001–010, §§24 e 42.9 — Central de assinatura, início visual em 09/09/2026:** por decisão do responsável, a central deve avançar sem configurar neste momento o meio de pagamento SaaS. A navegação passa a retornar para Mais e a Visão geral, planos, contratação, cobranças, cancelamento e dados usam a linguagem editorial V2: app bar clara, superfícies brancas, bordas discretas e terracota para ações disponíveis. O catálogo conserva preço total, duração, parcelamento máximo e limite de cinco profissionais; a interface não pressupõe cartão ou outro meio de pagamento ainda não configurado. A visão do proprietário continua a consultar somente a assinatura autorizada por RLS; gestor recebe orientação sem consulta financeira; barbeiro é redirecionado à própria agenda. Não houve mudança em tabelas, RLS, RPCs, Auth, dados, migrações ou Supabase remoto. A central permanece semipronta: não cria pedido, não grava aceite, não abre checkout, não confirma cobrança, não altera cancelamento, não solicita reembolso e não produz exportação enquanto as decisões da seção 38 e a configuração financeira da plataforma não existirem. Homologação visual e validações de build completas pendentes.

**Continuação GE-14 / §42.9 — central operacional da assinatura, decisão aprovada em 09/09/2026:** a central deixa de expor catálogo, comparação, preço, parcelas, limites, contratação, aceite e condições comerciais. A tela de entrada é a própria Visão geral e mostra situação e vigência atuais; portanto, o menu no padrão vertical de Mais contém somente Cobranças, Meus dados e Cancelamento. O retorno editorial grande da entrada leva a Mais; o retorno compacto da app bar fica oculto nessa mesma tela para não duplicar o destino. Nas subseções, o retorno compacto passa a levar à central de Assinatura. Meus dados foi separado dos dados de conta de Mais: ele descreve exclusivamente a futura exportação dos dados operacionais autorizados da barbearia. Cancelamento apresenta visualmente Renovar automaticamente como intenção padrão, seguida de Não renovar ao final, mas não grava nem declara uma configuração financeira real enquanto não houver integração; há card separado de Cancelar agora, que somente explica a futura confirmação, reautenticação e conciliação e aponta para os benefícios na landing. O catálogo e as regras comerciais ficam na landing pública `/#planos`; as rotas históricas de Planos e Contratar redirecionam para ela. O bloco escuro de abas foi removido. Sem alteração em tabelas, migrations, RPCs, RLS, Auth, Supabase remoto ou dados existentes. Dois testes dirigidos — três seções sem Visão geral redundante e ordem de intenção de renovação — foram escritos antes da implementação e passaram, junto aos seis testes preexistentes de assinatura; typecheck passou. Lint, build e homologação visual autenticada deste ajuste permanecem pendentes. A definição do prazo de download, avisos e eliminação/anomização após encerramento continua pendente de aprovação de produto e validação jurídica, conforme §46.3; não foi simulada como obrigação legal no card.

**GE-15 / RF-GE-001, T01–T03 — identidade do aplicativo em Agenda e Clientes, decisão aprovada em 09/09/2026:** Construído localmente. Agenda e Clientes agora usam o mesmo app bar principal de Equipe, exibindo o nome/logo BarbeariaSP em celular e desktop. Foram removidas somente as exceções móveis que escondiam a marca e, em Clientes, o cabeçalho paralelo de voltar/título/inicial. Rotas, dados, filtros, ações, papéis, navegação inferior e o conteúdo homologado das duas superfícies foram preservados. Mais não foi alterada, pois terá decisão visual posterior. Sem tabelas, migrations, RPCs, RLS, Auth, Supabase remoto ou dados existentes. `git diff --check` passou; a verificação de TypeScript e testes direcionados foi iniciada nesta rodada, mas não retornou saída final capturável no terminal. A homologação visual autenticada em celular, tablet e desktop aguarda o responsável.

**Continuação GE-12 / §§22 e 42.8 — detalhes da Visão geral, decisão aprovada em 09/09/2026:** Construído localmente. Faturamento, Cancelamentos, Não compareceu e Clientes da Visão geral são cartões acionáveis e revelam/recolhem, logo abaixo da grade, a lista integral retornada pelo período e profissional já aplicados. Faturamento restringe a lista a atendimentos concluídos; Cancelamentos e Não compareceu restringem pelo status correspondente; Clientes mostra a base elegível da mesma consulta. Agendamentos e Comissões abrem as respectivas abas sem perder os filtros. Não há nova fórmula, consulta extra, mutação ou leitura entre tenants. Ações de repasse pendente passam a usar terracota, e cartões de detalhamento usam superfície branca, borda discreta e estado terracota, sem cartões pretos. Hoje, Esta semana, Este mês e Últimos 30 dias ocupam uma única linha de quatro opções compactas no celular. Motivo de cancelamento foi removido da visão, da exportação CSV e dos requisitos: esse dado não é coletado; o relatório mantém status e valor snapshot. Sem alterações em tabelas, migrations, RPCs, RLS, Auth, Supabase remoto ou dados existentes. Teste de filtro de detalhamento foi criado antes da implementação e passou; typecheck, lint, validação visual autenticada e build completo aguardam a execução desta entrega.

**Continuação GE-12 / §§22 e 42.8 — interação e gráfico, decisão aprovada em 09/09/2026:** o acionamento dos detalhes foi refinado: o cartão não é mais inteiro clicável; somente a ação textual “Ver detalhes” abre/recolhe a lista ou navega para Agendamentos/Comissões. Exportar CSV saiu do cabeçalho e foi para o fim da página, com estilo terracota e texto que confirma visão e filtros aplicados. A evolução diária agora mostra exatamente os últimos sete dias do período aplicado e inclui dias sem atendimento como valor zero, evitando gráfico com intervalo variável. O teste de janela de sete dias foi escrito antes do código e passou junto aos outros seis testes dirigidos de Relatórios; typecheck passou. Lint, `git diff --check`, build e homologação visual autenticada ainda exigem captura final nesta rodada. Nenhuma alteração de banco, RPC, RLS, Auth, dados existentes ou Supabase remoto.

**Correção GE-12 / §22.6.1 — abertura do detalhamento em 10/09/2026:** o estado do detalhamento da Visão geral foi centralizado em uma transição determinística: clicar em “Ver detalhes” abre o indicador solicitado, trocar de indicador mostra o novo painel e clicar novamente no mesmo texto o recolhe. Depois de abrir, a tela rola até o painel para tornar o resultado visível, inclusive no celular. Faturamento, Cancelamentos, Não compareceu e Clientes continuam usando exclusivamente os dados já retornados pelo relatório e os filtros aplicados; não houve consulta, mutation, migration, RPC, RLS, Auth, Supabase remoto ou alteração de dados existentes. O teste dirigido foi escrito antes da implementação, falhou pela ausência da transição e passou após a correção; typecheck passou. Lint, build e homologação visual autenticada permanecem pendentes. A visão de clientes sem retorno superior a 45 dias não foi criada nesta correção: ela exige fonte própria, pois a resposta atual contém somente clientes com atividade no período, e aguarda aprovação da regra funcional e da nova RPC segura.

**Continuação GE-12 / §§22.6.2 e 42.8 — clientes sem retorno e comissões, lote em 10/09/2026:** Construído localmente e aplicado ao Supabase remoto de teste autorizado. Clientes passa a ter os segmentos “Clientes no período” e “Sem retorno +45 dias”; o segundo consulta a nova RPC `get_barbershop_inactive_customers`, mostra última visita, dias sem retorno, histórico financeiro, tipos de atendimento e contato, e exporta o mesmo recorte em CSV. A migration forward-only `20260910120852_add_inactive_customer_report.sql` cria apenas um índice parcial de leitura e uma RPC `SECURITY DEFINER` de privilégio mínimo: exige sessão, autoriza exclusivamente owner/manager pelo tenant, valida o profissional informado, revoga execução pública/anônima e não cria tabela, política RLS ou acesso de cliente. A regra exclui quem já tem reserva futura ativa na barbearia, inclusive quando o histórico está filtrado por profissional. Comissões conserva a RPC e a confirmação de pagamento existentes, mas agora respeita o seletor global de profissional, abre em resumo de total/pendente/pago/quantidade e exibe lançamentos somente após o texto “Ver detalhes”. O atalho “Últimos 30 dias” pode quebrar entre as duas linhas para permanecer em uma única fileira sem corte. O teste unitário de resumo foi escrito antes da função, falhou por export ausente e passou após a implementação; a fixture SQL também falhou antes da RPC e passou após aplicar a migration dentro de transação local com `ROLLBACK`, incluindo isolamento entre tenants, reserva futura, corte de 45 dias e tipos de serviço. TypeScript, lint dirigido, `git diff --check` e `supabase db lint --local --fail-on error` passaram; o lint mantém somente dois avisos preexistentes de parâmetros não usados em `revoke_customer_marketing_consent`. A aplicação convencional da migration local continua bloqueada pela divergência histórica `20260824114801`, sem reparo automático. No remoto de teste, a migration foi aplicada isoladamente, a RPC foi confirmada existente, `anon` foi confirmado sem execução e `authenticated` com execução controlada pela validação interna. O advisor remoto não reportou alerta novo específico desta RPC; permanecem os avisos preexistentes de funções autorizadas, tabelas internas protegidas sem policy e proteção de senha vazada desabilitada. Homologação visual autenticada em celular, tablet e desktop e confirmação real de um repasse continuam pendentes.

**QA-02 / §37, §48.5 — lint confiável e pureza de Notificações, lote local em 10/09/2026:** Construído localmente. Os artefatos gerados não versionados `.next-v2` e `.next-team-v2` passaram a ser excluídos tanto pelo ESLint quanto pelo Git, sem apagar os diretórios e sem excluir fontes, testes, migrations ou regras de segurança da análise. Em `/painel/notificacoes`, a fronteira de retenção de 45 dias deixou de usar `Date.now()` durante a renderização: ela é calculada uma vez, sob demanda, na busca de notificações e preserva o limite de 100 registros. Uma regressão adicional na tela de entrada eliminou duas capturas `error` não utilizadas, mantendo as mensagens sanitizadas de autenticação e de envio do link. Os testes foram escritos/ajustados antes das correções e falharam pelo `Date.now()` e pelas capturas remanescentes; após as mudanças, os testes dirigidos passaram (22/22), `npm.cmd run lint` passou sem erros ou avisos, `npm.cmd run typecheck` passou e `npm.cmd test` passou com build de 32 rotas e 168/168 testes. O build mantém o aviso preexistente do Next sobre `package-lock.json` fora do repositório; ele não impediu a compilação ou a preparação local do standalone. Não houve mudança de comportamento de produto, banco, migrations, RPCs, RLS, Auth, dados, Supabase remoto, commit, push, deploy ou homologação visual. Próximo passo: confirmar com o responsável se o rascunho de reserva expira em 10 ou 15 minutos antes de implementar a separação explícita entre Gestão e Cliente.

**QA-03 / §37 — raiz explícita de rastreamento do Next, lote local em 10/09/2026:** Construído localmente. A causa do aviso era a descoberta automática de dois `package-lock.json`: o lockfile da aplicação e outro no diretório contêiner acima da raiz Git. O Next ignora corretamente o arquivo externo, mas emitia o aviso antes de construir. `next.config.ts` agora calcula a pasta do próprio arquivo de configuração e a informa em `outputFileTracingRoot`; assim, o rastreamento do artefato `standalone` fica limitado à raiz versionada da aplicação, sem remover, alterar ou passar a incluir o lockfile externo. Após um bloqueio transitório de build concorrente, uma nova construção carregou a configuração sem o aviso e gerou o artefato `standalone`. `npm.cmd run lint` e `npm.cmd run typecheck` passaram; a etapa integral de testes definida pelo projeto foi executada diretamente e passou em 171/171; `git diff --check` não apontou erro. Não houve mudança de produto, dependências, banco, migrations, RPCs, RLS, Auth, Supabase remoto, commit, push, deploy ou homologação.

**Decisão GE-23 / §19.1 e T18 — prévia da foto no cadastro da barbearia, aprovada em 11/09/2026:** em Dados da barbearia, o círculo deve mostrar a foto atualmente cadastrada e, após a seleção de um novo arquivo válido, a prévia local dessa nova imagem. A área será identificada explicitamente como “Foto da barbearia”. Falha de carregamento apresenta as iniciais da barbearia, sem remover a URL salva; upload ou gravação malsucedidos continuam preservando a foto anterior. A implementação será local e limitada à apresentação/estado do frontend, sem migration, RPC, RLS, alteração de Auth, dados existentes ou Supabase remoto. Depois desta correção, a área profissional seguirá em lotes separados: Agenda própria; Minha disponibilidade; perfil público permitido; notificações e conta; por fim navegação e validação integral do papel. Cada lote deve respeitar o tenant, limitar o profissional à própria agenda/perfil e preservar a proibição de cancelamento prevista em AUTHZ-01.

**Homologação GE-22 / §§4, 8, 10, 13 e 42 — confirmada pelo responsável em 11/09/2026:** o último ajuste da foto da página pública, sua proporção e o limite responsivo sem estouro horizontal foi homologado pelo responsável. A confirmação abrange a página pública exibida e os tamanhos móveis corrigidos; não comprova publicação, produção nem amplia automaticamente a homologação para landing, entradas, tablet ou desktop ainda não verificados.

**GE-24 / §§16.2, 27.4 e 32.3 — falha nas ações de status da Agenda, registrada em 11/09/2026:** o responsável comprovou que Concluir, No-show e Cancelar falham nas agendas de gestão e que a mensagem aparece distante do botão acionado. O frontend foi corrigido localmente para manter um retorno independente por agendamento, imediatamente abaixo do grupo de ações daquele cartão, e traduzir falha de RPC ausente, permissão, sessão e transição para mensagens distintas e sanitizadas. O teste foi escrito antes da correção e falhou por export/estado contextual ausentes; depois da implementação, os 11 testes dirigidos passaram. A suíte oficial, já incluindo as novas regressões de Agenda, foto e área profissional, executou build de produção com 34 rotas, gerou o pacote standalone e passou em 186/186; lint global e typecheck também passaram. A investigação local encontrou uma única definição de `set_appointment_status`, na migration `20260909154505_simplify_appointment_status.sql`, já registrada como não aplicada ao Supabase remoto de homologação. Em 11/09/2026, o responsável autorizou a aplicação no ambiente de homologação, mas a CLI não conseguiu inicializar a rota de gerenciamento (`TransportError`) e a conexão direta vinculada não possui a senha de banco nesta máquina; não existe credencial alternativa versionada ou no `.env.local`. Nenhuma migration, RLS, Auth ou dado remoto foi alterado. As ações continuarão indisponíveis no ambiente remoto até a conexão ser destravada e a aplicação autorizada puder ser executada com verificação posterior da divergência histórica `20260824114801`.

### 48.5 Reconciliação integral da conversa de Gestão V2 — 10/09/2026

Esta reconciliação registra as decisões, entregas, integrações de homologação, homologações e pendências materiais tratadas nesta conversa. Ela não reproduz a conversa nem substitui os requisitos das seções 1–47: cada linha aponta para o registro detalhado acima e mantém a diferença entre código local, banco remoto de teste, publicação e homologação. Assim, o próximo trabalho deve começar por esta seção e pelos requisitos referenciados, sem usar documentos paralelos ou supor que um teste local signifique publicação em produção.

| Frente / referências | Estado consolidado em 10/09/2026 | Evidência, integração e homologação | Pendência objetiva para retomada |
|---|---|---|---|
| Governança do produto / §§1–48, DOC-01–02 | **Construído e vigente.** A EFS é a única especificação e registro de execução; referências visuais incorporadas, especialmente Clientes, têm prioridade total. Nenhuma tela deve ser reconstruída a partir de documentos históricos. | Diretriz expressa do responsável; `AGENTS.md` determina atualização concomitante desta seção. | Manter cada nova decisão e mudança de estado nesta EFS; não criar plano, resumo ou especificação paralela. |
| Operação local, Docker e pacote Hostinger / rotina de desenvolvimento | **Regra operacional definida.** O Supabase remoto ativo é o único banco compartilhado de desenvolvimento/homologação atual e contém somente dados de teste. Docker local é isolado, não é espelho automático e fica desligado no trabalho diário; só pode ser iniciado para validação técnica que exija banco local, após conferir e atualizar a estrutura por migrations aprovadas com fixtures fictícias. | Em 11/09/2026, a comparação verificou que o Docker local estava vazio, com linha de migrations interrompida em 24/08/2026 e ainda aceitava `confirmed`; o remoto tinha 0 `confirmed` e a restrição atualizada. `AGENTS.md` passou a exigir declaração explícita de código, banco e efeito em cada operação. | `npm test` executa somente a suíte; `npm run test:build` valida build sem standalone; `npm run package:hostinger` prepara standalone apenas depois de autorização para atualizar/testar nova versão na Hostinger. Não sincronizar ou desinstalar Docker sem decisão específica. |
| Shell, Início, Agenda, Clientes e Equipe / GE-13, GE-15, GE-16, T01–T03 e T30–T32 | **Homologado pelo responsável em 11/09/2026.** Barra compacta, marca, controles, navegação primária de cinco destinos, ausência de quebra horizontal/overflow e responsividade nas três resoluções (celular 390×844, tablet e desktop) verificados e concluídos. | Suíte de testes `npm test` validada, build standalone e conferência visual concluída sem quebras. | Nenhuma pendência de layout ou responsividade deste bloco. |
| Relatórios / GE-12, §§22 e 42.8, T23–T29 | **Homologado pelo responsável em 11/09/2026.** Detalhes sob demanda, evolução diária com últimos 7 dias, Clientes inativos (+45 dias) e resumo financeiro/comissões aprovados. | RPC privada validada e fluxos de visualização/exportação CSV conferidos. | Nenhuma pendência nesta visão de relatórios. |
| Segurança P0, publicação e dados de produção / SEG-01 | **Integrado e validado localmente em 11/09/2026.** AUTH-01 (proteção rigorosa contra open redirect com `safeCustomerReturnPath`), AUTHZ-01 (restrição de UPDATE amplo e RPC `set_appointment_status` com proibição de cancelamento por barbeiro) e ABUSE-01 (mensageria amigável e quota de 4 agendamentos futuros) integrados e cobertos por testes unitários dedicados (184/184 testes passando). | `tests/customer-return-path.test.mjs`, `tests/public-booking-errors.test.mjs` e `tests/management-mobile-redesign.test.mjs` passando 100%. | Validar aplicação das migrations correspondentes no ambiente remoto quando for autorizada a sincronização de banco. |
| Transparência LGPD & Regras de Divulgação / LGPD-01, RF-LG-001–004, RF-CL-009, RN-070–072 | **Construído, publicado e validado em 11/09/2026.** Política de Privacidade em 15 seções em `/privacidade` cumprindo integralmente LGPD, CDC (Arts. 36/37) e boas práticas de mensageria (opt-out explícito, horários de envio, papéis Controlador/Operador, não coleta de cartões, cláusula canônica de encerramento e ciclo de retenção SaaS). | Suíte de testes passando 100% (184/184); rota ativa em produção respondendo HTTP 200 em `https://barbeariasp.cullentech.com.br/privacidade`. | Nenhuma pendência técnica. Revisão jurídica formal contínua conforme conveniência do titular da marca. |
| Termos de Uso da Plataforma / TERMOS-01, RF-LP-005, §§2776–2778 | **Construído e validado em rota técnica (`/termos`), com ativação pendente no rodapé da landing.** Página com 11 seções em conformidade legal com CDC e EFS (identificação societária, delimitação tecnológica de responsabilidade, agendamento gratuito, tolerância/no-show, trial de 30 dias e direito de arrependimento de 7 dias do Art. 49 CDC). **Nota de sinceridade e transparência:** No deploy de 11/09/2026, faltou substituir o texto estático do rodapé em `app/page.tsx` ("em preparação") por um link clicável; dessa forma, os termos não estão acessíveis aos visitantes no site publicado. | Rota `/termos` pré-renderizada e ativa em produção (HTTP 200 em `https://barbeariasp.cullentech.com.br/termos`), validada por `tests/terms-of-service.test.mjs` e `tsc --noEmit`. | No próximo deploy autorizado, atualizar o rodapé de `app/page.tsx` com `<Link href="/termos">Termos de Uso</Link>`, atualizar a asserção em `tests/rendered-html.test.mjs` e reconstruir. |
| Publicação em Produção na Hostinger / infraestrutura web | **Implantado e verificado em produção em 12/09/2026.** Deploy executado com sucesso via MCP `hosting_deployJsApplication` no domínio `barbeariasp.cullentech.com.br`. Build `01a09396-36f8-717e-91d8-9fa326f1b176` finalizado em Node 22 com todas as 35 rotas estáticas pré-renderizadas e pacote standalone configurado. | Verificações de conectividade em tempo real respondendo HTTP 200 para `/api/health`, `/privacidade` e `/termos`. | Manter rotina de publicação vinculada às autorizações explícitas de novos ciclos de deploy. |

**Ordem segura de retomada:** (1) Infraestrutura Transacional: Validação e ativação ponta a ponta do pipeline de notificações e e-mails transacionais (Resend / Hostinger SMTP / worker); (2) Módulo Financeiro SaaS: Especificação da integração de gateway de pagamento (Asaas/PCI-DSS) para cobrança recorrente em `/painel/assinatura`; (3) Conectar o link de Termos de Uso no rodapé da landing pública (`app/page.tsx`) no próximo deploy autorizado.

**Decisão de governança:** a EFS é a única especificação de produto e concentra também o acompanhamento. Documentos antigos não são requisitos complementares de leitura. Código, testes e referências visuais são evidências; documentação oficial de APIs é apoio técnico, não outro contrato de produto.

Antes de encerrar uma tarefa, registrar o que foi construído, testes executados e resultados, limitações, pendências, integração/publicação, homologação e próximo passo. Se nada funcional mudou, declarar que a entrega foi documental. Para mudança funcional relevante, apresentar antes da implementação: problema, nova regra, benefício, impactos em frontend/banco/Supabase/autenticação/segurança e dados existentes, migrations/RPC/RLS prováveis, riscos e casos especiais; aguardar aprovação.
